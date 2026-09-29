// ============================================================
// What-If Strategic Simulation Engine
// Real-Time Reactive Trajectory Forecasting & Live Impact Reporting
// ============================================================

'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { BaseChart } from '@/components/charts/ECharts';
import type { EChartsOption, ECharts as EChartsInstance } from 'echarts';
import jsPDF from 'jspdf';
import { RIVALIQ_LOGO_BASE64 } from '@/lib/brand/logoData';
import { renderChartOptionToPng } from '@/components/charts/chartExport';
import styles from './simulation.module.css';

type VizTabType = 'revenue' | 'winrate' | 'deltas';
type HorizonType = '3 months' | '6 months' | '12 months' | '24 months';

interface SliderAssumption {
  id: string;
  variable: string;
  description: string;
  currentValue: number;
  assumedValue: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  weight: number;
}

function SimulationInner() {
  const { token, workspace, getToken } = useAuth();
  const searchParams = useSearchParams();

  // Scenario Header Parameters
  const [targetObjective, setTargetObjective] = useState(
    searchParams.get('target') || 'Increase Competitive Win Rate & DTC Market Share against Rival by 15%'
  );
  const [strategyDescription, setStrategyDescription] = useState(
    searchParams.get('strategy') ||
      'Deploy dynamic price-matching bands, accelerate SNKRS drop cadence, and reinforce regional specialty wholesale end-caps.'
  );
  const [timeHorizon, setTimeHorizon] = useState<HorizonType>('12 months');
  const [activeVizTab, setActiveVizTab] = useState<VizTabType>('revenue');
  const [activePreset, setActivePreset] = useState<'conservative' | 'baseline' | 'aggressive' | 'custom'>('baseline');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Competitor memory dropdown
  const [competitorNames, setCompetitorNames] = useState<string[]>([]);
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>('');
  const [openDropdown, setOpenDropdown] = useState(false);
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

  // Resolve internal baseline company name
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

  // 5 Strategic Assumption Levers (The "Bars")
  const [assumptions, setAssumptions] = useState<SliderAssumption[]>([
    {
      id: 'elasticity',
      variable: 'Rival Price Elasticity & Discounting',
      description: 'Consumer sensitivity and shift when competitor initiates promotional flash sales',
      currentValue: 1.0,
      assumedValue: 1.35,
      min: 0.5,
      max: 2.2,
      step: 0.05,
      unit: 'x',
      weight: 1.4,
    },
    {
      id: 'churn',
      variable: 'Quarterly Customer Churn Risk',
      description: 'Customer attrition rate across casual and enthusiast athletic footwear segments',
      currentValue: 4.2,
      assumedValue: 2.7,
      min: 1.0,
      max: 7.0,
      step: 0.1,
      unit: '%',
      weight: 1.8,
    },
    {
      id: 'velocity',
      variable: 'Sales Cycle & Drop Velocity',
      description: 'Transit cycle duration from high-heat digital drop announcement to 100% sell-through',
      currentValue: 45,
      assumedValue: 28,
      min: 15,
      max: 60,
      step: 1,
      unit: 'days',
      weight: 1.2,
    },
    {
      id: 'innovation',
      variable: 'Product Innovation & Tech Matrix Lead',
      description: 'Ergonomic cushioning and material superiority score over rival catalog',
      currentValue: 1.0,
      assumedValue: 1.4,
      min: 0.7,
      max: 2.0,
      step: 0.05,
      unit: 'x',
      weight: 1.5,
    },
    {
      id: 'shelf',
      variable: 'Wholesale Specialty Shelf Floor Defense',
      description: 'Secured priority end-cap floor space across independent and retail partner doors',
      currentValue: 50,
      assumedValue: 68,
      min: 25,
      max: 90,
      step: 1,
      unit: '%',
      weight: 1.1,
    },
  ]);

  // Fetch verified rivals from memory (strict memory extraction)
  useEffect(() => {
    const fetchMemoryCompetitors = async () => {
      const activeToken = (await getToken()) || token;
      if (!activeToken || !workspaceId) return;

      try {
        const rivalSet = new Set<string>();

        // 1. Fetch memory bank references
        const memRes = await fetch(`/api/memory?workspaceId=${workspaceId}`, {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        const memData = await memRes.json();
        (memData.references || []).forEach(
          (r: { competitor?: string; entity?: string; competitorName?: string; name?: string }) => {
            const c = r.competitor || r.entity || r.competitorName || r.name;
            if (c && !isOurCompany(c) && c.toUpperCase() !== 'GROQ') rivalSet.add(c.trim());
          }
        );
        (memData.hindsightMemories || []).forEach(
          (m: { competitor?: string; entity?: string; competitorName?: string; metadata?: { competitor?: string } }) => {
            const c = m.competitor || m.entity || m.competitorName || m.metadata?.competitor;
            if (c && !isOurCompany(c) && c.toUpperCase() !== 'GROQ') rivalSet.add(c.trim());
          }
        );

        // 2. Fetch datasets
        const dsRes = await fetch(`/api/datasets?workspaceId=${workspaceId}`, {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        const dsData = await dsRes.json();
        (dsData.datasets || []).forEach((d: { detectedCompetitors?: string[] }) => {
          (d.detectedCompetitors || []).forEach((c) => {
            if (c && !isOurCompany(c) && c.toUpperCase() !== 'GROQ') rivalSet.add(c.trim());
          });
        });

        const rivals = Array.from(rivalSet);
        setCompetitorNames(rivals);
        if (rivals.length > 0 && !selectedCompetitor) {
          setSelectedCompetitor(rivals[0]);
        }
      } catch (err) {
        console.warn('Memory fetch notice:', err);
      }
    };

    fetchMemoryCompetitors();
  }, [getToken, token, workspaceId, isOurCompany, selectedCompetitor]);

  // Update specific assumption lever
  const handleAssumptionChange = (id: string, newVal: number) => {
    setAssumptions((prev) =>
      prev.map((asm) => (asm.id === id ? { ...asm, assumedValue: newVal } : asm))
    );
    setActivePreset('custom');
  };

  // Preset Scenario Handlers
  const applyPreset = (preset: 'conservative' | 'baseline' | 'aggressive') => {
    setActivePreset(preset);
    if (preset === 'conservative') {
      setAssumptions([
        { ...assumptions[0], assumedValue: 1.15 },
        { ...assumptions[1], assumedValue: 3.5 },
        { ...assumptions[2], assumedValue: 38 },
        { ...assumptions[3], assumedValue: 1.15 },
        { ...assumptions[4], assumedValue: 56 },
      ]);
    } else if (preset === 'aggressive') {
      setAssumptions([
        { ...assumptions[0], assumedValue: 1.65 },
        { ...assumptions[1], assumedValue: 1.9 },
        { ...assumptions[2], assumedValue: 20 },
        { ...assumptions[3], assumedValue: 1.7 },
        { ...assumptions[4], assumedValue: 82 },
      ]);
    } else {
      // Baseline defaults
      setAssumptions([
        { ...assumptions[0], assumedValue: 1.35 },
        { ...assumptions[1], assumedValue: 2.7 },
        { ...assumptions[2], assumedValue: 28 },
        { ...assumptions[3], assumedValue: 1.4 },
        { ...assumptions[4], assumedValue: 68 },
      ]);
    }
  };

  // Reset to initial baseline
  const resetToBaseline = () => {
    setAssumptions((prev) =>
      prev.map((asm) => ({ ...asm, assumedValue: asm.currentValue }))
    );
    setActivePreset('baseline');
  };

  // ============================================================
  // REAL-TIME REACTIVE SIMULATION CALCULATIONS
  // As the user changes the sliders, all values, graphs, and the report update immediately!
  // ============================================================
  const simulationModel = useMemo(() => {
    const elasticity = assumptions.find((a) => a.id === 'elasticity')?.assumedValue ?? 1.0;
    const churn = assumptions.find((a) => a.id === 'churn')?.assumedValue ?? 4.2;
    const velocity = assumptions.find((a) => a.id === 'velocity')?.assumedValue ?? 45;
    const innovation = assumptions.find((a) => a.id === 'innovation')?.assumedValue ?? 1.0;
    const shelf = assumptions.find((a) => a.id === 'shelf')?.assumedValue ?? 50;

    // Time horizon multiplier (3 mo = 0.4, 6 mo = 0.75, 12 mo = 1.0, 24 mo = 1.65)
    let horizonFactor = 1.0;
    if (timeHorizon === '3 months') horizonFactor = 0.45;
    else if (timeHorizon === '6 months') horizonFactor = 0.75;
    else if (timeHorizon === '24 months') horizonFactor = 1.65;

    // 1. Revenue Lift Calculation
    // Base monthly DTC and wholesale revenue ~$3,210M / mo ($38.5B/yr)
    const churnSavings = (4.2 - churn) * 8.4; // $M per point saved
    const elasticityLift = (elasticity - 1.0) * 16.5;
    const velocityGain = ((45 - velocity) / 45) * 18.2;
    const techLeadImpact = (innovation - 1.0) * 22.0;
    const shelfDefenseImpact = ((shelf - 50) / 50) * 12.0;

    const netAnnualizedLift = Math.max(
      2.0,
      (churnSavings + elasticityLift + velocityGain + techLeadImpact + shelfDefenseImpact + 8.0) * horizonFactor
    );
    const revenueGrowthPercent = parseFloat(((netAnnualizedLift / 385) * 10).toFixed(1));

    // 2. Win Rate vs Rival
    // Base win rate is 53.0%
    const winRateShift =
      (innovation - 1.0) * 14 +
      ((45 - velocity) / 45) * 8 +
      (elasticity - 1.0) * 6;
    const simulatedWinRate = Math.min(88, Math.max(40, parseFloat((53.0 + winRateShift).toFixed(1))));
    const winRateDelta = parseFloat((simulatedWinRate - 53.0).toFixed(1));

    // 3. Churn Deflection
    const churnDeflectionPercent = parseFloat(Math.max(0, 4.2 - churn).toFixed(1));

    // 4. Moat Defensibility Rating
    // Base Moat is 76%
    const moatShift = Math.round(
      (innovation - 1.0) * 12 +
      ((shelf - 50) / 50) * 8 +
      ((45 - velocity) / 45) * 6
    );
    const simulatedMoatScore = Math.min(98, Math.max(50, 76 + moatShift));

    // 5. Market Share Projection
    // Base market share is 13.5%
    const marketShareGain = parseFloat(
      (Math.max(0.2, (netAnnualizedLift / 385) * 1.8)).toFixed(1)
    );
    const simulatedMarketShare = parseFloat((13.5 + marketShareGain).toFixed(1));

    return {
      revenueLiftM: Math.round(netAnnualizedLift),
      revenueGrowthPercent,
      simulatedWinRate,
      winRateDelta,
      churnDeflectionPercent,
      simulatedMoatScore,
      simulatedMarketShare,
      marketShareGain,
      elasticity,
      churn,
      velocity,
      innovation,
      shelf,
    };
  }, [assumptions, timeHorizon]);

  // ============================================================
  // ECHARTS TAB 1: Net Incremental Revenue Lift Trajectory ($M)
  // Dynamic 0-baseline curve that visibly moves across the canvas!
  // ============================================================
  const revenueLiftOption: EChartsOption = useMemo(() => {
    let periods: string[] = [];
    let baselineData: number[] = [];
    let simulatedData: number[] = [];

    const lift = simulationModel.revenueLiftM;

    if (timeHorizon === '3 months') {
      periods = ['Day 0', 'Month 1', 'Month 2', 'Month 3'];
      baselineData = [0, 0, 0, 0];
      simulatedData = [
        0,
        Math.round(lift * 0.38),
        Math.round(lift * 0.72),
        lift,
      ];
    } else if (timeHorizon === '6 months') {
      periods = ['Day 0', 'Month 2', 'Month 4', 'Month 6'];
      baselineData = [0, 0, 0, 0];
      simulatedData = [
        0,
        Math.round(lift * 0.35),
        Math.round(lift * 0.75),
        lift,
      ];
    } else if (timeHorizon === '24 months') {
      periods = ['Baseline (Now)', 'Q1 2027', 'Q3 2027', 'Q1 2028', 'Q3 2028'];
      baselineData = [0, 0, 0, 0, 0];
      simulatedData = [
        0,
        Math.round(lift * 0.28),
        Math.round(lift * 0.62),
        Math.round(lift * 0.90),
        lift,
      ];
    } else {
      // 12 months (default)
      periods = ['Baseline (Now)', 'Q4 2026', 'Q1 2027', 'Q2 2027', 'Q3 2027'];
      baselineData = [0, 0, 0, 0, 0];
      simulatedData = [
        0,
        Math.round(lift * 0.32),
        Math.round(lift * 0.65),
        Math.round(lift * 0.88),
        lift,
      ];
    }

    const yMax = Math.max(30, Math.ceil((lift * 1.3) / 10) * 10);

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 350,
      animationDurationUpdate: 250,
      animationEasingUpdate: 'cubicOut',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#121815',
        borderColor: 'rgba(163, 230, 53, 0.4)',
        borderWidth: 1,
        textStyle: { color: '#ffffff', fontSize: 12 },
        formatter: (params: unknown) => {
          if (!Array.isArray(params)) return '';
          const idx = params[0]?.dataIndex ?? 0;
          const sim = simulatedData[idx];

          let tip = `<div style="font-weight:700;margin-bottom:6px;color:#bef264;">${periods[idx]} Trajectory</div>`;
          tip += `<div style="display:flex;justify-content:space-between;gap:18px;margin:3px 0;">
            <span style="color:#a1a1aa;">Status Quo (Inaction):</span>
            <strong style="color:#ffffff;">+$0M</strong>
          </div>`;
          tip += `<div style="display:flex;justify-content:space-between;gap:18px;margin:3px 0;">
            <span style="color:#bef264;">Simulated Revenue Expansion:</span>
            <strong style="color:#bef264;">+$${sim.toLocaleString()}M / mo</strong>
          </div>`;
          tip += `<div style="margin-top:6px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.1);font-size:11px;color:#38bdf8;">
            Annualized Incremental Lift: <strong>+$${(sim * 12).toLocaleString()}M / yr</strong>
          </div>`;
          return tip;
        },
      },
      legend: {
        data: ['Status Quo (Inaction)', 'Simulated Revenue Expansion'],
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
        data: periods,
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.12)' } },
        axisLabel: { color: '#d4d4d8', fontSize: 11, fontWeight: 500 },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: yMax,
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)', type: 'dashed' } },
        axisLabel: { color: '#71717a', fontSize: 11, formatter: '+$ {value}M' },
      },
      series: [
        {
          name: 'Status Quo (Inaction)',
          type: 'line',
          data: baselineData,
          smooth: true,
          symbolSize: 6,
          lineStyle: { color: '#71717a', width: 2, type: 'dashed' },
          itemStyle: { color: '#71717a' },
        },
        {
          name: 'Simulated Revenue Expansion',
          type: 'line',
          data: simulatedData,
          smooth: true,
          symbolSize: 8,
          lineStyle: { color: '#a3e635', width: 3 },
          itemStyle: { color: '#bef264' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(163, 230, 53, 0.32)' },
                { offset: 1, color: 'rgba(163, 230, 53, 0.01)' },
              ],
            },
          },
        },
      ],
    };
  }, [simulationModel.revenueLiftM, timeHorizon]);

  // ============================================================
  // ECHARTS TAB 2: Competitive Win Rate Trajectory (%)
  // ============================================================
  const winRateOption: EChartsOption = useMemo(() => {
    let periods: string[] = [];
    const baseWinRate = 53.0;
    const simWinRate = simulationModel.simulatedWinRate;

    if (timeHorizon === '3 months') {
      periods = ['Day 0', 'Month 1', 'Month 2', 'Month 3'];
    } else if (timeHorizon === '6 months') {
      periods = ['Day 0', 'Month 2', 'Month 4', 'Month 6'];
    } else if (timeHorizon === '24 months') {
      periods = ['Baseline (Now)', 'Q1 2027', 'Q3 2027', 'Q1 2028', 'Q3 2028'];
    } else {
      periods = ['Baseline (Now)', 'Q4 2026', 'Q1 2027', 'Q2 2027', 'Q3 2027'];
    }

    const baselineData = periods.map(() => baseWinRate);
    const delta = simWinRate - baseWinRate;
    const count = periods.length;
    const simulatedData = periods.map((_, idx) => {
      if (idx === 0) return baseWinRate;
      const progress = idx / (count - 1);
      return parseFloat((baseWinRate + delta * Math.pow(progress, 0.8)).toFixed(1));
    });

    const yMax = Math.min(100, Math.max(75, Math.ceil((simWinRate + 6) / 5) * 5));

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 350,
      animationDurationUpdate: 250,
      animationEasingUpdate: 'cubicOut',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#121815',
        borderColor: 'rgba(56, 189, 248, 0.4)',
        borderWidth: 1,
        textStyle: { color: '#ffffff', fontSize: 12 },
        formatter: (params: unknown) => {
          if (!Array.isArray(params)) return '';
          const idx = params[0]?.dataIndex ?? 0;
          const base = baselineData[idx];
          const sim = simulatedData[idx];
          const adv = (sim - base).toFixed(1);

          let tip = `<div style="font-weight:700;margin-bottom:6px;color:#38bdf8;">${periods[idx]} Win Rate Trajectory</div>`;
          tip += `<div style="display:flex;justify-content:space-between;gap:18px;margin:3px 0;">
            <span style="color:#a1a1aa;">Status Quo vs ${selectedCompetitor}:</span>
            <strong style="color:#ffffff;">${base}%</strong>
          </div>`;
          tip += `<div style="display:flex;justify-content:space-between;gap:18px;margin:3px 0;">
            <span style="color:#38bdf8;">Simulated Strategy Win Rate:</span>
            <strong style="color:#38bdf8;">${sim}%</strong>
          </div>`;
          tip += `<div style="margin-top:6px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.1);font-size:11px;color:#bef264;">
            Advantage Shift over Rival: <strong>+${adv}% pts</strong>
          </div>`;
          return tip;
        },
      },
      legend: {
        data: [`Status Quo (${baseWinRate}%)`, `Simulated Win Rate vs ${selectedCompetitor}`],
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
        data: periods,
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.12)' } },
        axisLabel: { color: '#d4d4d8', fontSize: 11, fontWeight: 500 },
      },
      yAxis: {
        type: 'value',
        min: 40,
        max: yMax,
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)', type: 'dashed' } },
        axisLabel: { color: '#71717a', fontSize: 11, formatter: '{value}%' },
      },
      series: [
        {
          name: `Status Quo (${baseWinRate}%)`,
          type: 'line',
          data: baselineData,
          smooth: true,
          symbolSize: 6,
          lineStyle: { color: '#71717a', width: 2, type: 'dashed' },
          itemStyle: { color: '#71717a' },
        },
        {
          name: `Simulated Win Rate vs ${selectedCompetitor}`,
          type: 'line',
          data: simulatedData,
          smooth: true,
          symbolSize: 8,
          lineStyle: { color: '#38bdf8', width: 3 },
          itemStyle: { color: '#7dd3fc' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(56, 189, 248, 0.32)' },
                { offset: 1, color: 'rgba(56, 189, 248, 0.01)' },
              ],
            },
          },
        },
      ],
    };
  }, [simulationModel.simulatedWinRate, selectedCompetitor, timeHorizon]);

  // ============================================================
  // ECHARTS TAB 3: Key Metric Head-to-Head Deltas
  // Compares Baseline vs Simulated across 5 core business metrics
  // ============================================================
  const deltasOption: EChartsOption = useMemo(() => {
    const categories = [
      'Incremental Net Lift ($M)',
      'Win Rate vs Rival (%)',
      'Churn Saved (% x10)',
      'Drop Velocity Speed',
      'Moat Defensibility',
    ];

    const baselineScores = [0, 53, 0, 45, 76];
    const velocitySpeedIndex = Math.min(95, Math.round(45 + ((45 - simulationModel.velocity) / 45) * 45));

    const simulatedScores = [
      simulationModel.revenueLiftM,
      simulationModel.simulatedWinRate,
      parseFloat((simulationModel.churnDeflectionPercent * 10).toFixed(1)),
      velocitySpeedIndex,
      simulationModel.simulatedMoatScore,
    ];

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 350,
      animationDurationUpdate: 250,
      animationEasingUpdate: 'cubicOut',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#121815',
        borderColor: 'rgba(163, 230, 53, 0.35)',
        textStyle: { color: '#ffffff', fontSize: 12 },
        formatter: (params: unknown) => {
          if (!Array.isArray(params)) return '';
          const idx = params[0]?.dataIndex ?? 0;
          if (idx === 0) {
            return `<div style="font-weight:700;color:#bef264;">Incremental Net Revenue Lift</div><div>Status Quo: $0M</div><div>Simulated: <strong>+$${simulationModel.revenueLiftM}M / mo</strong></div>`;
          }
          if (idx === 1) {
            return `<div style="font-weight:700;color:#38bdf8;">Competitive Win Rate vs ${selectedCompetitor}</div><div>Current Baseline: 53.0%</div><div>Simulated: <strong>${simulationModel.simulatedWinRate}% (+${simulationModel.winRateDelta}%)</strong></div>`;
          }
          if (idx === 2) {
            return `<div style="font-weight:700;color:#4ade80;">Customer Churn Deflection</div><div>Baseline Churn: 4.2%</div><div>Simulated Churn: <strong>${simulationModel.churn}% (-${simulationModel.churnDeflectionPercent}% pts saved)</strong></div>`;
          }
          if (idx === 3) {
            return `<div style="font-weight:700;color:#f59e0b;">Drop Sell-Through Turnaround</div><div>Baseline Cycle: 45 days</div><div>Simulated Cycle: <strong>${simulationModel.velocity} days (${45 - simulationModel.velocity} days faster)</strong></div>`;
          }
          return `<div style="font-weight:700;color:#c084fc;">Moat Defensibility Score</div><div>Baseline Moat: 76 / 100</div><div>Simulated Moat: <strong>${simulationModel.simulatedMoatScore} / 100</strong></div>`;
        },
      },
      legend: {
        data: ['Current Baseline', 'Simulated Outcome'],
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
        axisLabel: { color: '#d4d4d8', fontSize: 11, interval: 0 },
      },
      yAxis: {
        type: 'value',
        max: 100,
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)', type: 'dashed' } },
        axisLabel: { color: '#71717a', fontSize: 11 },
      },
      series: [
        {
          name: 'Current Baseline',
          type: 'bar',
          barWidth: 20,
          barGap: '30%',
          data: baselineScores,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: '#52525b',
          },
        },
        {
          name: 'Simulated Outcome',
          type: 'bar',
          barWidth: 20,
          data: simulatedScores,
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
      ],
    };
  }, [simulationModel, selectedCompetitor]);

  // Executive PDF Export Handler
  const handleDownloadSimulationPdf = useCallback(() => {
    try {
      setDownloadingPdf(true);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Header Banner
      doc.setFillColor(12, 16, 14);
      doc.rect(0, 0, 210, 36, 'F');

      // RivalIQ Logo in header
      doc.addImage(RIVALIQ_LOGO_BASE64, 'PNG', 14, 10, 55, 17);

      doc.setTextColor(161, 161, 170);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('WHAT-IF STRATEGIC SIMULATION REPORT', 210 - 14, 16, { align: 'right' });
      doc.setTextColor(120, 120, 128);
      doc.setFontSize(8);
      doc.text(
        `Company: ${ourCompName} | Target: ${selectedCompetitor} | Window: ${timeHorizon}`,
        14,
        30
      );
      doc.text(
        `Workspace: ${workspace?.name || 'Default Workspace'} | Mode: Dynamic Sensitivity Simulation`,
        210 - 14,
        30,
        { align: 'right' }
      );

      // Executive Simulated Outcome Strip Box
      doc.setFillColor(24, 30, 26);
      doc.roundedRect(14, 42, 182, 26, 2, 2, 'F');

      doc.setTextColor(190, 242, 100);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`+$${simulationModel.revenueLiftM}M`, 22, 54);
      doc.setTextColor(161, 161, 170);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('PROJECTED REVENUE LIFT', 22, 60);

      doc.setTextColor(56, 189, 248);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${simulationModel.simulatedWinRate}%`, 72, 54);
      doc.setTextColor(161, 161, 170);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`WIN RATE (+${simulationModel.winRateDelta}%)`, 72, 60);

      doc.setTextColor(74, 222, 128);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`-${simulationModel.churnDeflectionPercent}%`, 120, 54);
      doc.setTextColor(161, 161, 170);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('CHURN DEFLECTION', 120, 60);

      doc.setTextColor(192, 132, 252);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${simulationModel.simulatedMoatScore}%`, 168, 54);
      doc.setTextColor(161, 161, 170);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('MOAT SCORE (BASE 76%)', 168, 60);

      // ==========================================
      // PAGE 1: Executive Dashboard & Trajectory Simulation
      // ==========================================
      
      // Embed Chart 1: Revenue Trajectory Simulation Graph
      let yPos = 74;
      doc.setTextColor(24, 32, 28);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('1. Projected Revenue Trajectory & Competitive Market Share Simulation', 14, yPos);
      yPos += 4;

      const revenueChartUri = renderChartOptionToPng(revenueLiftOption, 800, 340);
      if (revenueChartUri) {
        doc.addImage(revenueChartUri, 'PNG', 14, yPos, 182, 68);
        yPos += 72;
      }

      // Section 2: Scenario Levers & Parameters Table
      doc.setTextColor(24, 32, 28);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('2. Simulated Assumption Levers & Sensitivity Tunings', 14, yPos);
      yPos += 5;

      doc.setFillColor(240, 244, 240);
      doc.rect(14, yPos, 182, 7, 'F');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('ASSUMPTION VARIABLE', 18, yPos + 4.8);
      doc.text('BASELINE', 95, yPos + 4.8);
      doc.text('TUNED VALUE', 135, yPos + 4.8);
      doc.text('DELTA SENSITIVITY', 170, yPos + 4.8);
      yPos += 7;

      assumptions.forEach((asm, idx) => {
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 248);
          doc.rect(14, yPos, 182, 6.5, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        doc.text(asm.variable, 18, yPos + 4.5);
        doc.text(`${asm.currentValue} ${asm.unit}`, 95, yPos + 4.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`${asm.assumedValue} ${asm.unit}`, 135, yPos + 4.5);
        doc.text(`Shift: ${(asm.assumedValue - asm.currentValue).toFixed(2)}`, 170, yPos + 4.5);
        yPos += 6.5;
      });

      // Section 3: Prescriptive Recommendations
      yPos += 6;
      doc.setTextColor(24, 32, 28);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('3. Prescriptive Executive Recommendations', 14, yPos);
      yPos += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(`1. Authorize dynamic price-matching triggers for mid-tier SKUs to neutralize ${selectedCompetitor} flash sales.`, 18, yPos + 4);
      doc.text(`2. Allocate Q4 fast-turn factory capacity to accelerate drop cadence from 45 to ${simulationModel.velocity} days.`, 18, yPos + 10);
      doc.text(`3. Finalize co-op display agreements with top specialty accounts to secure ${simulationModel.shelf}% floor space.`, 18, yPos + 16);

      // Page 1 Footer
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        'CONFIDENTIAL & PROPRIETARY — RIVALIQ WHAT-IF STRATEGIC SIMULATION ENGINE • Page 1 of 2',
        14,
        288
      );

      // ==========================================
      // PAGE 2: Vector Radar, Waterfall & Deep Narrative
      // ==========================================
      doc.addPage();

      // Page 2 Header Banner
      doc.setFillColor(12, 16, 14);
      doc.rect(0, 0, 210, 24, 'F');
      doc.addImage(RIVALIQ_LOGO_BASE64, 'PNG', 14, 5, 42, 13);
      doc.setTextColor(161, 161, 170);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('WHAT-IF SIMULATION — CAPABILITY VECTORS & DELTA WATERFALL', 210 - 14, 14, { align: 'right' });

      // Embed Chart 2 (Win Rate Radar) and Chart 3 (Waterfall Deltas) side by side
      let p2Y = 32;
      doc.setTextColor(24, 32, 28);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('4. Capability Vectors Radar & 5-Metric Sensitivity Waterfall', 14, p2Y);
      p2Y += 5;

      const winRateChartUri = renderChartOptionToPng(winRateOption, 580, 420);
      const deltasChartUri = renderChartOptionToPng(deltasOption, 580, 420);

      if (winRateChartUri) {
        doc.addImage(winRateChartUri, 'PNG', 14, p2Y, 89, 65);
      }
      if (deltasChartUri) {
        doc.addImage(deltasChartUri, 'PNG', 107, p2Y, 89, 65);
      }
      p2Y += 72;

      // Section 5: Narrative Report
      doc.setTextColor(24, 32, 28);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('5. Executive Simulation Narrative & Strategic Findings', 14, p2Y);
      p2Y += 6;

      doc.setFillColor(245, 247, 245);
      doc.roundedRect(14, p2Y, 182, 54, 1.5, 1.5, 'F');

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      const narrativeP1 = `Under the tuned assumption parameters over a ${timeHorizon} operational horizon, ${ourCompName} is projected to generate an incremental +$${simulationModel.revenueLiftM}M in gross revenue (+${simulationModel.revenueGrowthPercent}% growth), expanding market share by +${simulationModel.marketShareGain}% against ${selectedCompetitor}.`;
      const splitP1 = doc.splitTextToSize(narrativeP1, 174);
      doc.text(splitP1, 18, p2Y + 8);

      const narrativeP2 = `Key Driver: Reducing drop turnaround cycle from ${assumptions[2].currentValue} to ${simulationModel.velocity} days combined with technical cushioning differentiation increases competitive win rate from 53.0% to ${simulationModel.simulatedWinRate}%, effectively defending core runner customer segments against rival discounts.`;
      const splitP2 = doc.splitTextToSize(narrativeP2, 174);
      doc.text(splitP2, 18, p2Y + 23);

      const narrativeP3 = `Strategic Trade-off: Churn risk reduction to ${simulationModel.churn}% requires sustaining product novelty to avoid hype exhaustion. Continued retail specialty shelf defense at ${simulationModel.shelf}% floor space is critical for defending gross margin integrity.`;
      const splitP3 = doc.splitTextToSize(narrativeP3, 174);
      doc.text(splitP3, 18, p2Y + 38);

      p2Y += 62;

      // Section 6: Strategic Execution Safeguards
      doc.setTextColor(24, 32, 28);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('6. Strategic Execution Safeguards & Milestone Checkpoints', 14, p2Y);
      p2Y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(`• Milestone M1 (Day 30): Validate supplier raw material inventory buffer for accelerated drop cadence.`, 18, p2Y + 4);
      doc.text(`• Milestone M2 (Day 60): Review mid-market retail conversion rates and adjust promotional thresholds.`, 18, p2Y + 10);
      doc.text(`• Milestone M3 (Day 90): Execute formal post-mortem on churn deflection metrics and recalculate net moat index.`, 18, p2Y + 16);

      // Page 2 Footer
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        'CONFIDENTIAL & PROPRIETARY — RIVALIQ WHAT-IF STRATEGIC SIMULATION ENGINE • Page 2 of 2',
        14,
        288
      );

      doc.save(`RivalIQ-WhatIf-Simulation-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setDownloadingPdf(false);
    }
  }, [assumptions, ourCompName, selectedCompetitor, simulationModel, timeHorizon, workspace?.name]);

  return (
    <div className={styles.container}>
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div className={styles.titleWithBadge}>
            <h1 className={styles.title}>What-If Strategy Simulation</h1>
            <div className={styles.livePill}>
              <span className={styles.pulseDot} />
              <span>Real-Time Reactive Engine</span>
            </div>
          </div>
          <p className={styles.subtitle}>
            Adjust market levers and operational assumptions below. All financial projections, win rates, graphs,
            and the executive report recalculate in real-time.
          </p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.scenarioPresetsRow}>
            <button
              type="button"
              onClick={() => applyPreset('conservative')}
              className={`${styles.presetBtn} ${activePreset === 'conservative' ? styles.presetBtnActive : ''}`}
            >
              Conservative
            </button>
            <button
              type="button"
              onClick={() => applyPreset('baseline')}
              className={`${styles.presetBtn} ${activePreset === 'baseline' ? styles.presetBtnActive : ''}`}
            >
              Baseline
            </button>
            <button
              type="button"
              onClick={() => applyPreset('aggressive')}
              className={`${styles.presetBtn} ${activePreset === 'aggressive' ? styles.presetBtnActive : ''}`}
            >
              Aggressive Growth
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadSimulationPdf}
            disabled={downloadingPdf}
            className={styles.pdfDownloadBtn}
            id="download-simulation-report-pdf"
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
                <span>Export Report PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Target Rival Benchmark Selector Bar from Memory */}
      <div className={styles.selectorBar}>
        <div className={styles.selectorLabelArea}>
          <div className={styles.selectorTitleRow}>
            <span className={styles.selectorLabel}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#a3e635' }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
              <span>Simulated Competitor Benchmark</span>
            </span>
            <span className={styles.memoryTag}>Memory Intelligence</span>
          </div>
          <span className={styles.selectorSub}>
            Simulating competitive reaction curves between {ourCompName} and monitored rivals from Hindsight memory bank.
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
              id="select-competitor-sim"
              aria-haspopup="listbox"
              aria-expanded={openDropdown}
            >
              <div className={styles.dropdownValue}>
                <span className={styles.itemDot} style={{ background: '#38bdf8' }} />
                <span>{selectedCompetitor || (competitorNames.length > 0 ? competitorNames[0] : 'No Competitors Discovered')}</span>
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
                {competitorNames.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: 12, color: '#a1a1aa' }}>
                    No competitors detected yet. Ingest market telemetry to benchmark rivals.
                  </div>
                ) : (
                  competitorNames.map((cName) => {
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
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4-Card Live KPI Strip (Recalculates immediately with sliders) */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard} style={{ ['--kpi-accent' as string]: '#a3e635' }}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Projected Revenue Lift</span>
            <div className={styles.kpiIconBox} style={{ color: '#a3e635' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue} style={{ color: '#bef264' }}>
            +${simulationModel.revenueLiftM}M
          </div>
          <div className={styles.kpiSub}>
            +{simulationModel.revenueGrowthPercent}% annualized topline expansion over {timeHorizon}
          </div>
        </div>

        <div className={styles.kpiCard} style={{ ['--kpi-accent' as string]: '#38bdf8' }}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Win Rate vs {selectedCompetitor || 'Target Rival'}</span>
            <div className={styles.kpiIconBox} style={{ color: '#38bdf8' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue} style={{ color: '#38bdf8' }}>
            {simulationModel.simulatedWinRate}%
          </div>
          <div className={styles.kpiSub}>
            +{simulationModel.winRateDelta}% gain over current baseline (53.0%)
          </div>
        </div>

        <div className={styles.kpiCard} style={{ ['--kpi-accent' as string]: '#4ade80' }}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Churn Deflection</span>
            <div className={styles.kpiIconBox} style={{ color: '#4ade80' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue} style={{ color: '#4ade80' }}>
            -{simulationModel.churnDeflectionPercent}%
          </div>
          <div className={styles.kpiSub}>
            Customer churn reduced from 4.2% to {simulationModel.churn}% quarterly
          </div>
        </div>

        <div className={styles.kpiCard} style={{ ['--kpi-accent' as string]: '#c084fc' }}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Simulated Moat Defensibility</span>
            <div className={styles.kpiIconBox} style={{ color: '#c084fc' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue} style={{ color: '#c084fc' }}>
            {simulationModel.simulatedMoatScore}%
          </div>
          <div className={styles.kpiSub}>
            Market share projected at {simulationModel.simulatedMarketShare}% (+{simulationModel.marketShareGain}%)
          </div>
        </div>
      </div>

      {/* Main Split Grid: Assumption Sliders (The Bars) on Left, Live Visualizer on Right */}
      <div className={styles.simulationSplitGrid}>
        {/* Left Column: Interactive Levers / The Bars */}
        <div className={styles.leversCard}>
          <div className={styles.leversHeader}>
            <h3 className={styles.leversTitle}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#a3e635' }}>
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
              </svg>
              <span>Assumption Levers & Sliders</span>
            </h3>
            <button
              type="button"
              onClick={resetToBaseline}
              className={styles.resetBtn}
            >
              Reset to Base
            </button>
          </div>

          {/* Time Horizon Selection */}
          <div className={styles.inputGroup}>
            <span className={styles.inputLabel}>Simulation Operational Horizon</span>
            <div className={styles.timeHorizonTabs}>
              {(['3 months', '6 months', '12 months', '24 months'] as HorizonType[]).map((th) => (
                <button
                  key={th}
                  type="button"
                  onClick={() => setTimeHorizon(th)}
                  className={`${styles.horizonBtn} ${timeHorizon === th ? styles.horizonBtnActive : ''}`}
                >
                  {th}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders List (The Bars) */}
          <div className={styles.slidersContainer}>
            {assumptions.map((asm) => {
              const delta = asm.assumedValue - asm.currentValue;
              const isPositive = delta > 0;

              return (
                <div key={asm.id} className={styles.sliderBox}>
                  <div className={styles.sliderTopRow}>
                    <span className={styles.sliderLabel}>{asm.variable}</span>
                    <span className={styles.sliderValueBadge}>
                      {asm.assumedValue} {asm.unit}
                    </span>
                  </div>

                  <span className={styles.sliderDesc}>{asm.description}</span>

                  <input
                    type="range"
                    min={asm.min}
                    max={asm.max}
                    step={asm.step}
                    value={asm.assumedValue}
                    onChange={(e) => handleAssumptionChange(asm.id, parseFloat(e.target.value))}
                    onInput={(e) => handleAssumptionChange(asm.id, parseFloat((e.target as HTMLInputElement).value))}
                    className={styles.rangeSlider}
                  />

                  <div className={styles.sliderMetaRow}>
                    <span>Base: {asm.currentValue} {asm.unit}</span>
                    <span className={styles.tunedDeltaPill}>
                      {delta === 0 ? 'At Baseline' : `${isPositive ? '+' : ''}${delta.toFixed(2)} ${asm.unit}`}
                    </span>
                    <span>Max: {asm.max} {asm.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Strategic Objective Input */}
          <div className={styles.inputGroup} style={{ paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span className={styles.inputLabel}>Target Scenario Objective</span>
            <input
              type="text"
              value={targetObjective}
              onChange={(e) => setTargetObjective(e.target.value)}
              className={styles.textInput}
              placeholder="e.g. Expand DTC win rate against target rival"
            />
          </div>
        </div>

        {/* Right Column: Live Dynamic Visualizer */}
        <div className={styles.vizCard}>
          <div className={styles.vizHeaderRow}>
            <div className={styles.vizTitleGroup}>
              <h3 className={styles.vizTitle}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#a3e635' }}>
                  <path d="M3 3v18h18" />
                  <path d="M18 9l-5 5-4-4-3 3" />
                </svg>
                <span>Live Outcome Trajectory Visualizer</span>
              </h3>
              <p className={styles.vizSubtitle}>
                Immediate recalculation comparing Status Quo against Simulated Strategy Execution.
              </p>
            </div>

            <div className={styles.vizTabs}>
              <button
                type="button"
                onClick={() => setActiveVizTab('revenue')}
                className={`${styles.vizTabBtn} ${activeVizTab === 'revenue' ? styles.vizTabBtnActive : ''}`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                <span>Revenue Lift Curve ($M)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveVizTab('winrate')}
                className={`${styles.vizTabBtn} ${activeVizTab === 'winrate' ? styles.vizTabBtnActive : ''}`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                </svg>
                <span>Win Rate (%)</span>
              </button>

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
                <span>5 Metric Deltas</span>
              </button>
            </div>
          </div>

          {/* Active ECharts Chart Display */}
          <BaseChart
            key={`sim-chart-${activeVizTab}`}
            option={
              activeVizTab === 'revenue'
                ? revenueLiftOption
                : activeVizTab === 'winrate'
                ? winRateOption
                : deltasOption
            }
            height={380}
            notMerge={false}
            onInit={(chart) => {
              chartInstanceRef.current = chart;
            }}
          />

          {/* Real-time Indicator Note */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(163,230,53,0.06)', border: '1px solid rgba(163,230,53,0.2)', borderRadius: 10, fontSize: 11, color: '#bef264' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className={styles.pulseDot} />
              <span>Reactive Model Active: Graphs update in real-time as you adjust any slider on the left.</span>
            </div>
            <span style={{ color: '#a1a1aa' }}>Entity: {ourCompName} vs {selectedCompetitor}</span>
          </div>
        </div>
      </div>

      {/* ============================================================
          EXECUTIVE SIMULATION IMPACT REPORT & STRATEGIC NARRATIVE
          ============================================================ */}
      <div className={styles.reportCard}>
        <div className={styles.reportHeaderRow}>
          <div className={styles.reportTitleArea}>
            <span className={styles.reportBadge}>Live Executive Report</span>
            <h3 className={styles.reportTitle}>Simulation Findings & Strategic Narrative</h3>
          </div>
          <span style={{ fontSize: 11, color: '#a1a1aa' }}>
            Horizon: <strong style={{ color: '#ffffff' }}>{timeHorizon}</strong> | Primary Rival: <strong style={{ color: '#38bdf8' }}>{selectedCompetitor}</strong>
          </span>
        </div>

        <div className={styles.reportGrid}>
          {/* Narrative Column */}
          <div className={styles.reportNarrativeCol}>
            <div className={styles.narrativeBlock}>
              <div className={styles.narrativeLead}>Executive Summary & Financial Impact</div>
              <p style={{ margin: 0 }}>
                Under the currently tuned parameters of <strong>{simulationModel.elasticity}x price elasticity</strong> and a reduced quarterly churn of <strong>{simulationModel.churn}%</strong>, {ourCompName} is projected to generate an incremental <strong style={{ color: '#bef264' }}>+${simulationModel.revenueLiftM}M in gross revenue</strong> (+{simulationModel.revenueGrowthPercent}% growth) across the {timeHorizon} window. Competitive win rate against {selectedCompetitor} expands from 53.0% to <strong style={{ color: '#38bdf8' }}>{simulationModel.simulatedWinRate}%</strong>, driving a net market share capture of <strong style={{ color: '#4ade80' }}>+{simulationModel.marketShareGain}%</strong>.
              </p>
            </div>

            <div className={styles.findingsList}>
              <div className={styles.findingItem}>
                <span className={styles.findingDot} />
                <span>
                  <strong>Drop Velocity Acceleration:</strong> Shortening release turnaround from 45 to {simulationModel.velocity} days directly compresses customer consideration windows, reducing mid-tier churn by {simulationModel.churnDeflectionPercent}%.
                </span>
              </div>
              <div className={styles.findingItem}>
                <span className={styles.findingDot} />
                <span>
                  <strong>Pricing Elasticity Defense:</strong> Setting dynamic price responsiveness to {simulationModel.elasticity}x protects premium shoe lines while capturing price-sensitive runners seeking mid-market alternatives.
                </span>
              </div>
              <div className={styles.findingItem}>
                <span className={styles.findingDot} />
                <span>
                  <strong>Wholesale Retail Defense:</strong> Securing {simulationModel.shelf}% specialty floor space guarantees high-visibility end-caps, neutralizing {selectedCompetitor}&apos;s expansion in regional footwear chains.
                </span>
              </div>
            </div>
          </div>

          {/* Side Column: Action Takeaways & Risk Flags */}
          <div className={styles.reportSideCol}>
            <div className={styles.takeawayBox}>
              <div className={styles.takeawayHeader}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                <span>Actionable Strategic Next Steps</span>
              </div>

              <div className={styles.takeawayList}>
                <div className={styles.takeawayStep}>
                  <span className={styles.stepNum}>01</span>
                  <span>Deploy algorithmic price-matching rules across DTC web & app to neutralize {selectedCompetitor} flash sales.</span>
                </div>
                <div className={styles.takeawayStep}>
                  <span className={styles.stepNum}>02</span>
                  <span>Allocate priority tooling capacity to compress product drop cycles to {simulationModel.velocity} days.</span>
                </div>
                <div className={styles.takeawayStep}>
                  <span className={styles.stepNum}>03</span>
                  <span>Formalize co-op display agreements with top specialty accounts to defend {simulationModel.shelf}% shelf presence.</span>
                </div>
              </div>
            </div>

            {simulationModel.churn > 3.5 && (
              <div className={styles.riskCallout}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 1 }}>
                  <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>
                  <strong>Elevated Churn Warning:</strong> Quarterly churn remains above 3.5%. Prioritize loyalty member incentives and warranty extensions to curb customer attrition.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SimulationPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px 0', color: '#a1a1aa' }}>Loading simulation engine...</div>}>
      <SimulationInner />
    </Suspense>
  );
}
