// ============================================================
// Health Check API - Real, genuine tests for Firebase, Hindsight, Gemini
// ============================================================

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { checkHealth as checkHindsightHealth } from '@/lib/hindsight/client';
import { checkGeminiHealth } from '@/lib/llm/gemini';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const results = {
    firebase: { status: 'offline', latency: 0, message: 'Not checked' },
    hindsight: { status: 'offline', latency: 0, message: 'Not checked' },
    llm: { status: 'offline', latency: 0, message: 'Not checked' },
  };

  // 1. Firebase live Firestore ping
  try {
    const start = Date.now();
    const db = getAdminDb();
    if (db) {
      await db.collection('_health').doc('ping').set({ timestamp: new Date().toISOString() });
      results.firebase = {
        status: 'connected',
        latency: Date.now() - start,
        message: 'Firebase Firestore is connected and operational',
      };
    } else {
      results.firebase = {
        status: 'offline',
        latency: 0,
        message: 'Firebase Admin credentials missing or uninitialized',
      };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown Firestore error';
    results.firebase = {
      status: 'offline',
      latency: 0,
      message: `Firebase error: ${msg}`,
    };
  }

  // 2. Hindsight live vector memory ping
  try {
    const start = Date.now();
    const hsHealth = await checkHindsightHealth();
    if (hsHealth.status === 'connected') {
      results.hindsight = {
        status: 'connected',
        latency: Date.now() - start,
        message: 'Hindsight memory service is connected and operational',
      };
    } else {
      results.hindsight = {
        status: 'offline',
        latency: 0,
        message: `Hindsight returned status: ${hsHealth.status}`,
      };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown Hindsight error';
    results.hindsight = {
      status: 'offline',
      latency: 0,
      message: `Hindsight error: ${msg}`,
    };
  }

  // 3. Gemini live inference ping
  try {
    const geminiHealth = await checkGeminiHealth();
    if (geminiHealth.status === 'connected') {
      results.llm = {
        status: 'connected',
        latency: geminiHealth.latency || 0,
        message: `Gemini (${geminiHealth.model}) is connected and operational`,
      };
    } else {
      results.llm = {
        status: 'offline',
        latency: 0,
        message: `Gemini returned status: ${geminiHealth.status}`,
      };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown Gemini error';
    results.llm = {
      status: 'offline',
      latency: 0,
      message: `Gemini error: ${msg}`,
    };
  }

  return NextResponse.json(results, { status: 200 });
}
