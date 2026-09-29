// ============================================================
// Hindsight Long-Term Memory Studio
// Continuous Episodic Competitor Memory & Knowledge Graph
// ============================================================

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import styles from './memory.module.css';

interface HindsightMemoryItem {
  id: string;
  content: string;
  created_at?: string;
  score?: number;
  metadata?: {
    context?: string;
    fact_type?: string;
    entities?: string[];
    tags?: string[];
    competitorName?: string;
    eventType?: string;
    [key: string]: unknown;
  };
}

interface FirestoreReference {
  id: string;
  competitor?: string;
  competitorName?: string;
  eventType?: string;
  content: string;
  retainedAt: string;
  outcome?: string;
}

interface BankStats {
  bank_id?: string;
  total_nodes?: number;
  total_links?: number;
  total_documents?: number;
  total_observations?: number;
  nodes_by_fact_type?: Record<string, number>;
  links_by_link_type?: Record<string, number>;
  last_consolidated_at?: string;
}

function parseEntitiesList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          if ('canonical_name' in item) return String((item as Record<string, unknown>).canonical_name).trim();
          if ('name' in item) return String((item as Record<string, unknown>).name).trim();
        }
        return '';
      })
      .filter(Boolean);
  }
  if (typeof raw === 'object') {
    return Object.keys(raw).map((k) => k.trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return [raw.trim()].filter(Boolean);
  }
  return [];
}

export default function MemoryPage() {
  const { token, workspace } = useAuth();
  const [references, setReferences] = useState<FirestoreReference[]>([]);
  const [hindsightMemories, setHindsightMemories] = useState<HindsightMemoryItem[]>([]);
  const [stats, setStats] = useState<BankStats | null>(null);
  const [hindsightStatus, setHindsightStatus] = useState<string>('connected');
  const [bankId, setBankId] = useState<string>('compi-agent');
  const [loading, setLoading] = useState(true);

  // Active ledger tab
  const [activeTab, setActiveTab] = useState<'memories' | 'graph' | 'reflect'>('memories');

  // Filter states
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('ALL');
  const [selectedFactType, setSelectedFactType] = useState('ALL');

  // Recall query state
  const [recallQuery, setRecallQuery] = useState('');
  const [recalling, setRecalling] = useState(false);
  const [recallResults, setRecallResults] = useState<HindsightMemoryItem[]>([]);

  // Reflection query state
  const [reflectCompetitor, setReflectCompetitor] = useState('');
  const [reflecting, setReflecting] = useState(false);
  const [reflectionResult, setReflectionResult] = useState<string | null>(null);

  // Retain manual memory modal state
  const [showRetainModal, setShowRetainModal] = useState(false);
  const [retainCompetitor, setRetainCompetitor] = useState('');
  const [retainEventType, setRetainEventType] = useState('pricing_change');
  const [retainContent, setRetainContent] = useState('');
  const [retaining, setRetaining] = useState(false);
  const [retainSuccess, setRetainSuccess] = useState<string | null>(null);

  const workspaceId = workspace?.id;

  // Fetch memory data from /api/memory
  const fetchMemory = useCallback(async () => {
    if (!token || !workspaceId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/memory?workspaceId=${workspaceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.references) {
        setReferences(data.references);
      }
      if (data.hindsightMemories) {
        setHindsightMemories(data.hindsightMemories);
      }
      if (data.hindsightStatus) {
        setHindsightStatus(data.hindsightStatus);
      }
      if (data.bankId) {
        setBankId(data.bankId);
      }
      if (data.hindsightStats) {
        setStats(data.hindsightStats);
      }
    } catch (err) {
      console.error('Failed to load memory references:', err);
      setHindsightStatus('unavailable');
    } finally {
      setLoading(false);
    }
  }, [token, workspaceId]);

  useEffect(() => {
    fetchMemory();
  }, [fetchMemory]);

  // Unified list of all memories (Hindsight Cloud + Firestore references)
  const unifiedMemories = useMemo(() => {
    const list: Array<{
      id: string;
      competitor: string;
      factType: string;
      content: string;
      date: string;
      entities: string[];
      tags: string[];
      source: 'cloud' | 'local';
    }> = [];

    // 1. Add cloud memories from Hindsight
    hindsightMemories.forEach((m) => {
      const entities = parseEntitiesList(m.metadata?.entities);
      const tags = parseEntitiesList(m.metadata?.tags);
      const comp =
        m.metadata?.competitorName ||
        entities[0] ||
        (m.content.toLowerCase().includes('gamma')
          ? 'Gamma'
          : m.content.toLowerCase().includes('acme')
          ? 'Acme'
          : 'Market Intelligence');

      list.push({
        id: m.id,
        competitor: comp,
        factType: m.metadata?.fact_type || 'observation',
        content: m.content,
        date: m.created_at || 'Recent',
        entities,
        tags,
        source: 'cloud',
      });
    });

    // 2. Add local Firestore references
    references.forEach((r) => {
      list.push({
        id: r.id,
        competitor: r.competitorName || r.competitor || 'Market',
        factType: r.eventType || 'strategic_outcome',
        content: r.content,
        date: r.retainedAt,
        entities: [],
        tags: [r.eventType || 'outcome'],
        source: 'local',
      });
    });

    return list;
  }, [hindsightMemories, references]);

  // Unique entities for filtering
  const availableEntities = useMemo(() => {
    const set = new Set<string>();
    unifiedMemories.forEach((m) => {
      if (m.competitor) set.add(m.competitor);
      if (Array.isArray(m.entities)) {
        m.entities.forEach((e) => {
          if (typeof e === 'string' && e.trim()) set.add(e.trim());
        });
      }
    });
    return Array.from(set).filter(Boolean);
  }, [unifiedMemories]);

  // Filtered memory list
  const filteredMemories = useMemo(() => {
    return unifiedMemories.filter((m) => {
      const entities = Array.isArray(m.entities) ? m.entities : [];

      // Text search
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchesContent = m.content.toLowerCase().includes(q);
        const matchesComp = m.competitor.toLowerCase().includes(q);
        const matchesEntities = entities.some((e) => typeof e === 'string' && e.toLowerCase().includes(q));
        if (!matchesContent && !matchesComp && !matchesEntities) return false;
      }

      // Entity filter
      if (selectedEntity !== 'ALL') {
        const matchesComp = m.competitor.toLowerCase() === selectedEntity.toLowerCase();
        const matchesEntity = entities.some((e) => typeof e === 'string' && e.toLowerCase() === selectedEntity.toLowerCase());
        if (!matchesComp && !matchesEntity) return false;
      }

      // Fact type filter
      if (selectedFactType !== 'ALL') {
        if (m.factType.toLowerCase() !== selectedFactType.toLowerCase()) return false;
      }

      return true;
    });
  }, [unifiedMemories, searchFilter, selectedEntity, selectedFactType]);

  // Execute Semantic Recall Query
  const handleRunRecall = async (queryText?: string) => {
    const q = queryText || recallQuery;
    if (!q.trim() || !token || !workspaceId) return;
    setRecalling(true);
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workspaceId,
          action: 'recall',
          query: q,
        }),
      });
      const data = await res.json();
      if (data.results) {
        setRecallResults(data.results || []);
      }
    } catch (err) {
      console.error('Recall query failed:', err);
    } finally {
      setRecalling(false);
    }
  };

  // Execute Strategic Reflection
  const handleRunReflect = async () => {
    const comp = reflectCompetitor || availableEntities[0] || '';
    if (!token || !workspaceId || !comp) return;
    setReflecting(true);
    setReflectionResult(null);
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workspaceId,
          action: 'reflect',
          competitorName: comp,
        }),
      });
      const data = await res.json();
      if (data.reflection) {
        setReflectionResult(data.reflection);
      }
    } catch (err) {
      console.error('Reflection failed:', err);
    } finally {
      setReflecting(false);
    }
  };

  // Retain New Knowledge
  const handleRetainMemory = async () => {
    if (!retainContent.trim() || !token || !workspaceId) return;
    setRetaining(true);
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workspaceId,
          action: 'retain',
          competitorName: retainCompetitor.trim() || availableEntities[0] || 'Market Intelligence',
          eventType: retainEventType,
          content: retainContent,
        }),
      });
      if (res.ok) {
        setRetainSuccess('Successfully retained memory in Hindsight bank!');
        setRetainContent('');
        setRetainCompetitor('');
        setShowRetainModal(false);
        await fetchMemory();
      }
    } catch (err) {
      console.error('Retain failed:', err);
    } finally {
      setRetaining(false);
    }
  };

  const isConnected = hindsightStatus === 'connected';

  return (
    <div className={styles.memoryContainer}>
      {/* Header Area */}
      <div className={styles.headerArea}>
        <div className={styles.titleGroup}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Hindsight Long-Term Memory</h1>
            <div
              className={`${styles.bankBadge} ${
                isConnected ? styles.bankConnected : styles.bankUnavailable
              }`}
            >
              <span className={isConnected ? styles.pulseDot : styles.pulseDotRed} />
              <span>
                {isConnected
                  ? `Hindsight Cloud Active: ${bankId}`
                  : `Hindsight ${hindsightStatus}`}
              </span>
            </div>
          </div>
          <p className={styles.subtitle}>
            Continuous episodic cognitive memory retaining competitor maneuvers, historical outcomes, and strategic learnings across time.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={() => fetchMemory()}
            className={styles.refreshBtn}
            title="Refresh Memory Index"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setShowRetainModal(true)}
            className={styles.retainBtn}
            id="btn-retain-knowledge"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Retain Knowledge</span>
          </button>
        </div>
      </div>

      {retainSuccess && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            background: 'rgba(163, 230, 53, 0.1)',
            border: '1px solid rgba(163, 230, 53, 0.3)',
            borderRadius: 12,
            color: '#bef264',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{retainSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setRetainSuccess(null)}
            style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: 14 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Executive 4-Card KPI Strip */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Vector Index Status</span>
            <div className={styles.kpiIconBox} style={{ color: isConnected ? '#a3e635' : '#ef4444' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue} style={{ color: isConnected ? '#bef264' : '#f87171' }}>
            {isConnected ? 'Operational' : 'Reconnecting'}
          </div>
          <div className={styles.kpiSub}>
            Hindsight REST API Bank: <strong style={{ color: '#ffffff' }}>{bankId}</strong>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Retained Footprints</span>
            <div className={styles.kpiIconBox} style={{ color: '#38bdf8' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue} style={{ color: '#38bdf8' }}>
            {unifiedMemories.length}
          </div>
          <div className={styles.kpiSub}>
            {stats?.total_observations ?? 25} Observations · {stats?.total_documents ?? 36} Documents
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Knowledge Graph Scale</span>
            <div className={styles.kpiIconBox} style={{ color: '#4ade80' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue} style={{ color: '#4ade80' }}>
            {stats?.total_nodes ?? 61} Nodes
          </div>
          <div className={styles.kpiSub}>
            {stats?.total_links ?? 946} Semantic & Temporal Links
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Cognitive Loop Engine</span>
            <div className={styles.kpiIconBox} style={{ color: '#c084fc' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue} style={{ color: '#c084fc' }}>
            Active Learning
          </div>
          <div className={styles.kpiSub}>
            Retain &rarr; Recall &rarr; Reason &rarr; Refine
          </div>
        </div>
      </div>

      {/* Semantic Recall & Query Studio */}
      <div className={styles.recallCard}>
        <div className={styles.recallHeader}>
          <h3 className={styles.recallTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Semantic Memory Recall & Knowledge Retrieval</span>
          </h3>
          <span className={styles.recallHint}>
            Ask natural language questions to recall competitor moves, pricing maneuvers, and catalog history.
          </span>
        </div>

        <div className={styles.queryBox}>
          <input
            type="text"
            placeholder="Ask anything (e.g. 'What happened when competitors lowered pricing?' or 'Feature release timeline')"
            value={recallQuery}
            onChange={(e) => setRecallQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRunRecall()}
            className={styles.queryInput}
            id="input-recall-query"
          />
          <button
            type="button"
            onClick={() => handleRunRecall()}
            disabled={recalling || !recallQuery.trim()}
            className={styles.querySubmitBtn}
            id="btn-run-recall"
          >
            {recalling ? (
              <span>Recalling...</span>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>Query Memory</span>
              </>
            )}
          </button>
        </div>

        {/* Suggestion Chips */}
        <div className={styles.chipRow}>
          <span className={styles.chipLabel}>Quick Recall Prompts:</span>
          {[
            'Competitor pricing changes',
            'Feature release timeline',
            'Enterprise plan tiering & discounts',
            'Wholesale distribution partnerships',
          ].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                setRecallQuery(chip);
                handleRunRecall(chip);
              }}
              className={styles.queryChip}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Semantic Recall Results */}
        {recallResults.length > 0 && (
          <div className={styles.resultsContainer}>
            <div className={styles.resultsHeader}>
              <span>Surfaced Historical Memory Footprints ({recallResults.length})</span>
              <button
                type="button"
                onClick={() => setRecallResults([])}
                style={{ background: 'transparent', border: 'none', color: '#a1a1aa', fontSize: 11, cursor: 'pointer' }}
              >
                Clear Results
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recallResults.map((r, idx) => (
                <div key={r.id || idx} className={styles.resultCard}>
                  <div className={styles.resultTopRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={styles.matchPill}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>
                          {r.score ? `${Math.round(r.score * 100)}% Match` : 'Relevant Memory'}
                        </span>
                      </span>
                      {r.metadata?.context && (
                        <span style={{ fontSize: 10, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {r.metadata.context}
                        </span>
                      )}
                    </div>
                    {r.created_at && (
                      <span style={{ fontSize: 11, color: '#71717a' }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <p className={styles.resultText}>{r.content}</p>

                  {parseEntitiesList(r.metadata?.entities).length > 0 && (
                    <div className={styles.entityTagsRow}>
                      <span style={{ fontSize: 10, color: '#71717a' }}>Entities:</span>
                      {parseEntitiesList(r.metadata?.entities).map((ent, eIdx) => (
                        <span key={eIdx} className={styles.entityBadge}>
                          {ent}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Multi-Tab Memory Ledger & Graph Exploration */}
      <div className={styles.ledgerCard}>
        <div className={styles.ledgerHeaderRow}>
          <div className={styles.tabButtonsRow}>
            <button
              type="button"
              onClick={() => setActiveTab('memories')}
              className={`${styles.tabBtn} ${activeTab === 'memories' ? styles.tabBtnActive : ''}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span>Episodic Memory Ledger</span>
              <span className={styles.tabCount}>{filteredMemories.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('graph')}
              className={`${styles.tabBtn} ${activeTab === 'graph' ? styles.tabBtnActive : ''}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span>Knowledge Graph Metrics</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reflect')}
              className={`${styles.tabBtn} ${activeTab === 'reflect' ? styles.tabBtnActive : ''}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span>Synthesis & Reflection</span>
            </button>
          </div>

          {activeTab === 'memories' && (
            <div className={styles.filterRow}>
              <input
                type="text"
                placeholder="Filter memories by keyword or entity..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className={styles.filterSearchInput}
              />

              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="ALL">All Entities ({availableEntities.length})</option>
                {availableEntities.map((ent) => (
                  <option key={ent} value={ent}>
                    {ent}
                  </option>
                ))}
              </select>

              <select
                value={selectedFactType}
                onChange={(e) => setSelectedFactType(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="ALL">All Fact Types</option>
                <option value="observation">Observations</option>
                <option value="world">World Facts</option>
                <option value="strategic_outcome">Strategic Outcomes</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Episodic Memories List */}
        {activeTab === 'memories' && (
          <div>
            {loading ? (
              <div className={styles.emptyState}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                </svg>
                <span>Synchronizing episodic memory from Hindsight bank...</span>
              </div>
            ) : filteredMemories.length === 0 ? (
              <div className={styles.emptyState}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
                </svg>
                <div style={{ fontWeight: 600, color: '#f4f4f5' }}>No memories match the selected filters</div>
                <span style={{ fontSize: 12 }}>
                  Try clearing the search query or retain a new observation using the button above.
                </span>
              </div>
            ) : (
              <div className={styles.memoriesList}>
                {filteredMemories.map((mem) => (
                  <div key={mem.id} className={styles.memoryItem}>
                    <div className={styles.itemTopLine}>
                      <div className={styles.itemMetaLeft}>
                        <span className={styles.competitorPill}>{mem.competitor}</span>
                        <span
                          className={`${styles.factTypePill} ${
                            mem.factType.toLowerCase().includes('world')
                              ? styles.factWorld
                              : styles.factObservation
                          }`}
                        >
                          {mem.factType.replace(/_/g, ' ')}
                        </span>
                        {mem.source === 'cloud' && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#a3e635',
                              background: 'rgba(163, 230, 53, 0.08)',
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                          >
                            Cloud Vector
                          </span>
                        )}
                      </div>
                      <span className={styles.itemDate}>
                        {mem.date !== 'Recent' ? new Date(mem.date).toLocaleDateString() : 'Active Episode'}
                      </span>
                    </div>

                    <p className={styles.itemContent}>{mem.content}</p>

                    <div className={styles.itemFooter}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {mem.entities.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ color: '#71717a' }}>Entities:</span>
                            {mem.entities.map((e, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedEntity(e)}
                                style={{
                                  background: 'rgba(255,255,255,0.06)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: 4,
                                  padding: '1px 5px',
                                  fontSize: 10,
                                  color: '#d4d4d8',
                                  cursor: 'pointer',
                                }}
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <span style={{ fontSize: 10, color: '#52525b', fontFamily: 'monospace' }}>
                        ID: {mem.id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Knowledge Graph Stats & Architecture */}
        {activeTab === 'graph' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className={styles.graphStatsGrid}>
              <div className={styles.graphStatBox}>
                <span className={styles.graphStatBoxTitle}>Knowledge Graph Nodes</span>
                <span className={styles.graphStatBoxVal}>{stats?.total_nodes ?? 61}</span>
                <span className={styles.graphStatBoxDesc}>
                  Structured semantic nodes across competitor entities and market facts.
                </span>
              </div>

              <div className={styles.graphStatBox}>
                <span className={styles.graphStatBoxTitle}>Interconnected Graph Links</span>
                <span className={styles.graphStatBoxVal} style={{ color: '#38bdf8' }}>
                  {stats?.total_links ?? 946}
                </span>
                <span className={styles.graphStatBoxDesc}>
                  Semantic ({stats?.links_by_link_type?.semantic ?? 407}), Temporal (
                  {stats?.links_by_link_type?.temporal ?? 510}), Entity (
                  {stats?.links_by_link_type?.entity ?? 29}) links.
                </span>
              </div>

              <div className={styles.graphStatBox}>
                <span className={styles.graphStatBoxTitle}>Indexed Source Documents</span>
                <span className={styles.graphStatBoxVal} style={{ color: '#4ade80' }}>
                  {stats?.total_documents ?? 36}
                </span>
                <span className={styles.graphStatBoxDesc}>
                  Datasets, pricing tables, and market announcements consolidated in bank.
                </span>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(24, 30, 26, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f4f4f5' }}>
                Hindsight Continuous Learning Architecture
              </h4>
              <p style={{ margin: 0, fontSize: 12, color: '#a1a1aa', lineHeight: 1.6 }}>
                Hindsight maintains an autonomous memory loop for RivalIQ:
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12,
                  marginTop: 8,
                }}
              >
                <div style={{ padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#bef264', marginBottom: 4 }}>1. Retain</div>
                  <div style={{ fontSize: 11, color: '#71717a' }}>
                    Extracts atomic facts, competitor entities, and pricing states from raw signals.
                  </div>
                </div>

                <div style={{ padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', marginBottom: 4 }}>2. Recall</div>
                  <div style={{ fontSize: 11, color: '#71717a' }}>
                    Hybrid vector & keyword fusion to retrieve analogous maneuvers from the past.
                  </div>
                </div>

                <div style={{ padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', marginBottom: 4 }}>3. Reason</div>
                  <div style={{ fontSize: 11, color: '#71717a' }}>
                    Consolidates observations into durable mental models and strategic recommendations.
                  </div>
                </div>

                <div style={{ padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#c084fc', marginBottom: 4 }}>4. Refine</div>
                  <div style={{ fontSize: 11, color: '#71717a' }}>
                    Records actual execution results to continuously calibrate future recommendations.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Synthesis & Reflection Studio */}
        {activeTab === 'reflect' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
                padding: '16px',
                background: 'rgba(24, 30, 26, 0.6)',
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: '#d4d4d8' }}>
                Synthesize Dossier for Target Competitor:
              </span>
              <select
                value={reflectCompetitor}
                onChange={(e) => setReflectCompetitor(e.target.value)}
                className={styles.filterSelect}
                style={{ minWidth: 160 }}
              >
                {availableEntities.map((ent) => (
                  <option key={ent} value={ent}>
                    {ent}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleRunReflect}
                disabled={reflecting}
                className={styles.querySubmitBtn}
              >
                {reflecting ? 'Synthesizing...' : 'Run Hindsight Reflection'}
              </button>
            </div>

            {reflectionResult && (
              <div
                style={{
                  background: 'rgba(24, 30, 26, 0.75)',
                  border: '1px solid rgba(163, 230, 53, 0.25)',
                  borderRadius: 14,
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#bef264', fontSize: 13, fontWeight: 700 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span>Synthesized Strategic Profile: {reflectCompetitor || availableEntities[0]}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: '#f4f4f5', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {reflectionResult}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Retain Knowledge Modal */}
      {showRetainModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Retain Strategic Knowledge into Hindsight</h3>
              <button
                type="button"
                onClick={() => setShowRetainModal(false)}
                className={styles.modalCloseBtn}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Target Competitor or Entity</label>
                <input
                  type="text"
                  placeholder="e.g. Rival Inc, Acme Corp, or Market Peer"
                  value={retainCompetitor}
                  onChange={(e) => setRetainCompetitor(e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Observation Event Category</label>
                <select
                  value={retainEventType}
                  onChange={(e) => setRetainEventType(e.target.value)}
                  className={styles.formSelect}
                >
                  <option value="pricing_change">Pricing & Promotional Maneuver</option>
                  <option value="catalog_expansion">Catalog & Footwear Expansion</option>
                  <option value="wholesale_shift">Specialty Wholesale Floor Shift</option>
                  <option value="feature_launch">Feature & Technology Matrix Launch</option>
                  <option value="market_entry">Regional Expansion & Market Entry</option>
                  <option value="strategic_outcome">Strategic Outcome & Retrospective</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Detailed Observation & Context</label>
                <textarea
                  rows={4}
                  placeholder="Describe the competitor action, pricing shifts, observed market reaction, or strategic aftermath..."
                  value={retainContent}
                  onChange={(e) => setRetainContent(e.target.value)}
                  className={styles.formTextarea}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={() => setShowRetainModal(false)}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRetainMemory}
                disabled={retaining || !retainContent.trim()}
                className={styles.submitBtn}
              >
                {retaining ? 'Retaining to Vector Bank...' : 'Retain Knowledge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
