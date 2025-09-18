import { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/auth-layout';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Sign In - OMSMS',
  description: 'Sign in to your OMSMS account to manage vehicle accessory installations.',
};

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome Back"
      description="Sign in to your account to continue"
      showTenantBranding={true}
    >
      <LoginForm />
    </AuthLayout>
  );
}