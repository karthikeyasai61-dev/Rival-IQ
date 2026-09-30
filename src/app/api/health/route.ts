// ============================================================
// Health Check API - Real, genuine tests for Firebase, Hindsight, Gemini
// ============================================================

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { checkHealth as checkHindsightHealth } from '@/lib/hindsight/client';
import { checkGeminiHealth } from '@/lib/llm/gemini';

export const dynamic = 'force-dynamic';

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function GET(req: Request) {
  const results = {
    firebase: { status: 'offline', latency: 0, message: 'Not checked' },
    hindsight: { status: 'offline', latency: 0, message: 'Not checked' },
    llm: { status: 'offline', latency: 0, message: 'Not checked' },
  };

  try {
    const [firebaseRes, hindsightRes, llmRes] = await Promise.allSettled([
      // 1. Firebase live Firestore ping
      withTimeout(
        (async () => {
          const start = Date.now();
          try {
            const db = getAdminDb();
            if (db && typeof db.collection === 'function') {
              await db.collection('_health').doc('ping').set({ timestamp: new Date().toISOString() });
              return {
                status: 'connected',
                latency: Date.now() - start,
                message: 'Firebase Firestore is connected and operational',
              };
            }
            return {
              status: 'offline',
              latency: 0,
              message: 'Firebase Admin credentials missing or uninitialized',
            };
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown Firestore error';
            return {
              status: 'offline',
              latency: 0,
              message: `Firebase error: ${msg}`,
            };
          }
        })(),
        4500,
        { status: 'offline', latency: 4500, message: 'Firebase ping timeout' }
      ),

      // 2. Hindsight live vector memory ping
      withTimeout(
        (async () => {
          const start = Date.now();
          try {
            const hsHealth = await checkHindsightHealth();
            if (hsHealth.status === 'connected') {
              return {
                status: 'connected',
                latency: Date.now() - start,
                message: 'Hindsight memory service is connected and operational',
              };
            }
            return {
              status: 'offline',
              latency: 0,
              message: `Hindsight returned status: ${hsHealth.status}`,
            };
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown Hindsight error';
            return {
              status: 'offline',
              latency: 0,
              message: `Hindsight error: ${msg}`,
            };
          }
        })(),
        4500,
        { status: 'offline', latency: 4500, message: 'Hindsight ping timeout' }
      ),

      // 3. Gemini live inference ping
      withTimeout(
        (async () => {
          try {
            const geminiHealth = await checkGeminiHealth();
            if (geminiHealth.status === 'connected') {
              return {
                status: 'connected',
                latency: geminiHealth.latency || 0,
                message: `Gemini (${geminiHealth.model}) is connected and operational`,
              };
            }
            return {
              status: 'offline',
              latency: 0,
              message: `Gemini returned status: ${geminiHealth.status}`,
            };
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown Gemini error';
            return {
              status: 'offline',
              latency: 0,
              message: `Gemini error: ${msg}`,
            };
          }
        })(),
        4500,
        { status: 'offline', latency: 4500, message: 'Gemini inference timeout' }
      ),
    ]);

    if (firebaseRes.status === 'fulfilled') results.firebase = firebaseRes.value;
    if (hindsightRes.status === 'fulfilled') results.hindsight = hindsightRes.value;
    if (llmRes.status === 'fulfilled') results.llm = llmRes.value;
  } catch (outerErr) {
    console.error('Unexpected error in health route:', outerErr);
  }

  return NextResponse.json(results, { status: 200 });
}
