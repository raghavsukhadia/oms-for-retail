'use client';

import { useState } from 'react';
import { useForm, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { registerUserSchema, type RegisterFormData } from '@/lib/validations/auth';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/store/authStore';
import { useTenantStore } from '@/store/tenantStore';
import type { UserRole } from '@/types';

// Create a type that extends FieldValues for react-hook-form compatibility
interface RegisterFormFields extends FieldValues {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  address?: string;
  role: UserRole;
  departmentId?: string;
  locationId?: string;
}

interface RegisterFormProps {
  redirectTo?: string;
}

export function RegisterForm({ redirectTo = '/dashboard' }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();
  const { login } = useAuthStore();
  const { setCurrentTenant, setAvailableTenants } = useTenantStore();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormFields>({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      role: 'salesperson', // Default role
    },
  });

  const watchRole = watch('role');

  const onSubmit = async (data: RegisterFormFields) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.register(data);
      
      if (response.success && response.data) {
        setSuccess(true);
        
        // Auto-login after successful registration
        const { user, tenant, tokens } = response.data;
        login(user, tenant, tokens.accessToken, tokens.refreshToken);
        setCurrentTenant(tenant);
        setAvailableTenants([tenant]);
        
        // Small delay to show success message
        setTimeout(() => {
          router.push(redirectTo);
        }, 1500);
      } else {
        setError(response.message || 'Registration failed. Please try again.');
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
        <div>
          <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
            Registration Successful!
          </h3>
          <p className="text-green-700 dark:text-green-300">
            Welcome to OMSMS. Redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              placeholder="John"
              {...register('firstName')}
              disabled={isLoading}
              className={errors.firstName ? 'border-destructive' : ''}
            />
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              {...register('lastName')}
              disabled={isLoading}
              className={errors.lastName ? 'border-destructive' : ''}
            />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName.message}</p>
            )}
          </div>
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
          <Label htmlFor="mobileNumber">Mobile Number (Optional)</Label>
          <Input
            id="mobileNumber"
            type="tel"
            placeholder="+1 (555) 123-4567"
            {...register('mobileNumber')}
            disabled={isLoading}
            className={errors.mobileNumber ? 'border-destructive' : ''}
          />
          {errors.mobileNumber && (
            <p className="text-sm text-destructive">{errors.mobileNumber.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select 
            value={watchRole} 
            onValueChange={(value) => setValue('role', value as any)}
            disabled={isLoading}
          >
            <SelectTrigger className={errors.role ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="salesperson">Salesperson</SelectItem>
              <SelectItem value="installer">Installer</SelectItem>
              <SelectItem value="coordinator">Coordinator</SelectItem>
              <SelectItem value="supervisor">Supervisor</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && (
            <p className="text-sm text-destructive">{errors.role.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
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
          <p className="text-xs text-muted-foreground">
            Password must be at least 8 characters long
          </p>
        </div>

        <div className="text-sm text-center">
          <span className="text-muted-foreground">Already have an account?</span>{' '}
          <Link 
            href="/login" 
            className="text-primary hover:underline font-medium"
          >
            Sign in
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </Button>
      </form>

      <div className="text-xs text-center text-muted-foreground">
        By creating an account, you agree to our{' '}
        <Link href="/terms" className="text-primary hover:underline">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="text-primary hover:underline">
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}