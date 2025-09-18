import { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/auth-layout';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata: Metadata = {
  title: 'Forgot Password - OMSMS',
  description: 'Reset your OMSMS account password.',
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Reset Password"
      description="We'll send you a link to reset your password"
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}