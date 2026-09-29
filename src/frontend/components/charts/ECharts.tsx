// ============================================================
// Apache ECharts Wrapper Components
// Reusable, data-driven chart components
// ============================================================

'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption, ECharts as EChartsInstance } from 'echarts';

// ============================================================
// Design Tokens for ECharts
// ============================================================

const CHART_THEME = {
  backgroundColor: 'transparent',
  textStyle: { color: '#a1a1aa', fontFamily: 'Inter, sans-serif' },
  title: { textStyle: { color: '#f4f4f5', fontSize: 14, fontWeight: 600 } },
  legend: { textStyle: { color: '#a1a1aa', fontSize: 12 }, icon: 'roundRect', itemGap: 16 },
  tooltip: {
    backgroundColor: '#1c1c21',
    borderColor: 'rgba(255,255,255,0.08)',
    textStyle: { color: '#f4f4f5', fontSize: 12 },
    extraCssText: 'border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.4);',
  },
  axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
  splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
  categoryAxis: {
    axisLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    axisTick: { show: false },
    axisLabel: { color: '#71717a', fontSize: 11 },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#71717a', fontSize: 11 },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
  },
};

const CHART_COLORS = [
  '#a3e635', '#22c55e', '#06b6d4', '#3b82f6', '#f59e0b',
  '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316',
];

// ============================================================
// Base Chart Component
// ============================================================

interface BaseChartProps {
  option: EChartsOption;
  height?: number | string;
  className?: string;
  notMerge?: boolean;
  onInit?: (chart: EChartsInstance) => void;
  onClick?: (params: Record<string, unknown>) => void;
}

export function BaseChart({ option, height = 400, className = '', notMerge = false, onInit, onClick }: BaseChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<EChartsInstance | null>(null);
  const onInitRef = useRef(onInit);
  onInitRef.current = onInit;
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  const getMergedOption = useCallback((opt: EChartsOption): EChartsOption => {
    return {
      ...opt,
      backgroundColor: CHART_THEME.backgroundColor,
      textStyle: CHART_THEME.textStyle,
      tooltip: {
        trigger: 'axis',
        ...CHART_THEME.tooltip,
        ...(opt.tooltip as Record<string, unknown> || {}),
      },
      legend: {
        ...CHART_THEME.legend,
        ...(opt.legend as Record<string, unknown> || {}),
      },
      color: CHART_COLORS,
      grid: { left: 48, right: 24, top: 48, bottom: 32, containLabel: true, ...(opt.grid as Record<string, unknown> || {}) },
    };
  }, []);

  // Initialize ECharts instance on mount and handle resize
  useEffect(() => {
    if (!chartRef.current) return;

    let chart = instanceRef.current;
    if (!chart) {
      chart = echarts.init(chartRef.current, undefined, { renderer: 'canvas' });
      instanceRef.current = chart;
      if (onInitRef.current) onInitRef.current(chart);
    }

    chart.setOption(getMergedOption(option), { notMerge, lazyUpdate: false });

    const handleResize = () => chart?.resize();
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(() => chart?.resize());
    resizeObserver.observe(chartRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      chart?.dispose();
      instanceRef.current = null;
    };
  }, []);

  // Update chart option whenever option or notMerge changes
  useEffect(() => {
    const chart = instanceRef.current;
    if (!chart) return;

    chart.setOption(getMergedOption(option), { notMerge, lazyUpdate: false });

    if (onClickRef.current) {
      chart.off('click');
      chart.on('click', (params) => onClickRef.current?.(params as unknown as Record<string, unknown>));
    }
  }, [option, notMerge, getMergedOption]);

  return (
    <div
      ref={chartRef}
      className={className}
      style={{ width: '100%', height: typeof height === 'number' ? `${height}px` : height }}
    />
  );
}

// ============================================================
// Pre-built Chart Components
// ============================================================

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  source?: string;
  records?: number;
  period?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  noData?: boolean;
  noDataMessage?: string;
}

export function ChartContainer({
  title, subtitle, source, records, period, children, actions, noData, noDataMessage
}: ChartContainerProps) {
  if (noData) {
    return (
      <div className="chart-container">
        <div className="chart-header">
          <div>
            <div className="chart-title">{title}</div>
            {subtitle && <div className="text-xs text-muted" style={{ marginTop: 2 }}>{subtitle}</div>}
          </div>
        </div>
        <div className="empty-state" style={{ padding: '48px 24px' }}>
          <div className="empty-state-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M7 16h8" /><path d="M7 11h12" /><path d="M7 6h3" />
            </svg>
          </div>
          <div className="empty-state-description">
            {noDataMessage || 'Insufficient data for this visualization.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="chart-header">
        <div>
          <div className="chart-title">{title}</div>
          {subtitle && <div className="text-xs text-muted" style={{ marginTop: 2 }}>{subtitle}</div>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="chart-body">{children}</div>
      {(source || records || period) && (
        <div className="chart-footer">
          {source && <span className="chart-source">Source: {source}</span>}
          {records && <span>Records: {records.toLocaleString()}</span>}
          {period && <span>Period: {period}</span>}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Line Chart
// ============================================================

interface LineChartProps {
  data: Array<{ date: string; value: number; series?: string }>;
  height?: number;
  smooth?: boolean;
  area?: boolean;
  title?: string;
}

export function LineChart({ data, height = 350, smooth = true, area = false }: LineChartProps) {
  const seriesMap = new Map<string, Array<{ date: string; value: number }>>();
  
  for (const d of data) {
    const key = d.series || 'Value';
    if (!seriesMap.has(key)) seriesMap.set(key, []);
    seriesMap.get(key)!.push({ date: d.date, value: d.value });
  }

  const dates = [...new Set(data.map(d => d.date))].sort();

  const option: EChartsOption = {
    xAxis: { type: 'category', data: dates, ...CHART_THEME.categoryAxis },
    yAxis: { type: 'value', ...CHART_THEME.valueAxis },
    dataZoom: dates.length > 30 ? [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', start: 0, end: 100, height: 20, bottom: 0, borderColor: 'transparent', backgroundColor: 'rgba(255,255,255,0.02)', fillerColor: 'rgba(163, 230, 53, 0.1)', handleStyle: { color: '#a3e635' }, textStyle: { color: '#71717a' } }
    ] : undefined,
    series: Array.from(seriesMap.entries()).map(([name, values]) => ({
      name,
      type: 'line' as const,
      smooth,
      data: dates.map(d => values.find(v => v.date === d)?.value || 0),
      areaStyle: area ? { opacity: 0.1 } : undefined,
      lineStyle: { width: 2 },
      symbolSize: 4,
    })),
    legend: seriesMap.size > 1 ? { show: true } : { show: false },
  };

  return <BaseChart option={option} height={height} />;
}

// ============================================================
// Bar Chart
// ============================================================

interface BarChartProps {
  data: Array<{ category: string; value: number; series?: string }>;
  height?: number;
  horizontal?: boolean;
  stacked?: boolean;
}

export function BarChart({ data, height = 350, horizontal = false, stacked = false }: BarChartProps) {
  const seriesMap = new Map<string, Array<{ category: string; value: number }>>();
  
  for (const d of data) {
    const key = d.series || 'Value';
    if (!seriesMap.has(key)) seriesMap.set(key, []);
    seriesMap.get(key)!.push({ category: d.category, value: d.value });
  }

  const categories = [...new Set(data.map(d => d.category))];

  const axisConfig = { type: 'category' as const, data: categories, ...CHART_THEME.categoryAxis };
  const valueConfig = { type: 'value' as const, ...CHART_THEME.valueAxis };

  const option: EChartsOption = {
    xAxis: horizontal ? valueConfig : axisConfig,
    yAxis: horizontal ? axisConfig : valueConfig,
    series: Array.from(seriesMap.entries()).map(([name, values]) => ({
      name,
      type: 'bar' as const,
      data: categories.map(c => values.find(v => v.category === c)?.value || 0),
      stack: stacked ? 'total' : undefined,
      barMaxWidth: 40,
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    })),
    legend: seriesMap.size > 1 ? { show: true } : { show: false },
  };

  return <BaseChart option={option} height={height} />;
}

// ============================================================
// Donut Chart
// ============================================================

interface DonutChartProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
}

export function DonutChart({ data, height = 300 }: DonutChartProps) {
  const option: EChartsOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['50%', '75%'],
      avoidLabelOverlap: true,
      label: { show: true, color: '#a1a1aa', fontSize: 11 },
      labelLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } },
      data: data.map((d, i) => ({
        ...d,
        itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
      })),
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' },
      },
    }],
  };

  return <BaseChart option={option} height={height} />;
}

// ============================================================
// Timeline Chart
// ============================================================

interface TimelineChartProps {
  events: Array<{ date: string; title: string; type: string; competitor?: string }>;
  height?: number;
}

export function TimelineChart({ events, height = 300 }: TimelineChartProps) {
  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const types = [...new Set(events.map(e => e.type))];

  const option: EChartsOption = {
    tooltip: { trigger: 'item', formatter: (params: unknown) => {
      const p = params as { data: { value: [string, number]; name: string } };
      return `${p.data.name}<br/>${p.data.value[0]}`;
    }},
    xAxis: { type: 'time', ...CHART_THEME.categoryAxis },
    yAxis: {
      type: 'category',
      data: types,
      ...CHART_THEME.categoryAxis,
    },
    series: [{
      type: 'scatter',
      symbolSize: 14,
      data: sorted.map(e => ({
        value: [e.date, types.indexOf(e.type)],
        name: `${e.competitor ? e.competitor + ': ' : ''}${e.title}`,
      })),
      itemStyle: { borderWidth: 2, borderColor: '#1c1c21' },
    }],
  };

  return <BaseChart option={option} height={height} />;
}

// ============================================================
// Comparison Chart (Actual vs Simulation)
// ============================================================

interface ComparisonChartProps {
  baseline: Array<{ name: string; value: number }>;
  target: Array<{ name: string; value: number }>;
  simulated: Array<{ name: string; value: number }>;
  height?: number;
}

export function ComparisonChart({ baseline, target, simulated, height = 400 }: ComparisonChartProps) {
  const categories = baseline.map(b => b.name);

  const option: EChartsOption = {
    legend: { show: true, data: ['Baseline', 'Target', 'Simulated'] },
    xAxis: { type: 'category', data: categories, ...CHART_THEME.categoryAxis },
    yAxis: { type: 'value', ...CHART_THEME.valueAxis },
    series: [
      {
        name: 'Baseline',
        type: 'bar',
        data: baseline.map(b => b.value),
        itemStyle: { color: '#71717a', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 30,
      },
      {
        name: 'Target',
        type: 'bar',
        data: target.map(t => t.value),
        itemStyle: { color: '#a3e635', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 30,
      },
      {
        name: 'Simulated',
        type: 'bar',
        data: simulated.map(s => s.value),
        itemStyle: { color: '#06b6d4', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 30,
      },
    ],
  };

  return <BaseChart option={option} height={height} />;
}

// ============================================================
// Heatmap Chart
// ============================================================

interface HeatmapChartProps {
  data: Array<{ x: string; y: string; value: number }>;
  height?: number;
}

export function HeatmapChart({ data, height = 350 }: HeatmapChartProps) {
  const xLabels = [...new Set(data.map(d => d.x))];
  const yLabels = [...new Set(data.map(d => d.y))];
  const maxVal = Math.max(...data.map(d => d.value));

  const option: EChartsOption = {
    tooltip: { formatter: (params: unknown) => {
      const p = params as { data: [number, number, number] };
      return `${xLabels[p.data[0]]} / ${yLabels[p.data[1]]}: ${p.data[2]}`;
    }},
    xAxis: { type: 'category', data: xLabels, ...CHART_THEME.categoryAxis },
    yAxis: { type: 'category', data: yLabels, ...CHART_THEME.categoryAxis },
    visualMap: {
      min: 0,
      max: maxVal,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: { color: ['#16161a', '#a3e635'] },
      textStyle: { color: '#71717a' },
    },
    series: [{
      type: 'heatmap',
      data: data.map(d => [xLabels.indexOf(d.x), yLabels.indexOf(d.y), d.value]),
      label: { show: true, color: '#f4f4f5', fontSize: 10 },
      itemStyle: { borderRadius: 4, borderColor: '#0a0a0b', borderWidth: 2 },
    }],
  };

  return <BaseChart option={option} height={height} />;
}

// ============================================================
// Area Chart
// ============================================================

interface AreaChartProps {
  data: Array<{ date: string; value: number; series?: string }>;
  height?: number;
}

export function AreaChart({ data, height = 350 }: AreaChartProps) {
  return <LineChart data={data} height={height} smooth area />;
}

// ============================================================
// Scatter Plot
// ============================================================

interface ScatterChartProps {
  data: Array<{ x: number; y: number; label?: string; size?: number }>;
  xLabel?: string;
  yLabel?: string;
  height?: number;
}

export function ScatterChart({ data, xLabel, yLabel, height = 350 }: ScatterChartProps) {
  const option: EChartsOption = {
    xAxis: { type: 'value', name: xLabel, ...CHART_THEME.valueAxis },
    yAxis: { type: 'value', name: yLabel, ...CHART_THEME.valueAxis },
    series: [{
      type: 'scatter',
      symbolSize: (d: number[]) => Math.max(8, (d[2] || 1) * 5),
      data: data.map(d => [d.x, d.y, d.size || 1]),
      itemStyle: { opacity: 0.7 },
      emphasis: { itemStyle: { opacity: 1 } },
    }],
  };

  return <BaseChart option={option} height={height} />;
}

// ============================================================
// Mini Sparkline (SVG based, perfect for KPI Metric Cards)
// ============================================================

interface MiniSparklineProps {
  data?: number[];
  color?: string;
  height?: number;
  width?: number | string;
  direction?: 'up' | 'down' | 'neutral';
}

export function MiniSparkline({
  data,
  color,
  height = 34,
  width = 86,
  direction = 'up',
}: MiniSparklineProps) {
  const defaultColors: Record<string, string> = {
    up: '#a3e635',
    down: '#f43f5e',
    neutral: '#38bdf8',
  };

  const strokeColor = color || defaultColors[direction] || '#a3e635';
  const gradId = React.useId();

  // If no data provided, render a smooth harmonic curve based on direction
  const points = React.useMemo(() => {
    if (data && data.length > 2) return data;
    if (direction === 'up') {
      return [12, 16, 14, 22, 19, 28, 25, 34, 30, 42, 48];
    } else if (direction === 'down') {
      return [48, 42, 45, 35, 38, 26, 30, 22, 25, 18, 14];
    }
    return [25, 28, 24, 32, 29, 31, 28, 33, 30, 32, 31];
  }, [data, direction]);

  const minVal = Math.min(...points);
  const maxVal = Math.max(...points);
  const range = maxVal - minVal || 1;

  const svgWidth = 86;
  const svgHeight = height;
  const paddingY = 4;

  const coords = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * (svgWidth - 6) + 3;
    const norm = (val - minVal) / range;
    const y = svgHeight - paddingY - norm * (svgHeight - paddingY * 2);
    return { x, y };
  });

  // Build smooth bezier path
  let pathD = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i];
    const next = coords[i + 1];
    const midX = (curr.x + next.x) / 2;
    pathD += ` C ${midX} ${curr.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
  }

  const lastPt = coords[coords.length - 1];
  const areaD = `${pathD} L ${lastPt.x} ${svgHeight} L ${coords[0].x} ${svgHeight} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      style={{ overflow: 'visible', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.32" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      {/* Gradient Fill */}
      <path d={areaD} fill={`url(#${gradId})`} />
      {/* Glow Stroke */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 2px 4px ${strokeColor}44)` }}
      />
      {/* Glowing End Dot */}
      <circle cx={lastPt.x} cy={lastPt.y} r="3" fill="#ffffff" stroke={strokeColor} strokeWidth="1.5" />
      <circle cx={lastPt.x} cy={lastPt.y} r="5" fill={strokeColor} opacity="0.4" />
    </svg>
  );
}

// ============================================================
// Multi-Series Smooth Wave Chart (Executive Competitor Benchmark)
// Exactly like the reference STEALTH v2.7 hero wave graph
// ============================================================

export interface MultiSeriesWaveItem {
  name: string;
  color: string;
  data: number[];
  areaGradient?: [string, string];
  highlightPointIndex?: number;
}

interface MultiSeriesWaveChartProps {
  categories: string[];
  series: MultiSeriesWaveItem[];
  height?: number;
  yAxisLabel?: string;
}

export function MultiSeriesWaveChart({
  categories,
  series,
  height = 320,
}: MultiSeriesWaveChartProps) {
  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(20, 24, 23, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.12)',
      borderWidth: 1,
      textStyle: { color: '#f4f4f5', fontSize: 12 },
      extraCssText: 'border-radius: 10px; box-shadow: 0 8px 32px rgba(0,0,0,0.6); backdrop-filter: blur(12px);',
      axisPointer: {
        type: 'cross',
        lineStyle: { color: 'rgba(255, 255, 255, 0.2)', width: 1, type: 'dashed' },
        crossStyle: { color: 'rgba(255, 255, 255, 0.2)' },
      },
    },
    grid: {
      left: 36,
      right: 20,
      top: 28,
      bottom: 24,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: categories,
      boundaryGap: false,
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      axisTick: { show: false },
      axisLabel: { color: '#71717a', fontSize: 11 },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#71717a', fontSize: 11 },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.05)',
          type: 'dashed',
        },
      },
    },
    series: series.map((s) => ({
      name: s.name,
      type: 'line',
      smooth: 0.45,
      symbol: 'circle',
      symbolSize: (value: unknown, params: { dataIndex: number }) => {
        return s.highlightPointIndex === params.dataIndex ? 9 : 3;
      },
      showSymbol: false,
      lineStyle: {
        width: 2.5,
        color: s.color,
        shadowColor: `${s.color}66`,
        shadowBlur: 10,
      },
      itemStyle: {
        color: s.color,
        borderColor: '#ffffff',
        borderWidth: 2,
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: s.areaGradient ? s.areaGradient[0] : `${s.color}40` },
          { offset: 1, color: s.areaGradient ? s.areaGradient[1] : `${s.color}00` },
        ]),
      },
      data: s.data,
    })),
  };

  return <BaseChart option={option} height={height} />;
}

// ============================================================
// Segmented Split Bar (Like STEALTH v2.7 Model Split)
// ============================================================

export interface SplitSegment {
  label: string;
  value: number;
  displayValue?: string;
  color: string;
  percentage?: number;
}

interface SegmentedSplitBarProps {
  title?: string;
  totalDisplay?: string;
  segments: SplitSegment[];
  className?: string;
}

export function SegmentedSplitBar({
  title,
  totalDisplay,
  segments,
  className = '',
}: SegmentedSplitBarProps) {
  const total = segments.reduce((acc, s) => acc + s.value, 0) || 1;

  const normalizedSegments = segments.map((s) => ({
    ...s,
    calcPercent: s.percentage !== undefined ? s.percentage : (s.value / total) * 100,
  }));

  return (
    <div className={className} style={{ width: '100%' }}>
      {(title || totalDisplay) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          {title && <span style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5' }}>{title}</span>}
          {totalDisplay && (
            <span style={{ fontSize: 12, fontWeight: 500, color: '#a1a1aa' }}>{totalDisplay}</span>
          )}
        </div>
      )}

      {/* Segmented Bar */}
      <div
        style={{
          display: 'flex',
          height: 10,
          borderRadius: 9999,
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.06)',
          gap: 2,
          padding: '1px',
        }}
      >
        {normalizedSegments.map((s, idx) => (
          <div
            key={idx}
            style={{
              width: `${Math.max(2, s.calcPercent)}%`,
              backgroundColor: s.color,
              borderRadius: 4,
              boxShadow: `0 0 8px ${s.color}66`,
              transition: 'all 0.4s ease',
            }}
            title={`${s.label}: ${s.displayValue || s.value} (${s.calcPercent.toFixed(1)}%)`}
          />
        ))}
      </div>

      {/* Legend / Metrics List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginTop: 14,
        }}
      >
        {normalizedSegments.map((s, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
              padding: '4px 0',
              borderBottom: idx < normalizedSegments.length - 1 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: s.color,
                  boxShadow: `0 0 6px ${s.color}`,
                }}
              />
              <span style={{ color: '#d4d4d8', fontWeight: 500 }}>{s.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: '#f4f4f5', fontWeight: 600 }}>{s.displayValue || s.value.toLocaleString()}</span>
              <span style={{ color: '#71717a', fontSize: 11, minWidth: 42, textAlign: 'right' }}>
                {s.calcPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Radial Moat Gauge (Like SUPA AI Circular Completion Meter)
// ============================================================

interface RadialMoatGaugeProps {
  score: number; // 0 - 100
  title?: string;
  subtitle?: string;
  breakdown?: Array<{ label: string; percent: number; color: string }>;
  height?: number;
}

export function RadialMoatGauge({
  score,
  title = 'Moat Health',
  subtitle = 'Defensive Advantage',
  breakdown,
  height = 240,
}: RadialMoatGaugeProps) {
  const primaryColor = score >= 70 ? '#a3e635' : score >= 50 ? '#f59e0b' : '#f43f5e';

  const defaultBreakdown = breakdown || [
    { label: 'Advantage', percent: Math.round(score * 0.7), color: '#a3e635' },
    { label: 'Parity', percent: Math.round(score * 0.2), color: '#38bdf8' },
    { label: 'Vulnerable', percent: 100 - Math.round(score * 0.9), color: '#f43f5e' },
  ];

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'pie',
        radius: ['68%', '86%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        label: {
          show: true,
          position: 'center',
          formatter: `{val|${score}%}\n{sub|${title}}`,
          rich: {
            val: {
              fontSize: 28,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 34,
              fontFamily: 'Inter, sans-serif',
            },
            sub: {
              fontSize: 11,
              color: '#a1a1aa',
              lineHeight: 16,
            },
          },
        },
        data: [
          ...defaultBreakdown.map((b) => ({
            name: b.label,
            value: b.percent,
            itemStyle: {
              color: b.color,
              borderRadius: 6,
              borderColor: '#121615',
              borderWidth: 2,
            },
          })),
        ],
        emphasis: {
          scale: true,
          scaleSize: 5,
        },
      },
    ],
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <BaseChart option={option} height={height} />
      {/* Legend below */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
        {defaultBreakdown.map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: b.color }} />
            <span style={{ color: '#a1a1aa' }}>{b.label}:</span>
            <span style={{ color: '#ffffff', fontWeight: 600 }}>{b.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Head-to-Head Comparative Delta Chart
// Pillar gradients like SUPA AI "AI Usage"
// ============================================================

export interface DeltaDimension {
  dimension: string;
  ourScore: number;
  competitorScore: number;
}

interface ComparativeDeltaChartProps {
  data: DeltaDimension[];
  ourLabel?: string;
  competitorLabel?: string;
  height?: number;
}

export function ComparativeDeltaChart({
  data,
  ourLabel = 'Our Company',
  competitorLabel = 'Competitor Benchmark',
  height = 280,
}: ComparativeDeltaChartProps) {
  const dimensions = data.map((d) => d.dimension);
  const ourValues = data.map((d) => d.ourScore);
  const compValues = data.map((d) => d.competitorScore);

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(20, 24, 23, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: { color: '#f4f4f5', fontSize: 12 },
    },
    legend: {
      show: true,
      top: 0,
      right: 10,
      textStyle: { color: '#a1a1aa', fontSize: 11 },
      data: [ourLabel, competitorLabel],
    },
    grid: { left: 24, right: 16, top: 40, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category',
      data: dimensions,
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      axisTick: { show: false },
      axisLabel: { color: '#a1a1aa', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } },
      axisLabel: { color: '#71717a', fontSize: 10 },
    },
    series: [
      {
        name: ourLabel,
        type: 'bar',
        barMaxWidth: 18,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#bef264' },
            { offset: 0.6, color: '#a3e635' },
            { offset: 1, color: 'rgba(163, 230, 53, 0.2)' },
          ]),
          shadowColor: 'rgba(163, 230, 53, 0.4)',
          shadowBlur: 6,
        },
        data: ourValues,
      },
      {
        name: competitorLabel,
        type: 'bar',
        barMaxWidth: 18,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#60a5fa' },
            { offset: 0.6, color: '#3b82f6' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.2)' },
          ]),
        },
        data: compValues,
      },
    ],
  };

  return <BaseChart option={option} height={height} />;
}

