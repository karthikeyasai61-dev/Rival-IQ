// ============================================================
// Competitors API - List, detail, and timeline of competitors
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getAdminDb, validateWorkspaceAccess } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const decoded = await verifyToken(authHeader.split('Bearer ')[1]);
  if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get('workspaceId');
  if (!workspaceId) return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });

  const competitorId = req.nextUrl.searchParams.get('competitorId');

  const hasAccess = await validateWorkspaceAccess(decoded.uid, workspaceId);
  if (!hasAccess) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const db = getAdminDb();

  try {
    if (competitorId) {
      // Get single competitor and their associated events/signals
      const compDoc = await db.collection('competitors').doc(competitorId).get();
      if (!compDoc.exists) {
        return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
      }

      const compData = { id: compDoc.id, ...compDoc.data() };
      const compName = (compData as Record<string, unknown>).name as string;

      // Get signals for this competitor
      const signalsSnapshot = await db.collection('signals')
        .where('workspaceId', '==', workspaceId)
        .where('competitor', '==', compName)
        .limit(50)
        .get();

      const signals = signalsSnapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date((b as Record<string, string>).eventDate || 0).getTime() - new Date((a as Record<string, string>).eventDate || 0).getTime());

      // Get raw records for this competitor
      const recordsSnapshot = await db.collection('datasetRecords')
        .where('workspaceId', '==', workspaceId)
        .where('normalizedData.competitor', '==', compName)
        .limit(100)
        .get();

      return NextResponse.json({
        competitor: compData,
        signals: signalsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })),
        records: recordsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })),
      });
    }

    // List all competitors in workspace
    const snapshot = await db.collection('competitors')
      .where('workspaceId', '==', workspaceId)
      .get();

    const competitors = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ competitors });
  } catch (error) {
    console.error('Competitors fetch error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch competitors',
    }, { status: 500 });
  }
}
