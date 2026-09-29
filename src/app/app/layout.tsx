// ============================================================
// App Layout - High-End Minimalist Header, Drawer & Footer
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext';
import { PRODUCT_NAME } from '@/types';
import SelectDropdown from '@/components/ui/SelectDropdown';
import ProPlansModal from '@/components/ui/ProPlansModal';
import { ORGANIZATION_SCALES, ORGANIZATION_TYPES } from '@/components/auth/AuthForm';

// Navigation items inside the hamburger drawer
const DRAWER_SECTIONS = [
  {
    title: 'Analysis & Detection',
    items: [
      { label: 'Overview', href: '/app/overview', icon: 'grid', hint: 'KPIs & activity overview' },
      { label: 'Data Management', href: '/app/data', icon: 'upload', hint: 'Upload & parse datasets' },
      { label: 'Competitor Intelligence', href: '/app/competitors', icon: 'users', hint: 'Rival profiles & timelines' },
      { label: 'Competitive Signals', href: '/app/signals', icon: 'signal', hint: 'Real-time move detection' },
      { label: 'Competitive Gaps', href: '/app/gaps', icon: 'gap', hint: 'Feature, price & market gaps' },
      { label: 'Strategic Recommendations', href: '/app/recommendations', icon: 'target', hint: 'AI-synthesized actions' },
    ],
  },
  {
    title: 'Cognitive Intelligence',
    items: [
      { label: 'Hindsight Memory', href: '/app/memory', icon: 'brain', hint: 'Episodic vector memory bank' },
      { label: 'What-If Simulation', href: '/app/simulation', icon: 'zap', hint: 'Predictive scenario testing' },
      { label: 'Intelligence Dossiers', href: '/app/reports', icon: 'file', hint: 'Executive reports & PDF' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Architecture Health', href: '/app/health', icon: 'heart', hint: 'Microservice status & latency' },
    ],
  },
];

// Quick navigation tabs for header
const HEADER_TABS = [
  { label: 'Overview', href: '/app/overview' },
  { label: 'Data', href: '/app/data' },
  { label: 'Signals', href: '/app/signals' },
  { label: 'Gaps', href: '/app/gaps' },
  { label: 'Simulation', href: '/app/simulation' },
  { label: 'Reports', href: '/app/reports' },
];

const ROUTE_LABELS: Record<string, string> = {
  '/app/overview': 'Overview Dashboard',
  '/app/data': 'Data Ingestion',
  '/app/competitors': 'Competitors',
  '/app/signals': 'Signals Stream',
  '/app/gaps': 'Competitive Gaps',
  '/app/recommendations': 'Recommendations',
  '/app/memory': 'Hindsight Memory',
  '/app/simulation': 'Simulation Engine',
  '/app/reports': 'Executive Reports',
  '/app/health': 'System Health',
};

function NavIcon({ icon }: { icon: string }) {
  const icons: Record<string, React.ReactNode> = {
    grid: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    upload: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    users: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    signal: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>,
    gap: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
    target: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
    brain: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/></svg>,
    zap: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>,
    file: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>,
    heart: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>,
  };
  return <span style={{ display: 'inline-flex', opacity: 0.85 }}>{icons[icon] || icons.grid}</span>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, workspace, loading, signOut, getToken, refreshWorkspace, setCustomWorkspace } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [organizationScale, setOrganizationScale] = useState('Growth (51 - 250 employees)');
  const [organizationType, setOrganizationType] = useState('E-Commerce & DTC Retail');
  const [creating, setCreating] = useState(false);
  const [proModalOpen, setProModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  // Close drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreateWorkspace = async () => {
    if (!companyName.trim()) return;
    setCreating(true);
    const newWs = {
      id: `ws-${Date.now()}`,
      name: workspaceName.trim() || `${companyName.trim()} Intelligence`,
      companyName: companyName.trim(),
      organizationScale,
      organizationType,
      industry: organizationType,
    };

    try {
      const token = (await getToken()) || 'demo-token-12345';
      await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newWs),
      }).catch((e) => console.warn('Workspace create API notice:', e));
    } catch (error) {
      console.warn('Workspace creation notice:', error);
    } finally {
      if (setCustomWorkspace) {
        setCustomWorkspace(newWs);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('sf_custom_workspace', JSON.stringify(newWs));
      }
      setCreating(false);
      window.location.href = '/app/overview';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div className="loading-spinner loading-spinner-lg" />
      </div>
    );
  }

  if (!user) return null;

  // Workspace setup if user has no workspace
  if (user && !workspace && !loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 'var(--space-4)', background: 'var(--bg-primary)' }}>
        <div style={{ maxWidth: 460, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
            <div className="flex items-center justify-center" style={{ marginBottom: 'var(--space-4)' }}>
              <img src="/rivaliq-full.png" alt="RivalIQ" style={{ height: '34px', width: 'auto', display: 'block' }} />
            </div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Set up your organization workspace</h1>
            <p className="text-sm text-muted">Configure your organization profile to begin competitive intelligence analysis</p>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="input-wrapper">
              <label className="input-label">Organization Name</label>
              <input className="input" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Acme Corp, Stripe, or Brand" />
            </div>
            <SelectDropdown
              id="workspace-org-scale"
              label="Scale of the Organization"
              value={organizationScale}
              options={ORGANIZATION_SCALES}
              onChange={setOrganizationScale}
              required
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />

            <SelectDropdown
              id="workspace-org-type"
              label="Type of the Organization"
              value={organizationType}
              options={ORGANIZATION_TYPES}
              onChange={setOrganizationType}
              required
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              }
            />
            <div className="input-wrapper">
              <label className="input-label">Workspace Name</label>
              <input className="input" value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} placeholder="e.g., Enterprise Intelligence" />
            </div>
            <button className="btn btn-primary" onClick={handleCreateWorkspace} disabled={creating || !companyName.trim()}>
              {creating ? <span className="loading-spinner" /> : 'Create Organization Workspace'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentLabel = ROUTE_LABELS[pathname] || 'Dashboard';

  return (
    <div className="app-layout">
      {/* ============================================================
          TOP HEADER (SLEEK, MINIMALIST, EXPANSIVE)
          ============================================================ */}
      <header className="app-topbar">
        {/* Left: Hamburger Button + Logo + Active Page */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            style={{
              background: drawerOpen ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              width: '36px',
              height: '36px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              padding: 0,
            }}
            title="Open all navigation options"
            aria-label="Toggle navigation drawer"
          >
            <span style={{ width: '18px', height: '2px', background: 'var(--text-primary)', borderRadius: '2px', transition: 'all 0.2s' }} />
            <span style={{ width: '18px', height: '2px', background: 'var(--text-primary)', borderRadius: '2px', transition: 'all 0.2s' }} />
            <span style={{ width: '18px', height: '2px', background: 'var(--text-primary)', borderRadius: '2px', transition: 'all 0.2s' }} />
          </button>

          {/* Logo & Brand */}
          <a href="/app/overview" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src="/rivaliq-full.png" alt="RivalIQ" style={{ height: '26px', width: 'auto', display: 'block' }} />
          </a>

          <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.12)', margin: '0 4px' }} className="hidden sm:block" />

          {/* Active section title */}
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }} className="hidden sm:inline">
            {currentLabel}
          </span>
        </div>

        {/* Center: Clean Segmented Header Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="hidden md:flex">
          {HEADER_TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                style={{
                  background: active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: 'none',
                  color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: active ? 600 : 450,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Architecture Status, Workspace Pill, Avatar & Sign Out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Pro Tier Button */}
          <button
            onClick={() => setProModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(163, 230, 53, 0.2) 0%, rgba(56, 189, 248, 0.15) 100%)',
              border: '1px solid #a3e635',
              color: '#bef264',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 0 14px rgba(163, 230, 53, 0.2)',
            }}
            title="View Pro Plans & Data Ingestion Tiers"
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(163, 230, 53, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 0 14px rgba(163, 230, 53, 0.2)';
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>PRO</span>
          </button>

          {/* Health Indicator */}
          <a
            href="/app/health"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              color: '#22c55e',
              fontSize: '11px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
            title="System Architecture Health"
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
            <span className="hidden lg:inline">Operational</span>
          </a>

          {/* Workspace badge */}
          <span style={{
            fontSize: '11px',
            padding: '3px 8px',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: 'var(--text-secondary)',
            fontWeight: 500,
          }} className="hidden sm:inline">
            {workspace?.companyName || 'Enterprise'}
          </span>

          {/* User initials & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px', borderLeft: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(163, 230, 53, 0.15)',
              border: '1px solid rgba(163, 230, 53, 0.3)',
              color: 'var(--accent)',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {(user.displayName || user.email || 'A').charAt(0).toUpperCase()}
            </div>

            <button
              onClick={signOut}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                transition: 'color 0.15s ease',
              }}
              title="Sign Out"
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================
          SLIDE-OUT HAMBURGER DRAWER (OPENS ONLY WHEN HAMBURGER CLICKED)
          ============================================================ */}
      <aside className={`app-sidebar ${drawerOpen ? 'app-sidebar-open' : ''}`}>
        {/* Drawer Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/rivaliq-mark.png" alt="RivalIQ" style={{ height: '24px', width: 'auto', display: 'block' }} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              RivalIQ Navigation
            </span>
          </div>

          <button
            onClick={() => setDrawerOpen(false)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--text-tertiary)',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-tertiary)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Drawer Workspace Context */}
        <div style={{
          padding: '12px 20px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>
            Workspace
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
            {workspace?.companyName || 'NexusTech Global'}
          </div>
        </div>

        {/* Navigation Sections */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
          {DRAWER_SECTIONS.map((section) => (
            <div key={section.title} style={{ marginBottom: '18px' }}>
              <div style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--text-tertiary)',
                padding: '4px 10px',
                marginBottom: '4px',
              }}>
                {section.title}
              </div>

              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      router.push(item.href);
                      setDrawerOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: active ? 'rgba(163, 230, 53, 0.12)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      marginBottom: '2px',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.color = '#fff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }
                    }}
                  >
                    <NavIcon icon={item.icon} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: active ? 600 : 500 }}>{item.label}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{item.hint}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Drawer Bottom Profile */}
        <div style={{
          padding: '14px 18px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(163, 230, 53, 0.15)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 700,
            }}>
              {(user.displayName || user.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.displayName || 'Analyst'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email || 'analyst@enterprise.com'}
              </div>
            </div>
          </div>

          <button
            onClick={signOut}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ef4444',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 500,
              padding: '4px 8px',
              borderRadius: '4px',
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Backdrop overlay (Closes drawer on outside click) */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 9999,
            cursor: 'pointer',
          }}
        />
      )}

      {/* ============================================================
          MAIN BODY CONTENT (FULL 100% WIDTH FOR VISUALIZATIONS)
          ============================================================ */}
      <main className="app-main">
        <div className="app-content">
          {children}
        </div>

        {/* ============================================================
            CLEAN, MINIMALIST APPLICATION FOOTER
            ============================================================ */}
        <footer style={{
          height: '46px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(10, 10, 13, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          fontSize: '11px',
          color: 'var(--text-tertiary)',
          marginTop: 'auto',
        }}>
          {/* Left: Brand info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{PRODUCT_NAME}</span>
            <span style={{ opacity: 0.5 }}>&bull;</span>
            <span className="hidden sm:inline">Competitive Intelligence & Cognitive Memory</span>
          </div>

          {/* Center: Architecture Microservices */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }} className="hidden md:flex">
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#22c55e' }} />
              <span>Firestore</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#22c55e' }} />
              <span>Hindsight Vector Memory</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#22c55e' }} />
              <span>Gemini 3.8 Flash</span>
            </span>
          </div>

          {/* Right: Copyright */}
          <div>
            &copy; {new Date().getFullYear()} {PRODUCT_NAME} Inc.
          </div>
        </footer>
      </main>

      {/* Pro Plans & Intelligence Tiers Modal */}
      <ProPlansModal isOpen={proModalOpen} onClose={() => setProModalOpen(false)} />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
