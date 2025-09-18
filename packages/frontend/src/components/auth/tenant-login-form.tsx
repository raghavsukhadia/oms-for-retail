'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Building2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { tenantLoginSchema, type TenantLoginFormData } from '@/lib/validations/auth';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/tenantStore';

interface TenantLoginFormProps {
  redirectTo?: string;
}

export function TenantLoginForm({ redirectTo = '/dashboard' }: TenantLoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const { login } = useAuthStore();
  const { setCurrentTenant, setAvailableTenants } = useTenantStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TenantLoginFormData>({
    resolver: zodResolver(tenantLoginSchema),
  });

  const subdomain = watch('subdomain');

  const onSubmit = async (data: TenantLoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.tenantLogin(data);
      
      if (response.success && response.data) {
        const { user, tenant, tokens } = response.data;
        
        // Update auth state
        login(user, tenant, tokens.accessToken, tokens.refreshToken);
        setCurrentTenant(tenant);
        
        // Fetch additional tenants for this user
        try {
          const tenantsResponse = await authApi.getTenants();
          if (tenantsResponse.success && tenantsResponse.data) {
            setAvailableTenants(tenantsResponse.data.tenants);
          }
        } catch (err) {
          // Non-critical error, just use current tenant
          setAvailableTenants([tenant]);
        }
        
        // Redirect to intended destination
        router.push(redirectTo);
      } else {
        setError(response.message || 'Tenant login failed. Please check your credentials.');
      }
    } catch (err: any) {
      if (err.status === 404) {
        setError('Tenant not found. Please check the subdomain and try again.');
      } else if (err.status === 401) {
        setError('Invalid credentials. Please check your email and password.');
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatSubdomain = (value: string) => {
    return value.toLowerCase().replace(/[^a-z0-9-]/g, '');
  };

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
        <h3 className="text-lg font-semibold">Multi-Tenant Login</h3>
        <p className="text-sm text-muted-foreground">
          Sign in to your organization's OMSMS workspace
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subdomain">Organization Subdomain</Label>
          <div className="relative">
            <Input
              id="subdomain"
              type="text"
              placeholder="your-company"
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
            <p className="text-sm text-muted-foreground">
              Workspace URL: <span className="font-medium">{subdomain}.omsms.com</span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="john.doe@company.com"
            {...register('email')}
            disabled={isLoading}
            className={errors.email ? 'border-destructive' : ''}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              {...register('password')}
              disabled={isLoading}
              className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="text-sm text-center">
          <Link 
            href="/forgot-password" 
            className="text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In to Workspace'
          )}
        </Button>
      </form>

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Don't have access to a workspace?
        </p>
        <div className="space-x-4">
          <Button variant="outline" asChild>
            <Link href="/register">
              Create Account
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/login">
              Standard Login
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}