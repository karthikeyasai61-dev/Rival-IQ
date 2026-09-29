// ============================================================
// Dataset Upload & Analysis API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getAdminDb, validateWorkspaceAccess } from '@/lib/firebase/admin';
import { parseCSV, parseXLSX, parseJSON, parseTXT, analyzeColumns, suggestColumnMappings, normalizeRecords, generateDataQualityReport } from '@/lib/engine/parser';
import { detectSignals, detectCompetitiveGaps } from '@/lib/engine/signals';
import { retainCompetitorEvent, recallForStrategy } from '@/lib/hindsight/client';
import { analyzeCompetitiveData } from '@/lib/llm/gemini';
import { v4 as uuid } from 'uuid';
import type { Signal, CompetitiveGap, NormalizedRecord } from '@/types';

// GET - List datasets for workspace
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
  const snapshot = await db.collection('datasets').where('workspaceId', '==', workspaceId).get();
  const datasets = snapshot.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => new Date((b as Record<string, string>).uploadedAt || 0).getTime() - new Date((a as Record<string, string>).uploadedAt || 0).getTime());

  return NextResponse.json({
    datasets,
  });
}

// POST - Upload and parse dataset
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const decoded = await verifyToken(authHeader.split('Bearer ')[1]);
  if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const workspaceId = formData.get('workspaceId') as string;
    const companyName = formData.get('companyName') as string || 'Our Company';

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!workspaceId) return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });

    const hasAccess = await validateWorkspaceAccess(decoded.uid, workspaceId);
    if (!hasAccess) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    // Detect file type
    const fileName = file.name;
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const validTypes = ['csv', 'xlsx', 'xls', 'json', 'txt'];
    
    if (!validTypes.includes(ext)) {
      return NextResponse.json({ error: `Unsupported file type: ${ext}. Supported: CSV, XLSX, JSON, TXT` }, { status: 400 });
    }

    // Parse file
    let headers: string[] = [];
    let rows: Record<string, string>[] = [];

    const buffer = await file.arrayBuffer();
    const content = new TextDecoder().decode(buffer);

    switch (ext) {
      case 'csv':
        ({ headers, rows } = parseCSV(content));
        break;
      case 'xlsx':
      case 'xls':
        ({ headers, rows } = parseXLSX(buffer));
        break;
      case 'json':
        ({ headers, rows } = parseJSON(content));
        break;
      case 'txt':
        ({ headers, rows } = parseTXT(content));
        break;
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'File contains no data records' }, { status: 400 });
    }

    // Analyze columns
    const schemas = analyzeColumns(headers, rows);
    const mappings = suggestColumnMappings(schemas);

    // Normalize records
    const { records, issues } = normalizeRecords(rows, mappings);

    // Generate quality report
    const qualityReport = generateDataQualityReport(records, issues);

    // Store in Firestore
    const db = getAdminDb();
    const datasetId = uuid();
    const dataType = (formData.get('dataType') as string) || 'competition';

    // If this is our user company's dataset, tag each record so it can be compared head-to-head
    if (dataType === 'user_company') {
      const ourName = companyName || 'Our Company';
      for (const rec of records) {
        if (!rec.competitor) {
          rec.competitor = ourName;
        }
      }
      if (!qualityReport.detectedCompetitors.includes(ourName)) {
        qualityReport.detectedCompetitors.unshift(ourName);
      }
    }

    const dataset = {
      id: datasetId,
      workspaceId,
      fileName,
      fileType: ext,
      fileSize: file.size,
      dataType,
      storagePath: `datasets/${workspaceId}/${datasetId}/${fileName}`,
      uploadedBy: decoded.uid,
      uploadedAt: new Date().toISOString(),
      processingStatus: 'ready' as const,
      recordCount: records.length,
      validRecordCount: qualityReport.validRecords,
      invalidRecordCount: qualityReport.invalidRecords,
      duplicateRecordCount: qualityReport.duplicateRecords,
      schema: schemas,
      columnMapping: mappings,
      dateRange: qualityReport.dateRange,
      detectedCompetitors: qualityReport.detectedCompetitors,
      detectedEventTypes: qualityReport.detectedEventTypes,
      analysisStatus: 'pending' as const,
    };

function cleanFirestoreDoc<T>(obj: T): T {
  if (obj === null || obj === undefined) return null as unknown as T;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanFirestoreDoc) as unknown as T;
  const res: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v !== undefined) {
      res[k] = cleanFirestoreDoc(v);
    }
  }
  return res as T;
}

    await db.collection('datasets').doc(datasetId).set(cleanFirestoreDoc(dataset));

    // Store normalized records (batch write, max 500 per batch)
    const BATCH_SIZE = 400;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = records.slice(i, i + BATCH_SIZE);
      
      for (let j = 0; j < chunk.length; j++) {
        const recordRef = db.collection('datasetRecords').doc();
        batch.set(recordRef, cleanFirestoreDoc({
          id: recordRef.id,
          datasetId,
          workspaceId,
          rowIndex: i + j,
          normalizedData: chunk[j],
          isValid: !!(chunk[j].competitor && chunk[j].date),
          validationErrors: [],
          isDuplicate: false,
        }));
      }
      
      await batch.commit();
    }

    // Store competitors
    for (const comp of qualityReport.detectedCompetitors) {
      const compId = comp.toLowerCase().replace(/\s+/g, '-');
      const compRef = db.collection('competitors').doc(`${workspaceId}-${compId}`);
      
      const compRecords = records.filter(r => r.competitor?.toLowerCase() === comp.toLowerCase());
      const dates = compRecords.filter(r => r.date).map(r => r.date!).sort();
      
      await compRef.set(cleanFirestoreDoc({
        id: `${workspaceId}-${compId}`,
        workspaceId,
        name: comp,
        normalizedName: compId,
        aliases: [],
        recordCount: compRecords.length,
        eventCount: compRecords.filter(r => r.eventType).length,
        activityLevel: compRecords.length > 50 ? 'very_high' : compRecords.length > 20 ? 'high' : compRecords.length > 5 ? 'moderate' : 'low',
        latestEventDate: dates.length > 0 ? dates[dates.length - 1] : null,
        firstSeenAt: dates.length > 0 ? dates[0] : new Date().toISOString(),
        lastAnalyzedAt: null,
        historicalMemoryCount: 0,
        datasetIds: [datasetId],
      }), { merge: true });
    }

    // Audit log
    await db.collection('auditLogs').add(cleanFirestoreDoc({
      workspaceId,
      userId: decoded.uid,
      action: 'dataset_uploaded',
      entityType: 'dataset',
      entityId: datasetId,
      details: `Uploaded ${fileName} with ${records.length} records`,
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json({
      dataset,
      qualityReport,
      message: `Successfully parsed ${records.length} records from ${fileName}`,
    });
  } catch (error) {
    console.error('Dataset upload error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to process file',
    }, { status: 500 });
  }
}

// DELETE - Delete a dataset or all datasets in workspace
export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const decoded = await verifyToken(authHeader.split('Bearer ')[1]);
  if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const datasetId = req.nextUrl.searchParams.get('id');
  const workspaceId = req.nextUrl.searchParams.get('workspaceId');

  if (!workspaceId) {
    return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
  }

  const hasAccess = await validateWorkspaceAccess(decoded.uid, workspaceId);
  if (!hasAccess) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const db = getAdminDb();

  try {
    if (datasetId) {
      await db.collection('datasets').doc(datasetId).delete();
      const recordsSnap = await db.collection('datasetRecords').where('datasetId', '==', datasetId).get();
      const batch = db.batch();
      recordsSnap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      return NextResponse.json({ success: true, message: 'Dataset deleted' });
    } else {
      const snap = await db.collection('datasets').where('workspaceId', '==', workspaceId).get();
      const batch = db.batch();
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      const recordsSnap = await db.collection('datasetRecords').where('workspaceId', '==', workspaceId).get();
      const recBatch = db.batch();
      recordsSnap.docs.forEach(doc => recBatch.delete(doc.ref));
      await recBatch.commit();

      return NextResponse.json({ success: true, message: 'All datasets cleared' });
    }
  } catch (err) {
    console.error('Dataset delete error:', err);
    return NextResponse.json({ error: 'Failed to delete dataset' }, { status: 500 });
  }
}
