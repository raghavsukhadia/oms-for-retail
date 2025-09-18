import { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/auth-layout';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata: Metadata = {
  title: 'Reset Password - OMSMS',
  description: 'Set your new OMSMS account password.',
};

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Set New Password"
      description="Enter your new password below"
    >
      <ResetPasswordForm />
    </AuthLayout>
  );
}