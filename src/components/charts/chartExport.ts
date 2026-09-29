// ============================================================
// RivalIQ Chart Export Engine
// Renders any ECharts option or DOM canvas into crisp, 2x Retina PNGs
// for seamless embedding into Executive jsPDF Reports
// ============================================================

import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

/**
 * Renders an ECharts option into a high-resolution 2x PNG Data URL.
 * Sets animation: false for instant, synchronous canvas rendering.
 * Works even if the chart tab is inactive or not mounted in DOM.
 */
export function renderChartOptionToPng(
  option: EChartsOption,
  width = 720,
  height = 320,
  backgroundColor = '#111613'
): string | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  try {
    const container = document.createElement('div');
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    container.style.position = 'fixed';
    container.style.left = '-99999px';
    container.style.top = '-99999px';
    container.style.visibility = 'hidden';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);

    const chart = echarts.init(container, undefined, {
      renderer: 'canvas',
      devicePixelRatio: 2,
      width,
      height,
    });

    // Merge options with animation: false for instantaneous, synchronous drawing
    chart.setOption({
      ...option,
      animation: false,
      backgroundColor,
    });

    const dataUrl = chart.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor,
    });

    chart.dispose();
    document.body.removeChild(container);

    return dataUrl;
  } catch (err) {
    console.warn('renderChartOptionToPng warning:', err);
    return null;
  }
}

/**
 * Captures an already mounted ECharts instance directly from DOM.
 */
export function getChartInstancePng(
  chart: echarts.ECharts | null,
  backgroundColor = '#111613'
): string | null {
  if (!chart) return null;
  try {
    return chart.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor,
    });
  } catch (err) {
    console.warn('getChartInstancePng warning:', err);
    return null;
  }
}
