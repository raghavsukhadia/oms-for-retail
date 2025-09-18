import { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/auth-layout';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata: Metadata = {
  title: 'Create Account - OMSMS',
  description: 'Create your OMSMS account to start managing vehicle accessory installations.',
};

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Create Your Account"
      description="Get started with OMSMS today"
    >
      <RegisterForm />
    </AuthLayout>
  );
}