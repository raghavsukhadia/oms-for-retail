'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { Building2, Shield } from 'lucide-react';
import { useOrganizationLogo, useOrganizationBranding } from '@/lib/providers/organization-provider';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
  showTenantBranding?: boolean;
}

export function AuthLayout({ 
  children, 
  title, 
  description, 
  showTenantBranding = false 
}: AuthLayoutProps) {
  const { logoUrl, companyName, hasLogo } = useOrganizationLogo();
  const { primaryColor } = useOrganizationBranding();
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Branding & Info */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-8 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('/auth-pattern.svg')] opacity-10" />
        
        <div className="relative z-10 flex flex-col justify-between w-full">
          {/* Header */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg">
              {hasLogo && logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={`${companyName} Logo`}
                  className="w-6 h-6 object-contain"
                />
              ) : (
                <Building2 className="w-6 h-6" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold">{companyName}</h1>
              <p className="text-blue-100 text-sm">Vehicle Accessory Management</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-6">
            <div>
              <h2 className="text-4xl font-bold leading-tight">
                Streamline Your 
                <br />
                Vehicle Accessory 
                <br />
                Operations
              </h2>
              <p className="text-xl text-blue-100 mt-4 leading-relaxed">
                Modern SaaS platform for managing vehicle accessory installation workflows, 
                tracking progress, and optimizing team performance.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-start space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-full mt-1">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold">Multi-Tenant Architecture</h3>
                  <p className="text-blue-100 text-sm">Secure, isolated environments for each organization</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-full mt-1">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold">Role-Based Access</h3>
                  <p className="text-blue-100 text-sm">Granular permissions for different team roles</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-sm text-blue-100">
            © 2024 OMSMS. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Header */}
          <div className="lg:hidden text-center space-y-2">
            <div className="flex items-center justify-center space-x-2">
              {hasLogo && logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={`${companyName} Logo`}
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <Building2 className="w-8 h-8 text-primary" style={{ color: primaryColor }} />
              )}
              <h1 className="text-2xl font-bold">{companyName}</h1>
            </div>
            <p className="text-muted-foreground">Vehicle Accessory Management</p>
          </div>

          {/* Theme Toggle */}
          <div className="flex justify-end">
            <ThemeToggle />
          </div>

          {/* Auth Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
              
              {showTenantBranding && (
                <div className="pt-2">
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm">
                    <Building2 className="w-4 h-4 mr-1" />
                    Multi-Tenant Platform
                  </div>
                </div>
              )}
            </CardHeader>
            
            <CardContent>
              {children}
            </CardContent>
          </Card>

          {/* Help Text */}
          <div className="text-center text-sm text-muted-foreground">
            Need help? Contact{' '}
            <a href="mailto:support@omsms.com" className="text-primary hover:underline">
              support@omsms.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}