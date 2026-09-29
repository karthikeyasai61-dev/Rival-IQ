// ============================================================
// RivalIQ Backend - Central Services & Modules Barrel
// ============================================================

// Firebase Admin & Database
export * from './firebase/admin';
export * from './firebase/config';

// Intelligence & Processing Engines
export * from './engine/signals';
export * from './engine/parser';

// Hindsight Vector Memory Client
export * from './hindsight/client';

// LLM & Cognitive Synthesis
export * from './llm/gemini';

// Middleware & Security
export * from './middleware/auth';
