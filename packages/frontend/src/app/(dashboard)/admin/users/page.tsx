'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Search, 
  Edit, 
  Trash2, 
  Shield, 
  UserCheck,
  UserX,
  Loader2,
  Building,
  Mail,
  Phone,
  Calendar
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from 'sonner';

interface AdminUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  tenantName: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string;
  createdAt: string;
  permissions: string[];
}

const roleConfigs = {
  admin: { color: 'bg-red-100 text-red-800', label: 'Admin' },
  manager: { color: 'bg-blue-100 text-blue-800', label: 'Manager' },
  coordinator: { color: 'bg-green-100 text-green-800', label: 'Coordinator' },
  supervisor: { color: 'bg-yellow-100 text-yellow-800', label: 'Supervisor' },
  salesperson: { color: 'bg-purple-100 text-purple-800', label: 'Salesperson' },
  installer: { color: 'bg-gray-100 text-gray-800', label: 'Installer' },
};

const statusConfigs = {
  active: { color: 'bg-green-100 text-green-800', label: 'Active' },
  inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inactive' },
  suspended: { color: 'bg-red-100 text-red-800', label: 'Suspended' },
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('all');

  const loadUsers = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      const mockUsers: AdminUser[] = [
        {
          userId: 'user_001',
          email: 'admin@demo.com',
          firstName: 'John',
          lastName: 'Admin',
          role: 'admin',
          tenantId: 'tenant_001',
          tenantName: 'Demo Company',
          status: 'active',
          lastLogin: '2024-01-18T10:30:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          permissions: ['all'],
        },
        {
          userId: 'user_002',
          email: 'manager@demo.com',
          firstName: 'Sarah',
          lastName: 'Manager',
          role: 'manager',
          tenantId: 'tenant_001',
          tenantName: 'Demo Company',
          status: 'active',
          lastLogin: '2024-01-18T09:15:00Z',
          createdAt: '2024-01-02T00:00:00Z',
          permissions: ['users', 'reports', 'vehicles'],
        },
        {
          userId: 'user_003',
          email: 'coordinator@demo.com',
          firstName: 'Mike',
          lastName: 'Coordinator',
          role: 'coordinator',
          tenantId: 'tenant_001',
          tenantName: 'Demo Company',
          status: 'active',
          lastLogin: '2024-01-17T16:45:00Z',
          createdAt: '2024-01-03T00:00:00Z',
          permissions: ['workflows', 'reports'],
        },
        {
          userId: 'user_004',
          email: 'sales@test.com',
          firstName: 'Lisa',
          lastName: 'Sales',
          role: 'salesperson',
          tenantId: 'tenant_002',
          tenantName: 'Test Organization',
          status: 'active',
          lastLogin: '2024-01-18T08:20:00Z',
          createdAt: '2024-01-10T00:00:00Z',
          permissions: ['vehicles', 'customers'],
        },
        {
          userId: 'user_005',
          email: 'installer@enterprise.com',
          firstName: 'David',
          lastName: 'Installer',
          role: 'installer',
          tenantId: 'tenant_003',
          tenantName: 'Enterprise Corp',
          status: 'active',
          lastLogin: '2024-01-18T11:10:00Z',
          createdAt: '2024-01-05T00:00:00Z',
          permissions: ['installations'],
        },
        {
          userId: 'user_006',
          email: 'suspended@demo.com',
          firstName: 'Tom',
          lastName: 'Suspended',
          role: 'salesperson',
          tenantId: 'tenant_001',
          tenantName: 'Demo Company',
          status: 'suspended',
          lastLogin: '2024-01-10T14:30:00Z',
          createdAt: '2024-01-04T00:00:00Z',
          permissions: ['vehicles'],
        },
      ];
      
      setUsers(mockUsers);
      toast.success('Users loaded successfully');
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'inactive' | 'suspended') => {
    try {
      setUsers(prev => prev.map(user => 
        user.userId === userId 
          ? { ...user, status: newStatus }
          : user
      ));
      toast.success(`User status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        setUsers(prev => prev.filter(user => user.userId !== userId));
        toast.success('User deleted successfully');
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('Failed to delete user');
      }
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.tenantName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesTenant = tenantFilter === 'all' || user.tenantId === tenantFilter;
    
    return matchesSearch && matchesRole && matchesStatus && matchesTenant;
  });

  const uniqueTenants = Array.from(new Set(users.map(user => user.tenantId)))
    .map(tenantId => {
      const user = users.find(u => u.tenantId === tenantId);
      return { tenantId, tenantName: user?.tenantName || 'Unknown' };
    });

  useEffect(() => {
    loadUsers();
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
                Admin User Management
              </h1>
              <p className="text-gray-600 text-lg">
                Manage users across all tenant organizations
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm">
                <Users className="h-4 w-4 mr-1" />
                {users.length} Total Users
              </Badge>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-sm border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{users.length}</p>
                  <p className="text-sm text-gray-600">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <UserCheck className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {users.filter(u => u.status === 'active').length}
                  </p>
                  <p className="text-sm text-gray-600">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-50 rounded-lg">
                  <UserX className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {users.filter(u => u.status === 'suspended').length}
                  </p>
                  <p className="text-sm text-gray-600">Suspended Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <Shield className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {users.filter(u => u.role === 'admin').length}
                  </p>
                  <p className="text-sm text-gray-600">Admin Users</p>
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
                    placeholder="Search users by name, email, or tenant..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 text-base"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-48 h-12">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {Object.entries(roleConfigs).map(([role, config]) => (
                      <SelectItem key={role} value={role}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48 h-12">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {Object.entries(statusConfigs).map(([status, config]) => (
                      <SelectItem key={status} value={status}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={tenantFilter} onValueChange={setTenantFilter}>
                  <SelectTrigger className="w-full sm:w-48 h-12">
                    <SelectValue placeholder="All Tenants" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tenants</SelectItem>
                    {uniqueTenants.map(tenant => (
                      <SelectItem key={tenant.tenantId} value={tenant.tenantId}>
                        {tenant.tenantName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Users Table */}
        <Card className="shadow-sm border-0 bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              Users ({filteredUsers.length})
            </CardTitle>
            <CardDescription className="text-gray-600">
              Manage users across all tenant organizations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-semibold text-gray-700">User</TableHead>
                    <TableHead className="font-semibold text-gray-700">Email</TableHead>
                    <TableHead className="font-semibold text-gray-700">Role</TableHead>
                    <TableHead className="font-semibold text-gray-700">Tenant</TableHead>
                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700">Last Login</TableHead>
                    <TableHead className="font-semibold text-gray-700">Created</TableHead>
                    <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const roleConfig = roleConfigs[user.role as keyof typeof roleConfigs];
                    const statusConfig = statusConfigs[user.status];
                    
                    return (
                      <TableRow key={user.userId} className="hover:bg-gray-50/50">
                        <TableCell className="font-medium py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {user.firstName[0]}{user.lastName[0]}
                              </span>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">
                                {user.firstName} {user.lastName}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge className={`${roleConfig?.color} font-medium`}>
                            {roleConfig?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">{user.tenantName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge className={`${statusConfig.color} font-medium`}>
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">
                              {new Date(user.lastLogin).toLocaleDateString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="text-gray-700">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex gap-2">
                            <Select
                              value={user.status}
                              onValueChange={(value) => handleStatusChange(user.userId, value as any)}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteUser(user.userId)}
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
