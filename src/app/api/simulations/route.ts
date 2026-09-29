// ============================================================
// Simulation API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getAdminDb, validateWorkspaceAccess } from '@/lib/firebase/admin';
import { generateSimulation } from '@/lib/llm/gemini';
import { recallForStrategy } from '@/lib/hindsight/client';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const decoded = await verifyToken(authHeader.split('Bearer ')[1]);
  if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  try {
    const body = await req.json();
    const { workspaceId, analysisId, target, strategy, timeHorizon, assumptions } = body;

    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });

    const hasAccess = await validateWorkspaceAccess(decoded.uid, workspaceId);
    if (!hasAccess) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const db = getAdminDb();

    // Get current metrics from analysis
    let currentMetrics: Record<string, unknown> = {};
    if (analysisId) {
      const signals = await db.collection('signals').where('analysisId', '==', analysisId).get();
      const gaps = await db.collection('competitiveGaps').where('analysisId', '==', analysisId).get();
      
      currentMetrics = {
        signalsDetected: signals.size,
        gapsIdentified: gaps.size,
        signals: signals.docs.slice(0, 10).map(d => {
          const data = d.data();
          return { type: data.signalType, competitor: data.competitor, severity: data.severity };
        }),
        gaps: gaps.docs.slice(0, 10).map(d => {
          const data = d.data();
          return { dimension: data.dimension, competitor: data.competitor?.name, severity: data.severity };
        }),
      };
    }

    // Recall relevant historical context
    let historicalMemory: string[] = [];
    try {
      const recall = await recallForStrategy([target, strategy], [], 5);
      historicalMemory = (recall.results || []).map(r => r.content);
    } catch {
      // Continue without memory
    }

    // Generate simulation via LLM
    const result = await generateSimulation(
      target,
      strategy,
      timeHorizon,
      assumptions || [],
      currentMetrics,
      historicalMemory
    );

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Store simulation
    const simulationId = uuid();
    const simulation = {
      id: simulationId,
      workspaceId,
      analysisId,
      strategyDescription: strategy,
      timeHorizon,
      assumptions: assumptions || [],
      baseline: result.baseline || { label: 'Baseline', metrics: [] },
      target: result.target || { label: 'Target', metrics: [] },
      simulated: result.simulated || { label: 'Simulated', metrics: [] },
      gapRemaining: result.gapRemaining || 0,
      disclaimer: result.disclaimer || 'Simulated scenario based on selected assumptions. Not an observed business result.',
      reasoning: result.reasoning || '',
      caveats: result.caveats || [],
      createdAt: new Date().toISOString(),
    };

    await db.collection('simulations').doc(simulationId).set(simulation);

    // Audit
    await db.collection('auditLogs').add({
      workspaceId,
      userId: decoded.uid,
      action: 'simulation_run',
      entityType: 'simulation',
      entityId: simulationId,
      details: `Simulation: ${strategy} over ${timeHorizon}`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ simulation });
  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Simulation failed',
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const decoded = await verifyToken(authHeader.split('Bearer ')[1]);
  if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get('workspaceId');
  if (!workspaceId) return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });

  const hasAccess = await validateWorkspaceAccess(decoded.uid, workspaceId);
  if (!hasAccess) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const db = getAdminDb();
  const simulations = await db.collection('simulations')
    .where('workspaceId', '==', workspaceId)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  return NextResponse.json({
    simulations: simulations.docs.map(d => ({ id: d.id, ...d.data() })),
  });
}
