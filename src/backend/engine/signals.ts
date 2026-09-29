// ============================================================
// Signal Detection Engine
// Deterministic signal detection from structured data
// ============================================================

import type { NormalizedRecord, Signal, SignalType, SignalEvidence, EventType } from '@/types';
import { v4 as uuid } from 'uuid';

interface SignalDetectionInput {
  records: NormalizedRecord[];
  datasetId: string;
  datasetName: string;
  workspaceId: string;
  analysisId: string;
  ourCompanyName?: string;
}

interface RecordWithId extends NormalizedRecord {
  _id: string;
  _rowIndex: number;
}

/**
 * Run all deterministic signal detectors
 */
export function detectSignals(input: SignalDetectionInput): Signal[] {
  const records: RecordWithId[] = input.records.map((r, i) => ({
    ...r,
    _id: `${input.datasetId}-row-${i}`,
    _rowIndex: i,
  }));

  if (records.length === 0) return [];

  const signals: Signal[] = [];

  // Group records by competitor
  const byCompetitor = groupBy(records, r => r.competitor?.toLowerCase() || 'unknown');

  for (const [competitorKey, competitorRecords] of Object.entries(byCompetitor)) {
    const competitorName = competitorRecords[0].competitor || competitorKey;

    // Check if this entity represents our own company
    const isOurCompany = competitorRecords.some(r => (r as Record<string, unknown>).isOurCompany) ||
      (input.ourCompanyName && competitorName.toLowerCase() === input.ourCompanyName.toLowerCase()) ||
      competitorName.toLowerCase() === 'groq' ||
      (input.ourCompanyName && input.ourCompanyName.toLowerCase() !== 'groq' && competitorName.toLowerCase() === input.ourCompanyName.toLowerCase());

    // Sort by date
    const sorted = competitorRecords
      .filter(r => r.date)
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

    // Run core signal detectors
    signals.push(...detectPricingChanges(sorted, competitorName, input));
    signals.push(...detectFeatureLaunches(sorted, competitorName, input));
    signals.push(...detectActivitySpikes(sorted, competitorName, input));
    signals.push(...detectHiringChanges(sorted, competitorName, input));
    signals.push(...detectRepeatedEvents(sorted, competitorName, input));
    signals.push(...detectExpansionSignals(sorted, competitorName, input));
    signals.push(...detectMessagingChanges(sorted, competitorName, input));

    // ONLY detect competitor-specific signals for rival entities (NEVER for our own company)
    if (!isOurCompany) {
      signals.push(...detectSuddenHiringCause(sorted, competitorName, input));
      signals.push(...detectCompetitorImprovements(sorted, competitorName, input));
      signals.push(...detectCompetitorDrawbacksAndFailures(sorted, competitorName, input));
      signals.push(...detectCompetitorSuccesses(sorted, competitorName, input));
    }
  }

  return signals;
}

// ============================================================
// Detectors
// ============================================================

function detectPricingChanges(
  records: RecordWithId[],
  competitor: string,
  input: SignalDetectionInput
): Signal[] {
  const signals: Signal[] = [];
  const pricingRecords = records.filter(r => r.price != null && r.price > 0);

  if (pricingRecords.length < 2) return signals;

  for (let i = 1; i < pricingRecords.length; i++) {
    const prev = pricingRecords[i - 1];
    const curr = pricingRecords[i];
    const prevPrice = prev.price!;
    const currPrice = curr.price!;
    const changePercent = ((currPrice - prevPrice) / prevPrice) * 100;

    if (Math.abs(changePercent) >= 3) {
      const direction = changePercent > 0 ? 'increase' : 'decrease';
      const severity = Math.abs(changePercent) >= 15 ? 'critical' :
                       Math.abs(changePercent) >= 8 ? 'high' :
                       Math.abs(changePercent) >= 5 ? 'medium' : 'low';

      signals.push({
        id: uuid(),
        workspaceId: input.workspaceId,
        analysisId: input.analysisId,
        signalType: 'pricing_change',
        competitor,
        competitorId: competitor.toLowerCase().replace(/\s+/g, '-'),
        eventDate: curr.date || new Date().toISOString(),
        severity,
        title: `Pricing ${direction} detected for ${competitor}`,
        description: `${competitor} pricing changed from ${prevPrice} to ${currPrice} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%)`,
        evidence: [
          createEvidence(prev, input, 'price', String(prevPrice)),
          createEvidence(curr, input, 'price', String(currPrice)),
        ],
        calculatedChange: {
          metric: 'price',
          previousValue: prevPrice,
          currentValue: currPrice,
          changePercent: parseFloat(changePercent.toFixed(2)),
          direction: changePercent > 0 ? 'increase' : 'decrease',
        },
        sourceRecordIds: [prev._id, curr._id],
        createdAt: new Date().toISOString(),
      });
    }
  }

  return signals;
}

function detectFeatureLaunches(
  records: RecordWithId[],
  competitor: string,
  input: SignalDetectionInput
): Signal[] {
  const signals: Signal[] = [];
  
  const featureRecords = records.filter(r => {
    const et = r.eventType?.toLowerCase() || '';
    const cat = r.category?.toLowerCase() || '';
    return et.includes('feature') || et.includes('launch') || et.includes('release') ||
           cat.includes('feature') || cat.includes('product');
  });

  for (const record of featureRecords) {
    const isLaunch = (record.eventType?.toLowerCase() || '').includes('launch') ||
                     (record.eventType?.toLowerCase() || '').includes('release') ||
                     (record.eventType?.toLowerCase() || '').includes('new');
    const isRemoval = (record.eventType?.toLowerCase() || '').includes('remov') ||
                      (record.eventType?.toLowerCase() || '').includes('deprecat') ||
                      (record.eventType?.toLowerCase() || '').includes('sunset');

    const signalType: SignalType = isRemoval ? 'feature_removal' :
                                   isLaunch ? 'feature_launch' : 'product_change';

    signals.push({
      id: uuid(),
      workspaceId: input.workspaceId,
      analysisId: input.analysisId,
      signalType,
      competitor,
      competitorId: competitor.toLowerCase().replace(/\s+/g, '-'),
      eventDate: record.date || new Date().toISOString(),
      severity: 'medium',
      title: `${signalType.replace(/_/g, ' ')} by ${competitor}`,
      description: record.description || `${competitor} ${signalType.replace(/_/g, ' ')}: ${record.feature || record.product || 'Details in source data'}`,
      evidence: [createEvidence(record, input, 'eventType', record.eventType || '')],
      sourceRecordIds: [record._id],
      createdAt: new Date().toISOString(),
    });
  }

  return signals;
}

function detectActivitySpikes(
  records: RecordWithId[],
  competitor: string,
  input: SignalDetectionInput
): Signal[] {
  const signals: Signal[] = [];
  
  if (records.length < 5) return signals;

  // Group by month
  const byMonth = groupBy(records, r => {
    if (!r.date) return 'unknown';
    const d = new Date(r.date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  delete byMonth['unknown'];

  const months = Object.keys(byMonth).sort();
  if (months.length < 2) return signals;

  const counts = months.map(m => byMonth[m].length);
  const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
  const stdDev = Math.sqrt(counts.reduce((sum, c) => sum + Math.pow(c - avgCount, 2), 0) / counts.length);

  for (let i = 0; i < months.length; i++) {
    const count = counts[i];
    const zScore = stdDev > 0 ? (count - avgCount) / stdDev : 0;

    if (Math.abs(zScore) >= 1.5) {
      const isSpike = zScore > 0;
      const severity = Math.abs(zScore) >= 3 ? 'critical' :
                       Math.abs(zScore) >= 2 ? 'high' : 'medium';

      signals.push({
        id: uuid(),
        workspaceId: input.workspaceId,
        analysisId: input.analysisId,
        signalType: isSpike ? 'activity_spike' : 'activity_decline',
        competitor,
        competitorId: competitor.toLowerCase().replace(/\s+/g, '-'),
        eventDate: `${months[i]}-01`,
        severity,
        title: `Activity ${isSpike ? 'spike' : 'decline'} for ${competitor} in ${months[i]}`,
        description: `${competitor} had ${count} events in ${months[i]} (average: ${avgCount.toFixed(1)}, z-score: ${zScore.toFixed(2)})`,
        evidence: byMonth[months[i]].slice(0, 5).map(r => createEvidence(r, input, 'date', r.date || '')),
        calculatedChange: {
          metric: 'monthly_activity_count',
          previousValue: parseFloat(avgCount.toFixed(1)),
          currentValue: count,
          changePercent: parseFloat((((count - avgCount) / avgCount) * 100).toFixed(1)),
          direction: isSpike ? 'increase' : 'decrease',
        },
        sourceRecordIds: byMonth[months[i]].map(r => r._id),
        createdAt: new Date().toISOString(),
      });
    }
  }

  return signals;
}

function detectHiringChanges(
  records: RecordWithId[],
  competitor: string,
  input: SignalDetectionInput
): Signal[] {
  const signals: Signal[] = [];

  const hiringRecords = records.filter(r => {
    const et = r.eventType?.toLowerCase() || '';
    const cat = r.category?.toLowerCase() || '';
    return et.includes('hir') || et.includes('recruit') || et.includes('job') ||
           cat.includes('hir') || cat.includes('talent') || cat.includes('team');
  });

  if (hiringRecords.length >= 3) {
    // Group by quarter
    const byQuarter = groupBy(hiringRecords, r => {
      if (!r.date) return 'unknown';
      const d = new Date(r.date);
      return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
    });

    delete byQuarter['unknown'];
    const quarters = Object.keys(byQuarter).sort();

    if (quarters.length >= 2) {
      const lastQ = byQuarter[quarters[quarters.length - 1]];
      const prevQ = byQuarter[quarters[quarters.length - 2]];

      const change = ((lastQ.length - prevQ.length) / prevQ.length) * 100;

      if (Math.abs(change) >= 30) {
        const isSpike = change > 0;
        signals.push({
          id: uuid(),
          workspaceId: input.workspaceId,
          analysisId: input.analysisId,
          signalType: isSpike ? 'hiring_spike' : 'hiring_decline',
          competitor,
          competitorId: competitor.toLowerCase().replace(/\s+/g, '-'),
          eventDate: new Date().toISOString(),
          severity: Math.abs(change) >= 80 ? 'high' : 'medium',
          title: `Hiring ${isSpike ? 'spike' : 'decline'} at ${competitor}`,
          description: `${competitor} hiring activity changed by ${change > 0 ? '+' : ''}${change.toFixed(0)}% between ${quarters[quarters.length - 2]} and ${quarters[quarters.length - 1]}`,
          evidence: lastQ.slice(0, 5).map(r => createEvidence(r, input, 'eventType', r.eventType || '')),
          calculatedChange: {
            metric: 'quarterly_hiring_count',
            previousValue: prevQ.length,
            currentValue: lastQ.length,
            changePercent: parseFloat(change.toFixed(1)),
            direction: isSpike ? 'increase' : 'decrease',
          },
          sourceRecordIds: lastQ.map(r => r._id),
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return signals;
}

// ============================================================
// Specialized Intelligence Detectors:
// Improvements, Drawbacks & Failures, Successes, Hiring Causes
// ============================================================

function detectSuddenHiringCause(
  records: RecordWithId[],
  competitor: string,
  input: SignalDetectionInput
): Signal[] {
  const signals: Signal[] = [];

  // 1. Textual hiring records
  const hiringRecords = records.filter(r => {
    const text = `${r.eventType || ''} ${r.category || ''} ${r.description || ''} ${r.feature || ''} ${r.product || ''}`.toLowerCase();
    return text.includes('hir') || text.includes('recruit') || text.includes('job') ||
           text.includes('headcount') || text.includes('talent') || text.includes('engineer') ||
           text.includes('developer') || text.includes('sales') || text.includes('executive');
  });

  // 2. Numerical headcount / employee growth records
  const employeeRecords = records.filter(r => {
    const val = r.employees != null ? r.employees : (r as Record<string, unknown>).headcount;
    return val != null && !isNaN(Number(val));
  });

  if (employeeRecords.length >= 2) {
    const sorted = [...employeeRecords].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
    const firstEmp = Number(sorted[0].employees ?? (sorted[0] as Record<string, unknown>).headcount);
    const lastEmp = Number(sorted[sorted.length - 1].employees ?? (sorted[sorted.length - 1] as Record<string, unknown>).headcount);
    const diff = lastEmp - firstEmp;
    const pctChange = firstEmp > 0 ? (diff / firstEmp) * 100 : 0;

    if (diff > 0) {
      signals.push({
        id: uuid(),
        workspaceId: input.workspaceId,
        analysisId: input.analysisId,
        signalType: 'sudden_hiring_cause',
        competitor,
        competitorId: competitor.toLowerCase().replace(/\s+/g, '-'),
        eventDate: sorted[sorted.length - 1].date || new Date().toISOString(),
        severity: pctChange >= 4 ? 'high' : 'medium',
        title: `Workforce Surge (+${diff.toLocaleString()} headcount / +${pctChange.toFixed(1)}%)`,
        description: `${competitor} expanded workforce from ${firstEmp.toLocaleString()} to ${lastEmp.toLocaleString()} (+${diff.toLocaleString()} hires).`,
        hiringCause: 'Operational & Commercial Scaling Blitz',
        strategicIntent: 'Expanding organizational delivery capacity and retail distribution.',
        impactOnOurCompany: 'Accelerate outbound acquisition before new hires ramp up.',
        intelligenceCategory: 'hiring_cause',
        evidence: [createEvidence(sorted[sorted.length - 1], input, 'employees', `${firstEmp} -> ${lastEmp} (+${diff})`)],
        sourceRecordIds: sorted.map(r => r._id),
        createdAt: new Date().toISOString(),
      });
    }
  }

  if (hiringRecords.length > 0) {
    const roles = hiringRecords.map(r => `${r.description || ''} ${r.feature || ''} ${r.eventType || ''}`.toLowerCase());
    const aiRoles = roles.filter(t => t.includes('ai') || t.includes('ml') || t.includes('machine learning') || t.includes('data science') || t.includes('llm') || t.includes('nlp'));
    const salesRoles = roles.filter(t => t.includes('sales') || t.includes('ae') || t.includes('bdr') || t.includes('account executive') || t.includes('gtm') || t.includes('commercial'));
    const supportRoles = roles.filter(t => t.includes('support') || t.includes('customer success') || t.includes('csm') || t.includes('helpdesk'));
    const securityRoles = roles.filter(t => t.includes('security') || t.includes('compliance') || t.includes('infosec') || t.includes('soc2') || t.includes('legal'));

    let primaryCause = 'Operational headcount scaling';
    let strategicIntent = 'Expanding execution velocity across core product lines';
    let impactOnOurCompany = 'Increased rival velocity; monitor new releases and market positioning';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

    if (aiRoles.length >= 1) {
      primaryCause = `Stealth AI/ML Initiative: Concentrated recruitment of AI/ML talent (${aiRoles.length} roles).`;
      strategicIntent = 'Developing autonomous capabilities and proprietary algorithmic workflows.';
      impactOnOurCompany = 'Accelerate our proprietary product roadmap to protect technology moat.';
      severity = 'high';
    } else if (salesRoles.length >= 1) {
      primaryCause = `Outbound Enterprise Blitz: Hiring field sales and account executives (${salesRoles.length} roles).`;
      strategicIntent = 'Aggressive hunting of enterprise and mid-market accounts.';
      impactOnOurCompany = 'Expect competitive discounting; lock in client renewals immediately.';
      severity = 'high';
    } else if (supportRoles.length >= 1) {
      primaryCause = 'Customer Onboarding & Churn Mitigation: Support hiring surge.';
      strategicIntent = 'Remediating service friction and retaining existing customers.';
      impactOnOurCompany = 'Target rival accounts with turnkey migration and SLA guarantees.';
      severity = 'medium';
    } else if (securityRoles.length >= 1) {
      primaryCause = 'Enterprise Compliance Sprint: Infosec and compliance hiring.';
      strategicIntent = 'Unlocking regulated enterprise sectors.';
      impactOnOurCompany = 'Highlight our existing enterprise certifications in competitive pitches.';
      severity = 'medium';
    }

    const latestHiringRecord = hiringRecords[hiringRecords.length - 1];
    signals.push({
      id: uuid(),
      workspaceId: input.workspaceId,
      analysisId: input.analysisId,
      signalType: 'sudden_hiring_cause',
      competitor,
      competitorId: competitor.toLowerCase().replace(/\s+/g, '-'),
      eventDate: latestHiringRecord.date || new Date().toISOString(),
      severity,
      title: `Hiring Cause Analysis: ${primaryCause.split(':')[0]} at ${competitor}`,
      description: `${competitor} hiring pattern analysis: ${primaryCause} Strategic Intent: ${strategicIntent}`,
      hiringCause: primaryCause,
      strategicIntent,
      impactOnOurCompany,
      intelligenceCategory: 'hiring_cause',
      evidence: hiringRecords.slice(0, 4).map(r => createEvidence(r, input, 'hiring_detail', r.description || r.eventType || 'Job post')),
      sourceRecordIds: hiringRecords.map(r => r._id),
      createdAt: new Date().toISOString(),
    });
  }

  return signals;
}

function detectCompetitorImprovements(
  records: RecordWithId[],
  competitor: string,
  input: SignalDetectionInput
): Signal[] {
  const signals: Signal[] = [];

  // 1. Textual improvement records
  const improvementRecords = records.filter(r => {
    const text = `${r.eventType || ''} ${r.category || ''} ${r.description || ''} ${r.feature || ''}`.toLowerCase();
    return text.includes('improv') || text.includes('upgrad') || text.includes('faster') ||
           text.includes('optimiz') || text.includes('enhanc') || text.includes('v2') ||
           text.includes('v3') || text.includes('redesign') || text.includes('discount') ||
           text.includes('price drop') || text.includes('efficiency') || text.includes('sla');
  });

  for (const record of improvementRecords) {
    signals.push({
      id: uuid(),
      workspaceId: input.workspaceId,
      analysisId: input.analysisId,
      signalType: 'competitor_improvement',
      competitor,
      competitorId: competitor.toLowerCase().replace(/\s+/g, '-'),
      eventDate: record.date || new Date().toISOString(),
      severity: 'medium',
      title: `Product Enhancement: ${record.feature || record.eventType || 'Platform Upgrade'}`,
      description: record.description || `${competitor} deployed significant product optimizations.`,
      intelligenceCategory: 'improvement',
      strategicIntent: 'Strengthening product stickiness and addressing customer churn friction.',
      impactOnOurCompany: 'Counter with our distinct capabilities and communicate our superior value proposition.',
      evidence: [createEvidence(record, input, 'improvement_evidence', record.description || record.eventType || 'Improvement')],
      sourceRecordIds: [record._id],
      createdAt: new Date().toISOString(),
    });
  }

  // 2. Numerical metric trajectory improvements (revenue, retention, rating, conversions)
  const sorted = [...records].filter(r => r.date).sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
  if (sorted.length >= 2) {
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    // Revenue growth
    const firstVal = Number(first.value ?? first.price ?? 0);
    const lastVal = Number(last.value ?? last.price ?? 0);
    if (firstVal > 0 && lastVal > firstVal) {
      const growthPct = ((lastVal - firstVal) / firstVal) * 100;
      if (growthPct >= 10) {
        signals.push({
          id: uuid(),
          workspaceId: input.workspaceId,
          analysisId: input.analysisId,
          signalType: 'competitor_improvement',
          competitor,
          competitorId: competitor.toLowerCase().replace(/\s+/g, '-'),
          eventDate: last.date || new Date().toISOString(),
          severity: 'high',
          title: `Commercial Revenue Expansion (+${growthPct.toFixed(1)}%)`,
          description: `${competitor} expanded monthly revenue from $${firstVal.toLocaleString()}M to $${lastVal.toLocaleString()}M (+${growthPct.toFixed(1)}% growth).`,
          intelligenceCategory: 'improvement',
          strategicIntent: 'Scaling market penetration and capturing incremental industry spend.',
          impactOnOurCompany: 'Reinforce client relationships with proactive loyalty reviews and long-term contracts.',
          evidence: [createEvidence(last, input, 'value', `$${firstVal}M -> $${lastVal}M (+${growthPct.toFixed(1)}%)`)],
          sourceRecordIds: [first._id, last._id],
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Customer retention rate improvement
    const firstRet = Number((first as Record<string, unknown>).customer_retention_percent ?? 0);
    const lastRet = Number((last as Record<string, unknown>).customer_retention_percent ?? 0);
    if (firstRet > 0 && lastRet > firstRet) {
      const retDelta = lastRet - firstRet;
      signals.push({
        id: uuid(),
        workspaceId: input.workspaceId,
        analysisId: input.analysisId,
        signalType: 'competitor_improvement',
        competitor,
        competitorId: competitor.toLowerCase().replace(/\s+/g, '-'),
        eventDate: last.date || new Date().toISOString(),
        severity: 'medium',
        title: `Customer Retention Rate Gain (+${retDelta.toFixed(1)}%)`,
        description: `${competitor} improved customer retention from ${firstRet.toFixed(1)}% to ${lastRet.toFixed(1)}% (+${retDelta.toFixed(1)} percentage points).`,
        intelligenceCategory: 'improvement',
        strategicIntent: 'Plugging onboarding leaks and elevating account lifecycle health.',
        impactOnOurCompany: 'Continue emphasizing our premium service level guarantees.',
        evidence: [createEvidence(last, input, 'retention', `${firstRet}% -> ${lastRet}%`)],
        sourceRecordIds: [first._id, last._id],
        createdAt: new Date().toISOString(),
      });
    }

    // Customer rating improvement
    const firstRating = Number((first as Record<string, unknown>).avg_customer_rating ?? 0);
    const lastRating = Number((last as Record<string, unknown>).avg_customer_rating ?? 0);
    if (firstRating > 0 && lastRating > firstRating) {
      signals.push({
        id: uuid(),
        workspaceId: input.workspaceId,
        analysisId: input.analysisId,
        signalType: 'competitor_improvement',
        competitor,
        competitorId: competitor.toLowerCase().replace(/\s+/g, '-'),
        eventDate: last.date || new Date().toISOString(),
        severity: 'medium',
        title: `Customer Satisfaction Uplift (${firstRating.toFixed(1)} -> ${lastRating.toFixed(1)} / 5.0)`,
        description: `${competitor} average customer rating climbed to ${lastRating.toFixed(1)}/5.0.`,
        intelligenceCategory: 'improvement',
        strategicIntent: 'Enhancing brand sentiment and customer advocacy.',
        impactOnOurCompany: 'Benchmark user satisfaction against our internal baseline.',
        evidence: [createEvidence(last, input, 'avg_customer_rating', `${firstRating} -> ${lastRating}`)],
        sourceRecordIds: [first._id, last._id],
        createdAt: new Date().toISOString(),
      });
    }
  }

  return signals;
}

function detectCompetitorDrawbacksAndFailures(
  records: RecordWithId[],
  competitor: string,
  input: SignalDetectionInput
): Signal[] {
  const signals: Signal[] = [];

  // Textual drawbacks
  const drawbackRecords = records.filter(r => {
    const text = `${r.eventType || ''} ${r.category || ''} ${r.description || ''} ${r.feature || ''}`.toLowerCase();
    return text.includes('outage') || text.includes('downtime') || text.includes('deprecated') ||
           text.includes('sunset') || text.includes('vulnerability') || text.includes('breach') ||
           text.includes('cve') || text.includes('backlash') || text.includes('complaint') ||
           text.includes('churn') || text.includes('slow') || text.includes('bug') ||
           text.includes('fail') || text.includes('delay') || text.includes('price hike') ||
           text.includes('negative') || text.includes('unstable');
  });

  for (const record of drawbackRecords) {
    const isOutageOrBreach = `${record.description || ''} ${record.eventType || ''}`.toLowerCase().match(/outage|breach|vulnerability|downtime/);
    const severity = isOutageOrBreach ? 'critical' : 'high';

    signals.push({
      id: uuid(),
      workspaceId: input.workspaceId,
      analysisId: input.analysisId,
      signalType: 'competitor_drawback_failure',
      competitor,
      competitorId: competitor.toLowerCase().replace(/\s+/g, '-'),
      eventDate: record.date || new Date().toISOString(),
      severity,
      title: `Competitor Vulnerability / Disruption: ${competitor}`,
      description: record.description || `${competitor} experienced operational drawbacks or service disruptions.`,
      intelligenceCategory: 'drawback_failure',
      strategicIntent: 'Struggling with technical infrastructure stability or margin constraints.',
      impactOnOurCompany: 'Immediate commercial offensive: Launch targeted migration campaigns and emphasize our uptime reliability.',
      evidence: [createEvidence(record, input, 'failure_evidence', record.description || record.eventType || 'Drawback')],
      sourceRecordIds: [record._id],
      createdAt: new Date().toISOString(),
    });
  }

  // Numerical drawbacks & structural vulnerabilities (market share deficit & retention ceiling)
  const latestRecord = records[records.length - 1];
  if (latestRecord) {
    const marketShare = Number((latestRecord as Record<string, unknown>).market_share_percent ?? 0);
    const retention = Number((latestRecord as Record<string, unknown>).customer_retention_percent ?? 0);

    if (marketShare > 0 && marketShare < 15) {
      signals.push({
        id: uuid(),
        workspaceId: input.workspaceId,
        analysisId: input.analysisId,
        signalType: 'competitor_drawback_failure',
        competitor,
        competitorId: competitor.toLowerCase().replace(/\s+/g, '-'),
        eventDate: latestRecord.date || new Date().toISOString(),
        severity: 'high',
        title: `Market Share Deficit (${marketShare.toFixed(1)}%)`,
        description: `${competitor} maintains only ${marketShare.toFixed(1)}% market share, presenting a structural distribution deficit.`,
        intelligenceCategory: 'drawback_failure',
        strategicIntent: 'Constrained by regional distribution limits and lower enterprise adoption.',
        impactOnOurCompany: 'Leverage dominant market share to negotiate exclusive partner shelf space and enterprise RFPs.',
        evidence: [createEvidence(latestRecord, input, 'market_share_percent', `${marketShare}%`)],
        sourceRecordIds: [latestRecord._id],
        createdAt: new Date().toISOString(),
      });
    }

    if (retention > 0 && retention < 82) {
      const churnRate = 100 - retention;
      signals.push({
        id: uuid(),
        workspaceId: input.workspaceId,
        analysisId: input.analysisId,
        signalType: 'competitor_drawback_failure',
        competitor,
        competitorId: competitor.toLowerCase().replace(/\s+/g, '-'),
        eventDate: latestRecord.date || new Date().toISOString(),
        severity: 'medium',
        title: `Elevated Customer Churn (${churnRate.toFixed(1)}% annual churn)`,
        description: `${competitor} customer retention of ${retention.toFixed(1)}% exposes an annualized churn rate of ${churnRate.toFixed(1)}%.`,
        intelligenceCategory: 'drawback_failure',
        strategicIntent: 'Facing account attrition and customer switching friction.',
        impactOnOurCompany: 'Deploy targeted conquest campaigns offering turnkey migration credits.',
        evidence: [createEvidence(latestRecord, input, 'customer_retention_percent', `${retention}% retention (${churnRate}% churn)`)],
        sourceRecordIds: [latestRecord._id],
        createdAt: new Date().toISOString(),
      });
    }
  }

  return signals;
}

function detectCompetitorSuccesses(
  records: RecordWithId[],
  competitor: string,
  input: SignalDetectionInput
): Signal[] {
  const signals: Signal[] = [];

  // Textual successes
  const successRecords = records.filter(r => {
    const text = `${r.eventType || ''} ${r.category || ''} ${r.description || ''} ${r.feature || ''}`.toLowerCase();
    return text.includes('award') || text.includes('record revenue') || text.includes('funding') ||
           text.includes('series') || text.includes('fortune 500') || text.includes('enterprise win') ||
           text.includes('top rated') || text.includes('5-star') || text.includes('leader') ||
           text.includes('milestone') || text.includes('expansion win') || text.includes('partnership with');
  });

  for (const record of successRecords) {
    signals.push({
      id: uuid(),
      workspaceId: input.workspaceId,
      analysisId: input.analysisId,
      signalType: 'competitor_success',
      competitor,
      competitorId: competitor.toLowerCase().replace(/\s+/g, '-'),
      eventDate: record.date || new Date().toISOString(),
      severity: 'high',
      title: `Competitor Market Success: ${competitor}`,
      description: record.description || `${competitor} secured a significant customer milestone or market award.`,
      intelligenceCategory: 'success',
      strategicIntent: 'Consolidating brand prestige and accelerating enterprise market penetration.',
      impactOnOurCompany: 'Defend existing enterprise deals and emphasize our bespoke capabilities.',
      evidence: [createEvidence(record, input, 'success_evidence', record.description || record.eventType || 'Success')],
      sourceRecordIds: [record._id],
      createdAt: new Date().toISOString(),
    });
  }

  // Numerical milestones (e.g. crossing scale barriers)
  const sorted = [...records].filter(r => r.date).sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
  if (sorted.length > 0) {
    const latest = sorted[sorted.length - 1];
    const revenueVal = Number(latest.value ?? latest.price ?? 0);
    const newCust = Number((latest as Record<string, unknown>).new_customers ?? 0);
    const marketShare = Number((latest as Record<string, unknown>).market_share_percent ?? 0);

    if (revenueVal >= 3000) {
      signals.push({
        id: uuid(),
        workspaceId: input.workspaceId,
        analysisId: input.analysisId,
        signalType: 'competitor_success',
        competitor,
        competitorId: competitor.toLowerCase().replace(/\s+/g, '-'),
        eventDate: latest.date || new Date().toISOString(),
        severity: 'high',
        title: `Commercial Milestone: Surpassed $3,000M Monthly Revenue`,
        description: `${competitor} reached $${revenueVal.toLocaleString()}M monthly volume (${marketShare.toFixed(1)}% share).`,
        intelligenceCategory: 'success',
        strategicIntent: 'Consolidating institutional presence and scaling commercial operations.',
        impactOnOurCompany: 'Proactively review top enterprise client renewals with multi-year rate protections.',
        evidence: [createEvidence(latest, input, 'value', `$${revenueVal}M monthly`)],
        sourceRecordIds: [latest._id],
        createdAt: new Date().toISOString(),
      });
    }

    if (newCust >= 500000) {
      signals.push({
        id: uuid(),
        workspaceId: input.workspaceId,
        analysisId: input.analysisId,
        signalType: 'competitor_success',
        competitor,
        competitorId: competitor.toLowerCase().replace(/\s+/g, '-'),
        eventDate: latest.date || new Date().toISOString(),
        severity: 'medium',
        title: `Customer Acquisition Spike (${(newCust / 1000).toFixed(0)}k New Accounts)`,
        description: `${competitor} achieved ${(newCust).toLocaleString()} new customer acquisitions in a single month.`,
        intelligenceCategory: 'success',
        strategicIntent: 'Accelerating top-of-funnel customer adoption.',
        impactOnOurCompany: 'Strengthen middle-of-funnel conversion incentives.',
        evidence: [createEvidence(latest, input, 'new_customers', `${newCust} additions`)],
        sourceRecordIds: [latest._id],
        createdAt: new Date().toISOString(),
      });
    }
  }

  return signals;
}

function detectRepeatedEvents(
  records: RecordWithId[],
  competitor: string,
  input: SignalDetectionInput
): Signal[] {
  const signals: Signal[] = [];

  // Detect repeated event types
  const eventCounts = new Map<string, RecordWithId[]>();
  for (const r of records) {
    const et = r.eventType?.toLowerCase() || '';
    if (!et) continue;
    if (!eventCounts.has(et)) eventCounts.set(et, []);
    eventCounts.get(et)!.push(r);
  }

  for (const [eventType, eventRecords] of eventCounts) {
    if (eventRecords.length >= 3) {
      signals.push({
        id: uuid(),
        workspaceId: input.workspaceId,
        analysisId: input.analysisId,
        signalType: 'repeated_event',
        competitor,
        competitorId: competitor.toLowerCase().replace(/\s+/g, '-'),
        eventDate: eventRecords[eventRecords.length - 1].date || new Date().toISOString(),
        severity: eventRecords.length >= 5 ? 'high' : 'medium',
        title: `Repeated ${eventType} pattern from ${competitor}`,
        description: `${competitor} has exhibited "${eventType}" ${eventRecords.length} times in the analysis period, indicating a recurring pattern`,
        evidence: eventRecords.slice(0, 5).map(r => createEvidence(r, input, 'eventType', r.eventType || '')),
        sourceRecordIds: eventRecords.map(r => r._id),
        createdAt: new Date().toISOString(),
      });
    }
  }

  return signals;
}

function detectExpansionSignals(
  records: RecordWithId[],
  competitor: string,
  input: SignalDetectionInput
): Signal[] {
  const signals: Signal[] = [];

  const expansionRecords = records.filter(r => {
    const et = r.eventType?.toLowerCase() || '';
    const desc = r.description?.toLowerCase() || '';
    const cat = r.category?.toLowerCase() || '';
    return et.includes('expan') || et.includes('market') || et.includes('geo') ||
           desc.includes('expansion') || desc.includes('new market') || desc.includes('new region') ||
           cat.includes('expansion') || cat.includes('market entry');
  });

  for (const record of expansionRecords) {
    signals.push({
      id: uuid(),
      workspaceId: input.workspaceId,
      analysisId: input.analysisId,
      signalType: record.region ? 'expansion_signal' : 'market_entry_signal',
      competitor,
      competitorId: competitor.toLowerCase().replace(/\s+/g, '-'),
      eventDate: record.date || new Date().toISOString(),
      severity: 'high',
      title: `${record.region ? 'Geographic expansion' : 'Market entry'} by ${competitor}`,
      description: record.description || `${competitor} appears to be expanding${record.region ? ` into ${record.region}` : ''}`,
      evidence: [createEvidence(record, input, 'eventType', record.eventType || '')],
      sourceRecordIds: [record._id],
      createdAt: new Date().toISOString(),
    });
  }

  return signals;
}

function detectMessagingChanges(
  records: RecordWithId[],
  competitor: string,
  input: SignalDetectionInput
): Signal[] {
  const signals: Signal[] = [];

  const messagingRecords = records.filter(r => {
    const et = r.eventType?.toLowerCase() || '';
    const cat = r.category?.toLowerCase() || '';
    return et.includes('messag') || et.includes('brand') || et.includes('campaign') ||
           et.includes('rebrand') || et.includes('position') ||
           cat.includes('marketing') || cat.includes('messaging');
  });

  for (const record of messagingRecords) {
    signals.push({
      id: uuid(),
      workspaceId: input.workspaceId,
      analysisId: input.analysisId,
      signalType: 'messaging_change',
      competitor,
      competitorId: competitor.toLowerCase().replace(/\s+/g, '-'),
      eventDate: record.date || new Date().toISOString(),
      severity: 'medium',
      title: `Messaging change by ${competitor}`,
      description: record.description || `${competitor} messaging or campaign activity detected`,
      evidence: [createEvidence(record, input, 'eventType', record.eventType || '')],
      sourceRecordIds: [record._id],
      createdAt: new Date().toISOString(),
    });
  }

  return signals;
}

// ============================================================
// Competitive Gap Detection
// ============================================================

export interface GapDetectionInput {
  records: NormalizedRecord[];
  ourCompanyName: string;
  workspaceId: string;
  analysisId: string;
  datasetId: string;
}

export function detectCompetitiveGaps(input: GapDetectionInput) {
  const gaps: Array<{
    dimension: string;
    ourValue: number | string;
    competitorName: string;
    competitorValue: number | string;
    gapDescription: string;
    evidence: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    direction: 'behind' | 'ahead' | 'neutral';
  }> = [];

  const byCompetitor = groupBy(input.records, r => r.competitor?.toLowerCase() || 'unknown');
  let ourRecords = input.records.filter(r => (r as Record<string, unknown>).isOurCompany);
  if (ourRecords.length === 0) {
    ourRecords = byCompetitor[input.ourCompanyName.toLowerCase()] || [];
  }

  // Helper to extract the latest numeric value from records
  const getLatestNum = (recs: NormalizedRecord[], field: string) => {
    const sorted = [...recs]
      .filter(r => (r as Record<string, unknown>)[field] != null)
      .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
    if (sorted.length === 0) return null;
    const val = Number((sorted[sorted.length - 1] as Record<string, unknown>)[field]);
    return isNaN(val) ? null : val;
  };

  for (const [compKey, compRecords] of Object.entries(byCompetitor)) {
    if (compKey === input.ourCompanyName.toLowerCase() || compKey === 'unknown') continue;
    // Don't compare our company to itself if records were tagged as our company
    if (compRecords.every(r => (r as Record<string, unknown>).isOurCompany)) continue;

    const competitorName = compRecords[0].competitor || compKey;

    // 1. Pricing gap
    const ourPrices = ourRecords.filter(r => r.price != null).map(r => r.price!);
    const compPrices = compRecords.filter(r => r.price != null).map(r => r.price!);

    if (ourPrices.length > 0 && compPrices.length > 0) {
      const ourAvg = ourPrices.reduce((a, b) => a + b, 0) / ourPrices.length;
      const compAvg = compPrices.reduce((a, b) => a + b, 0) / compPrices.length;
      const priceDiff = ((ourAvg - compAvg) / compAvg) * 100;

      if (Math.abs(priceDiff) >= 5) {
        gaps.push({
          dimension: 'pricing',
          ourValue: parseFloat(ourAvg.toFixed(2)),
          competitorName,
          competitorValue: parseFloat(compAvg.toFixed(2)),
          gapDescription: `Our average price (${ourAvg.toFixed(2)}) is ${Math.abs(priceDiff).toFixed(1)}% ${priceDiff > 0 ? 'higher' : 'lower'} than ${competitorName} (${compAvg.toFixed(2)})`,
          evidence: [`Our price samples: ${ourPrices.length}`, `${competitorName} price samples: ${compPrices.length}`],
          severity: Math.abs(priceDiff) >= 30 ? 'critical' : Math.abs(priceDiff) >= 15 ? 'high' : 'medium',
          direction: priceDiff > 0 ? 'behind' : 'ahead',
        });
      }
    }

    // 2. Revenue scale gap
    const ourRev = getLatestNum(ourRecords, 'value') ?? getLatestNum(ourRecords, 'revenue') ?? (ourPrices.length > 0 ? ourPrices.reduce((a, b) => a + b, 0) / ourPrices.length : null);
    const compRev = getLatestNum(compRecords, 'value') ?? getLatestNum(compRecords, 'revenue') ?? (compPrices.length > 0 ? compPrices.reduce((a, b) => a + b, 0) / compPrices.length : null);
    if (ourRev != null && compRev != null && compRev > 0) {
      const revDiff = ((ourRev - compRev) / compRev) * 100;
      if (Math.abs(revDiff) >= 1) {
        gaps.push({
          dimension: 'revenue_scale',
          ourValue: Math.round(ourRev),
          competitorName,
          competitorValue: Math.round(compRev),
          gapDescription: `Our monthly revenue ($${Math.round(ourRev).toLocaleString()}M) is ${Math.abs(revDiff).toFixed(1)}% ${revDiff >= 0 ? 'ahead of' : 'behind'} ${competitorName} ($${Math.round(compRev).toLocaleString()}M)`,
          evidence: [`Our Revenue: $${Math.round(ourRev)}M`, `${competitorName} Revenue: $${Math.round(compRev)}M`],
          severity: revDiff < -20 ? 'high' : revDiff < 0 ? 'medium' : 'low',
          direction: revDiff >= 0 ? 'ahead' : 'behind',
        });
      }
    }

    // 3. Market Share gap
    const ourShare = getLatestNum(ourRecords, 'market_share_percent') ?? getLatestNum(ourRecords, 'market_share');
    const compShare = getLatestNum(compRecords, 'market_share_percent') ?? getLatestNum(compRecords, 'market_share');
    if (ourShare != null && compShare != null) {
      const shareDiff = ourShare - compShare;
      gaps.push({
        dimension: 'market_share',
        ourValue: parseFloat(ourShare.toFixed(1)),
        competitorName,
        competitorValue: parseFloat(compShare.toFixed(1)),
        gapDescription: `Our market share (${ourShare.toFixed(1)}%) is ${Math.abs(shareDiff).toFixed(1)} percentage points ${shareDiff >= 0 ? 'above' : 'below'} ${competitorName} (${compShare.toFixed(1)}%)`,
        evidence: [`Our Market Share: ${ourShare}%`, `${competitorName} Market Share: ${compShare}%`],
        severity: shareDiff < -5 ? 'high' : shareDiff < 0 ? 'medium' : 'low',
        direction: shareDiff >= 0 ? 'ahead' : 'behind',
      });
    }

    // 4. Customer Retention gap
    const ourRet = getLatestNum(ourRecords, 'customer_retention_percent') ?? getLatestNum(ourRecords, 'retention');
    const compRet = getLatestNum(compRecords, 'customer_retention_percent') ?? getLatestNum(compRecords, 'retention');
    if (ourRet != null && compRet != null) {
      const retDiff = ourRet - compRet;
      gaps.push({
        dimension: 'customer_retention',
        ourValue: parseFloat(ourRet.toFixed(1)),
        competitorName,
        competitorValue: parseFloat(compRet.toFixed(1)),
        gapDescription: `Our customer retention (${ourRet.toFixed(1)}%) is ${Math.abs(retDiff).toFixed(1)}% ${retDiff >= 0 ? 'higher than' : 'lower than'} ${competitorName} (${compRet.toFixed(1)}%)`,
        evidence: [`Our Retention: ${ourRet}%`, `${competitorName} Retention: ${compRet}%`],
        severity: retDiff < -5 ? 'critical' : retDiff < 0 ? 'high' : 'low',
        direction: retDiff >= 0 ? 'ahead' : 'behind',
      });
    }

    // 5. Workforce Headcount scale gap
    const ourEmp = getLatestNum(ourRecords, 'employees') ?? getLatestNum(ourRecords, 'headcount');
    const compEmp = getLatestNum(compRecords, 'employees') ?? getLatestNum(compRecords, 'headcount');
    if (ourEmp != null && compEmp != null) {
      const empDiff = ((ourEmp - compEmp) / compEmp) * 100;
      gaps.push({
        dimension: 'workforce_scale',
        ourValue: Math.round(ourEmp),
        competitorName,
        competitorValue: Math.round(compEmp),
        gapDescription: `Our team size (${Math.round(ourEmp).toLocaleString()}) is ${Math.abs(empDiff).toFixed(1)}% ${empDiff >= 0 ? 'larger than' : 'smaller than'} ${competitorName} (${Math.round(compEmp).toLocaleString()})`,
        evidence: [`Our Headcount: ${Math.round(ourEmp)}`, `${competitorName} Headcount: ${Math.round(compEmp)}`],
        severity: empDiff < -20 ? 'medium' : 'low',
        direction: empDiff >= 0 ? 'ahead' : 'behind',
      });
    }

    // 6. Customer Satisfaction / Rating gap
    const ourRating = getLatestNum(ourRecords, 'avg_customer_rating');
    const compRating = getLatestNum(compRecords, 'avg_customer_rating');
    if (ourRating != null && compRating != null) {
      const ratingDiff = ourRating - compRating;
      gaps.push({
        dimension: 'customer_satisfaction',
        ourValue: parseFloat(ourRating.toFixed(2)),
        competitorName,
        competitorValue: parseFloat(compRating.toFixed(2)),
        gapDescription: `Our customer satisfaction rating (${ourRating.toFixed(1)}/5.0) is ${Math.abs(ratingDiff).toFixed(2)} pts ${ratingDiff >= 0 ? 'higher than' : 'lower than'} ${competitorName} (${compRating.toFixed(1)}/5.0)`,
        evidence: [`Our Rating: ${ourRating.toFixed(2)}`, `${competitorName} Rating: ${compRating.toFixed(2)}`],
        severity: ratingDiff < -0.3 ? 'high' : 'low',
        direction: ratingDiff >= 0 ? 'ahead' : 'behind',
      });
    }

    // 7. Activity gap
    const ourFeatures = ourRecords.filter(r => {
      const et = r.eventType?.toLowerCase() || '';
      return et.includes('feature') || et.includes('launch');
    });
    const compFeatures = compRecords.filter(r => {
      const et = r.eventType?.toLowerCase() || '';
      return et.includes('feature') || et.includes('launch');
    });

    if (compFeatures.length > ourFeatures.length + 1) {
      gaps.push({
        dimension: 'feature_availability',
        ourValue: ourFeatures.length,
        competitorName,
        competitorValue: compFeatures.length,
        gapDescription: `${competitorName} launched ${compFeatures.length} features vs our ${ourFeatures.length} in the analysis period`,
        evidence: compFeatures.slice(0, 5).map(r => `${r.feature || r.product || r.description || 'Feature event'} (${r.date || 'date unknown'})`),
        severity: compFeatures.length - ourFeatures.length >= 5 ? 'high' : 'medium',
        direction: 'behind',
      });
    }

    // 8. Activity volume gap
    if (compRecords.length > ourRecords.length * 1.5) {
      gaps.push({
        dimension: 'product_activity',
        ourValue: ourRecords.length,
        competitorName,
        competitorValue: compRecords.length,
        gapDescription: `${competitorName} has ${compRecords.length} recorded events vs our ${ourRecords.length}`,
        evidence: [`Total ${competitorName} events: ${compRecords.length}`, `Total our events: ${ourRecords.length}`],
        severity: compRecords.length > ourRecords.length * 2 ? 'high' : 'medium',
        direction: 'behind',
      });
    }
  }

  return gaps;
}

// ============================================================
// Helpers
// ============================================================

function createEvidence(
  record: RecordWithId,
  input: SignalDetectionInput,
  field: string,
  value: string
): SignalEvidence {
  return {
    recordId: record._id,
    datasetId: input.datasetId,
    datasetName: input.datasetName,
    field,
    value,
    date: record.date,
  };
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}
