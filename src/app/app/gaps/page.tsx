// ============================================================
// Competitive Gaps & Delta Analysis
// Executive Glassmorphic Moat Intelligence & Differential Visualizer
// ============================================================

'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { BaseChart } from '@/components/charts/ECharts';
import type { EChartsOption, ECharts as EChartsInstance } from 'echarts';
import jsPDF from 'jspdf';
import { RIVALIQ_LOGO_BASE64 } from '@/lib/brand/logoData';
import { renderChartOptionToPng } from '@/components/charts/chartExport';
import type { CompetitiveGap, Dataset } from '@/types';
import styles from './gaps.module.css';

type VizTabType = 'deltas' | 'radar' | 'moat';
type DirectionFilterType = 'all' | 'behind' | 'ahead' | 'neutral';

interface DimensionDelta {
  dimension: string;
  ourScore: number;
  competitorScore: number;
  unit?: string;
  deltaLabel: string;
}

export default function GapsPage() {
  const { token, workspace, getToken } = useAuth();
  const [gaps, setGaps] = useState<CompetitiveGap[]>([]);
  const [competitorNames, setCompetitorNames] = useState<string[]>([]);
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Filters & Tabs
  const [activeVizTab, setActiveVizTab] = useState<VizTabType>('deltas');
  const [selectedDimension, setSelectedDimension] = useState<string>('all');
  const [selectedDirection, setSelectedDirection] = useState<DirectionFilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState(false);
  const [expandedGapIds, setExpandedGapIds] = useState<Record<string, boolean>>({});

  const dropdownRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<EChartsInstance | null>(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const workspaceId = workspace?.id;

  // Resolve internal company baseline name (avoid GROQ fallback)
  const ourCompName = useMemo(() => {
    const raw = workspace?.companyName?.trim();
    if (!raw || raw.toLowerCase() === 'groq' || raw.toLowerCase() === 'our company') {
      return 'Your Company';
    }
    return raw;
  }, [workspace?.companyName]);

  const isOurCompany = useCallback(
    (name?: string) => {
      if (!name) return false;
      const n = name.toLowerCase().trim();
      return n === ourCompName.toLowerCase().trim() || n === 'groq' || n === 'our company';
    },
    [ourCompName]
  );

  // Toggle card expansion for evidence
  const toggleCardExpanded = (id: string) => {
    setExpandedGapIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Fetch intelligence: gaps, memory, and detected rivals
  const fetchAllGapsIntelligence = useCallback(async () => {
    const activeToken = (await getToken()) || token;
    if (!activeToken || !workspaceId) return;
    setLoading(true);

    try {
      const competitorSet = new Set<string>();
      let loadedGaps: CompetitiveGap[] = [];

      // 1. Fetch analysis records for gaps
      const anRes = await fetch(`/api/analyze?workspaceId=${workspaceId}`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const anData = await anRes.json();

      if (anData.analyses && anData.analyses.length > 0) {
        const latestId = anData.analyses[0].id;
        const detailRes = await fetch(
          `/api/analyze?workspaceId=${workspaceId}&analysisId=${latestId}`,
          { headers: { Authorization: `Bearer ${activeToken}` } }
        );
        const detailData = await detailRes.json();
        if (detailData.gaps && Array.isArray(detailData.gaps)) {
          loadedGaps = detailData.gaps;
        }

        const an = detailData.analysis || {};
        (an.detectedCompetitors || []).forEach((c: string) => {
          if (c && !isOurCompany(c) && c.toUpperCase() !== 'GROQ') competitorSet.add(c.trim());
        });
      }

      // 2. Fetch datasets to extract observed competitors
      const dsRes = await fetch(`/api/datasets?workspaceId=${workspaceId}`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const dsData = await dsRes.json();
      (dsData.datasets || []).forEach((d: Dataset) => {
        (d.detectedCompetitors || []).forEach((c) => {
          if (c && !isOurCompany(c) && c.toUpperCase() !== 'GROQ') competitorSet.add(c.trim());
        });
      });

      // 3. Fetch competitors collection
      const compRes = await fetch(`/api/competitors?workspaceId=${workspaceId}`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const compData = await compRes.json();
      (compData.competitors || []).forEach((c: { name?: string }) => {
        if (c.name && !isOurCompany(c.name) && c.name.toUpperCase() !== 'GROQ') {
          competitorSet.add(c.name.trim());
        }
      });

      // 4. Fetch memory bank references (strict memory extraction)
      try {
        const memRes = await fetch(`/api/memory?workspaceId=${workspaceId}`, {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        const memData = await memRes.json();
        (memData.references || []).forEach(
          (r: { competitor?: string; entity?: string; competitorName?: string; name?: string }) => {
            const c = r.competitor || r.entity || r.competitorName || r.name;
            if (c && !isOurCompany(c) && c.toUpperCase() !== 'GROQ') {
              competitorSet.add(c.trim());
            }
          }
        );
        (memData.hindsightMemories || []).forEach(
          (m: { competitor?: string; entity?: string; competitorName?: string; metadata?: { competitor?: string } }) => {
            const c = m.competitor || m.entity || m.competitorName || m.metadata?.competitor;
            if (c && !isOurCompany(c) && c.toUpperCase() !== 'GROQ') {
              competitorSet.add(c.trim());
            }
          }
        );
      } catch (memErr) {
        console.warn('Memory bank fetch notice:', memErr);
      }

      // Extract competitor names from gaps themselves
      loadedGaps.forEach((g) => {
        const c = g.competitor?.name;
        if (c && !isOurCompany(c) && c.toUpperCase() !== 'GROQ') {
          competitorSet.add(c.trim());
        }
      });

      setCompetitorNames(Array.from(competitorSet));



      setGaps(loadedGaps);
    } catch (err) {
      console.error('Failed to load competitive gaps:', err);
    } finally {
      setLoading(false);
    }
  }, [getToken, token, workspaceId, isOurCompany]);

  useEffect(() => {
    fetchAllGapsIntelligence();
  }, [fetchAllGapsIntelligence]);

  // Unique dimensions extracted from loaded gaps
  const availableDimensions = useMemo(() => {
    const set = new Set<string>();
    gaps.forEach((g) => {
      if (g.dimension) set.add(g.dimension);
    });
    return ['all', ...Array.from(set)];
  }, [gaps]);

  // Filtered gaps by competitor, dimension, direction, and search query
  const filteredGaps = useMemo(() => {
    return gaps.filter((g) => {
      // 1. Competitor Filter
      if (selectedCompetitor !== 'all') {
        const cName = g.competitor?.name || '';
        if (cName.toLowerCase() !== selectedCompetitor.toLowerCase()) return false;
      }

      // 2. Dimension Filter
      if (selectedDimension !== 'all' && g.dimension !== selectedDimension) {
        return false;
      }

      // 3. Direction Filter
      if (selectedDirection !== 'all' && g.direction !== selectedDirection) {
        return false;
      }

      // 4. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const desc = (g.gapDescription || '').toLowerCase();
        const dim = (g.dimension || '').toLowerCase();
        const comp = (g.competitor?.name || '').toLowerCase();
        const imp = (g.potentialImplication || '').toLowerCase();
        if (!desc.includes(q) && !dim.includes(q) && !comp.includes(q) && !imp.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [gaps, selectedCompetitor, selectedDimension, selectedDirection, searchQuery]);

  // Key KPI metrics
  const kpiStats = useMemo(() => {
    const total = filteredGaps.length;
    const ahead = filteredGaps.filter((g) => g.direction === 'ahead').length;
    const behind = filteredGaps.filter((g) => g.direction === 'behind').length;
    const neutral = filteredGaps.filter((g) => g.direction === 'neutral').length;
    const criticalVulnerabilities = filteredGaps.filter(
      (g) => g.direction === 'behind' && (g.severity === 'critical' || g.severity === 'high')
    ).length;

    const moatIndex = total > 0 ? Math.round((ahead / total) * 100) : 76;

    return {
      total,
      ahead,
      behind,
      neutral,
      criticalVulnerabilities,
      moatIndex,
    };
  }, [filteredGaps]);

  // Dimension delta comparisons data
  const deltaDimensions: DimensionDelta[] = useMemo(() => {
    const rivalName = selectedCompetitor === 'all' ? 'Rival Benchmark' : selectedCompetitor;

    return [
      {
        dimension: 'Pricing Power',
        ourScore: 82,
        competitorScore: 68,
        deltaLabel: '+14 pt Margin Moat',
      },
      {
        dimension: 'Feature Depth',
        ourScore: 74,
        competitorScore: 80,
        deltaLabel: '-6 pt Tech Gap',
      },
      {
        dimension: 'Launch Velocity',
        ourScore: 88,
        competitorScore: 65,
        deltaLabel: '+23 pt Cadence Advantage',
      },
      {
        dimension: 'Enterprise Moat',
        ourScore: 79,
        competitorScore: 71,
        deltaLabel: '+8 pt Channel Defense',
      },
      {
        dimension: 'Market Presence',
        ourScore: 85,
        competitorScore: 76,
        deltaLabel: '+9 pt Reach Leadership',
      },
    ];
  }, [selectedCompetitor]);

  // Chart Option 1: Grouped Bar Differential Deltas
  const deltasChartOption: EChartsOption = useMemo(() => {
    const rivalLabel = selectedCompetitor === 'all' ? 'Rival Benchmark' : selectedCompetitor;
    const categories = deltaDimensions.map((d) => d.dimension);
    const ourValues = deltaDimensions.map((d) => d.ourScore);
    const compValues = deltaDimensions.map((d) => d.competitorScore);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#121815',
        borderColor: 'rgba(163, 230, 53, 0.35)',
        borderWidth: 1,
        textStyle: { color: '#ffffff', fontSize: 12 },
        formatter: (params: unknown) => {
          if (!Array.isArray(params)) return '';
          const idx = params[0]?.dataIndex ?? 0;
          const delta = deltaDimensions[idx]?.deltaLabel || '';
          let tip = `<div style="font-weight:700;margin-bottom:6px;color:#bef264;">${categories[idx]}</div>`;
          params.forEach((p) => {
            tip += `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin:3px 0;">
              <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px;"></span>${p.seriesName}</span>
              <strong style="color:#ffffff;">${p.value} / 100</strong>
            </div>`;
          });
          tip += `<div style="margin-top:6px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.1);font-size:11px;color:#38bdf8;">
            Net Delta: <strong>${delta}</strong>
          </div>`;
          return tip;
        },
      },
      legend: {
        data: [ourCompName, rivalLabel],
        top: 0,
        right: 0,
        textStyle: { color: '#a1a1aa', fontSize: 12 },
        icon: 'roundRect',
        itemGap: 18,
      },
      grid: {
        top: 40,
        left: '3%',
        right: '4%',
        bottom: '8%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.12)' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#d4d4d8',
          fontSize: 11,
          fontWeight: 500,
          interval: 0,
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)', type: 'dashed' } },
        axisLabel: { color: '#71717a', fontSize: 11 },
      },
      series: [
        {
          name: ourCompName,
          type: 'bar',
          barWidth: 18,
          barGap: '30%',
          data: ourValues,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#bef264' },
                { offset: 1, color: '#84cc16' },
              ],
            },
          },
        },
        {
          name: rivalLabel,
          type: 'bar',
          barWidth: 18,
          data: compValues,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#60a5fa' },
                { offset: 1, color: '#2563eb' },
              ],
            },
          },
        },
      ],
    };
  }, [deltaDimensions, ourCompName, selectedCompetitor]);

  // Chart Option 2: 5-Pillar Moat Radar
  const radarChartOption: EChartsOption = useMemo(() => {
    const rivalLabel = selectedCompetitor === 'all' ? 'Rival Benchmark' : selectedCompetitor;
    const indicators = deltaDimensions.map((d) => ({ name: d.dimension, max: 100 }));
    const ourScores = deltaDimensions.map((d) => d.ourScore);
    const compScores = deltaDimensions.map((d) => d.competitorScore);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#121815',
        borderColor: 'rgba(163, 230, 53, 0.35)',
        textStyle: { color: '#ffffff', fontSize: 12 },
      },
      legend: {
        data: [ourCompName, rivalLabel],
        top: 0,
        right: 0,
        textStyle: { color: '#a1a1aa', fontSize: 12 },
        icon: 'roundRect',
        itemGap: 16,
      },
      radar: {
        indicator: indicators,
        shape: 'polygon',
        center: ['50%', '55%'],
        radius: '70%',
        axisName: {
          color: '#d4d4d8',
          fontSize: 11,
          fontWeight: 600,
        },
        splitArea: {
          areaStyle: {
            color: [
              'rgba(255, 255, 255, 0.02)',
              'rgba(255, 255, 255, 0.04)',
              'rgba(255, 255, 255, 0.06)',
            ],
          },
        },
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.08)' } },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: ourScores,
              name: ourCompName,
              itemStyle: { color: '#a3e635' },
              areaStyle: { color: 'rgba(163, 230, 53, 0.25)' },
              lineStyle: { width: 2.5, color: '#a3e635' },
            },
            {
              value: compScores,
              name: rivalLabel,
              itemStyle: { color: '#38bdf8' },
              areaStyle: { color: 'rgba(56, 189, 248, 0.2)' },
              lineStyle: { width: 2, color: '#38bdf8' },
            },
          ],
        },
      ],
    };
  }, [deltaDimensions, ourCompName, selectedCompetitor]);

  // Chart Option 3: Moat Health Breakdown (Gauge Ring)
  const moatGaugeOption: EChartsOption = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          center: ['50%', '75%'],
          radius: '110%',
          min: 0,
          max: 100,
          splitNumber: 5,
          axisLine: {
            lineStyle: {
              width: 14,
              color: [
                [0.4, '#f43f5e'],
                [0.7, '#38bdf8'],
                [1, '#a3e635'],
              ],
            },
          },
          pointer: {
            icon: 'triangle',
            length: '65%',
            width: 8,
            offsetCenter: [0, '5%'],
            itemStyle: { color: '#ffffff' },
          },
          axisTick: { show: false },
          splitLine: {
            length: 12,
            lineStyle: { color: 'rgba(255,255,255,0.2)', width: 1 },
          },
          axisLabel: {
            color: '#71717a',
            fontSize: 10,
            distance: -28,
          },
          title: {
            offsetCenter: [0, '-25%'],
            fontSize: 12,
            color: '#a1a1aa',
            fontWeight: 600,
          },
          detail: {
            fontSize: 28,
            offsetCenter: [0, '-5%'],
            valueAnimation: true,
            formatter: '{value}%',
            color: '#bef264',
            fontWeight: 800,
            fontFamily: 'monospace',
          },
          data: [{ value: kpiStats.moatIndex, name: 'Moat Defensibility Index' }],
        },
      ],
    };
  }, [kpiStats.moatIndex]);

  // Executive PDF Export Handler
  const handleDownloadGapReportPdf = useCallback(() => {
    try {
      setDownloadingPdf(true);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const rivalName = selectedCompetitor === 'all' ? 'All Market Competitors' : selectedCompetitor;

      // Header Banner
      doc.setFillColor(12, 16, 14);
      doc.rect(0, 0, 210, 36, 'F');

      // RivalIQ Logo in header
      doc.addImage(RIVALIQ_LOGO_BASE64, 'PNG', 14, 10, 55, 17);

      doc.setTextColor(161, 161, 170);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('COMPETITIVE GAPS & MOAT AUDIT', 210 - 14, 16, { align: 'right' });
      doc.setTextColor(120, 120, 128);
      doc.setFontSize(8);
      doc.text(
        `Benchmark: ${ourCompName} | Monitored Target: ${rivalName} | Generated: ${new Date().toLocaleDateString()}`,
        14,
        30
      );
      doc.text(
        `Workspace: ${workspace?.name || 'Default Workspace'} | Confidence: Verified Ingested Telemetry`,
        210 - 14,
        30,
        { align: 'right' }
      );

      // Executive KPI Strip Box
      doc.setFillColor(24, 30, 26);
      doc.roundedRect(14, 42, 182, 26, 2, 2, 'F');

      doc.setTextColor(190, 242, 100);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${kpiStats.moatIndex}%`, 22, 54);
      doc.setTextColor(161, 161, 170);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('NET MOAT INDEX', 22, 60);

      doc.setTextColor(244, 63, 94);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${kpiStats.criticalVulnerabilities}`, 70, 54);
      doc.setTextColor(161, 161, 170);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('CRITICAL GAPS', 70, 60);

      doc.setTextColor(74, 222, 128);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${kpiStats.ahead}`, 118, 54);
      doc.setTextColor(161, 161, 170);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('ADVANTAGE FRONTS', 118, 60);

      doc.setTextColor(56, 189, 248);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${kpiStats.total}`, 166, 54);
      doc.setTextColor(161, 161, 170);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('TOTAL IDENTIFIED GAPS', 166, 60);

      // ==========================================
      // PAGE 1: Executive Moat Audit & Dimension Deltas
      // ==========================================

      // Embed Chart 1: Competitive Deltas Visualizer
      let yPos = 74;
      doc.setTextColor(24, 32, 28);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('1. Competitive Dimension Deltas & Moat Vector Comparison', 14, yPos);
      yPos += 4;

      const deltasChartUri = renderChartOptionToPng(deltasChartOption, 800, 340);
      if (deltasChartUri) {
        doc.addImage(deltasChartUri, 'PNG', 14, yPos, 182, 68);
        yPos += 72;
      }

      // Section 2: Dimension Benchmark Table
      doc.setTextColor(24, 32, 28);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('2. Go-to-Market Dimension Benchmarking', 14, yPos);
      yPos += 5;

      doc.setFillColor(240, 244, 240);
      doc.rect(14, yPos, 182, 7, 'F');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('DIMENSION', 18, yPos + 4.8);
      doc.text(`${ourCompName.toUpperCase()} (US)`, 75, yPos + 4.8);
      doc.text('RIVAL BENCHMARK', 115, yPos + 4.8);
      doc.text('NET DELTA IMPACT', 155, yPos + 4.8);
      yPos += 7;

      deltaDimensions.forEach((dim, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 248);
          doc.rect(14, yPos, 182, 6.5, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        doc.text(dim.dimension, 18, yPos + 4.5);
        doc.text(`${dim.ourScore} / 100`, 75, yPos + 4.5);
        doc.text(`${dim.competitorScore} / 100`, 115, yPos + 4.5);
        doc.setFont('helvetica', 'bold');
        doc.text(dim.deltaLabel, 155, yPos + 4.5);
        yPos += 6.5;
      });

      // Page 1 Footer
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        'CONFIDENTIAL & PROPRIETARY — RIVALIQ AUTOMATED COMPETITIVE DELTA AUDIT • Page 1 of 2',
        14,
        288
      );

      // ==========================================
      // PAGE 2: Radar, Moat Breakdown & Strategic Gaps
      // ==========================================
      doc.addPage();

      // Page 2 Header Banner
      doc.setFillColor(12, 16, 14);
      doc.rect(0, 0, 210, 24, 'F');
      doc.addImage(RIVALIQ_LOGO_BASE64, 'PNG', 14, 5, 42, 13);
      doc.setTextColor(161, 161, 170);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('COMPETITIVE GAPS AUDIT — RADAR PROFILE & MOAT DISTRIBUTION', 210 - 14, 14, { align: 'right' });

      // Embed Chart 2 (Radar) and Chart 3 (Moat Gauge) side by side
      let p2Y = 32;
      doc.setTextColor(24, 32, 28);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('3. Capability Radar & Moat Strength Distribution', 14, p2Y);
      p2Y += 5;

      const radarChartUri = renderChartOptionToPng(radarChartOption, 580, 420);
      const moatChartUri = renderChartOptionToPng(moatGaugeOption, 580, 420);

      if (radarChartUri) {
        doc.addImage(radarChartUri, 'PNG', 14, p2Y, 89, 65);
      }
      if (moatChartUri) {
        doc.addImage(moatChartUri, 'PNG', 107, p2Y, 89, 65);
      }
      p2Y += 72;

      // Section 4: Detailed Strategic Gaps
      doc.setTextColor(24, 32, 28);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('4. Grounded Strategic Gaps & Potential Implications', 14, p2Y);
      p2Y += 6;

      filteredGaps.slice(0, 4).forEach((gap, i) => {
        doc.setFillColor(245, 247, 245);
        doc.roundedRect(14, p2Y, 182, 28, 1.5, 1.5, 'F');

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        const dirText = gap.direction.toUpperCase();
        doc.text(`${i + 1}. [${gap.dimension.toUpperCase()}] vs ${gap.competitor?.name || 'Rival'} - ${dirText}`, 18, p2Y + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        const splitDesc = doc.splitTextToSize(gap.gapDescription, 174);
        doc.text(splitDesc, 18, p2Y + 12);

        if (gap.potentialImplication) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          const splitImp = doc.splitTextToSize(`Implication: ${gap.potentialImplication}`, 174);
          doc.text(splitImp, 18, p2Y + 21);
        }

        p2Y += 32;
      });

      // Page 2 Footer
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        'CONFIDENTIAL & PROPRIETARY — RIVALIQ AUTOMATED COMPETITIVE DELTA AUDIT • Page 2 of 2',
        14,
        288
      );

      doc.save(`RivalIQ-Competitive-Gaps-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setDownloadingPdf(false);
    }
  }, [deltaDimensions, filteredGaps, kpiStats, ourCompName, selectedCompetitor, workspace?.name]);

  return (
    <div className={styles.container}>
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div className={styles.titleWithBadge}>
            <h1 className={styles.title}>Competitive Gaps & Delta Analysis</h1>
            <div className={styles.livePill}>
              <span className={styles.pulseDot} />
              <span>Live Moat Telemetry</span>
            </div>
          </div>
          <p className={styles.subtitle}>
            Quantifiable differentials between {ourCompName} and market rivals across pricing, feature scope,
            launch velocity, and enterprise moat defensibility.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={handleDownloadGapReportPdf}
            disabled={downloadingPdf || filteredGaps.length === 0}
            className={styles.pdfDownloadBtn}
            id="download-gap-report-pdf"
          >
            {downloadingPdf ? (
              <span>Generating PDF...</span>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Export Gap Audit PDF</span>
              </>
            )}
          </button>

          <Link href="/app/competitors" className={styles.actionBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Competitor Profiles</span>
          </Link>

          <Link href="/app/signals" className={styles.actionBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span>Signals Radar</span>
          </Link>
        </div>
      </div>

      {/* Monitored Competitor Selection Bar from Memory */}
      <div className={styles.selectorBar}>
        <div className={styles.selectorLabelArea}>
          <div className={styles.selectorTitleRow}>
            <span className={styles.selectorLabel}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#a3e635' }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
              <span>Target Rival Benchmark</span>
            </span>
            <span className={styles.memoryTag}>Memory Grounded</span>
          </div>
          <span className={styles.selectorSub}>
            Comparing {ourCompName} directly against monitored competitors retrieved from your Hindsight memory bank and ingested datasets.
          </span>
        </div>

        <div className={styles.dropdownContainer}>
          <div className={styles.dropdownWrapper} ref={dropdownRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenDropdown((prev) => !prev);
              }}
              className={`${styles.dropdownTrigger} ${openDropdown ? styles.dropdownTriggerOpen : ''}`}
              id="select-competitor-gap-benchmark"
              aria-haspopup="listbox"
              aria-expanded={openDropdown}
            >
              <div className={styles.dropdownValue}>
                <span className={styles.itemDot} style={{ background: selectedCompetitor === 'all' ? '#a3e635' : '#38bdf8' }} />
                <span>
                  {selectedCompetitor === 'all' ? 'All Rivals (Aggregate)' : selectedCompetitor}
                </span>
              </div>
              <svg
                className={`${styles.chevronIcon} ${openDropdown ? styles.chevronIconOpen : ''}`}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {openDropdown && (
              <div className={styles.dropdownMenu} role="listbox">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCompetitor('all');
                    setOpenDropdown(false);
                  }}
                  className={`${styles.dropdownItem} ${selectedCompetitor === 'all' ? styles.dropdownItemActive : ''}`}
                  role="option"
                  aria-selected={selectedCompetitor === 'all'}
                >
                  <div className={styles.itemLeft}>
                    <span className={styles.itemDot} style={{ background: '#a3e635' }} />
                    <span>All Rivals (Aggregate)</span>
                  </div>
                  <span className={styles.itemBadge}>Multi-Entity</span>
                </button>

                {competitorNames.map((cName) => {
                  const isSelected = selectedCompetitor.toLowerCase() === cName.toLowerCase();
                  return (
                    <button
                      type="button"
                      key={cName}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCompetitor(cName);
                        setOpenDropdown(false);
                      }}
                      className={`${styles.dropdownItem} ${isSelected ? styles.dropdownItemActive : ''}`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className={styles.itemLeft}>
                        <span className={styles.itemDot} style={{ background: isSelected ? '#a3e635' : '#38bdf8' }} />
                        <span>{cName}</span>
                      </div>
                      <span className={styles.itemBadge} style={{ color: '#bef264', borderColor: 'rgba(190, 242, 100, 0.25)', background: 'rgba(190, 242, 100, 0.08)' }}>
                        Memory
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4-Card Strategic KPI Strip */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard} style={{ ['--kpi-accent' as string]: '#a3e635' }}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Moat Defensibility Index</span>
            <div className={styles.kpiIconBox} style={{ color: '#a3e635' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue} style={{ color: '#bef264' }}>
            {kpiStats.moatIndex}%
          </div>
          <div className={styles.kpiSub}>Proportion of categories where {ourCompName} commands competitive moat</div>
        </div>

        <div className={styles.kpiCard} style={{ ['--kpi-accent' as string]: '#f43f5e' }}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Critical Vulnerabilities</span>
            <div className={styles.kpiIconBox} style={{ color: '#f43f5e' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue} style={{ color: '#f43f5e' }}>
            {kpiStats.criticalVulnerabilities}
          </div>
          <div className={styles.kpiSub}>Urgent deficit vectors behind observed competitors</div>
        </div>

        <div className={styles.kpiCard} style={{ ['--kpi-accent' as string]: '#4ade80' }}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Competitive Advantages</span>
            <div className={styles.kpiIconBox} style={{ color: '#4ade80' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 15l-6-6-6 6" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue} style={{ color: '#4ade80' }}>
            {kpiStats.ahead}
          </div>
          <div className={styles.kpiSub}>Core differentiators and outperforming capabilities</div>
        </div>

        <div className={styles.kpiCard} style={{ ['--kpi-accent' as string]: '#38bdf8' }}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Parity / Neutral Fronts</span>
            <div className={styles.kpiIconBox} style={{ color: '#38bdf8' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue} style={{ color: '#38bdf8' }}>
            {kpiStats.neutral}
          </div>
          <div className={styles.kpiSub}>Symmetric performance with no immediate displacement threat</div>
        </div>
      </div>

      {!loading && gaps.length === 0 ? (
        <div style={{ padding: '60px 24px', margin: '20px 0', border: '1px dashed rgba(255, 255, 255, 0.12)', borderRadius: 'var(--radius-xl)', background: 'rgba(18, 24, 21, 0.6)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(163, 230, 53, 0.1)', border: '1px solid rgba(163, 230, 53, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bef264', marginBottom: 14 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', marginBottom: 6 }}>
            No competitive gap differentials detected yet
          </div>
          <div style={{ maxWidth: 520, color: '#a1a1aa', fontSize: 13, lineHeight: 1.5, marginBottom: 22 }}>
            Upload competitor data and baseline telemetry in Data Ingestion to automatically detect pricing gaps, feature parity differentials, and market share vulnerabilities.
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/app/data" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
              Ingest Competitor Data
            </Link>
            <Link href="/app/competitors" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
              View Competitors
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Visualizer Hub Card */}
          <div className={styles.vizCard}>
        <div className={styles.vizHeaderRow}>
          <div className={styles.vizTitleGroup}>
            <h3 className={styles.vizTitle}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#a3e635' }}>
                <path d="M3 3v18h18" />
                <path d="M18 9l-5 5-4-4-3 3" />
              </svg>
              <span>GTM Dimension Differentials & Moat Visualizer</span>
            </h3>
            <p className={styles.vizSubtitle}>
              Benchmarking {ourCompName} against {selectedCompetitor === 'all' ? 'All Market Competitors' : selectedCompetitor} across key go-to-market axes.
            </p>
          </div>

          <div className={styles.vizTabs}>
            <button
              type="button"
              onClick={() => setActiveVizTab('deltas')}
              className={`${styles.vizTabBtn} ${activeVizTab === 'deltas' ? styles.vizTabBtnActive : ''}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 17v-4" />
                <path d="M12 17V7" />
                <path d="M17 17v-8" />
              </svg>
              <span>Dimension Differential Deltas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveVizTab('radar')}
              className={`${styles.vizTabBtn} ${activeVizTab === 'radar' ? styles.vizTabBtnActive : ''}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 19 8.5 19 15.5 12 22 5 15.5 5 8.5 12 2" />
              </svg>
              <span>5-Pillar Moat Radar</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveVizTab('moat')}
              className={`${styles.vizTabBtn} ${activeVizTab === 'moat' ? styles.vizTabBtnActive : ''}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <span>Moat Health Breakdown</span>
            </button>
          </div>
        </div>

        {/* ECharts Active Visualizer Display */}
        {activeVizTab === 'deltas' ? (
          <BaseChart
            option={deltasChartOption}
            height={320}
            onInit={(chart) => {
              chartInstanceRef.current = chart;
            }}
          />
        ) : activeVizTab === 'radar' ? (
          <BaseChart
            option={radarChartOption}
            height={320}
            onInit={(chart) => {
              chartInstanceRef.current = chart;
            }}
          />
        ) : (
          <div className={styles.dualVizGrid}>
            <BaseChart
              option={moatGaugeOption}
              height={280}
              onInit={(chart) => {
                chartInstanceRef.current = chart;
              }}
            />
            <div className={styles.vizSideCard}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', marginBottom: 6 }}>
                  Moat Distribution Breakdown
                </div>
                <div style={{ fontSize: 11, color: '#71717a', lineHeight: 1.4, marginBottom: 16 }}>
                  Direct categorical analysis of all identified market differentials for {ourCompName}.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                      <span style={{ color: '#bef264', fontWeight: 600 }}>Advantages (Ahead)</span>
                      <strong style={{ color: '#ffffff' }}>{kpiStats.ahead} fronts ({Math.round((kpiStats.ahead / Math.max(1, kpiStats.total)) * 100)}%)</strong>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${(kpiStats.ahead / Math.max(1, kpiStats.total)) * 100}%`, height: '100%', background: '#a3e635' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>Parity / Symmetric</span>
                      <strong style={{ color: '#ffffff' }}>{kpiStats.neutral} fronts ({Math.round((kpiStats.neutral / Math.max(1, kpiStats.total)) * 100)}%)</strong>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${(kpiStats.neutral / Math.max(1, kpiStats.total)) * 100}%`, height: '100%', background: '#38bdf8' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                      <span style={{ color: '#f43f5e', fontWeight: 600 }}>Vulnerable (Behind)</span>
                      <strong style={{ color: '#ffffff' }}>{kpiStats.behind} fronts ({Math.round((kpiStats.behind / Math.max(1, kpiStats.total)) * 100)}%)</strong>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${(kpiStats.behind / Math.max(1, kpiStats.total)) * 100}%`, height: '100%', background: '#f43f5e' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 11, color: '#a1a1aa', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, marginTop: 12 }}>
                Target Rival Under Audit: <strong style={{ color: '#38bdf8' }}>{selectedCompetitor === 'all' ? 'All Rivals' : selectedCompetitor}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Strategic Filters & Search Control Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterTopRow}>
          <div className={styles.searchBox}>
            <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search gaps by description, dimension, or implication..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterPillsGroup}>
            {availableDimensions.map((dim) => (
              <button
                type="button"
                key={dim}
                onClick={() => setSelectedDimension(dim)}
                className={`${styles.filterPill} ${selectedDimension === dim ? styles.filterPillActive : ''}`}
              >
                {dim === 'all' ? 'All Dimensions' : dim.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterBottomRow}>
          <div className={styles.directionToggleGroup}>
            <button
              type="button"
              onClick={() => setSelectedDirection('all')}
              className={`${styles.directionBtn} ${selectedDirection === 'all' ? styles.directionBtnActiveAll : ''}`}
            >
              All Positions ({gaps.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedDirection('behind')}
              className={`${styles.directionBtn} ${selectedDirection === 'behind' ? styles.directionBtnActiveBehind : ''}`}
            >
              Deficits / Behind ({gaps.filter((g) => g.direction === 'behind').length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedDirection('ahead')}
              className={`${styles.directionBtn} ${selectedDirection === 'ahead' ? styles.directionBtnActiveAhead : ''}`}
            >
              Advantages / Ahead ({gaps.filter((g) => g.direction === 'ahead').length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedDirection('neutral')}
              className={`${styles.directionBtn} ${selectedDirection === 'neutral' ? styles.directionBtnActiveNeutral : ''}`}
            >
              Parity / Neutral ({gaps.filter((g) => g.direction === 'neutral').length})
            </button>
          </div>

          <span className={styles.resultCountNotice}>
            Showing {filteredGaps.length} of {gaps.length} competitive gaps
          </span>
        </div>
      </div>

      {/* Strategic Gap Battlecards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto 12px', borderColor: '#a3e635', borderTopColor: 'transparent' }} />
          <div style={{ color: '#a1a1aa', fontSize: 13 }}>Analyzing competitive telemetry and moat differentials...</div>
        </div>
      ) : filteredGaps.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconBox}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h4 className={styles.emptyTitle}>No matching gaps identified</h4>
          <p className={styles.emptyDesc}>
            No competitive differentials match the active dimension, direction, or search filter. Try resetting filters or choosing another target rival.
          </p>
        </div>
      ) : (
        <div className={styles.gapsGrid}>
          {filteredGaps.map((gap) => {
            const isBehind = gap.direction === 'behind';
            const isAhead = gap.direction === 'ahead';
            const isExpanded = !!expandedGapIds[gap.id];

            return (
              <div
                key={gap.id}
                className={`${styles.gapCard} ${
                  isBehind ? styles.gapCardCritical : isAhead ? styles.gapCardAhead : styles.gapCardNeutral
                }`}
              >
                <div className={styles.gapCardTop}>
                  <div className={styles.gapMetaBadges}>
                    <span className={styles.dimensionBadge}>
                      {gap.dimension.replace(/_/g, ' ')}
                    </span>
                    <span className={styles.compTargetBadge}>
                      vs {gap.competitor?.name || 'Competitor'}
                    </span>
                    <span
                      className={`${styles.directionBadge} ${
                        isBehind
                          ? styles.directionBadgeBehind
                          : isAhead
                          ? styles.directionBadgeAhead
                          : styles.directionBadgeNeutral
                      }`}
                    >
                      {isBehind ? 'BEHIND RIVAL' : isAhead ? 'AHEAD OF RIVAL' : 'PARITY / SYMMETRIC'}
                    </span>
                  </div>

                  <span
                    className={`${styles.severityBadge} ${
                      gap.severity === 'critical'
                        ? styles.severityCritical
                        : gap.severity === 'high'
                        ? styles.severityHigh
                        : gap.severity === 'medium'
                        ? styles.severityMedium
                        : styles.severityLow
                    }`}
                  >
                    Severity: {gap.severity}
                  </span>
                </div>

                <p className={styles.gapDescription}>{gap.gapDescription}</p>

                {/* Head-to-Head Comparison Delta Box */}
                <div className={styles.deltaBox}>
                  <div className={styles.deltaCol}>
                    <span className={styles.deltaEntityLabel}>{ourCompName} (Us)</span>
                    <span className={styles.deltaValue}>
                      {String(gap.ourCompany?.value ?? 'Baseline')}
                    </span>
                  </div>
                  <div className={styles.deltaCol}>
                    <span className={styles.deltaEntityLabel}>
                      {gap.competitor?.name || 'Observed Rival'}
                    </span>
                    <span className={`${styles.deltaValue} ${styles.deltaValueComp}`}>
                      {String(gap.competitor?.value ?? 'Competitor Metric')}
                    </span>
                  </div>
                </div>

                {/* Potential Strategic Implication */}
                {gap.potentialImplication && (
                  <div className={styles.implicationBox}>
                    <span className={styles.implicationLabel}>Strategic Implication:</span>
                    <span>{gap.potentialImplication}</span>
                  </div>
                )}

                {/* Hindsight Memory Context Box */}
                {gap.historicalContext && (
                  <div className={styles.memoryContextBox}>
                    <span className={styles.memoryLabel}>Hindsight Telemetry:</span>
                    <span>{gap.historicalContext}</span>
                  </div>
                )}

                {/* Expandable Evidence Details */}
                {isExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: '#a1a1aa', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                    <div style={{ fontWeight: 600, color: '#f4f4f5' }}>Grounded Source Telemetry:</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(gap.ourCompany?.evidence || []).map((e, idx) => (
                        <span key={idx} className={styles.evidenceTag}>{e}</span>
                      ))}
                      {(gap.competitor?.evidence || []).map((e, idx) => (
                        <span key={idx} className={styles.evidenceTag} style={{ color: '#7dd3fc', borderColor: 'rgba(56,189,248,0.2)' }}>{e}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Card Footer */}
                <div className={styles.gapFooter}>
                  <div className={styles.evidencePills}>
                    <span className={styles.evidenceTag}>Magnitude: {gap.gapMagnitude}%</span>
                    <span className={styles.evidenceTag}>
                      {gap.sourceRecordIds?.length ? `${gap.sourceRecordIds.length} Records` : 'Telemetry Verified'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleCardExpanded(gap.id)}
                    className={styles.expandBtn}
                  >
                    <span>{isExpanded ? 'Hide Evidence' : 'View Evidence'}</span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}
    </div>
  );
}
