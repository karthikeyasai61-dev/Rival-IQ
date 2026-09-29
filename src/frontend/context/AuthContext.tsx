// ============================================================
// Auth Context Provider
// ============================================================

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthChange, logOut } from '@/lib/firebase/config';

import type { User as FirebaseUser } from 'firebase/auth';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface Workspace {
  id: string;
  name: string;
  companyName: string;
  organizationScale?: string;
  organizationType?: string;
  industry?: string;
}

interface CustomOrgData {
  companyName?: string;
  organizationScale?: string;
  organizationType?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  workspace: Workspace | null;
  loading: boolean;
  token: string | null;
  getToken: (forceRefresh?: boolean) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  signInAsDemo: (customEmail?: string, customName?: string, customOrg?: CustomOrgData) => Promise<void>;
  setCustomWorkspace?: (ws: Workspace) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  workspace: null,
  loading: true,
  token: null,
  getToken: async () => null,
  signOut: async () => {},
  refreshWorkspace: async () => {},
  signInAsDemo: async () => {},
  setCustomWorkspace: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('sf_demo_session') === 'true') {
      const email = localStorage.getItem('sf_demo_email') || 'analyst@enterprise.com';
      const displayName = localStorage.getItem('sf_demo_name') || 'Executive Analyst';
      return {
        uid: 'demo-analyst-uid',
        email,
        displayName,
        photoURL: null,
      };
    }
    return null;
  });

  const [workspace, setWorkspace] = useState<Workspace | null>(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('sf_demo_session') === 'true') {
        const savedCompany = localStorage.getItem('sf_demo_company') || 'NexusTech Global';
        const savedScale = localStorage.getItem('sf_demo_scale') || 'Mid-Market (51-250 employees)';
        const savedType = localStorage.getItem('sf_demo_type') || 'E-Commerce & Retail';
        return {
          id: 'demo-workspace',
          name: `${savedCompany} Workspace`,
          companyName: savedCompany,
          organizationScale: savedScale,
          organizationType: savedType,
          industry: savedType,
        };
      }
      const savedWs = localStorage.getItem('sf_custom_workspace');
      if (savedWs) {
        try {
          return JSON.parse(savedWs);
        } catch {}
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('sf_demo_session') === 'true') {
      return 'demo-token-12345';
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('sf_demo_session') === 'true') {
      return false;
    }
    return true;
  });

  const rawUserRef = React.useRef<FirebaseUser | null>(null);

  const fetchWorkspace = useCallback(async (idToken: string) => {
    try {
      const res = await fetch('/api/workspace', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.workspace) {
          setWorkspace(data.workspace);
        }
      }
    } catch (error) {
      console.error('Failed to fetch workspace:', error);
    }
  }, []);

  const getToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
    if (typeof window !== 'undefined' && localStorage.getItem('sf_demo_session') === 'true') {
      return 'demo-token-12345';
    }
    if (rawUserRef.current) {
      try {
        const fresh = await rawUserRef.current.getIdToken(forceRefresh);
        setToken(fresh);
        return fresh;
      } catch (err) {
        console.error('Failed to refresh token:', err);
      }
    }
    return token;
  }, [token]);

  const signInAsDemo = async (customEmail?: string, customName?: string, customOrg?: CustomOrgData) => {
    const demoToken = 'demo-token-12345';
    const email = customEmail || 'analyst@enterprise.com';
    const displayName = customName || (customEmail ? customEmail.split('@')[0] : 'Executive Analyst');
    const demoUser = {
      uid: 'demo-analyst-uid',
      email,
      displayName,
      photoURL: null,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('sf_demo_session', 'true');
      localStorage.setItem('sf_demo_email', email);
      localStorage.setItem('sf_demo_name', displayName);
      if (customOrg?.companyName) localStorage.setItem('sf_demo_company', customOrg.companyName);
      if (customOrg?.organizationScale) localStorage.setItem('sf_demo_scale', customOrg.organizationScale);
      if (customOrg?.organizationType) localStorage.setItem('sf_demo_type', customOrg.organizationType);
    }
    setUser(demoUser);
    setToken(demoToken);
    setWorkspace({
      id: 'demo-workspace',
      name: customOrg?.companyName ? `${customOrg.companyName} Workspace` : 'Enterprise Intelligence',
      companyName: customOrg?.companyName || 'NexusTech Global',
      organizationScale: customOrg?.organizationScale || 'Mid-Market (51-250 employees)',
      organizationType: customOrg?.organizationType || 'E-Commerce & Retail',
      industry: customOrg?.organizationType || 'E-Commerce & Retail',
    });
    setLoading(false);

    try {
      await fetchWorkspace(demoToken);
    } catch {
      // workspace is already initialized in state
    }
  };

  useEffect(() => {
    // Check if demo session is active
    if (typeof window !== 'undefined' && localStorage.getItem('sf_demo_session') === 'true') {
      const demoToken = 'demo-token-12345';
      const email = localStorage.getItem('sf_demo_email') || 'analyst@enterprise.com';
      const displayName = localStorage.getItem('sf_demo_name') || 'Executive Analyst';
      const savedCompany = localStorage.getItem('sf_demo_company');
      const savedScale = localStorage.getItem('sf_demo_scale');
      const savedType = localStorage.getItem('sf_demo_type');
      setUser({
        uid: 'demo-analyst-uid',
        email,
        displayName,
        photoURL: null,
      });
      setToken(demoToken);
      setWorkspace({
        id: 'demo-workspace',
        name: savedCompany ? `${savedCompany} Workspace` : 'Enterprise Intelligence',
        companyName: savedCompany || 'NexusTech Global',
        organizationScale: savedScale || 'Mid-Market (51-250 employees)',
        organizationType: savedType || 'E-Commerce & Retail',
        industry: savedType || 'E-Commerce & Retail',
      });
      setLoading(false);

      fetchWorkspace(demoToken).catch(() => {});
      return;
    }

    const unsubscribe = onAuthChange(async (firebaseUser) => {
      rawUserRef.current = firebaseUser;
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
        setToken(idToken);
        await fetchWorkspace(idToken);
        // Fallback: If workspace is still not set after fetchWorkspace, guarantee a valid workspace
        setWorkspace((current) => {
          if (current) return current;
          const savedWs = typeof window !== 'undefined' ? localStorage.getItem('sf_custom_workspace') : null;
          if (savedWs) {
            try { return JSON.parse(savedWs); } catch {}
          }
          const rawName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Enterprise';
          const defaultWs: Workspace = {
            id: `ws-${firebaseUser.uid.slice(0, 8)}`,
            name: `${rawName} Intelligence`,
            companyName: rawName,
            organizationScale: 'Mid-Market (51-250 employees)',
            organizationType: 'E-Commerce & Retail',
            industry: 'E-Commerce & Retail',
          };
          if (typeof window !== 'undefined') {
            localStorage.setItem('sf_custom_workspace', JSON.stringify(defaultWs));
          }
          return defaultWs;
        });
      } else {
        // Protect demo session: do NOT clear state if demo mode is active
        if (typeof window !== 'undefined' && localStorage.getItem('sf_demo_session') === 'true') {
          return;
        }
        setUser(null);
        setWorkspace(null);
        setToken(null);
      }
      setLoading(false);
    });

    // Refresh token periodically every 20 minutes to prevent expiration
    const refreshTimer = setInterval(async () => {
      if (rawUserRef.current) {
        try {
          const fresh = await rawUserRef.current.getIdToken(true);
          setToken(fresh);
        } catch {
          // ignore
        }
      }
    }, 20 * 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(refreshTimer);
    };
  }, [fetchWorkspace]);

  const setCustomWorkspace = useCallback((newWs: Workspace) => {
    setWorkspace(newWs);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sf_custom_workspace', JSON.stringify(newWs));
    }
  }, []);

  const handleSignOut = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sf_demo_session');
      localStorage.removeItem('sf_demo_email');
      localStorage.removeItem('sf_demo_name');
      localStorage.removeItem('sf_demo_company');
      localStorage.removeItem('sf_demo_scale');
      localStorage.removeItem('sf_demo_type');
      localStorage.removeItem('sf_custom_workspace');
    }
    await logOut().catch(() => {});
    rawUserRef.current = null;
    setUser(null);
    setWorkspace(null);
    setToken(null);
  };

  const refreshWorkspace = async () => {
    const activeToken = await getToken();
    if (activeToken) {
      await fetchWorkspace(activeToken);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspace,
        loading,
        token,
        getToken,
        signOut: handleSignOut,
        refreshWorkspace,
        signInAsDemo,
        setCustomWorkspace,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
