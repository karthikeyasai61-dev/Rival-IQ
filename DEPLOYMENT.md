# RivalIQ - Deployment & Architecture Guide

This guide details the internal file architecture separating **Frontend** and **Backend**, and provides step-by-step instructions for deploying to **Vercel**.

---

## 1. Project Architecture (Frontend & Backend Separation)

The codebase is organized into dedicated directories:

```
src/
├── frontend/               # CLIENT-SIDE ARCHITECTURE
│   ├── components/         # Reusable React UI components
│   │   ├── auth/           # Login & Signup forms
│   │   ├── charts/         # Apache ECharts visualizations
│   │   └── ui/             # Modals, BrandLogo, SelectDropdown, buttons
│   ├── context/            # Client state providers (AuthContext)
│   ├── brand/              # High-resolution logos & asset data
│   ├── styles/             # Global CSS styling & design system tokens
│   └── index.ts            # Central barrel exports for @frontend
│
├── backend/                # SERVER-SIDE ARCHITECTURE
│   ├── engine/             # Core competitive intelligence logic
│   │   ├── signals.ts      # Signal detection & trajectory simulation
│   │   └── parser.ts       # CSV/JSON file normalization & parsing
│   ├── firebase/           # Server-side Firebase Admin SDK & DB operations
│   │   ├── admin.ts        # Firestore server db & auth verification
│   │   └── config.ts       # Firebase client/server credentials
│   ├── hindsight/          # Hindsight vector cognitive memory client
│   │   └── client.ts       # Bank query, reflect & retain operations
│   ├── llm/                # LLM cognitive narrative synthesis
│   │   └── gemini.ts       # Google Gemini 2.0 Flash integration
│   ├── middleware/         # Security & authentication middleware
│   │   └── auth.ts         # Bearer token verification helper
│   └── index.ts            # Central barrel exports for @backend
│
├── shared/                 # SHARED DATA MODELS
│   ├── types/              # TypeScript interfaces (Workspace, Signal, Gap, etc.)
│   └── index.ts            # Central barrel exports for @shared
│
└── app/                    # NEXT.JS FULL-STACK ROUTING LAYER
    ├── layout.tsx          # Root layout & global metadata
    ├── page.tsx            # Public landing page
    ├── auth/               # Authentication route
    ├── app/                # Authenticated C-Suite dashboard pages
    └── api/                # Serverless Node.js REST API endpoints
```

### TypeScript Path Aliases

You can import cleanly from anywhere in the codebase using:
- `@frontend/*` -> Points to `src/frontend/*`
- `@backend/*` -> Points to `src/backend/*`
- `@shared/*` -> Points to `src/shared/*`
- `@/*` -> Points to `src/*` (backward-compatible)

---

## 2. Deploying to Vercel

RivalIQ is optimized for 1-click deployment on **Vercel** with full support for Next.js App Router and serverless API routes.

### Option A: Deploy via GitHub (Recommended)
1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "Organize frontend and backend architecture for deployment"
   git push origin main
   ```
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Select your repository and click **Import**.
4. Framework Preset will automatically detect **Next.js**.
5. Add the **Environment Variables** (listed below).
6. Click **Deploy**.

### Option B: Deploy via Vercel CLI
```bash
npm install -g vercel
vercel login
vercel
```
Follow the interactive prompts to link and deploy your project.

---

## 3. Production Environment Variables Checklist

Add these environment variables in your **Vercel Project Settings > Environment Variables**:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API Key | `AIzaSy...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `agent-d162a.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID | `agent-d162a` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`| Firebase Storage Bucket | `agent-d162a.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID | `1234567890` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Web App ID | `1:123456:web:...` |
| `FIREBASE_PROJECT_ID` | Firebase Admin Project ID | `agent-d162a` |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin Service Account Email | `firebase-adminsdk-...@agent-d162a.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin Private Key | `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` |
| `HINDSIGHT_API_KEY` | Hindsight Vector Memory API Key | `hin_live_...` |
| `HINDSIGHT_BASE_URL` | Hindsight API Base URL | `https://api.hindsight.vectorize.io` |
| `HINDSIGHT_BANK_ID` | Hindsight Vector Bank Identifier | `rivaliq-ci` |
| `GEMINI_API_KEY` | Google Gemini API Key | `AIzaSy...` |
| `GEMINI_MODEL` | Gemini Model Identifier | `gemini-2.0-flash` |
| `NEXT_PUBLIC_APP_URL` | Public Production URL | `https://your-domain.vercel.app` |

---

## 4. Local Build Validation

To verify the production build locally before pushing:

```bash
# Type check
npx tsc --noEmit

# Production build
npm run build
```
