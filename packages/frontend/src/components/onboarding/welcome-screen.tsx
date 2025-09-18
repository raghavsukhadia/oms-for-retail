'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  ArrowRight, 
  Car, 
  Users, 
  Settings, 
  BarChart3,
  Building2,
  UserCircle,
  BookOpen
} from 'lucide-react';

import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/tenantStore';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  completed: boolean;
  requiredRole?: string[];
}

export function WelcomeScreen() {
  const { user } = useAuthStore();
  const { currentTenant } = useTenantStore();
  const [currentStep, setCurrentStep] = useState(0);

  const getOnboardingSteps = (): OnboardingStep[] => {
    const baseSteps: OnboardingStep[] = [
      {
        id: 'profile',
        title: 'Complete Your Profile',
        description: 'Add your personal information and contact details',
        icon: UserCircle,
        href: '/settings/profile',
        completed: !!(user?.firstName && user?.lastName && user?.mobileNumber),
      },
      {
        id: 'workspace',
        title: 'Explore Your Workspace',
        description: 'Get familiar with the dashboard and navigation',
        icon: Building2,
        href: '/dashboard',
        completed: false, // This would be tracked via user preferences
      },
      {
        id: 'first-vehicle',
        title: 'Add Your First Vehicle',
        description: 'Register a vehicle to start the installation process',
        icon: Car,
        href: '/vehicles/inward',
        completed: false, // This would be checked against actual data
      },
      {
        id: 'team-setup',
        title: 'Set Up Your Team',
        description: 'Invite team members and assign roles',
        icon: Users,
        href: '/users',
        completed: false,
        requiredRole: ['supervisor', 'coordinator', 'manager', 'admin'],
      },

      {
        id: 'reports',
        title: 'Review Reports',
        description: 'Learn about analytics and performance tracking',
        icon: BarChart3,
        href: '/reports',
        completed: false,
        requiredRole: ['coordinator', 'manager', 'admin'],
      },
    ];

    // Filter steps based on user role
    return baseSteps.filter(step => {
      if (!step.requiredRole) return true;
      return step.requiredRole.includes(user?.role || '');
    });
  };

  const steps = getOnboardingSteps();
  const completedSteps = steps.filter(step => step.completed).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  const getRoleWelcomeMessage = (role: string) => {
    const messages = {
      admin: "As an administrator, you have full access to manage your organization's vehicle operations.",
      manager: "As a manager, you can oversee operations, manage teams, and access comprehensive reports.",
      coordinator: "As a coordinator, you'll orchestrate vehicle installations and manage workflow efficiency.",
      supervisor: "As a supervisor, you'll guide your team and ensure quality installation processes.",
      salesperson: "As a salesperson, you'll manage customer relationships and vehicle registrations.",
      installer: "As an installer, you'll handle the hands-on vehicle accessory installation work.",
    };
    return messages[role as keyof typeof messages] || "Welcome to OMSMS! Let's get you started.";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Welcome Header */}
      <Card className="border-2 border-dashed border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            Welcome to {currentTenant?.tenantName || 'OMSMS'}, {user?.firstName || 'there'}!
          </CardTitle>
          <CardDescription className="text-base">
            {getRoleWelcomeMessage(user?.role || '')}
          </CardDescription>
          
          {user?.role && (
            <div className="flex justify-center mt-4">
              <Badge variant="secondary" className="text-sm">
                {(() => {
                        const roleName = typeof user.role === 'string' ? user.role : user.roleName || user.role?.roleName || 'user';
                        return roleName.charAt(0).toUpperCase() + roleName.slice(1);
                      })()} Role
              </Badge>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="text-center">
          <div className="space-y-2 mb-6">
            <div className="text-sm text-muted-foreground">
              Setup Progress: {completedSteps} of {steps.length} steps completed
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Follow the steps below to get the most out of your OMSMS experience.
          </p>
        </CardContent>
      </Card>

      {/* Onboarding Steps */}
      <div className="grid gap-4 md:grid-cols-2">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          return (
            <Card 
              key={step.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                step.completed ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      step.completed 
                        ? 'bg-green-100 dark:bg-green-900' 
                        : 'bg-primary/10'
                    }`}>
                      {step.completed ? (
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <StepIcon className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{step.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {step.description}
                      </CardDescription>
                    </div>
                  </div>
                  {step.completed && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Complete
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <Button 
                  variant={step.completed ? "outline" : "default"}
                  size="sm"
                  className="w-full"
                  asChild
                >
                  <a href={step.href}>
                    {step.completed ? 'Review' : 'Get Started'}
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            Helpful Resources
          </CardTitle>
          <CardDescription>
            Learn more about OMSMS features and best practices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3">
            <Button variant="ghost" className="justify-start h-auto p-3">
              <div className="text-left">
                <p className="font-medium text-sm">User Guide</p>
                <p className="text-xs text-muted-foreground">Complete documentation</p>
              </div>
            </Button>
            <Button variant="ghost" className="justify-start h-auto p-3">
              <div className="text-left">
                <p className="font-medium text-sm">Video Tutorials</p>
                <p className="text-xs text-muted-foreground">Step-by-step walkthroughs</p>
              </div>
            </Button>
            <Button variant="ghost" className="justify-start h-auto p-3">
              <div className="text-left">
                <p className="font-medium text-sm">Support Center</p>
                <p className="text-xs text-muted-foreground">Get help when needed</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}