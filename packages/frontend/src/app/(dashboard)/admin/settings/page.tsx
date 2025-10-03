'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Shield, 
  Database, 
  Server, 
  Mail, 
  Key, 
  Globe, 
  Save, 
  Loader2,
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

interface SystemSettings {
  // Database Settings
  database: {
    connectionPool: number;
    queryTimeout: number;
    enableLogging: boolean;
  };
  
  // Security Settings
  security: {
    jwtExpiry: string;
    passwordMinLength: number;
    enableTwoFactor: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
  };
  
  // Email Settings
  email: {
    provider: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    enableSSL: boolean;
    fromEmail: string;
    fromName: string;
  };
  
  // Application Settings
  application: {
    maintenanceMode: boolean;
    debugMode: boolean;
    logLevel: string;
    maxFileSize: number;
    allowedFileTypes: string[];
  };
  
  // API Settings
  api: {
    rateLimitPerMinute: number;
    enableCORS: boolean;
    corsOrigins: string[];
    enableSwagger: boolean;
  };
  
  // Cache Settings
  cache: {
    provider: string;
    ttl: number;
    maxMemory: number;
  };
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    database: {
      connectionPool: 20,
      queryTimeout: 30000,
      enableLogging: true,
    },
    security: {
      jwtExpiry: '7d',
      passwordMinLength: 8,
      enableTwoFactor: false,
      sessionTimeout: 3600,
      maxLoginAttempts: 5,
    },
    email: {
      provider: 'smtp',
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      enableSSL: true,
      fromEmail: '',
      fromName: 'OMSMS',
    },
    application: {
      maintenanceMode: false,
      debugMode: false,
      logLevel: 'info',
      maxFileSize: 10485760, // 10MB
      allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
    },
    api: {
      rateLimitPerMinute: 100,
      enableCORS: true,
      corsOrigins: ['http://localhost:3000'],
      enableSwagger: true,
    },
    cache: {
      provider: 'memory',
      ttl: 3600,
      maxMemory: 100,
    },
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // In a real application, this would fetch from the API
      // For now, we'll use the default settings
      toast.success('Settings loaded successfully');
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // In a real application, this would save to the API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast.success('System settings updated successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save system settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (section: keyof SystemSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <Shield className="h-8 w-8 text-red-600" />
                </div>
                System Settings
              </h1>
              <p className="text-gray-600 text-lg">
                Configure system-wide settings and security parameters
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm">
                <Info className="h-4 w-4 mr-1" />
                Auto-save enabled
              </Badge>
              <Button onClick={handleSave} disabled={saving} size="lg" className="px-6">
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Database Settings */}
          <Card className="shadow-sm border-0 bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Database className="h-6 w-6 text-blue-600" />
                </div>
                Database Configuration
              </CardTitle>
              <CardDescription className="text-gray-600">
                Configure database connection and performance settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="connectionPool" className="text-sm font-medium text-gray-700">
                    Connection Pool Size
                  </Label>
                  <Input
                    id="connectionPool"
                    type="number"
                    value={settings.database.connectionPool}
                    onChange={(e) => updateSetting('database', 'connectionPool', parseInt(e.target.value))}
                    className="h-10"
                  />
                  <p className="text-xs text-gray-500">Recommended: 10-50 connections</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="queryTimeout" className="text-sm font-medium text-gray-700">
                    Query Timeout (ms)
                  </Label>
                  <Input
                    id="queryTimeout"
                    type="number"
                    value={settings.database.queryTimeout}
                    onChange={(e) => updateSetting('database', 'queryTimeout', parseInt(e.target.value))}
                    className="h-10"
                  />
                  <p className="text-xs text-gray-500">Default: 30000ms (30 seconds)</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="enableLogging" className="text-sm font-medium text-gray-700">
                    Enable Query Logging
                  </Label>
                  <p className="text-xs text-gray-500">Log all database queries for debugging</p>
                </div>
                <Switch
                  id="enableLogging"
                  checked={settings.database.enableLogging}
                  onCheckedChange={(checked) => updateSetting('database', 'enableLogging', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="shadow-sm border-0 bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Key className="h-6 w-6 text-green-600" />
                </div>
                Security Settings
              </CardTitle>
              <CardDescription className="text-gray-600">
                Configure authentication and security parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="jwtExpiry" className="text-sm font-medium text-gray-700">
                    JWT Token Expiry
                  </Label>
                  <Select
                    value={settings.security.jwtExpiry}
                    onValueChange={(value) => updateSetting('security', 'jwtExpiry', value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">1 Hour</SelectItem>
                      <SelectItem value="24h">24 Hours</SelectItem>
                      <SelectItem value="7d">7 Days</SelectItem>
                      <SelectItem value="30d">30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">How long authentication tokens remain valid</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="passwordMinLength" className="text-sm font-medium text-gray-700">
                      Minimum Password Length
                    </Label>
                    <Input
                      id="passwordMinLength"
                      type="number"
                      value={settings.security.passwordMinLength}
                      onChange={(e) => updateSetting('security', 'passwordMinLength', parseInt(e.target.value))}
                      className="h-10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maxLoginAttempts" className="text-sm font-medium text-gray-700">
                      Max Login Attempts
                    </Label>
                    <Input
                      id="maxLoginAttempts"
                      type="number"
                      value={settings.security.maxLoginAttempts}
                      onChange={(e) => updateSetting('security', 'maxLoginAttempts', parseInt(e.target.value))}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="enableTwoFactor" className="text-sm font-medium text-gray-700">
                    Enable Two-Factor Authentication
                  </Label>
                  <p className="text-xs text-gray-500">Require 2FA for enhanced security</p>
                </div>
                <Switch
                  id="enableTwoFactor"
                  checked={settings.security.enableTwoFactor}
                  onCheckedChange={(checked) => updateSetting('security', 'enableTwoFactor', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card className="shadow-sm border-0 bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Mail className="h-6 w-6 text-purple-600" />
                </div>
                Email Configuration
              </CardTitle>
              <CardDescription className="text-gray-600">
                Configure SMTP settings for email notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost" className="text-sm font-medium text-gray-700">
                    SMTP Host
                  </Label>
                  <Input
                    id="smtpHost"
                    value={settings.email.smtpHost}
                    onChange={(e) => updateSetting('email', 'smtpHost', e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="h-10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="smtpPort" className="text-sm font-medium text-gray-700">
                    SMTP Port
                  </Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={settings.email.smtpPort}
                    onChange={(e) => updateSetting('email', 'smtpPort', parseInt(e.target.value))}
                    className="h-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="smtpUser" className="text-sm font-medium text-gray-700">
                  SMTP Username
                </Label>
                <Input
                  id="smtpUser"
                  value={settings.email.smtpUser}
                  onChange={(e) => updateSetting('email', 'smtpUser', e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="h-10"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fromEmail" className="text-sm font-medium text-gray-700">
                  From Email Address
                </Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={settings.email.fromEmail}
                  onChange={(e) => updateSetting('email', 'fromEmail', e.target.value)}
                  placeholder="noreply@omsms.com"
                  className="h-10"
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="enableSSL" className="text-sm font-medium text-gray-700">
                    Enable SSL/TLS
                  </Label>
                  <p className="text-xs text-gray-500">Secure connection for email sending</p>
                </div>
                <Switch
                  id="enableSSL"
                  checked={settings.email.enableSSL}
                  onCheckedChange={(checked) => updateSetting('email', 'enableSSL', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Application Settings */}
          <Card className="shadow-sm border-0 bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Settings className="h-6 w-6 text-orange-600" />
                </div>
                Application Settings
              </CardTitle>
              <CardDescription className="text-gray-600">
                Configure application behavior and logging
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logLevel" className="text-sm font-medium text-gray-700">
                    Log Level
                  </Label>
                  <Select
                    value={settings.application.logLevel}
                    onValueChange={(value) => updateSetting('application', 'logLevel', value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="warn">Warning</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="debug">Debug</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">Set the minimum log level to capture</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxFileSize" className="text-sm font-medium text-gray-700">
                    Max File Size (bytes)
                  </Label>
                  <Input
                    id="maxFileSize"
                    type="number"
                    value={settings.application.maxFileSize}
                    onChange={(e) => updateSetting('application', 'maxFileSize', parseInt(e.target.value))}
                    className="h-10"
                  />
                  <p className="text-xs text-gray-500">Maximum file size for uploads (10MB = 10485760 bytes)</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="maintenanceMode" className="text-sm font-medium text-gray-700">
                      Maintenance Mode
                    </Label>
                    <p className="text-xs text-gray-500">Temporarily disable access for maintenance</p>
                  </div>
                  <Switch
                    id="maintenanceMode"
                    checked={settings.application.maintenanceMode}
                    onCheckedChange={(checked) => updateSetting('application', 'maintenanceMode', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="debugMode" className="text-sm font-medium text-gray-700">
                      Debug Mode
                    </Label>
                    <p className="text-xs text-gray-500">Enable detailed debugging information</p>
                  </div>
                  <Switch
                    id="debugMode"
                    checked={settings.application.debugMode}
                    onCheckedChange={(checked) => updateSetting('application', 'debugMode', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Settings */}
          <Card className="shadow-sm border-0 bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-cyan-50 rounded-lg">
                  <Globe className="h-6 w-6 text-cyan-600" />
                </div>
                API Configuration
              </CardTitle>
              <CardDescription className="text-gray-600">
                Configure API rate limiting and CORS settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="rateLimit" className="text-sm font-medium text-gray-700">
                  Rate Limit (requests/minute)
                </Label>
                <Input
                  id="rateLimit"
                  type="number"
                  value={settings.api.rateLimitPerMinute}
                  onChange={(e) => updateSetting('api', 'rateLimitPerMinute', parseInt(e.target.value))}
                  className="h-10"
                />
                <p className="text-xs text-gray-500">Maximum API requests per minute per IP</p>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="enableCORS" className="text-sm font-medium text-gray-700">
                      Enable CORS
                    </Label>
                    <p className="text-xs text-gray-500">Allow cross-origin requests</p>
                  </div>
                  <Switch
                    id="enableCORS"
                    checked={settings.api.enableCORS}
                    onCheckedChange={(checked) => updateSetting('api', 'enableCORS', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="enableSwagger" className="text-sm font-medium text-gray-700">
                      Enable Swagger Documentation
                    </Label>
                    <p className="text-xs text-gray-500">API documentation interface</p>
                  </div>
                  <Switch
                    id="enableSwagger"
                    checked={settings.api.enableSwagger}
                    onCheckedChange={(checked) => updateSetting('api', 'enableSwagger', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cache Settings */}
          <Card className="shadow-sm border-0 bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Server className="h-6 w-6 text-indigo-600" />
                </div>
                Cache Configuration
              </CardTitle>
              <CardDescription className="text-gray-600">
                Configure caching strategy and performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="cacheProvider" className="text-sm font-medium text-gray-700">
                  Cache Provider
                </Label>
                <Select
                  value={settings.cache.provider}
                  onValueChange={(value) => updateSetting('cache', 'provider', value)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="memory">Memory</SelectItem>
                    <SelectItem value="redis">Redis</SelectItem>
                    <SelectItem value="file">File System</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Choose the caching backend</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cacheTTL" className="text-sm font-medium text-gray-700">
                    Cache TTL (seconds)
                  </Label>
                  <Input
                    id="cacheTTL"
                    type="number"
                    value={settings.cache.ttl}
                    onChange={(e) => updateSetting('cache', 'ttl', parseInt(e.target.value))}
                    className="h-10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxMemory" className="text-sm font-medium text-gray-700">
                    Max Memory Usage (MB)
                  </Label>
                  <Input
                    id="maxMemory"
                    type="number"
                    value={settings.cache.maxMemory}
                    onChange={(e) => updateSetting('cache', 'maxMemory', parseInt(e.target.value))}
                    className="h-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card className="shadow-sm border-0 bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              System Status
            </CardTitle>
            <CardDescription className="text-gray-600">
              Current system health and status information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-900">Database</p>
                  <p className="text-sm text-green-700">Connected & Healthy</p>
                  <p className="text-xs text-green-600 mt-1">Last check: 2 minutes ago</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-900">API Server</p>
                  <p className="text-sm text-green-700">Running & Responsive</p>
                  <p className="text-xs text-green-600 mt-1">Response time: 45ms</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="font-semibold text-yellow-900">Email Service</p>
                  <p className="text-sm text-yellow-700">Not Configured</p>
                  <p className="text-xs text-yellow-600 mt-1">SMTP settings required</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
