// ============================================================
// Auth Page - /auth
// ============================================================

import React from 'react';
import AuthForm from '@/components/auth/AuthForm';

export default function AuthPage() {
  return <AuthForm initialSignUp={false} />;
}
