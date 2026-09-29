// ============================================================
// Pro Plans & Data Ingestion Tiers Modal (Clear & Understandable)
// 3 Easy Tiers: Free (Manual Files) | Plus (Articles & PDFs) | Pro (Just 2 URLs)
// Clean SVG icons, no emojis, intuitive step-by-step breakdown
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';

interface ProPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProPlansModal({ isOpen, onClose }: ProPlansModalProps) {
  const [requestedTier, setRequestedTier] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset local state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setRequestedTier(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '940px',
          background: '#0d110f',
          border: '1px solid rgba(163, 230, 53, 0.22)',
          borderRadius: '20px',
          padding: '28px 32px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(163, 230, 53, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '22px',
          color: '#f4f4f5',
          fontFamily: 'inherit',
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span
                style={{
                  background: 'linear-gradient(135deg, #a3e635, #38bdf8)',
                  color: '#0a0d0b',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: '6px',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Data Input Methods
              </span>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
                How would you like to provide company data?
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0 }}>
              Compare how each tier processes data for your company and competitors.
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              color: '#d4d4d8',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.color = '#d4d4d8';
            }}
          >
            &times;
          </button>
        </div>

        {/* 3 Clear, Understandable Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: '16px',
          }}
        >
          {/* ==================== 1. FREE ==================== */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'relative',
            }}
          >
            {/* Top row with clean SVG icon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(163, 230, 53, 0.1)',
                  border: '1px solid rgba(163, 230, 53, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#bef264" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="17" x2="16" y2="17" />
                  <line x1="10" y1="9" x2="8" y2="9" />
                </svg>
              </div>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(163, 230, 53, 0.12)',
                  color: '#bef264',
                  border: '1px solid rgba(163, 230, 53, 0.25)',
                }}
              >
                Current Plan
              </span>
            </div>

            {/* Title & Headline */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: '#fff' }}>
                1. Free Tier
              </h3>
              <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0, fontWeight: 500 }}>
                Upload Formatted Data Files
              </p>
            </div>

            {/* Comparison Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ fontSize: '10px', color: '#a1a1aa', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.04em' }}>
                  YOU PROVIDE:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {['CSV File', 'Excel Sheet', 'JSON', 'Text Table'].map((fmt) => (
                    <span
                      key={fmt}
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '5px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: '#f4f4f5',
                      }}
                    >
                      {fmt}
                    </span>
                  ))}
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                }}
              >
                <div style={{ fontSize: '10px', color: '#a1a1aa', marginBottom: '4px', fontWeight: 700, letterSpacing: '0.04em' }}>
                  HOW IT WORKS:
                </div>
                <p style={{ fontSize: '12px', color: '#d4d4d8', margin: 0, lineHeight: 1.45 }}>
                  You prepare and structure files for both your company and competitor, then upload directly.
                </p>
              </div>
            </div>

            {/* Action */}
            <button
              disabled
              style={{
                marginTop: 'auto',
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#bef264',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>Active on Workspace</span>
            </button>
          </div>

          {/* ==================== 2. PLUS ==================== */}
          <div
            style={{
              background: 'rgba(56, 189, 248, 0.03)',
              border: '1px solid rgba(56, 189, 248, 0.28)',
              borderRadius: '16px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'relative',
            }}
          >
            {/* Top row with clean SVG icon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  <line x1="9" y1="7" x2="16" y2="7" />
                  <line x1="9" y1="11" x2="14" y2="11" />
                </svg>
              </div>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                }}
              >
                Coming Soon
              </span>
            </div>

            {/* Title & Headline */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: '#fff' }}>
                2. Plus Tier
              </h3>
              <p style={{ fontSize: '13px', color: '#38bdf8', margin: 0, fontWeight: 500 }}>
                Unstructured Links & Documents
              </p>
            </div>

            {/* Comparison Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(56, 189, 248, 0.15)',
                }}
              >
                <div style={{ fontSize: '10px', color: '#38bdf8', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.04em' }}>
                  YOU PROVIDE:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {['Web Links', 'News Articles', 'PDF Reports'].map((fmt) => (
                    <span
                      key={fmt}
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '5px',
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#7dd3fc',
                      }}
                    >
                      {fmt}
                    </span>
                  ))}
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.04)',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(56, 189, 248, 0.1)',
                }}
              >
                <div style={{ fontSize: '10px', color: '#38bdf8', marginBottom: '4px', fontWeight: 700, letterSpacing: '0.04em' }}>
                  HOW IT WORKS:
                </div>
                <p style={{ fontSize: '12px', color: '#d4d4d8', margin: 0, lineHeight: 1.45 }}>
                  Simply paste links or upload raw PDFs. RivalIQ automatically extracts numbers and structures the dataset for you.
                </p>
              </div>
            </div>

            {/* Action */}
            <button
              onClick={() => setRequestedTier('plus')}
              style={{
                marginTop: 'auto',
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                background: requestedTier === 'plus' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#38bdf8',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (requestedTier !== 'plus') {
                  e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (requestedTier !== 'plus') {
                  e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)';
                }
              }}
            >
              {requestedTier === 'plus' ? 'You are on the Plus Waitlist' : 'Notify Me on Launch'}
            </button>
          </div>

          {/* ==================== 3. PRO ==================== */}
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(163, 230, 53, 0.08) 0%, rgba(13, 17, 15, 0.95) 100%)',
              border: '2px solid #a3e635',
              borderRadius: '16px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              position: 'relative',
              boxShadow: '0 8px 26px rgba(163, 230, 53, 0.14)',
            }}
          >
            {/* Top row with clean SVG icon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(163, 230, 53, 0.18)',
                  border: '1px solid rgba(163, 230, 53, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: '#a3e635',
                  color: '#0c100e',
                  letterSpacing: '0.04em',
                }}
              >
                100% Autopilot
              </span>
            </div>

            {/* Title & Headline */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: '#fff' }}>
                3. Pro Tier
              </h3>
              <p style={{ fontSize: '13px', color: '#bef264', margin: 0, fontWeight: 600 }}>
                Automated Web Scraping
              </p>
            </div>

            {/* Comparison Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(163, 230, 53, 0.28)',
                }}
              >
                <div style={{ fontSize: '10px', color: '#bef264', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.04em' }}>
                  YOU PROVIDE:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '5px',
                      background: 'rgba(163, 230, 53, 0.18)',
                      color: '#bef264',
                    }}
                  >
                    Only 2 Company URLs (Website Links)
                  </span>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(163, 230, 53, 0.05)',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(163, 230, 53, 0.15)',
                }}
              >
                <div style={{ fontSize: '10px', color: '#bef264', marginBottom: '4px', fontWeight: 700, letterSpacing: '0.04em' }}>
                  HOW IT WORKS:
                </div>
                <p style={{ fontSize: '12px', color: '#d4d4d8', margin: 0, lineHeight: 1.45 }}>
                  Give the website URLs. RivalIQ autonomously scans web sources, financials, and news to structure and compare everything with zero manual effort.
                </p>
              </div>
            </div>

            {/* Action */}
            <button
              onClick={() => setRequestedTier('pro')}
              style={{
                marginTop: 'auto',
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                background: requestedTier === 'pro' ? '#84cc16' : 'linear-gradient(135deg, #a3e635 0%, #84cc16 100%)',
                border: 'none',
                color: '#0c100e',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(163, 230, 53, 0.3)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.92';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {requestedTier === 'pro' ? 'Access Requested — In Queue' : 'Request Early Access'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '6px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '12px',
            color: '#71717a',
          }}
        >
          <span>Free tier is active now. Plus & Pro automation pipelines are currently in pilot roll-out.</span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a1a1aa',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#a1a1aa'; }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
