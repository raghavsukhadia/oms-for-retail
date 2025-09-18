import { Metadata } from 'next';
import { WelcomeScreen } from '@/components/onboarding/welcome-screen';

export const metadata: Metadata = {
  title: 'Welcome - OMSMS',
  description: 'Welcome to OMSMS - Get started with your vehicle accessory management platform.',
};

export default function WelcomePage() {
  return (
    <div className="container mx-auto py-6">
      <WelcomeScreen />
    </div>
  );
}