// ============================================================
// Reports API - Generate, list, and fetch intelligence reports
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getAdminDb, validateWorkspaceAccess } from '@/lib/firebase/admin';
import { generateReportContent } from '@/lib/llm/gemini';
import { v4 as uuid } from 'uuid';

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

  const reportId = req.nextUrl.searchParams.get('reportId');

  const hasAccess = await validateWorkspaceAccess(decoded.uid, workspaceId);
  if (!hasAccess) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const db = getAdminDb();

  try {
    if (reportId) {
      const doc = await db.collection('reports').doc(reportId).get();
      if (!doc.exists) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }
      return NextResponse.json({ report: { id: doc.id, ...doc.data() } });
    }

    const snapshot = await db.collection('reports')
      .where('workspaceId', '==', workspaceId)
      .limit(50)
      .get();

    const reports = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => new Date((b as Record<string, string>).generatedAt || 0).getTime() - new Date((a as Record<string, string>).generatedAt || 0).getTime())
      .slice(0, 30);

    return NextResponse.json({
      reports,
    });
  } catch (error) {
    console.error('Reports fetch error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch reports',
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const decoded = await verifyToken(authHeader.split('Bearer ')[1]);
  if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  try {
    const body = await req.json();
    const { workspaceId, analysisId, title, companyName } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    const hasAccess = await validateWorkspaceAccess(decoded.uid, workspaceId);
    if (!hasAccess) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const db = getAdminDb();

    // Fetch analysis data if analysisId provided, otherwise latest analysis
    let analysisData: Record<string, unknown> = {};
    let targetAnalysisId = analysisId;

    if (!targetAnalysisId) {
      const latestSnapshot = await db.collection('analyses')
        .where('workspaceId', '==', workspaceId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!latestSnapshot.empty) {
        targetAnalysisId = latestSnapshot.docs[0].id;
      }
    }

    if (targetAnalysisId) {
      const [analysisDoc, signalsSnap, gapsSnap, recsSnap] = await Promise.all([
        db.collection('analyses').doc(targetAnalysisId).get(),
        db.collection('signals').where('analysisId', '==', targetAnalysisId).get(),
        db.collection('competitiveGaps').where('analysisId', '==', targetAnalysisId).get(),
        db.collection('recommendations').where('analysisId', '==', targetAnalysisId).get(),
      ]);

      analysisData = {
        analysis: analysisDoc.data(),
        signals: signalsSnap.docs.map(d => d.data()),
        gaps: gapsSnap.docs.map(d => d.data()),
        recommendations: recsSnap.docs.map(d => d.data()),
      };
    }

    // Call Gemini to generate comprehensive sections
    const generated = await generateReportContent(companyName || 'Our Enterprise', analysisData);

    const reportId = uuid();
    const report = {
      id: reportId,
      workspaceId,
      analysisId: targetAnalysisId || 'standalone',
      title: title || generated.title || 'Competitive Intelligence Dossier',
      generatedAt: new Date().toISOString(),
      generatedBy: decoded.uid,
      companyName: companyName || 'Enterprise',
      status: 'ready' as const,
      content: generated,
    };

    await db.collection('reports').doc(reportId).set(report);

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Report creation error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to generate report',
    }, { status: 500 });
  }
}
