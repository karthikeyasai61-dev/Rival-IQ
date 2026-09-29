// ============================================================
// Analysis API - Run full competitive intelligence analysis
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getAdminDb, validateWorkspaceAccess, cleanFirestoreDoc } from '@/lib/firebase/admin';
import { detectSignals, detectCompetitiveGaps } from '@/lib/engine/signals';
import { retainCompetitorEvent, recallForStrategy } from '@/lib/hindsight/client';
import { analyzeCompetitiveData } from '@/lib/llm/gemini';
import { v4 as uuid } from 'uuid';
import type { NormalizedRecord, Signal, LLMAnalysisContext, Recommendation, CompetitiveGap } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const decoded = await verifyToken(authHeader.split('Bearer ')[1]);
  if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  try {
    const body = await req.json();
    const { workspaceId, datasetIds, companyName, target } = body;

    if (!workspaceId || !datasetIds?.length) {
      return NextResponse.json({ error: 'Workspace ID and dataset IDs required' }, { status: 400 });
    }

    const hasAccess = await validateWorkspaceAccess(decoded.uid, workspaceId);
    if (!hasAccess) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const db = getAdminDb();
    const analysisId = uuid();
    const agentRuns: Array<{ agentType: string; status: string; startedAt: string; completedAt?: string; outputSummary?: string }> = [];

    // Create analysis record
    const analysis = {
      id: analysisId,
      workspaceId,
      datasetIds,
      status: 'analyzing',
      currentStep: 'Loading data',
      analysisPeriod: { start: '', end: '' },
      engineVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      competitorsAnalyzed: 0,
      signalsDetected: 0,
      gapsIdentified: 0,
      recommendationsGenerated: 0,
      memoriesRecalled: 0,
      memoriesRetained: 0,
      configuration: { period: 'custom', includeHistoricalMemory: true, target: target || 'all' },
    };

    await db.collection('analyses').doc(analysisId).set(cleanFirestoreDoc(analysis));

    // STEP 1: Load records from all datasets
    const startTime = Date.now();
    logAgentRun(agentRuns, 'data_agent', 'running');

    // Gather all target dataset IDs. If user only provided 1 dataset, include all datasets in workspace to enable comparative analysis
    let targetDatasetIds = [...datasetIds];
    try {
      const allWsDatasets = await db.collection('datasets')
        .where('workspaceId', '==', workspaceId)
        .get();
      if (allWsDatasets.docs.length > 1) {
        targetDatasetIds = allWsDatasets.docs.map(d => d.id);
      }
    } catch (e) {
      console.warn('Could not fetch all workspace datasets:', e);
    }

    const allRecords: NormalizedRecord[] = [];
    const datasetNames: string[] = [];

    // Inspect datasets to resolve our company name (never fallback to GROQ)
    let resolvedOurCompany = (companyName && companyName.toLowerCase() !== 'groq') ? companyName : '';
    const datasetMap = new Map<string, FirebaseFirestore.DocumentData | undefined>();

    for (const dsId of targetDatasetIds) {
      const dataset = await db.collection('datasets').doc(dsId).get();
      if (dataset.exists) {
        const dsData = dataset.data();
        datasetMap.set(dsId, dsData);
        datasetNames.push(dsData?.fileName || dsId);
        if (dsData?.dataType === 'user_company') {
          if (dsData.detectedCompetitors?.[0] && dsData.detectedCompetitors[0].toLowerCase() !== 'groq') {
            resolvedOurCompany = dsData.detectedCompetitors[0];
          } else if (dsData.fileName) {
            const cleanName = dsData.fileName.replace(/\.csv|\.xlsx|\.json/i, '').replace(/[-_]/g, ' ').trim();
            if (cleanName && cleanName.toLowerCase() !== 'groq') {
              resolvedOurCompany = cleanName;
            }
          }
        }
      }
    }

    for (const dsId of targetDatasetIds) {
      const dsData = datasetMap.get(dsId);
      const isUserCompany = dsData?.dataType === 'user_company';

      const records = await db.collection('datasetRecords')
        .where('datasetId', '==', dsId)
        .where('workspaceId', '==', workspaceId)
        .get();

      records.docs.forEach(doc => {
        const data = doc.data();
        if (data.normalizedData) {
          const rec = { ...data.normalizedData };
          if (isUserCompany) {
            rec.isOurCompany = true;
            const rawComp = rec.company || rec.competitor;
            if ((!resolvedOurCompany || resolvedOurCompany.toLowerCase() === 'groq') && rawComp && rawComp.toLowerCase() !== 'groq') {
              resolvedOurCompany = rawComp;
            }
            rec.competitor = resolvedOurCompany || rawComp || 'Your Company';
          }
          allRecords.push(rec);
        }
      });
    }

    if (!resolvedOurCompany || resolvedOurCompany.toLowerCase() === 'groq') {
      resolvedOurCompany = 'Your Company';
    }

    if (allRecords.length === 0) {
      await updateAnalysis(db, analysisId, { status: 'error', errorMessage: 'No records found in selected datasets' });
      return NextResponse.json({ error: 'No records found' }, { status: 400 });
    }

    // Calculate date range
    const dates = allRecords.filter(r => r.date).map(r => r.date!).sort();
    const dateRange = {
      start: dates[0] || new Date().toISOString(),
      end: dates[dates.length - 1] || new Date().toISOString(),
    };

    logAgentRun(agentRuns, 'data_agent', 'completed', `Loaded ${allRecords.length} records`);

    // STEP 2: Signal Detection
    await updateAnalysis(db, analysisId, { currentStep: 'Detecting signals' });
    logAgentRun(agentRuns, 'signal_agent', 'running');

    const detectedSignals: Signal[] = detectSignals({
      records: allRecords,
      datasetId: datasetIds[0],
      datasetName: datasetNames[0] || 'dataset',
      workspaceId,
      analysisId,
      ourCompanyName: resolvedOurCompany,
    });

    // Store signals
    for (const signal of detectedSignals) {
      await db.collection('signals').doc(signal.id).set(cleanFirestoreDoc(signal));
    }

    logAgentRun(agentRuns, 'signal_agent', 'completed', `Detected ${detectedSignals.length} signals`);

    // STEP 3: Competitive Gap Detection
    await updateAnalysis(db, analysisId, { currentStep: 'Identifying competitive gaps' });

    const competitors = [...new Set(
      allRecords
        .filter(r => !(r as Record<string, unknown>).isOurCompany)
        .map(r => r.competitor)
        .filter(Boolean)
    )] as string[];

    const gapResults = detectCompetitiveGaps({
      records: allRecords,
      ourCompanyName: resolvedOurCompany,
      workspaceId,
      analysisId,
      datasetId: datasetIds[0],
    });

    const gaps: CompetitiveGap[] = gapResults.map(g => ({
      id: uuid(),
      workspaceId,
      analysisId,
      dimension: g.dimension as CompetitiveGap['dimension'],
      ourCompany: { value: g.ourValue, evidence: [] },
      competitor: { name: g.competitorName, competitorId: g.competitorName.toLowerCase().replace(/\s+/g, '-'), value: g.competitorValue, evidence: g.evidence },
      gapDescription: g.gapDescription,
      gapMagnitude: typeof g.ourValue === 'number' && typeof g.competitorValue === 'number'
        ? Math.abs(g.ourValue - g.competitorValue) : 0,
      direction: g.direction,
      severity: g.severity,
      potentialImplication: '',
      sourceRecordIds: [],
      datasetIds,
      createdAt: new Date().toISOString(),
    }));

    for (const gap of gaps) {
      await db.collection('competitiveGaps').doc(gap.id).set(cleanFirestoreDoc(gap));
    }

    // STEP 4: Hindsight Memory Recall
    await updateAnalysis(db, analysisId, { currentStep: 'Searching memory' });
    logAgentRun(agentRuns, 'memory_agent', 'running');

    let hindsightMatches: Array<{ memoryId: string; content: string; similarity: number; historicalOutcome?: string }> = [];
    
    try {
      const signalDescriptions = detectedSignals.slice(0, 10).map(s => s.description);
      const recallResult = await recallForStrategy(signalDescriptions, competitors);
      
      hindsightMatches = (recallResult.results || []).map(r => ({
        memoryId: r.id,
        content: r.content,
        similarity: r.score || 0.5,
        historicalOutcome: r.metadata?.outcome as string || undefined,
      }));

      logAgentRun(agentRuns, 'memory_agent', 'completed', `Recalled ${hindsightMatches.length} memories`);
    } catch (error) {
      console.error('Hindsight recall error:', error);
      logAgentRun(agentRuns, 'memory_agent', 'completed', 'Memory recall unavailable - proceeding without historical context');
    }

    // STEP 5: LLM Analysis
    await updateAnalysis(db, analysisId, { currentStep: 'Reasoning' });
    logAgentRun(agentRuns, 'analysis_agent', 'running');

    const eventTypes = [...new Set(allRecords.map(r => r.eventType).filter(Boolean))] as string[];

    const llmContext: LLMAnalysisContext = {
      currentDataset: {
        recordCount: allRecords.length,
        dateRange,
        competitors,
        eventTypes,
      },
      calculatedMetrics: {
        totalSignals: detectedSignals.length,
        signalsByType: groupCount(detectedSignals, s => s.signalType),
        competitorActivity: groupCount(allRecords as Array<{ competitor?: string }>, r => r.competitor || 'unknown'),
      },
      currentSignals: detectedSignals.slice(0, 20),
      hindsightRecall: hindsightMatches.map(m => ({
        memoryId: m.memoryId,
        content: m.content,
        similarity: m.similarity,
        historicalOutcome: m.historicalOutcome,
      })),
      historicalOutcomes: [],
      competitiveGaps: gaps,
      userTarget: target,
      previousStrategies: [],
    };

    const llmResult = await analyzeCompetitiveData(llmContext);

    logAgentRun(agentRuns, 'analysis_agent', 'completed', `Generated ${llmResult.recommendations.length} recommendations`);

    // STEP 6: Store recommendations
    await updateAnalysis(db, analysisId, { currentStep: 'Generating recommendations' });
    logAgentRun(agentRuns, 'strategy_agent', 'running');

    const recommendations: Recommendation[] = llmResult.recommendations.map(r => ({
      id: uuid(),
      workspaceId,
      analysisId,
      title: r.title,
      description: r.description,
      reasoning: r.reasoning,
      evidenceIds: r.evidence,
      historicalMemoryIds: [],
      expectedEffect: r.expectedEffect,
      risks: r.risks,
      dependencies: [],
      successMetric: r.successMetric,
      confidence: r.confidence,
      confidenceRationale: '',
      timeHorizon: r.timeHorizon,
      priority: r.confidence === 'high' ? 'high' : r.confidence === 'medium' ? 'medium' : 'low',
      category: 'monitoring',
      monitoringPlan: llmResult.monitoringPlan || [],
      createdAt: new Date().toISOString(),
    }));

    for (const rec of recommendations) {
      await db.collection('recommendations').doc(rec.id).set(cleanFirestoreDoc(rec));
    }

    logAgentRun(agentRuns, 'strategy_agent', 'completed', `Stored ${recommendations.length} recommendations`);

    // STEP 7: Retain significant events in Hindsight
    await updateAnalysis(db, analysisId, { currentStep: 'Retaining memory' });
    let memoriesRetained = 0;

    try {
      const significantSignals = detectedSignals.filter(s => s.severity === 'high' || s.severity === 'critical');
      
      for (const signal of significantSignals.slice(0, 10)) {
        await retainCompetitorEvent({
          workspaceId,
          competitorId: signal.competitorId,
          competitorName: signal.competitor,
          eventType: signal.signalType,
          eventDate: signal.eventDate,
          description: signal.description,
          sourceDataset: datasetNames[0] || 'dataset',
          sourceRecordIds: signal.sourceRecordIds,
          observedMetrics: signal.calculatedChange ? {
            metric: signal.calculatedChange.metric,
            change: signal.calculatedChange.changePercent,
          } : undefined,
          analysisId,
        });

        // Store reference in Firestore
        await db.collection('hindsightReferences').add(cleanFirestoreDoc({
          workspaceId,
          competitorId: signal.competitorId,
          competitorName: signal.competitor,
          eventType: signal.signalType,
          eventDate: signal.eventDate,
          content: signal.description,
          analysisId,
          retainedAt: new Date().toISOString(),
          recallCount: 0,
        }));

        memoriesRetained++;
      }
    } catch (error) {
      console.error('Hindsight retain error:', error);
    }

    // STEP 8: Finalize & Synthesize Findings
    const completedAt = new Date().toISOString();
    const duration = Date.now() - startTime;

    // Merge LLM results with deterministic detected signals so findings are guaranteed dynamic & rich
    // FILTER OUT our own company from all competitor findings!
    const isOurCompanyEntity = (name?: string) => {
      if (!name) return false;
      const n = name.toLowerCase().trim();
      return n === resolvedOurCompany.toLowerCase().trim() || n === 'groq' || n === 'our company';
    };

    const improvements = (llmResult.competitorImprovements || []).filter(i => !isOurCompanyEntity(i.competitor));
    const drawbacks = (llmResult.competitorDrawbacks || []).filter(d => !isOurCompanyEntity(d.competitor));
    const successes = (llmResult.competitorSuccesses || []).filter(s => !isOurCompanyEntity(s.competitor));
    const hiring = (llmResult.hiringAnalysis || []).filter(h => !isOurCompanyEntity(h.competitor));

    detectedSignals.forEach(s => {
      // Exclude our own company: competitor cards must strictly contain rival data!
      if (isOurCompanyEntity(s.competitor)) return;

      if (s.signalType === 'competitor_improvement' && !improvements.some(i => i.improvement === s.title)) {
        improvements.push({
          competitor: s.competitor,
          improvement: s.title,
          impact: s.impactOnOurCompany || s.description,
        });
      }
      if (s.signalType === 'competitor_drawback_failure' && !drawbacks.some(d => d.drawback === s.title)) {
        drawbacks.push({
          competitor: s.competitor,
          drawback: s.title,
          vulnerabilityOpportunity: s.impactOnOurCompany || s.description,
        });
      }
      if (s.signalType === 'competitor_success' && !successes.some(sc => sc.success === s.title)) {
        successes.push({
          competitor: s.competitor,
          success: s.title,
          defensiveRecommendation: s.impactOnOurCompany || s.description,
        });
      }
      if (s.signalType === 'sudden_hiring_cause' && !hiring.some(h => h.inferredCause === s.hiringCause)) {
        hiring.push({
          competitor: s.competitor,
          departmentOrRole: s.title,
          inferredCause: s.hiringCause || s.description,
          strategicIntent: s.strategicIntent || 'Scaling execution bandwidth',
        });
      }
    });

    // Compute Comprehensive Head-to-Head Comparison Summary
    const ourCompanyRecords = allRecords.filter(r => (r as Record<string, unknown>).isOurCompany || r.competitor?.toLowerCase() === resolvedOurCompany.toLowerCase());
    const primaryCompName = competitors.find(c => !isOurCompanyEntity(c)) || competitors[0] || 'Competitor';
    const compCompanyRecords = allRecords.filter(r => !(r as Record<string, unknown>).isOurCompany && (r.competitor?.toLowerCase() === primaryCompName.toLowerCase() || competitors.length <= 1));

    const getLatestNumVal = (recs: NormalizedRecord[], field: string) => {
      const sorted = [...recs].filter(r => (r as Record<string, unknown>)[field] != null).sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
      if (sorted.length === 0) return null;
      return Number((sorted[sorted.length - 1] as Record<string, unknown>)[field]) || null;
    };

    const ourLatestRevenue = getLatestNumVal(ourCompanyRecords, 'value') ?? getLatestNumVal(ourCompanyRecords, 'revenue') ?? 0;
    const compLatestRevenue = getLatestNumVal(compCompanyRecords, 'value') ?? getLatestNumVal(compCompanyRecords, 'revenue') ?? 0;

    const ourLatestShare = getLatestNumVal(ourCompanyRecords, 'market_share_percent') ?? 0;
    const compLatestShare = getLatestNumVal(compCompanyRecords, 'market_share_percent') ?? 0;

    const ourLatestRetention = getLatestNumVal(ourCompanyRecords, 'customer_retention_percent') ?? 0;
    const compLatestRetention = getLatestNumVal(compCompanyRecords, 'customer_retention_percent') ?? 0;

    const ourLatestEmp = getLatestNumVal(ourCompanyRecords, 'employees') ?? getLatestNumVal(ourCompanyRecords, 'headcount') ?? 0;
    const compLatestEmp = getLatestNumVal(compCompanyRecords, 'employees') ?? getLatestNumVal(compCompanyRecords, 'headcount') ?? 0;

    const ourLatestRating = getLatestNumVal(ourCompanyRecords, 'avg_customer_rating') ?? 0;
    const compLatestRating = getLatestNumVal(compCompanyRecords, 'avg_customer_rating') ?? 0;

    const ourLatestNewCust = getLatestNumVal(ourCompanyRecords, 'new_customers') ?? 0;
    const compLatestNewCust = getLatestNumVal(compCompanyRecords, 'new_customers') ?? 0;

    // Timeline alignment for monthly performance chart
    const dateSet = new Set<string>();
    ourCompanyRecords.forEach(r => { if (r.date) dateSet.add(r.date.slice(0, 7)); });
    compCompanyRecords.forEach(r => { if (r.date) dateSet.add(r.date.slice(0, 7)); });
    const timelineDates = Array.from(dateSet).sort();

    const timelineData = timelineDates.map(month => {
      const ourRec = ourCompanyRecords.find(r => r.date?.startsWith(month));
      const compRec = compCompanyRecords.find(r => r.date?.startsWith(month));
      return {
        month,
        ourRevenue: Number(ourRec?.value ?? ourRec?.price ?? 0),
        compRevenue: Number(compRec?.value ?? compRec?.price ?? 0),
        ourShare: Number((ourRec as Record<string, unknown>)?.market_share_percent ?? 0),
        compShare: Number((compRec as Record<string, unknown>)?.market_share_percent ?? 0),
        ourRetention: Number((ourRec as Record<string, unknown>)?.customer_retention_percent ?? 0),
        compRetention: Number((compRec as Record<string, unknown>)?.customer_retention_percent ?? 0),
        ourEmployees: Number((ourRec as Record<string, unknown>)?.employees ?? 0),
        compEmployees: Number((compRec as Record<string, unknown>)?.employees ?? 0),
      };
    });

    const ourFinalCompName = (resolvedOurCompany && resolvedOurCompany.toLowerCase() !== 'groq') ? resolvedOurCompany : 'Your Company';
    const compFinalCompName = (primaryCompName && primaryCompName.toLowerCase() !== 'groq' && primaryCompName.toLowerCase() !== ourFinalCompName.toLowerCase()) ? primaryCompName : (competitors.find(c => !isOurCompanyEntity(c)) || 'Competitor');

    const comparisonSummary = {
      ourCompany: {
        name: ourFinalCompName,
        revenue: ourLatestRevenue,
        marketShare: ourLatestShare,
        retention: ourLatestRetention,
        employees: ourLatestEmp,
        rating: ourLatestRating,
        newCustomers: ourLatestNewCust,
      },
      competitorCompany: {
        name: compFinalCompName,
        revenue: compLatestRevenue,
        marketShare: compLatestShare,
        retention: compLatestRetention,
        employees: compLatestEmp,
        rating: compLatestRating,
        newCustomers: compLatestNewCust,
      },
      timeline: timelineData,
      deltaMetrics: [
        {
          metric: 'Monthly Revenue ($M)',
          ourValue: ourLatestRevenue ? `$${Math.round(ourLatestRevenue).toLocaleString()}M` : 'N/A',
          compValue: compLatestRevenue ? `$${Math.round(compLatestRevenue).toLocaleString()}M` : 'N/A',
          delta: ourLatestRevenue && compLatestRevenue ? `${((ourLatestRevenue - compLatestRevenue) / compLatestRevenue * 100).toFixed(1)}%` : 'N/A',
          status: ourLatestRevenue >= compLatestRevenue ? 'Advantage' : 'Behind',
        },
        {
          metric: 'Market Share (%)',
          ourValue: ourLatestShare ? `${ourLatestShare.toFixed(1)}%` : 'N/A',
          compValue: compLatestShare ? `${compLatestShare.toFixed(1)}%` : 'N/A',
          delta: ourLatestShare && compLatestShare ? `${(ourLatestShare - compLatestShare > 0 ? '+' : '')}${(ourLatestShare - compLatestShare).toFixed(1)}%` : 'N/A',
          status: ourLatestShare >= compLatestShare ? 'Advantage' : 'Behind',
        },
        {
          metric: 'Customer Retention (%)',
          ourValue: ourLatestRetention ? `${ourLatestRetention.toFixed(1)}%` : 'N/A',
          compValue: compLatestRetention ? `${compLatestRetention.toFixed(1)}%` : 'N/A',
          delta: ourLatestRetention && compLatestRetention ? `${(ourLatestRetention - compLatestRetention > 0 ? '+' : '')}${(ourLatestRetention - compLatestRetention).toFixed(1)}%` : 'N/A',
          status: ourLatestRetention >= compLatestRetention ? 'Advantage' : 'Behind',
        },
        {
          metric: 'Workforce Headcount',
          ourValue: ourLatestEmp ? ourLatestEmp.toLocaleString() : 'N/A',
          compValue: compLatestEmp ? compLatestEmp.toLocaleString() : 'N/A',
          delta: ourLatestEmp && compLatestEmp ? `${((ourLatestEmp - compLatestEmp) / compLatestEmp * 100).toFixed(1)}%` : 'N/A',
          status: ourLatestEmp >= compLatestEmp ? 'Advantage' : 'Behind',
        },
        {
          metric: 'Customer Satisfaction (/5.0)',
          ourValue: ourLatestRating ? ourLatestRating.toFixed(1) : 'N/A',
          compValue: compLatestRating ? compLatestRating.toFixed(1) : 'N/A',
          delta: ourLatestRating && compLatestRating ? `${(ourLatestRating - compLatestRating > 0 ? '+' : '')}${(ourLatestRating - compLatestRating).toFixed(1)}` : 'N/A',
          status: ourLatestRating >= compLatestRating ? 'Advantage' : 'Behind',
        },
      ],
    };

    await updateAnalysis(db, analysisId, {
      status: 'complete',
      currentStep: 'Complete',
      completedAt,
      analysisPeriod: dateRange,
      competitorsAnalyzed: competitors.length,
      signalsDetected: detectedSignals.length,
      gapsIdentified: gaps.length,
      recommendationsGenerated: recommendations.length,
      memoriesRecalled: hindsightMatches.length,
      memoriesRetained,
      competitorImprovements: improvements,
      competitorDrawbacks: drawbacks,
      competitorSuccesses: successes,
      hiringAnalysis: hiring,
      comparisonSummary,
    });

    // Store agent runs
    for (const run of agentRuns) {
      await db.collection('agentRuns').add(cleanFirestoreDoc({
        ...run,
        id: uuid(),
        workspaceId,
        analysisId,
      }));
    }

    // Audit log
    await db.collection('auditLogs').add(cleanFirestoreDoc({
      workspaceId,
      userId: decoded.uid,
      action: 'analysis_completed',
      entityType: 'analysis',
      entityId: analysisId,
      details: `Analysis completed in ${(duration / 1000).toFixed(1)}s. ${detectedSignals.length} signals, ${gaps.length} gaps, ${recommendations.length} recommendations.`,
      timestamp: completedAt,
    }));

    return NextResponse.json({
      analysis: {
        id: analysisId,
        status: 'complete',
        competitorsAnalyzed: competitors.length,
        signalsDetected: detectedSignals.length,
        gapsIdentified: gaps.length,
        recommendationsGenerated: recommendations.length,
        memoriesRecalled: hindsightMatches.length,
        memoriesRetained,
        duration,
        competitorImprovements: improvements,
        competitorDrawbacks: drawbacks,
        competitorSuccesses: successes,
        hiringAnalysis: hiring,
        comparisonSummary,
      },
      llmAnalysis: {
        summary: llmResult.summary,
        observations: llmResult.observations,
        competitorImprovements: improvements,
        competitorDrawbacks: drawbacks,
        competitorSuccesses: successes,
        hiringAnalysis: hiring,
        historicalMatches: llmResult.historicalMatches,
        implications: llmResult.implications,
        risks: llmResult.risks,
      },
      comparisonSummary,
      signals: detectedSignals,
      gaps,
      recommendations,
      hindsightMatches,
      agentRuns,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Analysis failed',
    }, { status: 500 });
  }
}

// GET - Retrieve analysis results
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const decoded = await verifyToken(authHeader.split('Bearer ')[1]);
  if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get('workspaceId');
  const analysisId = req.nextUrl.searchParams.get('analysisId');

  if (!workspaceId) return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });

  const hasAccess = await validateWorkspaceAccess(decoded.uid, workspaceId);
  if (!hasAccess) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const db = getAdminDb();

  if (analysisId) {
    const analysis = await db.collection('analyses').doc(analysisId).get();
    if (!analysis.exists || analysis.data()?.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Fetch related data
    const [signals, gaps, recommendations, agentRuns, memories] = await Promise.all([
      db.collection('signals').where('analysisId', '==', analysisId).get(),
      db.collection('competitiveGaps').where('analysisId', '==', analysisId).get(),
      db.collection('recommendations').where('analysisId', '==', analysisId).get(),
      db.collection('agentRuns').where('analysisId', '==', analysisId).get(),
      db.collection('hindsightReferences').where('analysisId', '==', analysisId).get(),
    ]);

    return NextResponse.json({
      analysis: { id: analysis.id, ...analysis.data() },
      signals: signals.docs.map(d => ({ id: d.id, ...d.data() })),
      gaps: gaps.docs.map(d => ({ id: d.id, ...d.data() })),
      recommendations: recommendations.docs.map(d => ({ id: d.id, ...d.data() })),
      agentRuns: agentRuns.docs.map(d => ({ id: d.id, ...d.data() })),
      memories: memories.docs.map(d => ({ id: d.id, ...d.data() })),
    });
  }

  // List all analyses
  const analyses = await db.collection('analyses')
    .where('workspaceId', '==', workspaceId)
    .limit(50)
    .get();

  const items = analyses.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => new Date((b as Record<string, string>).createdAt || 0).getTime() - new Date((a as Record<string, string>).createdAt || 0).getTime())
    .slice(0, 20);

  // Fetch recent signals and competitive gaps
  const [signalsSnap, gapsSnap] = await Promise.all([
    db.collection('signals')
      .where('workspaceId', '==', workspaceId)
      .limit(30)
      .get()
      .catch(() => ({ docs: [] })),
    db.collection('competitiveGaps')
      .where('workspaceId', '==', workspaceId)
      .limit(20)
      .get()
      .catch(() => ({ docs: [] })),
  ]);

  const recentSignals = signalsSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => new Date((b as unknown as Record<string, string>).detectedAt || (b as unknown as Record<string, string>).createdAt || 0).getTime() - new Date((a as unknown as Record<string, string>).detectedAt || (a as unknown as Record<string, string>).createdAt || 0).getTime())
    .slice(0, 10);

  const recentGaps = gapsSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => Number((b as unknown as Record<string, number>).gapMagnitude || 0) - Number((a as unknown as Record<string, number>).gapMagnitude || 0))
    .slice(0, 6);

  return NextResponse.json({
    analyses: items,
    recentSignals,
    recentGaps,
  });
}

// Helpers
async function updateAnalysis(db: FirebaseFirestore.Firestore, id: string, data: Record<string, unknown>) {
  await db.collection('analyses').doc(id).update(cleanFirestoreDoc(data));
}

function logAgentRun(
  runs: Array<{ agentType: string; status: string; startedAt: string; completedAt?: string; outputSummary?: string }>,
  agentType: string,
  status: string,
  outputSummary?: string
) {
  const existing = runs.find(r => r.agentType === agentType);
  if (existing && status === 'completed') {
    existing.status = 'completed';
    existing.completedAt = new Date().toISOString();
    existing.outputSummary = outputSummary;
  } else {
    runs.push({
      agentType,
      status,
      startedAt: new Date().toISOString(),
      completedAt: status === 'completed' ? new Date().toISOString() : undefined,
      outputSummary,
    });
  }
}

function groupCount<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}
