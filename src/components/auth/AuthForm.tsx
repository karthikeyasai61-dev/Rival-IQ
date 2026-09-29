// ============================================================
// Auth Form Component - Reusable for /auth, /auth/login, /auth/signup
// Bespoke Glassmorphism Dropdowns for Organization Scale & Type
// ============================================================

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '@/lib/firebase/config';
import { useAuth } from '@/lib/auth/AuthContext';
import { PRODUCT_NAME } from '@/types';
import SelectDropdown from '@/components/ui/SelectDropdown';
import styles from '@/app/auth/auth.module.css';

interface AuthFormProps {
  initialSignUp?: boolean;
}

export const ORGANIZATION_SCALES = [
  'Startup (1 - 50 employees)',
  'Growth (51 - 250 employees)',
  'Mid-Market (251 - 1,000 employees)',
  'Enterprise (1,001 - 5,000 employees)',
  'Global Conglomerate (5,000+ employees)',
];

export const ORGANIZATION_TYPES = [
  'E-Commerce & DTC Retail',
  'SaaS & Enterprise Technology',
  'Consumer Goods & Apparel',
  'Financial Services & FinTech',
  'Healthcare & Biotechnology',
  'Industrial & Manufacturing',
  'Media, Entertainment & Gaming',
  'Consulting & Professional Services',
  'Other',
];

export default function AuthForm({ initialSignUp = false }: AuthFormProps) {
  const router = useRouter();
  const { signInAsDemo } = useAuth();
  const [isSignUp, setIsSignUp] = useState(initialSignUp);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationScale, setOrganizationScale] = useState(ORGANIZATION_SCALES[1]);
  const [organizationType, setOrganizationType] = useState(ORGANIZATION_TYPES[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!organizationName.trim()) {
          setError('Organization name is required.');
          setLoading(false);
          return;
        }

        const cred = await signUpWithEmail(email, password, name);
        const token = await cred.user.getIdToken();

        // Create workspace with the provided Organization Name, Scale, and Type
        await fetch('/api/workspace', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: `${organizationName.trim()} Intelligence`,
            companyName: organizationName.trim(),
            organizationScale,
            organizationType,
          }),
        }).catch((wsErr) => console.warn('Workspace creation API error:', wsErr));

        router.push('/app/overview');
      } else {
        await signInWithEmail(email, password);
        router.push('/app/overview');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '';
      if (
        errMsg.includes('api-key') ||
        errMsg.includes('API key') ||
        errMsg.includes('invalid-api-key') ||
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'AIzaSyDummyKey'
      ) {
        // Seamless fallback: Log in directly with provided credentials and organization data
        await signInAsDemo(email, name, {
          companyName: organizationName.trim() || 'NexusTech Global',
          organizationScale,
          organizationType,
        });
        router.push('/app/overview');
        return;
      }
      setError(err instanceof Error ? err.message.replace('Firebase: ', '') : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithGoogle();
      if (cred?.user) {
        try {
          const idToken = await cred.user.getIdToken();
          const orgName = organizationName.trim() || cred.user.displayName || 'Enterprise';
          await fetch('/api/workspace', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              name: `${orgName} Intelligence`,
              companyName: orgName,
              organizationScale,
              organizationType,
            }),
          });
        } catch (wsErr) {
          console.warn('Workspace auto-init notice:', wsErr);
        }
      }
      router.push('/app/overview');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '';
      if (
        errMsg.includes('api-key') ||
        errMsg.includes('API key') ||
        errMsg.includes('invalid-api-key') ||
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY === 'AIzaSyDummyKey'
      ) {
        await signInAsDemo(undefined, undefined, {
          companyName: organizationName.trim() || 'NexusTech Global',
          organizationScale,
          organizationType,
        });
        router.push('/app/overview');
        return;
      }
      setError(err instanceof Error ? err.message.replace('Firebase: ', '') : 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>
        <div className={styles.authHeader}>
          <a href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
            <img src="/rivaliq-full.png" alt="RivalIQ" style={{ height: '36px', width: 'auto', display: 'block' }} />
          </a>
        </div>

        <div className={styles.authCard}>
          <h1 className={styles.authTitle}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className={styles.authSubtitle}>
            {isSignUp
              ? 'Configure your organization profile & intelligence workspace'
              : 'Sign in to continue your analysis'}
          </p>

          <button
            type="button"
            className="btn btn-secondary w-full flex items-center justify-center gap-2 mb-3"
            style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}
            onClick={async () => {
              try {
                await signInAsDemo(undefined, undefined, {
                  companyName: organizationName.trim() || 'NexusTech Global',
                  organizationScale,
                  organizationType,
                });
                router.push('/app/overview');
              } catch (e) {
                console.error('Demo login error:', e);
              }
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Instant 1-Click Demo Access
          </button>

          <button className={styles.googleBtn} onClick={handleGoogle} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <form onSubmit={handleSubmit} className={styles.authForm}>
            {isSignUp && (
              <>
                <div className="input-wrapper">
                  <label className="input-label" htmlFor="name">Your Name</label>
                  <input
                    id="name"
                    type="text"
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    required={isSignUp}
                  />
                </div>

                <div className="input-wrapper">
                  <label className="input-label" htmlFor="organizationName">
                    Organization / Company Name <span style={{ color: 'var(--accent)' }}>*</span>
                  </label>
                  <input
                    id="organizationName"
                    type="text"
                    className="input"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="e.g. Acme Corp, Stripe, or Brand"
                    required={isSignUp}
                  />
                </div>

                {/* Custom Styled Dropdown for Organization Scale */}
                <SelectDropdown
                  id="organizationScale"
                  label="Scale of the Organization"
                  value={organizationScale}
                  options={ORGANIZATION_SCALES}
                  onChange={(val) => setOrganizationScale(val)}
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

                {/* Custom Styled Dropdown for Organization Type */}
                <SelectDropdown
                  id="organizationType"
                  label="Type of the Organization"
                  value={organizationType}
                  options={ORGANIZATION_TYPES}
                  onChange={(val) => setOrganizationType(val)}
                  required
                  icon={
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                  }
                />
              </>
            )}

            <div className="input-wrapper">
              <label className="input-label" htmlFor="email">Work Email</label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>

            <div className="input-wrapper">
              <label className="input-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className={styles.errorMessage}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? <span className="loading-spinner" /> : (isSignUp ? 'Create Organization & Account' : 'Sign In')}
            </button>
          </form>

          <div className={styles.switchMode}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className={styles.switchBtn}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
