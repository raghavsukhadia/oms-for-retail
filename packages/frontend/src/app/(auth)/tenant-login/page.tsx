import { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/auth-layout';
import { TenantLoginForm } from '@/components/auth/tenant-login-form';

export const metadata: Metadata = {
  title: 'Workspace Sign In - OMSMS',
  description: 'Sign in to your organization\'s OMSMS workspace.',
};

export default function TenantLoginPage() {
  return (
    <AuthLayout
      title="Workspace Sign In"
      description="Access your organization's OMSMS workspace"
      showTenantBranding={true}
    >
      <TenantLoginForm />
    </AuthLayout>
  );
}