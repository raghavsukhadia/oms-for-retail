'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, CheckCircle, Building2, Users, Shield, Zap } from 'lucide-react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/tenantStore';
import { authApi } from '@/lib/api/auth';

// Validation schema for tenant signup
const tenantSignupSchema = z.object({
  tenantName: z.string().min(1, 'Organization name is required'),
  subdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(63, 'Subdomain must be less than 63 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens'),
  adminEmail: z.string().email('Invalid email address'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
  adminFirstName: z.string().min(1, 'First name is required'),
  adminLastName: z.string().min(1, 'Last name is required'),
  subscriptionTier: z.enum(['starter', 'professional', 'enterprise'])
});

type TenantSignupFormData = z.infer<typeof tenantSignupSchema>;

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
}

export function TenantSignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [subdomainChecking, setSubdomainChecking] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  const router = useRouter();
  const { login } = useAuthStore();
  const { setCurrentTenant, setAvailableTenants } = useTenantStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TenantSignupFormData>({
    resolver: zodResolver(tenantSignupSchema),
    defaultValues: {
      subscriptionTier: 'starter'
    }
  });

  const subdomain = watch('subdomain');
  const selectedPlan = watch('subscriptionTier');

  const loadSubscriptionPlans = async () => {
    try {
      const response = await authApi.getSubscriptionPlans();
      if (response.success && response.data) {
        setPlans(response.data.plans);
      }
    } catch (error) {
      console.error('Failed to load subscription plans:', error);
    }
  };

  // Load subscription plans on component mount
  useEffect(() => {
    loadSubscriptionPlans();
  }, []);

  // Check subdomain availability with debouncing
  useEffect(() => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainAvailable(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSubdomainChecking(true);
      try {
        const response = await authApi.checkSubdomain(subdomain);
        if (response.success && response.data) {
          setSubdomainAvailable(response.data.available);
        }
      } catch (error) {
        console.error('Failed to check subdomain:', error);
      } finally {
        setSubdomainChecking(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [subdomain]);

  const formatSubdomain = (value: string) => {
    return value.toLowerCase().replace(/[^a-z0-9-]/g, '');
  };

  const onSubmit = async (data: TenantSignupFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.registerTenant(data);

      if (response.success && response.data) {
        const { tenant, adminUser, tokens } = response.data;
        
        // Auto-login the admin user
        login(adminUser, tenant, tokens.accessToken, tokens.refreshToken);
        setCurrentTenant(tenant);
        setAvailableTenants([tenant]);
        
        setSuccess(true);
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setError(response.error || 'Signup failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">
          Welcome to OMSMS!
        </h2>
        <p className="text-muted-foreground">
          Your organization has been successfully created. Redirecting to your dashboard...
        </p>
      </div>
    );
  }

  const currentPlan = plans.find(plan => plan.id === selectedPlan);

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold">Create Your Organization</h1>
        <p className="text-muted-foreground">
          Start your journey with OMSMS and transform your operations management
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Organization Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Organization Details</h3>
          
          <div className="space-y-2">
            <Label htmlFor="tenantName">Organization Name</Label>
            <Input
              id="tenantName"
              type="text"
              placeholder="Acme Corporation"
              {...register('tenantName')}
              disabled={isLoading}
              className={errors.tenantName ? 'border-destructive' : ''}
            />
            {errors.tenantName && (
              <p className="text-sm text-destructive">{errors.tenantName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subdomain">Workspace URL</Label>
            <div className="relative">
              <Input
                id="subdomain"
                type="text"
                placeholder="acme-corp"
                {...register('subdomain', {
                  setValueAs: formatSubdomain,
                })}
                disabled={isLoading}
                className={errors.subdomain ? 'border-destructive' : ''}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                .omsms.com
              </div>
            </div>
            {errors.subdomain && (
              <p className="text-sm text-destructive">{errors.subdomain.message}</p>
            )}
            {subdomain && !errors.subdomain && (
              <div className="flex items-center gap-2 text-sm">
                {subdomainChecking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : subdomainAvailable === true ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : subdomainAvailable === false ? (
                  <div className="w-4 h-4 rounded-full bg-red-600" />
                ) : null}
                <span className={
                  subdomainAvailable === true ? 'text-green-600' :
                  subdomainAvailable === false ? 'text-red-600' : 'text-muted-foreground'
                }>
                  {subdomainChecking ? 'Checking availability...' :
                   subdomainAvailable === true ? `${subdomain}.omsms.com is available!` :
                   subdomainAvailable === false ? `${subdomain}.omsms.com is not available` :
                   `Your workspace: ${subdomain}.omsms.com`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Admin User Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Administrator Account</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adminFirstName">First Name</Label>
              <Input
                id="adminFirstName"
                type="text"
                placeholder="John"
                {...register('adminFirstName')}
                disabled={isLoading}
                className={errors.adminFirstName ? 'border-destructive' : ''}
              />
              {errors.adminFirstName && (
                <p className="text-sm text-destructive">{errors.adminFirstName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminLastName">Last Name</Label>
              <Input
                id="adminLastName"
                type="text"
                placeholder="Doe"
                {...register('adminLastName')}
                disabled={isLoading}
                className={errors.adminLastName ? 'border-destructive' : ''}
              />
              {errors.adminLastName && (
                <p className="text-sm text-destructive">{errors.adminLastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminEmail">Email Address</Label>
            <Input
              id="adminEmail"
              type="email"
              placeholder="john.doe@acme-corp.com"
              {...register('adminEmail')}
              disabled={isLoading}
              className={errors.adminEmail ? 'border-destructive' : ''}
            />
            {errors.adminEmail && (
              <p className="text-sm text-destructive">{errors.adminEmail.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminPassword">Password</Label>
            <div className="relative">
              <Input
                id="adminPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                {...register('adminPassword')}
                disabled={isLoading}
                className={errors.adminPassword ? 'border-destructive' : ''}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.adminPassword && (
              <p className="text-sm text-destructive">{errors.adminPassword.message}</p>
            )}
          </div>
        </div>

        {/* Subscription Plan */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Choose Your Plan</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <Card 
                key={plan.id}
                className={`cursor-pointer transition-all ${
                  selectedPlan === plan.id 
                    ? 'ring-2 ring-blue-600 border-blue-600' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => setValue('subscriptionTier', plan.id as any)}
              >
                <CardHeader className="text-center">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="text-2xl font-bold">
                    ${plan.price}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{plan.interval}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {errors.subscriptionTier && (
            <p className="text-sm text-destructive">{errors.subscriptionTier.message}</p>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading || subdomainAvailable === false}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating your organization...
            </>
          ) : (
            'Create Organization'
          )}
        </Button>
      </form>

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Already have an organization?{' '}
          <Link 
            href="/tenant-login" 
            className="text-primary hover:underline font-medium"
          >
            Sign in to your workspace
          </Link>
        </p>
        <p className="text-xs text-muted-foreground">
          By creating an organization, you agree to our{' '}
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
