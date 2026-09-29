// ============================================================
// Health Check API - Tests Firebase, Hindsight, Gemini connectivity
// ============================================================

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { checkHealth as checkHindsightHealth } from '@/lib/hindsight/client';
import { checkGeminiHealth } from '@/lib/llm/gemini';

export async function GET() {
  const results = {
    firebase: { status: 'checking', latency: 0, message: '' },
    hindsight: { status: 'checking', latency: 0, message: '' },
    llm: { status: 'checking', latency: 0, message: '' },
  };

  // Firebase check
  try {
    const start = Date.now();
    const db = getAdminDb();
    await db.collection('_health').doc('ping').set({ timestamp: new Date().toISOString() });
    results.firebase = {
      status: 'connected',
      latency: Date.now() - start,
      message: 'Firebase Firestore is operational',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    results.firebase = {
      status: msg.includes('credentials') || msg.includes('permission') ? 'auth_error' : 'unavailable',
      latency: 0,
      message: msg,
    };
  }

  // Hindsight check
  try {
    const start = Date.now();
    const hsHealth = await checkHindsightHealth();
    results.hindsight = {
      status: hsHealth.status === 'connected' ? 'connected' : hsHealth.status,
      latency: Date.now() - start,
      message: hsHealth.status === 'connected' ? 'Hindsight memory service is operational' : `Hindsight: ${hsHealth.status}`,
    };
  } catch (error) {
    results.hindsight = {
      status: 'unavailable',
      latency: 0,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Gemini check
  try {
    const geminiHealth = await checkGeminiHealth();
    results.llm = {
      status: geminiHealth.status,
      latency: geminiHealth.latency || 0,
      message: geminiHealth.status === 'connected'
        ? `Gemini (${geminiHealth.model}) is operational`
        : `Gemini: ${geminiHealth.status}`,
    };
  } catch (error) {
    results.llm = {
      status: 'unavailable',
      latency: 0,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  return NextResponse.json(results);
}
