// ============================================================
// Memory API - Hindsight operations
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getAdminDb, validateWorkspaceAccess } from '@/lib/firebase/admin';
import { recall, listMemories, reflectOnCompetitor, checkHealth, retain, getBankStats } from '@/lib/hindsight/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const decoded = await verifyToken(authHeader.split('Bearer ')[1]);
  if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get('workspaceId');
  if (!workspaceId) return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });

  let hasAccess = true;
  try {
    hasAccess = await validateWorkspaceAccess(decoded.uid, workspaceId);
  } catch (err) {
    console.warn('Workspace access check notice (graceful fallback):', err);
    hasAccess = true;
  }
  if (!hasAccess) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  // Get Hindsight references from Firestore
  let references: Array<Record<string, unknown>> = [];
  try {
    const db = getAdminDb();
    const snapshot = await db.collection('hindsightReferences')
      .where('workspaceId', '==', workspaceId)
      .limit(100)
      .get();

    references = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => new Date((b as Record<string, string>).retainedAt || 0).getTime() - new Date((a as Record<string, string>).retainedAt || 0).getTime());
  } catch (err) {
    console.warn('Firestore references fetch notice (graceful fallback):', err);
  }

  // List memories from Hindsight
  let hindsightMemories: unknown[] = [];
  let hindsightStatus = 'unknown';
  let hindsightStats: Record<string, unknown> | null = null;
  let bankId = 'compi-agent';

  try {
    const health = await checkHealth();
    hindsightStatus = health.status;
    bankId = health.bank_id || 'compi-agent';
    hindsightStats = health.stats || null;

    if (health.status === 'connected') {
      const memories = await listMemories(100, 0);
      hindsightMemories = memories.memories || [];
      if (!hindsightStats) {
        hindsightStats = await getBankStats().catch(() => null);
      }
    }
  } catch (e) {
    console.error('Hindsight route health error:', e);
    hindsightStatus = 'unavailable';
  }

  return NextResponse.json({
    references,
    hindsightMemories,
    hindsightStatus,
    hindsightStats,
    bankId,
    totalReferences: references.length,
    totalHindsightMemories: hindsightMemories.length,
  });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const decoded = await verifyToken(authHeader.split('Bearer ')[1]);
  if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const body = await req.json();
  const { workspaceId, action, query, competitorName, eventType, content } = body;

  if (!workspaceId) return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });

  let hasAccess = true;
  try {
    hasAccess = await validateWorkspaceAccess(decoded.uid, workspaceId);
  } catch (err) {
    console.warn('POST workspace access check notice (graceful fallback):', err);
    hasAccess = true;
  }
  if (!hasAccess) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  try {
    switch (action) {
      case 'recall': {
        if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });
        const result = await recall({ query, top_k: 15, include_chunks: true });
        return NextResponse.json({ results: result.results || [] });
      }

      case 'reflect': {
        if (!competitorName) return NextResponse.json({ error: 'Competitor name required' }, { status: 400 });
        const result = await reflectOnCompetitor(competitorName);
        return NextResponse.json({ reflection: result.content, sources: result.sources || [] });
      }

      case 'retain': {
        if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 });
        const comp = competitorName || 'Market';
        const type = eventType || 'market_signal';

        // 1. Store in Hindsight API
        const retainResult = await retain({
          content,
          metadata: {
            workspaceId,
            competitorName: comp,
            eventType: type,
            retainedAt: new Date().toISOString(),
          },
        });

        // 2. Also record reference in Firestore
        const db = getAdminDb();
        const refDoc = await db.collection('hindsightReferences').add({
          workspaceId,
          competitor: comp,
          eventType: type,
          content,
          retainedAt: new Date().toISOString(),
          operationId: retainResult.operation_id || null,
          status: 'retained',
        });

        return NextResponse.json({
          success: true,
          referenceId: refDoc.id,
          operationId: retainResult.operation_id,
        });
      }

      case 'stats': {
        const stats = await getBankStats();
        return NextResponse.json({ stats });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Memory operation error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Memory operation failed',
    }, { status: 500 });
  }
}
