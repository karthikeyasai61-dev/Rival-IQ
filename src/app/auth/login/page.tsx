// ============================================================
// Login Page - /auth/login
// ============================================================

import React from 'react';
import AuthForm from '@/components/auth/AuthForm';

export default function LoginPage() {
  return <AuthForm initialSignUp={false} />;
}
