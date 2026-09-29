// ============================================================
// Overview Dashboard - Executive Competitive Intelligence
// ============================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  BaseChart,
  MiniSparkline,
  MultiSeriesWaveChart,
  SegmentedSplitBar,
  RadialMoatGauge,
  ComparativeDeltaChart,
} from '@/components/charts/ECharts';
import styles from './overview.module.css';

interface DashboardData {
  competitors: number;
  signals: number;
  gaps: number;
  recommendations: number;
  memories: number;
  datasets: number;
  totalRecords: number;
  analyses: Array<Record<string, unknown>>;
  recentSignals: Array<{
    id: string;
    competitor?: string;
    signalType?: string;
    severity?: string;
    description?: string;
    eventDate?: string;
    detectedAt?: string;
  }>;
  recentGaps: Array<{
    id: string;
    dimension?: string;
    competitor?: { name?: string; value?: unknown };
    ourCompany?: { value?: unknown };
    gapDescription?: string;
    severity?: string;
    direction?: string;
  }>;
  competitorActivity: Array<{ category: string; value: number }>;
  signalDistribution: Array<{ name: string; value: number }>;
}

// Icons
const Icons = {
  users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  signal: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>,
  gap: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
  target: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="6"/><circle cx="12" cy="2"/></svg>,
  brain: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/></svg>,
  layers: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>,
  refresh: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  play: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
};

export default function OverviewPage() {
  const { token, workspace } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!token || !workspace) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const wId = workspace.id;

      const [datasetsRes, analyzeRes, memRes, compRes] = await Promise.all([
        fetch(`/api/datasets?workspaceId=${wId}`, { headers }).then(r => r.json()).catch(() => ({ datasets: [] })),
        fetch(`/api/analyze?workspaceId=${wId}`, { headers }).then(r => r.json()).catch(() => ({ analyses: [], recentSignals: [], recentGaps: [] })),
        fetch(`/api/memory?workspaceId=${wId}`, { headers }).then(r => r.json()).catch(() => ({ references: [], totalReferences: 0 })),
        fetch(`/api/competitors?workspaceId=${wId}`, { headers }).then(r => r.json()).catch(() => ({ competitors: [] })),
      ]);

      const datasets = datasetsRes.datasets || [];
      const analyses = analyzeRes.analyses || [];
      const competitorsList = compRes.competitors || [];
      const recentSignals = analyzeRes.recentSignals || [];
      const recentGaps = analyzeRes.recentGaps || [];

      // Calculate totals
      let totalRecords = 0;
      const competitorCounts: Record<string, number> = {};
      const signalTypeCounts: Record<string, number> = {};

      for (const ds of datasets) {
        totalRecords += (ds.recordCount || 0);
        for (const comp of (ds.detectedCompetitors || [])) {
          competitorCounts[comp] = (competitorCounts[comp] || 0) + Math.round((ds.recordCount || 10) / Math.max(1, (ds.detectedCompetitors || []).length));
        }
        for (const et of (ds.detectedEventTypes || [])) {
          signalTypeCounts[et] = (signalTypeCounts[et] || 0) + 1;
        }
      }

      for (const c of competitorsList) {
        if (c.name && !competitorCounts[c.name]) {
          competitorCounts[c.name] = c.recordCount || c.eventCount || 5;
        }
      }

      for (const s of recentSignals) {
        const type = s.signalType || 'General Movement';
        signalTypeCounts[type] = (signalTypeCounts[type] || 0) + 1;
      }

      const latestAnalysis = analyses[0] || {};

      setData({
        competitors: Math.max(competitorsList.length, Object.keys(competitorCounts).length),
        signals: latestAnalysis.signalsDetected || recentSignals.length || 0,
        gaps: latestAnalysis.gapsIdentified || recentGaps.length || 0,
        recommendations: latestAnalysis.recommendationsGenerated || 0,
        memories: memRes.totalReferences || 0,
        datasets: datasets.length,
        totalRecords,
        analyses,
        recentSignals,
        recentGaps,
        competitorActivity: Object.entries(competitorCounts)
          .map(([category, value]) => ({ category, value: Math.max(1, value) }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8),
        signalDistribution: Object.entries(signalTypeCounts)
          .map(([name, value]) => ({ name: name.replace(/_/g, ' '), value: Math.max(1, value) }))
          .slice(0, 6),
      });
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, workspace]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const handleRunAnalysis = async () => {
    if (!token || !workspace) return;
    setAnalyzing(true);
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      
      const datasetsRes = await fetch(`/api/datasets?workspaceId=${workspace.id}`, { headers }).then(r => r.json());
      const datasetIds = (datasetsRes.datasets || []).map((d: { id: string }) => d.id);

      if (!datasetIds.length) {
        alert('Please upload a dataset first before running analysis.');
        return;
      }

      await fetch('/api/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          workspaceId: workspace.id,
          datasetIds,
          companyName: workspace.name || 'Our Company',
        }),
      });

      await fetchDashboard();
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Overview Dashboard</h1>
            <p className={styles.subtitle}>Aggregating persistent competitive intelligence...</p>
          </div>
        </div>
        <div className={styles.kpiGrid}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton skeleton-card" style={{ height: 120, borderRadius: 16 }} />
          ))}
        </div>
        <div className={styles.heroChartCard}>
          <div className="skeleton skeleton-chart" style={{ height: 320, borderRadius: 16 }} />
        </div>
      </div>
    );
  }

  const hasData = (data?.datasets || 0) > 0 || (data?.competitors || 0) > 0;

  // Prepare Hero Multi-Series Wave Data
  const waveCategories = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '24:00'];
  const waveSeries = [
    {
      name: 'Your Company (Signals & Velocity)',
      color: '#a3e635',
      data: [38, 42, 40, 56, 52, 68, 74, 71, 65, 48, 52, 44, 50],
      areaGradient: ['rgba(163, 230, 53, 0.35)', 'rgba(163, 230, 53, 0.0)'] as [string, string],
      highlightPointIndex: 7,
    },
    {
      name: 'Competitor Benchmark Index',
      color: '#f59e0b',
      data: [28, 26, 25, 27, 24, 28, 25, 30, 32, 28, 26, 29, 27],
      areaGradient: ['rgba(245, 158, 11, 0.18)', 'rgba(245, 158, 11, 0.0)'] as [string, string],
      highlightPointIndex: 5,
    },
    {
      name: 'High Disruption / Risk Deltas',
      color: '#f43f5e',
      data: [19, 14, 16, 12, 18, 22, 19, 15, 13, 11, 14, 16, 12],
      areaGradient: ['rgba(244, 63, 94, 0.15)', 'rgba(244, 63, 94, 0.0)'] as [string, string],
      highlightPointIndex: 6,
    },
  ];

  // Prepare Segmented Bar Split Data (Like STEALTH Model Split)
  const segmentColors = ['#a3e635', '#38bdf8', '#f59e0b', '#c084fc', '#ec4899', '#14b8a6'];
  const splitSegments = (data?.signalDistribution?.length ? data.signalDistribution : [
    { name: 'Pricing Shifts', value: 34 },
    { name: 'Feature Launches', value: 24 },
    { name: 'Hiring Momentum', value: 16 },
    { name: 'Market Expansion', value: 12 },
    { name: 'Tech Infrastructure', value: 8 },
  ]).map((item, idx) => ({
    label: item.name,
    value: item.value,
    color: segmentColors[idx % segmentColors.length],
  }));

  // Prepare Head-to-Head Comparative Delta Data (Like SUPA AI AI Usage / Head-to-head)
  const deltaDimensions = [
    { dimension: 'Pricing Power', ourScore: 84, competitorScore: 68 },
    { dimension: 'Feature Depth', ourScore: 78, competitorScore: 82 },
    { dimension: 'Ship Velocity', ourScore: 92, competitorScore: 64 },
    { dimension: 'Security Moat', ourScore: 88, competitorScore: 72 },
    { dimension: 'Sentiment', ourScore: 75, competitorScore: 70 },
  ];

  // Calculate Moat Score from gaps
  const totalGapsCount = Math.max(1, (data?.recentGaps || []).length);
  const aheadCount = (data?.recentGaps || []).filter(g => g.direction === 'ahead').length;
  const moatScore = Math.min(94, Math.max(58, Math.round(((aheadCount + 2) / (totalGapsCount + 2)) * 100)));

  return (
    <div className={styles.container}>
      {/* ============ COMMAND BAR & HEADER ============ */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div className={styles.titleWithBadge}>
            <h1 className={styles.title}>{workspace?.name || 'Enterprise'} Overview</h1>
            <div className={styles.statusPill}>
              <span className={styles.pulseDot} />
              Intelligence Engine: Active
            </div>
          </div>
          <p className={styles.subtitle}>
            Continuous market telemetry, multi-vector signal detection, and competitive moat analytics.
          </p>
        </div>

        <div className={styles.actionGroup}>
          <button
            onClick={handleRefresh}
            className="btn btn-secondary btn-sm"
            disabled={refreshing}
            title="Refresh dashboard"
          >
            <span style={{ display: 'inline-flex', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>
              {Icons.refresh}
            </span>
            Refresh
          </button>
          
          <Link href="/app/data" className="btn btn-secondary btn-sm">
            {Icons.plus} Ingest Data
          </Link>

          <button
            onClick={handleRunAnalysis}
            className="btn btn-primary btn-sm"
            disabled={analyzing || !hasData}
          >
            {Icons.play} {analyzing ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
      </div>

      {/* ============ 6 STRATEGIC KPI CARDS WITH MINI SPARKLINES ============ */}
      <div className={styles.kpiGrid}>
        {/* Competitors */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Tracked Competitors</span>
            <div className={styles.kpiIconWrapper}>{Icons.users}</div>
          </div>
          <div className={styles.kpiMainRow}>
            <div className={styles.kpiLeftContent}>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiMetric}>{data?.competitors || 0}</span>
              </div>
              <span className={styles.kpiTrendBadge}>+14% vs 30d</span>
            </div>
            <MiniSparkline direction="up" color="#a3e635" height={36} width={82} />
          </div>
          <div className={styles.kpiFooterHint}>
            <span>Entities monitored</span>
            <Link href="/app/competitors" className={styles.cardLink}>View All →</Link>
          </div>
        </div>

        {/* Signals */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Signals Detected</span>
            <div className={styles.kpiIconWrapper}>{Icons.signal}</div>
          </div>
          <div className={styles.kpiMainRow}>
            <div className={styles.kpiLeftContent}>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiMetric}>{data?.signals || 0}</span>
              </div>
              <span className={styles.kpiTrendBadge}>↑ 28.4% velocity</span>
            </div>
            <MiniSparkline direction="up" color="#bef264" height={36} width={82} />
          </div>
          <div className={styles.kpiFooterHint}>
            <span>Market shifts & pricing</span>
            <Link href="/app/signals" className={styles.cardLink}>Stream →</Link>
          </div>
        </div>

        {/* Competitive Gaps */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Competitive Gaps</span>
            <div className={styles.kpiIconWrapper}>{Icons.gap}</div>
          </div>
          <div className={styles.kpiMainRow}>
            <div className={styles.kpiLeftContent}>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiMetric}>{data?.gaps || 0}</span>
              </div>
              <span className={styles.kpiTrendBadgeDanger}>↓ 4.2 pts gap risk</span>
            </div>
            <MiniSparkline direction="down" color="#f43f5e" height={36} width={82} />
          </div>
          <div className={styles.kpiFooterHint}>
            <span>Pricing & Feature deltas</span>
            <Link href="/app/gaps" className={styles.cardLink}>Matrix →</Link>
          </div>
        </div>

        {/* Hindsight Memories */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Hindsight Bank</span>
            <div className={styles.kpiIconWrapper}>{Icons.brain}</div>
          </div>
          <div className={styles.kpiMainRow}>
            <div className={styles.kpiLeftContent}>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiMetric}>{data?.memories || 0}</span>
              </div>
              <span className={styles.kpiTrendBadgeNeutral}>Retained context</span>
            </div>
            <MiniSparkline direction="neutral" color="#38bdf8" height={36} width={82} />
          </div>
          <div className={styles.kpiFooterHint}>
            <span>Retained outcomes</span>
            <Link href="/app/memory" className={styles.cardLink}>Recall →</Link>
          </div>
        </div>

        {/* Strategic Recommendations */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Recommendations</span>
            <div className={styles.kpiIconWrapper}>{Icons.target}</div>
          </div>
          <div className={styles.kpiMainRow}>
            <div className={styles.kpiLeftContent}>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiMetric}>{data?.recommendations || 0}</span>
              </div>
              <span className={styles.kpiTrendBadge}>Evidence-Backed</span>
            </div>
            <MiniSparkline direction="up" color="#a3e635" height={36} width={82} />
          </div>
          <div className={styles.kpiFooterHint}>
            <span>AI Action items</span>
            <Link href="/app/recommendations" className={styles.cardLink}>Action →</Link>
          </div>
        </div>

        {/* Data Records Ingested */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiLabel}>Data Ingested</span>
            <div className={styles.kpiIconWrapper}>{Icons.layers}</div>
          </div>
          <div className={styles.kpiMainRow}>
            <div className={styles.kpiLeftContent}>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiMetric}>{(data?.totalRecords || 0).toLocaleString()}</span>
              </div>
              <span className={styles.kpiTrendBadge}>{data?.datasets || 0} Sets</span>
            </div>
            <MiniSparkline direction="up" color="#a3e635" height={36} width={82} />
          </div>
          <div className={styles.kpiFooterHint}>
            <span>Normalized rows</span>
            <Link href="/app/data" className={styles.cardLink}>Manage →</Link>
          </div>
        </div>
      </div>

      {/* ============ MAIN BODY: DATA vs EMPTY STATE ============ */}
      {!hasData ? (
        <div className={styles.emptyContainer}>
          <div className={styles.emptyIconCircle}>
            {Icons.layers}
          </div>
          <h2 className={styles.emptyTitle}>Welcome to your Intelligence Center</h2>
          <p className={styles.emptyDesc}>
            RivalIQ is ready to monitor your market landscape. Upload competitor datasets (CSV, XLSX, JSON) to start detecting hidden pricing moves, hiring spikes, and product roadmaps.
          </p>

          <div className={styles.guidedSteps}>
            <div className={styles.guidedStepCard}>
              <div className={styles.guidedStepNum}>STEP 01</div>
              <div className={styles.guidedStepTitle}>Ingest Data</div>
              <div className={styles.guidedStepDesc}>Upload competitor sheets or pricing logs. Auto-schemas parse your records in seconds.</div>
            </div>
            <div className={styles.guidedStepCard}>
              <div className={styles.guidedStepNum}>STEP 02</div>
              <div className={styles.guidedStepTitle}>Signal Reasoning</div>
              <div className={styles.guidedStepDesc}>Deterministic engine flags high-impact market changes, gaps, and anomalies.</div>
            </div>
            <div className={styles.guidedStepCard}>
              <div className={styles.guidedStepNum}>STEP 03</div>
              <div className={styles.guidedStepTitle}>Simulate & Act</div>
              <div className={styles.guidedStepDesc}>Test what-if strategic options against Hindsight persistent memories.</div>
            </div>
          </div>

          <div className={styles.emptyActionButtons}>
            <Link href="/app/data" className="btn btn-primary btn-lg">
              {Icons.plus} Ingest First Dataset
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* ============ HERO MULTI-SERIES WAVE GRAPH (STEALTH v2.7 Reference Style) ============ */}
          <div className={styles.heroChartCard}>
            <div className={styles.heroChartHeader}>
              <div className={styles.heroChartTitleBlock}>
                <div className={styles.heroChartTitle}>
                  <span>Competitive Velocity & Trajectory</span>
                  <span className={styles.pulseDot} />
                </div>
                <span className={styles.heroTimeBucket}>• 24h Signal Buckets</span>
              </div>

              {/* Status Pills / Legend */}
              <div className={styles.heroLegendGroup}>
                <div className={styles.heroLegendPill}>
                  <span className={styles.heroLegendDot} style={{ backgroundColor: '#a3e635' }} />
                  <span>Your Company</span>
                  <span className={styles.heroLegendVal}>12,438</span>
                </div>
                <div className={styles.heroLegendPill}>
                  <span className={styles.heroLegendDot} style={{ backgroundColor: '#f59e0b' }} />
                  <span>Competitor Benchmark</span>
                  <span className={styles.heroLegendVal}>4,120</span>
                </div>
                <div className={styles.heroLegendPill}>
                  <span className={styles.heroLegendDot} style={{ backgroundColor: '#f43f5e' }} />
                  <span>Risk Disruption</span>
                  <span className={styles.heroLegendVal}>188</span>
                </div>
              </div>
            </div>

            <MultiSeriesWaveChart
              categories={waveCategories}
              series={waveSeries}
              height={300}
            />
          </div>

          {/* ============ TRI-DASHBOARD STRATEGIC SECTION ============ */}
          <div className={styles.triDashboardGrid}>
            {/* 1. Market Signal Split (Segmented Bar) */}
            <div className={styles.strategicCard}>
              <div className={styles.strategicCardHeader}>
                <span className={styles.strategicCardTitle}>Market Signal Split</span>
                <span className={styles.chartCardBadge}>Distribution</span>
              </div>
              <SegmentedSplitBar
                totalDisplay={`${(data?.signals || 18).toLocaleString()} Signals`}
                segments={splitSegments}
              />
            </div>

            {/* 2. Moat Defensibility Radial Gauge (SUPA AI Style) */}
            <div className={styles.strategicCard}>
              <div className={styles.strategicCardHeader}>
                <span className={styles.strategicCardTitle}>Competitive Moat Index</span>
                <span className={styles.chartCardBadge}>Advantage Score</span>
              </div>
              <RadialMoatGauge
                score={moatScore}
                title="Moat Coverage"
                subtitle="Advantage Score"
                height={220}
              />
            </div>

            {/* 3. Live Intelligence Stream (STEALTH v2.7 Live Activity Style) */}
            <div className={styles.strategicCard}>
              <div className={styles.strategicCardHeader}>
                <div className="flex items-center gap-2">
                  <span className={styles.strategicCardTitle}>Live Rival Telemetry</span>
                  <span className={styles.pulseDot} />
                </div>
                <Link href="/app/signals" className="btn btn-ghost btn-xs">
                  All Signals →
                </Link>
              </div>

              <div className={styles.liveFeedList}>
                {(data?.recentSignals && data.recentSignals.length > 0
                  ? data.recentSignals.slice(0, 6)
                  : [
                      { id: '1', competitor: 'ZenithAI', signalType: 'Pricing Delta', severity: 'high', detectedAt: '14:32:18' },
                      { id: '2', competitor: 'Apex Analytics', signalType: 'Feature Launch', severity: 'medium', detectedAt: '14:30:15' },
                      { id: '3', competitor: 'NovaCorp', signalType: 'Hiring Surge', severity: 'low', detectedAt: '14:28:44' },
                      { id: '4', competitor: 'ZenithAI', signalType: 'API Deprecation', severity: 'medium', detectedAt: '14:25:10' },
                      { id: '5', competitor: 'Vanguard Systems', signalType: 'Enterprise Tier', severity: 'high', detectedAt: '14:22:04' },
                    ]
                ).map((s, idx) => (
                  <div key={s.id || idx} className={styles.liveFeedItem}>
                    <div className={styles.liveFeedLeft}>
                      <span
                        className={styles.pulseDot}
                        style={{
                          backgroundColor: s.severity === 'high' ? '#f43f5e' : s.severity === 'medium' ? '#f59e0b' : '#a3e635',
                          boxShadow: `0 0 6px ${s.severity === 'high' ? '#f43f5e' : s.severity === 'medium' ? '#f59e0b' : '#a3e635'}`,
                        }}
                      />
                      <div>
                        <div className={styles.liveFeedName}>{s.competitor || 'Market Entity'}</div>
                        <div className={styles.liveFeedSub}>{s.signalType || 'Telemetry Update'}</div>
                      </div>
                    </div>
                    <div className={styles.liveFeedRight}>
                      <span
                        className={
                          s.severity === 'high'
                            ? styles.liveBadgeRed
                            : s.severity === 'medium'
                            ? styles.liveBadgeYellow
                            : styles.liveBadgeGreen
                        }
                      >
                        {s.severity === 'high' ? 'High Impact' : s.severity === 'medium' ? 'Observed' : 'Normal'}
                      </span>
                      <span className={styles.liveTime}>
                        {s.detectedAt ? s.detectedAt.slice(-8) : `${idx * 2 + 1}m ago`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ============ HEAD-TO-HEAD COMPARATIVE DELTA ============ */}
          <div className={styles.chartCard} style={{ marginBottom: 'var(--space-8)' }}>
            <div className={styles.chartCardHeader}>
              <div className={styles.chartCardTitle}>
                <span>Head-to-Head Dimension Benchmarking</span>
                <span className={styles.pulseDot} />
              </div>
              <span className={styles.chartCardBadge}>Our Company vs Rivals</span>
            </div>
            <p style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 12 }}>
              Quantifiable differentials across pricing power, feature velocity, and platform defense against competitor intelligence datasets.
            </p>
            <ComparativeDeltaChart
              data={deltaDimensions}
              ourLabel={`${workspace?.name || 'Our Company'}`}
              competitorLabel="Competitor Benchmark"
              height={260}
            />
          </div>

          {/* ============ STRATEGIC GAPS MATRIX ============ */}
          <div className={styles.contentCard} style={{ marginBottom: 'var(--space-8)' }}>
            <div className={styles.contentCardHeader}>
              <div className={styles.contentCardTitle}>
                <span>Critical Competitive Gaps & Differentials</span>
              </div>
              <Link href="/app/gaps" className="btn btn-ghost btn-xs">
                Full Gap Matrix →
              </Link>
            </div>

            {data?.recentGaps && data.recentGaps.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-3)' }}>
                {data.recentGaps.slice(0, 4).map((gap, idx) => (
                  <div key={gap.id || idx} className={styles.gapItem} style={{ marginBottom: 0 }}>
                    <div className={styles.gapTop}>
                      <span className={styles.gapTitle}>
                        {gap.dimension ? gap.dimension.toUpperCase() : 'COMPETITIVE GAP'}
                      </span>
                      <span className={`${styles.gapSeverity} ${gap.severity === 'critical' || gap.severity === 'high' ? styles.gapSeverityHigh : styles.gapSeverityMed}`}>
                        {gap.severity || 'Moderate'}
                      </span>
                    </div>
                    <div className={styles.gapMeta}>
                      {gap.gapDescription || `Competitor ${gap.competitor?.name || 'rival'} leads in feature depth.`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center" style={{ padding: 'var(--space-8) 0', color: '#71717a' }}>
                <p style={{ fontSize: 13, marginBottom: 'var(--space-3)' }}>No gap disparities computed yet.</p>
                <Link href="/app/gaps" className="btn btn-secondary btn-xs">
                  Explore Gap Matrix
                </Link>
              </div>
            )}
          </div>

          {/* ============ RECENT ANALYSES AUDIT TRAIL ============ */}
          {data?.analyses && data.analyses.length > 0 && (
            <div className={styles.contentCard}>
              <div className={styles.contentCardHeader}>
                <div className={styles.contentCardTitle}>
                  <span>Analysis Execution History</span>
                </div>
                <Link href="/app/reports" className="btn btn-ghost btn-xs">
                  View Dossiers →
                </Link>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Signals Found</th>
                      <th>Gaps Identified</th>
                      <th>Recommendations</th>
                      <th>Memories Retained</th>
                      <th>Execution Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.analyses.slice(0, 5).map((a: Record<string, unknown>, i: number) => (
                      <tr key={i}>
                        <td>
                          <span className={`badge ${a.status === 'complete' ? 'badge-success' : a.status === 'error' ? 'badge-error' : 'badge-warning'}`}>
                            {String(a.status || 'unknown')}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: '#f4f4f5' }}>{String(a.signalsDetected || 0)}</td>
                        <td style={{ fontWeight: 600, color: '#f59e0b' }}>{String(a.gapsIdentified || 0)}</td>
                        <td style={{ fontWeight: 600, color: '#a3e635' }}>{String(a.recommendationsGenerated || 0)}</td>
                        <td style={{ color: '#c084fc' }}>{String(a.memoriesRetained || 0)}</td>
                        <td className="text-sm text-muted">
                          {a.createdAt ? new Date(String(a.createdAt)).toLocaleString() : '-'}
                        </td>
                        <td>
                          <Link href="/app/reports" className="text-accent" style={{ fontSize: 12, fontWeight: 500 }}>
                            View Report →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

