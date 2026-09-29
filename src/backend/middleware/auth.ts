// ============================================================
// RivalIQ Backend - API Authentication Middleware
// Standardized Bearer token extraction and verification
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserWorkspace } from '@/backend/firebase/admin';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
}

export interface AuthContextResult {
  user: AuthenticatedUser;
  workspaceId?: string;
}

/**
 * Extracts and verifies the Firebase Bearer token from the incoming NextRequest.
 * Returns either an AuthenticatedUser or a NextResponse 401 error.
 */
export async function authenticateApiRequest(
  req: NextRequest
): Promise<{ user: AuthenticatedUser } | { errorResponse: NextResponse }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Unauthorized: Missing or malformed Bearer token' },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.split('Bearer ')[1];
  const decoded = await verifyToken(token);
  if (!decoded) {
    return {
      errorResponse: NextResponse.json(
        { error: 'Unauthorized: Invalid or expired token' },
        { status: 401 }
      ),
    };
  }

  return {
    user: {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
    },
  };
}

/**
 * Helper to get the user's active workspace given an authenticated user id.
 */
export async function getAuthenticatedWorkspace(userId: string) {
  return await getUserWorkspace(userId);
}
