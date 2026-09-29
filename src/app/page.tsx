// ============================================================
// RivalIQ Landing Page
// Premium enterprise competitive intelligence landing
// ============================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PRODUCT_NAME } from '@/types';
import { BaseChart } from '@/components/charts/ECharts';
import styles from './landing.module.css';

// ============================================================
// Icons (inline SVG, no emoji)
// ============================================================

const Icons = {
  signal: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>,
  brain: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/></svg>,
  target: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  chart: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
  upload: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  search: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  shield: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>,
  layers: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>,
  fileText: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>,
  zap: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>,
  arrowRight: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>,
  menu: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  x: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  globe: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>,
  play: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>,
};

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5; // Slow motion
    }
  }, []);

  return (
    <div className={styles.landing}>
      {/* ============ WHOLE-PAGE VIDEO BACKGROUND ============ */}
      <div className={styles.fullPageVideoWrapper}>
        <video
          ref={videoRef}
          className={styles.fullPageVideo}
          autoPlay
          loop
          muted
          playsInline
          onLoadedMetadata={() => {
            if (videoRef.current) {
              videoRef.current.playbackRate = 0.5;
            }
          }}
        >
          <source src="/0928.mp4" type="video/mp4" />
        </video>
        <div className={styles.videoTint} />
        <div className={styles.videoGlowOverlay} />
        <div className={styles.videoDarkOverlay} />
      </div>

      {/* ============ HEADER ============ */}
      <header className={`landing-header ${scrolled ? 'landing-header-scrolled' : ''}`}>
        <a href="/" className={styles.headerLeft} style={{ textDecoration: 'none' }}>
          <img src="/rivaliq-full.png" alt="RivalIQ" style={{ height: '32px', width: 'auto', display: 'block' }} />
        </a>

        <nav className={styles.headerNav}>
          <a href="#intelligence" className={styles.navLink}>Intelligence</a>
          <a href="#memory" className={styles.navLink}>Memory</a>
          <a href="#simulation" className={styles.navLink}>Simulation</a>
          <a href="#reports" className={styles.navLink}>Reports</a>
        </nav>

        <div className={styles.headerRight}>
          <a href="/auth/login" className="btn btn-ghost">Sign In</a>
          <a href="/auth/signup" className="btn btn-primary">Get Started</a>
        </div>

        <button
          className={`hamburger ${menuOpen ? 'hamburger-open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </header>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${menuOpen ? 'mobile-menu-open' : ''}`}>
        <a href="#intelligence" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>Competitive Intelligence</a>
        <a href="#signals" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>Signal Detection</a>
        <a href="#memory" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>Hindsight Memory</a>
        <a href="#gaps" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>Competitive Gaps</a>
        <a href="#simulation" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>Simulation</a>
        <a href="#reports" className="mobile-menu-item" onClick={() => setMenuOpen(false)}>Reports</a>
        <div style={{ padding: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)' }}>
          <a href="/auth/login" className="btn btn-secondary w-full">Sign In</a>
          <a href="/auth/signup" className="btn btn-primary w-full">Get Started</a>
        </div>
      </div>

      {/* ============ HERO ============ */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <div className="section-label">Competitive Intelligence Agent</div>
          <h1 className="text-hero" style={{ maxWidth: 800, marginBottom: 'var(--space-6)' }}>
            Turn competitor activity into strategic action.
          </h1>
          <p className="text-body" style={{ maxWidth: 640, fontSize: 'var(--text-lg)', marginBottom: 'var(--space-10)' }}>
            Analyze historical competitor activity, connect today&apos;s signals with what happened before, and turn persistent intelligence into evidence-backed strategic decisions.
          </p>
          <div className={styles.heroCtas}>
            <a href="/auth/signup" className="btn btn-primary btn-lg">
              Start Analysis {Icons.arrowRight}
            </a>
            <a href="#intelligence" className="btn btn-outline btn-lg">
              Explore Intelligence
            </a>
          </div>
        </div>

        {/* Dashboard preview */}
        <div className={styles.dashboardPreview}>
          <div className={styles.previewWindow}>
            <div className={styles.previewTopBar}>
              <div className={styles.previewDots}>
                <span /><span /><span />
              </div>
              <span className={styles.previewTitle}>{PRODUCT_NAME} Dashboard</span>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.previewSidebar}>
                {['Overview', 'Data', 'Competitors', 'Signals', 'Gaps', 'Memory', 'Simulation'].map(item => (
                  <div key={item} className={styles.previewNavItem}>{item}</div>
                ))}
              </div>
              <div className={styles.previewMain}>
                <div className={styles.previewCards}>
                  <div className={styles.previewCard}>
                    <div className={styles.previewCardLabel}>Competitors Tracked</div>
                    <div className={styles.previewCardValue}>12</div>
                  </div>
                  <div className={styles.previewCard}>
                    <div className={styles.previewCardLabel}>Signals Detected</div>
                    <div className={styles.previewCardValue}>47</div>
                  </div>
                  <div className={styles.previewCard}>
                    <div className={styles.previewCardLabel}>Memories Retained</div>
                    <div className={styles.previewCardValue}>128</div>
                  </div>
                  <div className={styles.previewCard}>
                    <div className={styles.previewCardLabel}>Gaps Identified</div>
                    <div className={styles.previewCardValue}>8</div>
                  </div>
                </div>
                <div className={styles.previewChart}>
                  <div className={styles.chartHeader}>
                    <div className="flex items-center gap-2">
                      <span className={styles.livePulse} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#f4f4f5' }}>Signal Velocity & Competitor Activity</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#a3e635', fontWeight: 500 }}>Live Realtime Stream</span>
                  </div>
                  <BaseChart
                    height={155}
                    option={{
                      animationDuration: 2000,
                      animationEasing: 'cubicOut',
                      grid: { left: 30, right: 15, top: 12, bottom: 20 },
                      tooltip: {
                        trigger: 'axis',
                        backgroundColor: '#16161a',
                        borderColor: 'rgba(163, 230, 53, 0.4)',
                        textStyle: { color: '#f4f4f5', fontSize: 11 },
                      },
                      xAxis: {
                        type: 'category',
                        data: ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
                        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
                        axisLabel: { color: '#71717a', fontSize: 10 },
                      },
                      yAxis: {
                        type: 'value',
                        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
                        axisLabel: { color: '#71717a', fontSize: 10 },
                      },
                      series: [
                        {
                          name: 'Signal Velocity',
                          type: 'line',
                          smooth: 0.35,
                          symbol: 'circle',
                          symbolSize: 5,
                          itemStyle: { color: '#a3e635' },
                          lineStyle: { width: 3, shadowColor: 'rgba(163, 230, 53, 0.6)', shadowBlur: 10 },
                          areaStyle: {
                            color: {
                              type: 'linear',
                              x: 0, y: 0, x2: 0, y2: 1,
                              colorStops: [
                                { offset: 0, color: 'rgba(163, 230, 53, 0.35)' },
                                { offset: 1, color: 'rgba(163, 230, 53, 0.0)' }
                              ]
                            }
                          },
                          data: [35, 48, 42, 68, 55, 88, 76, 94, 82, 110, 95, 128],
                        },
                        {
                          name: 'Competitor Moves',
                          type: 'bar',
                          barMaxWidth: 10,
                          itemStyle: {
                            color: {
                              type: 'linear',
                              x: 0, y: 0, x2: 0, y2: 1,
                              colorStops: [
                                { offset: 0, color: '#06b6d4' },
                                { offset: 1, color: 'rgba(6, 182, 212, 0.15)' }
                              ]
                            },
                            borderRadius: [3, 3, 0, 0]
                          },
                          data: [18, 26, 22, 38, 30, 52, 44, 60, 48, 72, 58, 84],
                        }
                      ]
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="landing-section" id="how-it-works">
        <div className="landing-section-header">
          <div className="section-label">How It Works</div>
          <h2 className="text-h2">From raw data to strategic intelligence</h2>
        </div>

        <div className={styles.stepsGrid}>
          {[
            { num: '01', title: 'Upload', desc: 'Upload competitor and company data in CSV, XLSX, JSON, or TXT format.', icon: Icons.upload },
            { num: '02', title: 'Analyze', desc: 'Agent identifies signals, patterns, and competitive dynamics.', icon: Icons.search },
            { num: '03', title: 'Remember', desc: 'Hindsight retains meaningful historical context for future recall.', icon: Icons.brain },
            { num: '04', title: 'Compare', desc: 'Current activity is compared against historical memory and patterns.', icon: Icons.layers },
            { num: '05', title: 'Act', desc: 'Agent generates evidence-backed strategic considerations.', icon: Icons.target },
            { num: '06', title: 'Simulate', desc: 'Test possible strategic scenarios with what-if analysis.', icon: Icons.zap },
            { num: '07', title: 'Report', desc: 'Generate a professional business intelligence report.', icon: Icons.fileText },
          ].map((step, i) => (
            <div key={step.num} className={`${styles.stepCard} animate-in animate-delay-${Math.min(i + 1, 4)}`}>
              <div className={styles.stepNum}>{step.num}</div>
              <div className={styles.stepIcon}>{step.icon}</div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ INTELLIGENCE ============ */}
      <section className="landing-section" id="intelligence">
        <div className="landing-section-header">
          <div className="section-label">Competitive Intelligence</div>
          <h2 className="text-h2">Detect signals before they become threats</h2>
          <p className="text-body" style={{ maxWidth: 600, margin: '0 auto' }}>
            The agent identifies pricing changes, feature launches, hiring patterns, market movements, and repeated competitor behavior from your uploaded data.
          </p>
        </div>

        <div className={styles.featureGrid}>
          {[
            { title: 'Signal Detection', desc: 'Deterministic detection of pricing changes, product launches, hiring spikes, and market entries.', icon: Icons.signal },
            { title: 'Competitive Gaps', desc: 'Compare your company against competitors on pricing, features, activity, and market presence.', icon: Icons.chart },
            { title: 'Evidence Traceability', desc: 'Every insight is traceable to source records, datasets, and calculated metrics.', icon: Icons.fileText },
            { title: 'Pattern Recognition', desc: 'Identify repeated behaviors and strategic patterns across competitors over time.', icon: Icons.search },
          ].map((feature) => (
            <div key={feature.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDesc}>{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* ============ ANIMATED RADAR BENCHMARK CHART ============ */}
        <div style={{
          marginTop: 'var(--space-12)',
          background: 'rgba(22, 27, 25, 0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-8)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)'
        }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
            <div>
              <div className="section-label" style={{ marginBottom: 'var(--space-2)' }}>Live Radar Benchmark</div>
              <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: '#ffffff' }}>
                Multi-Dimensional Competitive Gap Analysis
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: '#a1a1aa' }}>
                Realtime Apache ECharts animated comparison against top industry rivals.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={styles.livePulse} />
              <span style={{ fontSize: 'var(--text-xs)', color: '#a3e635', fontWeight: 600 }}>Interactive ECharts API</span>
            </div>
          </div>
          <BaseChart
            height={320}
            option={{
              animationDuration: 2200,
              animationEasing: 'cubicOut',
              legend: {
                show: true,
                bottom: 0,
                textStyle: { color: '#a1a1aa', fontSize: 12 },
                data: ['Your Platform', 'Market Leader A', 'Challenger B']
              },
              tooltip: {
                trigger: 'item',
                backgroundColor: '#16161a',
                borderColor: 'rgba(163, 230, 53, 0.4)',
                textStyle: { color: '#f4f4f5', fontSize: 12 }
              },
              radar: {
                indicator: [
                  { name: 'Feature Coverage', max: 100 },
                  { name: 'Pricing Competitiveness', max: 100 },
                  { name: 'Release Velocity', max: 100 },
                  { name: 'Market Sentiment', max: 100 },
                  { name: 'Hiring Momentum', max: 100 },
                  { name: 'Signal Detection Rate', max: 100 }
                ],
                shape: 'polygon',
                splitNumber: 4,
                axisName: { color: '#a1a1aa', fontSize: 11, fontWeight: 500 },
                splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.08)' } },
                splitArea: { show: true, areaStyle: { color: ['rgba(255, 255, 255, 0.01)', 'rgba(255, 255, 255, 0.03)'] } },
                axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
              },
              series: [{
                type: 'radar',
                data: [
                  {
                    value: [92, 85, 94, 88, 78, 96],
                    name: 'Your Platform',
                    symbol: 'circle',
                    symbolSize: 6,
                    itemStyle: { color: '#a3e635' },
                    lineStyle: { width: 3, shadowColor: 'rgba(163, 230, 53, 0.5)', shadowBlur: 10 },
                    areaStyle: { color: 'rgba(163, 230, 53, 0.25)' }
                  },
                  {
                    value: [84, 62, 70, 80, 85, 65],
                    name: 'Market Leader A',
                    symbol: 'circle',
                    symbolSize: 5,
                    itemStyle: { color: '#38bdf8' },
                    lineStyle: { width: 2 },
                    areaStyle: { color: 'rgba(56, 189, 248, 0.15)' }
                  },
                  {
                    value: [65, 90, 55, 60, 50, 48],
                    name: 'Challenger B',
                    symbol: 'circle',
                    symbolSize: 5,
                    itemStyle: { color: '#f59e0b' },
                    lineStyle: { width: 2, type: 'dashed' },
                    areaStyle: { color: 'rgba(245, 158, 11, 0.1)' }
                  }
                ]
              }]
            }}
          />
        </div>
      </section>

      {/* ============ MEMORY ============ */}
      <section className="landing-section" id="memory" style={{ background: 'rgba(17, 17, 19, 0.45)', backdropFilter: 'blur(8px)', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--border)' }}>
        <div className="landing-section-header">
          <div className="section-label">Hindsight Memory</div>
          <h2 className="text-h2">The agent gets better because it remembers</h2>
          <p className="text-body" style={{ maxWidth: 600, margin: '0 auto' }}>
            Every analysis builds on the previous one. Historical events, outcomes, and patterns are retained and recalled to improve future intelligence.
          </p>
        </div>

        <div className={styles.memoryProgression}>
          {[
            { interaction: 'Interaction 1', title: 'Generic Understanding', desc: 'Initial analysis with no historical context. Agent detects signals from current data only.', opacity: 0.4 },
            { interaction: 'Interaction 5', title: 'Historical Context Appears', desc: 'Agent recalls previous competitor events and outcomes. Analysis references what happened before.', opacity: 0.7 },
            { interaction: 'Interaction 20', title: 'Pattern-Driven Intelligence', desc: 'Rich historical memory influences analysis. Previous outcomes shape current recommendations.', opacity: 1 },
          ].map((stage, i) => (
            <div key={stage.interaction} className={styles.memoryStage} style={{ opacity: stage.opacity }}>
              <div className={styles.memoryStageLabel}>{stage.interaction}</div>
              <div className={styles.memoryStageCard}>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>{stage.title}</h3>
                <p className="text-sm text-muted">{stage.desc}</p>
                <div className={styles.memoryBar}>
                  <div className={styles.memoryBarFill} style={{ width: `${(i + 1) * 33}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Before vs After */}
        <div className={styles.beforeAfter}>
          <div className={styles.beforeCard}>
            <div className={styles.beforeLabel}>WITHOUT MEMORY</div>
            <p className={styles.beforeText}>&ldquo;Current competitor activity detected.&rdquo;</p>
          </div>
          <div className={styles.afterCard}>
            <div className={styles.afterLabel}>WITH HINDSIGHT</div>
            <p className={styles.afterText}>&ldquo;Current competitor activity matches a previous pattern. Historical outcome suggests a product launch is likely to follow.&rdquo;</p>
          </div>
        </div>
      </section>

      {/* ============ SIMULATION ============ */}
      <section className="landing-section" id="simulation">
        <div className="landing-section-header">
          <div className="section-label">What-If Simulation</div>
          <h2 className="text-h2">Test strategies before committing resources</h2>
          <p className="text-body" style={{ maxWidth: 600, margin: '0 auto' }}>
            Define targets, select strategies, set assumptions, and visualize simulated outcomes against your baseline and goals.
          </p>
        </div>

        <div className={styles.simPreview}>
          <div className={styles.simInputs}>
            <div className={styles.simField}><span className={styles.simLabel}>Target</span><span>Reduce feature gap</span></div>
            <div className={styles.simField}><span className={styles.simLabel}>Strategy</span><span>Increase feature release cadence</span></div>
            <div className={styles.simField}><span className={styles.simLabel}>Time Horizon</span><span>6 months</span></div>
          </div>
          <div className={styles.simChart}>
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5' }}>Simulated Strategic Impact vs Baseline</span>
              <span style={{ fontSize: 11, color: '#a3e635', fontWeight: 600 }}>Confidence: 94.2%</span>
            </div>
            <BaseChart
              height={230}
              option={{
                animationDuration: 1800,
                animationEasing: 'cubicOut',
                legend: {
                  show: true,
                  top: 0,
                  textStyle: { color: '#a1a1aa', fontSize: 11 },
                  data: ['Baseline', 'Simulated Outcome', 'Target Goal']
                },
                grid: { left: 35, right: 15, top: 35, bottom: 25 },
                tooltip: {
                  trigger: 'axis',
                  backgroundColor: '#16161a',
                  borderColor: 'rgba(163, 230, 53, 0.4)',
                  textStyle: { color: '#f4f4f5', fontSize: 12 },
                },
                xAxis: {
                  type: 'category',
                  data: ['Feature Depth', 'Market Share', 'Win Rate', 'Pricing Advantage', 'Response Speed'],
                  axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
                  axisLabel: { color: '#a1a1aa', fontSize: 11 }
                },
                yAxis: {
                  type: 'value',
                  max: 100,
                  splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
                  axisLabel: { color: '#71717a', fontSize: 11, formatter: '{value}%' }
                },
                series: [
                  {
                    name: 'Baseline',
                    type: 'bar',
                    barMaxWidth: 16,
                    itemStyle: { color: '#52525b', borderRadius: [4, 4, 0, 0] },
                    data: [50, 32, 40, 60, 48]
                  },
                  {
                    name: 'Simulated Outcome',
                    type: 'bar',
                    barMaxWidth: 16,
                    itemStyle: {
                      color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                          { offset: 0, color: '#a3e635' },
                          { offset: 1, color: '#65a30d' }
                        ]
                      },
                      borderRadius: [4, 4, 0, 0],
                      shadowColor: 'rgba(163, 230, 53, 0.4)',
                      shadowBlur: 8
                    },
                    data: [82, 54, 66, 85, 80]
                  },
                  {
                    name: 'Target Goal',
                    type: 'bar',
                    barMaxWidth: 16,
                    itemStyle: {
                      color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                          { offset: 0, color: '#38bdf8' },
                          { offset: 1, color: '#0284c7' }
                        ]
                      },
                      borderRadius: [4, 4, 0, 0]
                    },
                    data: [88, 60, 72, 90, 85]
                  }
                ]
              }}
            />
            <div className={styles.simDisclaimer} style={{ marginTop: 'var(--space-2)' }}>
              Simulated scenario based on selected assumptions. Powered by Hindsight reasoning engine.
            </div>
          </div>
        </div>
      </section>

      {/* ============ REPORTS ============ */}
      <section className="landing-section" id="reports" style={{ background: 'rgba(17, 17, 19, 0.45)', backdropFilter: 'blur(8px)', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--border)' }}>
        <div className="landing-section-header">
          <div className="section-label">Strategic Reports</div>
          <h2 className="text-h2">Professional intelligence documentation</h2>
          <p className="text-body" style={{ maxWidth: 600, margin: '0 auto' }}>
            Generate comprehensive competitive intelligence reports with evidence traceability, charts, recommendations, and monitoring plans.
          </p>
        </div>

        <div className={styles.reportSections}>
          {[
            'Executive Summary', 'Competitive Landscape', 'Competitive Signals',
            'Historical Patterns', 'Competitive Gap Analysis', 'Strategic Considerations',
            'What-If Simulation', 'Monitoring Plan', 'Evidence Traceability'
          ].map((section, i) => (
            <div key={section} className={styles.reportSection}>
              <span className={styles.reportSectionNum}>{String(i + 1).padStart(2, '0')}</span>
              <span>{section}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ============ SECURITY ============ */}
      <section className="landing-section">
        <div className="landing-section-header">
          <div className="section-label">Security & Architecture</div>
          <h2 className="text-h2">Enterprise-grade data protection</h2>
        </div>

        <div className={styles.securityGrid}>
          {[
            { title: 'Workspace Isolation', desc: 'All data is scoped to workspaces. Users cannot access data outside their workspace.' },
            { title: 'Server-side API Keys', desc: 'Hindsight, Gemini, and Firebase credentials never reach the browser.' },
            { title: 'Authenticated Access', desc: 'Every API request requires a valid Firebase authentication token.' },
            { title: 'Audit Trail', desc: 'Every upload, analysis, and report generation is logged with timestamps.' },
          ].map((item) => (
            <div key={item.title} className={styles.securityCard}>
              <div className={styles.securityIcon}>{Icons.shield}</div>
              <h3>{item.title}</h3>
              <p className="text-sm text-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className={styles.finalCta}>
        <div className={styles.ctaGlow} />
        <h2 className="text-h2" style={{ marginBottom: 'var(--space-4)' }}>Ready to turn intelligence into action?</h2>
        <p className="text-body" style={{ maxWidth: 500, margin: '0 auto var(--space-8)' }}>
          Upload your first dataset and let the agent analyze your competitive landscape.
        </p>
        <a href="/auth/signup" className="btn btn-primary btn-lg">
          Start Analysis {Icons.arrowRight}
        </a>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <img src="/rivaliq-full.png" alt="RivalIQ" style={{ height: '28px', width: 'auto', display: 'block' }} />
              </div>
              <p className="text-sm text-muted">
                Evidence-backed competitive intelligence powered by persistent memory and strategic reasoning.
              </p>
            </div>

            <div className={styles.footerLinks}>
              <h4 className={styles.footerHeading}>Product</h4>
              <a href="#intelligence">Intelligence</a>
              <a href="#memory">Memory</a>
              <a href="#simulation">Simulation</a>
              <a href="#reports">Reports</a>
            </div>

            <div className={styles.footerLinks}>
              <h4 className={styles.footerHeading}>Resources</h4>
              <a href="#how-it-works">Documentation</a>
              <a href="#security">Architecture</a>
              <a href="#security">Security</a>
            </div>

            <div className={styles.footerLinks}>
              <h4 className={styles.footerHeading}>Legal</h4>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <span className="text-xs text-muted">{PRODUCT_NAME}. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
