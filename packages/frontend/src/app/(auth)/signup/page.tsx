'use client';

import { TenantSignupForm } from '@/components/auth/tenant-signup-form';

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-4xl w-full mx-auto p-6">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl p-8">
          <TenantSignupForm />
        </div>
      </div>
    </div>
  );
}
