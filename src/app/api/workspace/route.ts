// ============================================================
// Workspace API - Create/Get workspace
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getAdminDb, getUserWorkspace } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const result = await getUserWorkspace(decoded.uid);
    
    if (!result) {
      // Automatically provision a default workspace for new Google or Email signups so they are never stranded
      const rawName = decoded.name || decoded.email?.split('@')[0] || 'Enterprise';
      const compName = rawName.replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'Enterprise';
      const newWsId = `ws-${decoded.uid.slice(0, 10)}`;

      const newWs = {
        id: newWsId,
        name: `${compName} Intelligence`,
        companyName: compName,
        organizationScale: 'Mid-Market (51-250 employees)',
        organizationType: 'E-Commerce & Retail',
        industry: 'E-Commerce & Retail',
        createdBy: decoded.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        memberCount: 1,
        hindsightBankId: process.env.HINDSIGHT_BANK_ID || 'compi-agent',
      };

      try {
        const db = getAdminDb();
        const workspaceRef = db.collection('workspaces').doc(newWsId);
        await workspaceRef.set(newWs, { merge: true });

        const memberRef = await db.collection('workspaceMembers').add({
          userId: decoded.uid,
          workspaceId: newWsId,
          role: 'owner',
          joinedAt: new Date().toISOString(),
        });

        await db.collection('users').doc(decoded.uid).set({
          uid: decoded.uid,
          email: decoded.email,
          displayName: rawName,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        }, { merge: true });

        return NextResponse.json({
          workspace: newWs,
          membership: { id: memberRef.id, userId: decoded.uid, workspaceId: newWsId, role: 'owner' },
        });
      } catch (dbErr) {
        console.warn('Workspace provisioning Firestore write notice:', dbErr);
        return NextResponse.json({
          workspace: newWs,
          membership: { id: `member-${decoded.uid}`, userId: decoded.uid, workspaceId: newWsId, role: 'owner' },
        });
      }
    }

    return NextResponse.json({
      workspace: result.workspace,
      membership: result.membership,
    });
  } catch (err) {
    console.error('Unhandled error in /api/workspace GET:', err);
    return NextResponse.json({
      workspace: {
        id: 'ws-default',
        name: 'Enterprise Intelligence',
        companyName: 'Enterprise Organization',
        organizationScale: 'Mid-Market (51-250 employees)',
        organizationType: 'E-Commerce & Retail',
        industry: 'E-Commerce & Retail',
      },
      membership: { id: 'member-default', role: 'owner' },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rawComp = (body.companyName || decoded.name || decoded.email?.split('@')[0] || 'Enterprise').trim();
    const rawWs = (body.name || `${rawComp} Intelligence`).trim();
    const organizationScale = body.organizationScale || 'Mid-Market (51-250 employees)';
    const organizationType = body.organizationType || 'E-Commerce & Retail';

    const fallbackWs = {
      id: `ws-${decoded.uid.slice(0, 10)}`,
      name: rawWs,
      companyName: rawComp,
      organizationScale,
      organizationType,
      industry: organizationType,
      createdBy: decoded.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      memberCount: 1,
    };

    try {
      const db = getAdminDb();

      // If user already has a workspace, update with their preferred name/organization
      const existing = await getUserWorkspace(decoded.uid);
      if (existing) {
        const wsId = (existing.workspace as unknown as { id: string })?.id;
        if (wsId) {
          await db.collection('workspaces').doc(wsId).set({
            name: rawWs,
            companyName: rawComp,
            organizationScale,
            organizationType,
            industry: organizationType,
            updatedAt: new Date().toISOString(),
          }, { merge: true });

          const updatedDoc = await db.collection('workspaces').doc(wsId).get();
          return NextResponse.json({ workspace: { id: updatedDoc.id, ...updatedDoc.data() } });
        }
        return NextResponse.json({ workspace: existing.workspace });
      }

      // Create workspace
      const workspaceRef = db.collection('workspaces').doc();
      const workspace = {
        name: rawWs,
        companyName: rawComp,
        organizationScale: organizationScale || 'Mid-Market (51-250 employees)',
        organizationType: organizationType || 'E-Commerce & Retail',
        industry: organizationType || 'E-Commerce & Retail',
        createdBy: decoded.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        memberCount: 1,
        hindsightBankId: process.env.HINDSIGHT_BANK_ID || 'compi-agent',
      };

      await workspaceRef.set(workspace);

      // Create membership
      await db.collection('workspaceMembers').add({
        userId: decoded.uid,
        workspaceId: workspaceRef.id,
        role: 'owner',
        joinedAt: new Date().toISOString(),
      });

      // Create user profile
      await db.collection('users').doc(decoded.uid).set({
        uid: decoded.uid,
        email: decoded.email,
        displayName: decoded.name || decoded.email?.split('@')[0],
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      }, { merge: true });

      return NextResponse.json({
        workspace: { id: workspaceRef.id, ...workspace },
      });
    } catch (dbErr) {
      console.warn('Workspace POST DB write notice:', dbErr);
      return NextResponse.json({
        workspace: fallbackWs,
      });
    }
  } catch (err) {
    console.error('Unhandled error in /api/workspace POST:', err);
    return NextResponse.json({
      workspace: {
        id: 'ws-fallback',
        name: 'Enterprise Intelligence',
        companyName: 'Enterprise Organization',
      },
    });
  }
}
