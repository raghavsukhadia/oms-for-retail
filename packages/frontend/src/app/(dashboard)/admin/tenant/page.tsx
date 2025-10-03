'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Building, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Save, 
  Loader2,
  Users,
  Database,
  Globe,
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from 'sonner';

interface Tenant {
  tenantId: string;
  tenantName: string;
  subdomain: string;
  databaseUrl: string;
  subscriptionTier: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'inactive' | 'suspended';
  settings: {
    maxUsers: number;
    maxVehicles: number;
    features: string[];
  };
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    vehicles: number;
  };
}

const subscriptionTiers = [
  { value: 'starter', label: 'Starter', color: 'bg-green-100 text-green-800' },
  { value: 'professional', label: 'Professional', color: 'bg-blue-100 text-blue-800' },
  { value: 'enterprise', label: 'Enterprise', color: 'bg-purple-100 text-purple-800' },
];

const statusConfigs = {
  active: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  inactive: { color: 'bg-gray-100 text-gray-800', icon: XCircle },
  suspended: { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
};

export default function AdminTenantPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState<Partial<Tenant>>({
    tenantName: '',
    subdomain: '',
    subscriptionTier: 'starter',
    status: 'active',
    settings: {
      maxUsers: 10,
      maxVehicles: 100,
      features: ['basic_reports', 'user_management'],
    },
  });

  const loadTenants = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      const mockTenants: Tenant[] = [
        {
          tenantId: 'tenant_001',
          tenantName: 'Demo Company',
          subdomain: 'demo',
          databaseUrl: 'postgresql://demo:password@localhost:5432/omsms_demo',
          subscriptionTier: 'professional',
          status: 'active',
          settings: {
            maxUsers: 25,
            maxVehicles: 500,
            features: ['basic_reports', 'user_management', 'advanced_reports', 'api_access'],
          },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
          _count: { users: 12, vehicles: 45 },
        },
        {
          tenantId: 'tenant_002',
          tenantName: 'Test Organization',
          subdomain: 'test',
          databaseUrl: 'postgresql://test:password@localhost:5432/omsms_test',
          subscriptionTier: 'starter',
          status: 'active',
          settings: {
            maxUsers: 5,
            maxVehicles: 50,
            features: ['basic_reports'],
          },
          createdAt: '2024-01-10T00:00:00Z',
          updatedAt: '2024-01-20T15:45:00Z',
          _count: { users: 3, vehicles: 12 },
        },
        {
          tenantId: 'tenant_003',
          tenantName: 'Enterprise Corp',
          subdomain: 'enterprise',
          databaseUrl: 'postgresql://enterprise:password@localhost:5432/omsms_enterprise',
          subscriptionTier: 'enterprise',
          status: 'active',
          settings: {
            maxUsers: 100,
            maxVehicles: 2000,
            features: ['basic_reports', 'user_management', 'advanced_reports', 'api_access', 'custom_branding', 'priority_support'],
          },
          createdAt: '2024-01-05T00:00:00Z',
          updatedAt: '2024-01-18T09:20:00Z',
          _count: { users: 45, vehicles: 180 },
        },
      ];
      
      setTenants(mockTenants);
      toast.success('Tenants loaded successfully');
    } catch (error) {
      console.error('Error loading tenants:', error);
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // In a real application, this would save to the API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      if (editingTenant) {
        setTenants(prev => prev.map(tenant => 
          tenant.tenantId === editingTenant.tenantId 
            ? { ...tenant, ...formData, updatedAt: new Date().toISOString() }
            : tenant
        ));
        toast.success('Tenant updated successfully');
      } else {
        const newTenant: Tenant = {
          tenantId: `tenant_${Date.now()}`,
          ...formData as Tenant,
          databaseUrl: `postgresql://${formData.subdomain}:password@localhost:5432/omsms_${formData.subdomain}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _count: { users: 0, vehicles: 0 },
        };
        setTenants(prev => [...prev, newTenant]);
        toast.success('Tenant created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingTenant(null);
      setFormData({
        tenantName: '',
        subdomain: '',
        subscriptionTier: 'starter',
        status: 'active',
        settings: {
          maxUsers: 10,
          maxVehicles: 100,
          features: ['basic_reports', 'user_management'],
        },
      });
    } catch (error) {
      console.error('Error saving tenant:', error);
      toast.error('Failed to save tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData(tenant);
    setIsDialogOpen(true);
  };

  const handleDelete = async (tenantId: string) => {
    if (confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      try {
        setTenants(prev => prev.filter(tenant => tenant.tenantId !== tenantId));
        toast.success('Tenant deleted successfully');
      } catch (error) {
        console.error('Error deleting tenant:', error);
        toast.error('Failed to delete tenant');
      }
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingTenant(null);
    setFormData({
      tenantName: '',
      subdomain: '',
      subscriptionTier: 'starter',
      status: 'active',
      settings: {
        maxUsers: 10,
        maxVehicles: 100,
        features: ['basic_reports', 'user_management'],
      },
    });
  };

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = 
      tenant.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.subdomain.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    loadTenants();
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
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Building className="h-8 w-8 text-blue-600" />
                </div>
                Tenant Management
              </h1>
              <p className="text-gray-600 text-lg">
                Manage multi-tenant organizations and their configurations
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm">
                <Building className="h-4 w-4 mr-1" />
                {tenants.length} Total Tenants
              </Badge>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleDialogClose()} size="lg" className="px-6">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tenant
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTenant ? 'Edit Tenant' : 'Create New Tenant'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingTenant ? 'Update tenant configuration' : 'Configure a new tenant organization'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tenantName" className="text-sm font-medium text-gray-700">
                          Tenant Name
                        </Label>
                        <Input
                          id="tenantName"
                          value={formData.tenantName || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, tenantName: e.target.value }))}
                          placeholder="Company Name"
                          className="h-10"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="subdomain" className="text-sm font-medium text-gray-700">
                          Subdomain
                        </Label>
                        <Input
                          id="subdomain"
                          value={formData.subdomain || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, subdomain: e.target.value.toLowerCase() }))}
                          placeholder="company"
                          className="h-10"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="subscriptionTier" className="text-sm font-medium text-gray-700">
                          Subscription Tier
                        </Label>
                        <Select
                          value={formData.subscriptionTier || 'starter'}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, subscriptionTier: value as any }))}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {subscriptionTiers.map(tier => (
                              <SelectItem key={tier.value} value={tier.value}>
                                {tier.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                          Status
                        </Label>
                        <Select
                          value={formData.status || 'active'}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="maxUsers" className="text-sm font-medium text-gray-700">
                          Max Users
                        </Label>
                        <Input
                          id="maxUsers"
                          type="number"
                          value={formData.settings?.maxUsers || 10}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            settings: { ...prev.settings!, maxUsers: parseInt(e.target.value) }
                          }))}
                          className="h-10"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="maxVehicles" className="text-sm font-medium text-gray-700">
                          Max Vehicles
                        </Label>
                        <Input
                          id="maxVehicles"
                          type="number"
                          value={formData.settings?.maxVehicles || 100}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            settings: { ...prev.settings!, maxVehicles: parseInt(e.target.value) }
                          }))}
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter className="pt-4">
                    <Button variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {editingTenant ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-sm border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Building className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{tenants.length}</p>
                  <p className="text-sm text-gray-600">Total Tenants</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {tenants.filter(t => t.status === 'active').length}
                  </p>
                  <p className="text-sm text-gray-600">Active Tenants</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {tenants.reduce((sum, t) => sum + (t._count?.users || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-600">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-50 rounded-lg">
                  <Database className="h-8 w-8 text-orange-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {tenants.reduce((sum, t) => sum + (t._count?.vehicles || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-600">Total Vehicles</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="shadow-sm border-0 bg-white">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Search tenants by name or subdomain..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 text-base"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48 h-12">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Tenants Table */}
        <Card className="shadow-sm border-0 bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Building className="h-6 w-6 text-blue-600" />
              </div>
              Tenants ({filteredTenants.length})
            </CardTitle>
            <CardDescription className="text-gray-600">
              Manage all tenant organizations and their configurations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-semibold text-gray-700">Tenant</TableHead>
                    <TableHead className="font-semibold text-gray-700">Subdomain</TableHead>
                    <TableHead className="font-semibold text-gray-700">Tier</TableHead>
                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700">Users</TableHead>
                    <TableHead className="font-semibold text-gray-700">Vehicles</TableHead>
                    <TableHead className="font-semibold text-gray-700">Created</TableHead>
                    <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => {
                    const tierConfig = subscriptionTiers.find(t => t.value === tenant.subscriptionTier);
                    const statusConfig = statusConfigs[tenant.status];
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <TableRow key={tenant.tenantId} className="hover:bg-gray-50/50">
                        <TableCell className="font-medium py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Building className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{tenant.tenantName}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <code className="text-sm bg-gray-100 px-3 py-1 rounded-md font-mono text-gray-700">
                            {tenant.subdomain}.omsms.com
                          </code>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge className={`${tierConfig?.color} font-medium`}>
                            {tierConfig?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge className={`${statusConfig.color} font-medium`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {tenant.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">{tenant._count?.users || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">{tenant._count?.vehicles || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="text-gray-700">
                            {new Date(tenant.createdAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(tenant)}
                              className="h-8 w-8 p-0 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(tenant.tenantId)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
