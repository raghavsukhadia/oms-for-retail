"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, Shield, Users, Settings, Palette, Save, X, Check } from "lucide-react";
import { roleApi, type Role, type PermissionOptions } from "@/lib/api/roles";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

// Color picker component
const ColorPicker = ({ value, onChange, disabled }: { value?: string; onChange: (color: string) => void; disabled?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const colors = [
    "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
    "#22c55e", "#10b981", "#06b6d4", "#0ea5e9", "#3b82f6",
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
    "#f43f5e", "#64748b", "#6b7280", "#374151", "#111827"
  ];

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div
          className="w-4 h-4 rounded-full mr-2 border"
          style={{ backgroundColor: value || "#64748b" }}
        />
        {value || "Select color"}
        <Palette className="w-4 h-4 ml-auto" />
      </Button>
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 p-3 bg-white border rounded-md shadow-lg">
          <div className="grid grid-cols-5 gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                className="w-8 h-8 rounded-full border-2 border-gray-200 hover:border-gray-400 transition-colors"
                style={{ backgroundColor: color }}
                onClick={() => {
                  onChange(color);
                  setIsOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Form schema
const roleSchema = z.object({
  roleName: z.string().min(1, "Role name is required").max(50),
  roleDescription: z.string().optional(),
  roleColor: z.string().optional(),
  roleLevel: z.number().min(0).max(100).optional(),
  permissions: z.array(z.object({
    resource: z.string(),
    action: z.string(),
    conditions: z.record(z.any()).optional()
  })).optional()
});

type RoleFormData = z.infer<typeof roleSchema>;

export function RoleMaster() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionOptions, setPermissionOptions] = useState<PermissionOptions>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [includeSystemRoles, setIncludeSystemRoles] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      roleName: "",
      roleDescription: "",
      roleColor: "",
      roleLevel: 10,
      permissions: []
    },
  });

  // Fetch roles
  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await roleApi.getRoles({
        search: searchTerm || undefined,
        status: statusFilter === "all" ? undefined : statusFilter as "active" | "inactive",
        includeSystemRoles,
        limit: 100
      });
      if (response.success) {
        setRoles(response.data || []);
      }
    } catch (error) {
      toast.error("Failed to fetch roles");
    } finally {
      setLoading(false);
    }
  };

  // Fetch permission options
  const fetchPermissionOptions = async () => {
    try {
      const response = await roleApi.getPermissionOptions();
      if (response.success) {
        setPermissionOptions(response.data || {});
      }
    } catch (error) {
      console.error("Failed to fetch permission options:", error);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchPermissionOptions();
  }, [searchTerm, statusFilter, includeSystemRoles]);

  // Handle form submission
  const onSubmit = async (data: RoleFormData) => {
    try {
      const response = editingRole
        ? await roleApi.updateRole(editingRole.roleId, data)
        : await roleApi.createRole(data);

      if (response.success) {
        toast.success(`Role ${editingRole ? 'updated' : 'created'} successfully`);
        
        setIsDialogOpen(false);
        setEditingRole(null);
        form.reset({
          roleName: "",
          roleDescription: "",
          roleColor: "",
          roleLevel: 10,
          permissions: []
        });
        fetchRoles();
      } else {
        toast.error(response.error || "Failed to save role");
      }
    } catch (error) {
      toast.error("Failed to save role");
    }
  };

  // Handle edit
  const handleEdit = (role: Role) => {
    setEditingRole(role);
    form.setValue("roleName", role.roleName);
    form.setValue("roleDescription", role.roleDescription || "");
    form.setValue("roleColor", role.roleColor || "");
    form.setValue("roleLevel", role.roleLevel);
    
    // Convert role permissions to form format
    const permissions = role.rolePermissions?.map(p => ({
      resource: p.resource,
      action: p.action,
      conditions: p.conditions || {}
    })) || [];
    form.setValue("permissions", permissions);
    
    setIsDialogOpen(true);
  };

  // Handle delete
  const handleDelete = async (roleId: string, roleName: string, isSystemRole: boolean, userCount: number) => {
    if (isSystemRole) {
      toast.error("Cannot delete system roles");
      return;
    }

    if (userCount > 0) {
      toast.error(`Cannot delete role: ${userCount} users are assigned to this role`);
      return;
    }

    if (!confirm(`Are you sure you want to delete the role "${roleName}"?`)) return;

    try {
      const response = await roleApi.deleteRole(roleId);

      if (response.success) {
        toast.success("Role deleted successfully");
        fetchRoles();
      } else {
        toast.error(response.error || "Failed to delete role");
      }
    } catch (error) {
      toast.error("Failed to delete role");
    }
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingRole(null);
    form.reset({
      roleName: "",
      roleDescription: "",
      roleColor: "",
      roleLevel: 10,
      permissions: []
    });
  };

  // Get selected permissions for display
  const getSelectedPermissions = () => {
    const permissions = form.watch("permissions") || [];
    const groupedPermissions: Record<string, string[]> = {};
    
    permissions.forEach(p => {
      if (!groupedPermissions[p.resource]) {
        groupedPermissions[p.resource] = [];
      }
      groupedPermissions[p.resource].push(p.action);
    });
    
    return groupedPermissions;
  };

  // Toggle permission
  const togglePermission = (resource: string, action: string) => {
    const currentPermissions = form.getValues("permissions") || [];
    const exists = currentPermissions.some(p => p.resource === resource && p.action === action);
    
    if (exists) {
      // Remove permission
      const newPermissions = currentPermissions.filter(p => !(p.resource === resource && p.action === action));
      form.setValue("permissions", newPermissions);
    } else {
      // Add permission
      const newPermissions = [...currentPermissions, { resource, action, conditions: {} }];
      form.setValue("permissions", newPermissions);
    }
  };

  // Check if permission is selected
  const isPermissionSelected = (resource: string, action: string) => {
    const permissions = form.watch("permissions") || [];
    return permissions.some(p => p.resource === resource && p.action === action);
  };

  // Check if all permissions for a resource are selected
  const areAllResourcePermissionsSelected = (resource: string) => {
    const actions = permissionOptions[resource] || [];
    return actions.every(action => isPermissionSelected(resource, action));
  };

  // Check if some permissions for a resource are selected
  const areSomeResourcePermissionsSelected = (resource: string) => {
    const actions = permissionOptions[resource] || [];
    return actions.some(action => isPermissionSelected(resource, action));
  };

  // Toggle all permissions for a resource
  const toggleAllResourcePermissions = (resource: string) => {
    const actions = permissionOptions[resource] || [];
    const currentPermissions = form.getValues("permissions") || [];
    const allSelected = areAllResourcePermissionsSelected(resource);
    
    if (allSelected) {
      // Remove all permissions for this resource
      const newPermissions = currentPermissions.filter(p => p.resource !== resource);
      form.setValue("permissions", newPermissions);
    } else {
      // Add all missing permissions for this resource
      const existingResourcePermissions = currentPermissions.filter(p => p.resource === resource);
      const existingActions = new Set(existingResourcePermissions.map(p => p.action));
      
      const newResourcePermissions = actions
        .filter(action => !existingActions.has(action))
        .map(action => ({ resource, action, conditions: {} }));
      
      const newPermissions = [...currentPermissions, ...newResourcePermissions];
      form.setValue("permissions", newPermissions);
    }
  };

  // Check if all permissions are selected
  const areAllPermissionsSelected = () => {
    return Object.keys(permissionOptions).every(resource => 
      areAllResourcePermissionsSelected(resource)
    );
  };

  // Toggle all permissions
  const toggleAllPermissions = () => {
    const allSelected = areAllPermissionsSelected();
    
    if (allSelected) {
      // Clear all permissions
      form.setValue("permissions", []);
    } else {
      // Select all permissions
      const allPermissions: { resource: string; action: string; conditions: {} }[] = [];
      Object.entries(permissionOptions).forEach(([resource, actions]) => {
        actions.forEach(action => {
          allPermissions.push({ resource, action, conditions: {} });
        });
      });
      form.setValue("permissions", allPermissions);
    }
  };

  const selectedPermissions = getSelectedPermissions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Role Management</h1>
          <p className="text-muted-foreground">
            Manage user roles and permissions
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => form.reset({
              roleName: "",
              roleDescription: "",
              roleColor: "",
              roleLevel: 10,
              permissions: []
            })}>
              <Plus className="w-4 h-4 mr-2" />
              Add Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRole ? "Edit Role" : "Add New Role"}
              </DialogTitle>
              <DialogDescription>
                {editingRole
                  ? "Update the role information and permissions below."
                  : "Create a new role by defining its properties and permissions."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="roleName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter role name" 
                            {...field}
                            disabled={editingRole?.isSystemRole}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="roleLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role Level</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0-100 (0 = highest)"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            disabled={editingRole?.isSystemRole}
                          />
                        </FormControl>
                        <FormDescription>
                          Lower numbers have higher authority (0 = highest)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="roleColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role Color</FormLabel>
                        <FormControl>
                          <ColorPicker
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormDescription>
                          Choose a color to identify this role
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="roleDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter role description (optional)" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Permissions Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Permissions</h3>
                    <div className="flex items-center gap-2">
                      <Select onValueChange={(template) => {
                        if (template === "clear") {
                          form.setValue("permissions", []);
                        } else if (template === "all") {
                          toggleAllPermissions();
                        } else if (template === "readonly") {
                          const readOnlyPermissions: { resource: string; action: string; conditions: {} }[] = [];
                          Object.keys(permissionOptions).forEach(resource => {
                            readOnlyPermissions.push({ resource, action: "read", conditions: {} });
                          });
                          form.setValue("permissions", readOnlyPermissions);
                        } else if (template === "basic") {
                          const basicPermissions = [
                            { resource: "vehicles", action: "read", conditions: {} },
                            { resource: "vehicles", action: "update", conditions: {} },
                            { resource: "users", action: "read", conditions: {} },
                            { resource: "locations", action: "read", conditions: {} },
                            { resource: "departments", action: "read", conditions: {} },
                            { resource: "media", action: "create", conditions: {} },
                            { resource: "media", action: "read", conditions: {} },
                            { resource: "settings", action: "read", conditions: {} }
                          ];
                          form.setValue("permissions", basicPermissions);
                        } else if (template === "financial_manager") {
                          const financialManagerPermissions = [
                            // Core permissions
                            { resource: "vehicles", action: "read", conditions: {} },
                            { resource: "users", action: "read", conditions: {} },
                            { resource: "reports", action: "read", conditions: {} },
                            { resource: "reports", action: "export", conditions: {} },
                            // Full financial permissions
                            { resource: "payments", action: "view", conditions: {} },
                            { resource: "payments", action: "create", conditions: {} },
                            { resource: "payments", action: "update", conditions: {} },
                            { resource: "payments", action: "approve", conditions: {} },
                            { resource: "payments", action: "export", conditions: {} },
                            { resource: "invoices", action: "view", conditions: {} },
                            { resource: "invoices", action: "create", conditions: {} },
                            { resource: "invoices", action: "update", conditions: {} },
                            { resource: "invoices", action: "send", conditions: {} },
                            { resource: "invoices", action: "export", conditions: {} },
                            { resource: "pricing", action: "view", conditions: {} },
                            { resource: "pricing", action: "update", conditions: {} },
                            { resource: "pricing", action: "manage_discounts", conditions: {} },
                            { resource: "financial_reports", action: "view", conditions: {} },
                            { resource: "financial_reports", action: "export", conditions: {} },
                            { resource: "financial_reports", action: "view_detailed", conditions: {} },
                            { resource: "cost_analysis", action: "view", conditions: {} },
                            { resource: "cost_analysis", action: "export", conditions: {} },
                            { resource: "account_statements", action: "view", conditions: {} },
                            { resource: "account_statements", action: "export", conditions: {} },
                            { resource: "revenue_data", action: "view", conditions: {} },
                            { resource: "revenue_data", action: "export", conditions: {} },
                            { resource: "revenue_data", action: "view_profit_margins", conditions: {} }
                          ];
                          form.setValue("permissions", financialManagerPermissions);
                        } else if (template === "accountant") {
                          const accountantPermissions = [
                            // Basic permissions
                            { resource: "vehicles", action: "read", conditions: {} },
                            { resource: "users", action: "read", conditions: {} },
                            // Financial permissions for accountant
                            { resource: "payments", action: "view", conditions: {} },
                            { resource: "payments", action: "create", conditions: {} },
                            { resource: "payments", action: "update", conditions: {} },
                            { resource: "invoices", action: "view", conditions: {} },
                            { resource: "invoices", action: "create", conditions: {} },
                            { resource: "invoices", action: "update", conditions: {} },
                            { resource: "invoices", action: "send", conditions: {} },
                            { resource: "invoices", action: "export", conditions: {} },
                            { resource: "financial_reports", action: "view", conditions: {} },
                            { resource: "financial_reports", action: "export", conditions: {} },
                            { resource: "account_statements", action: "view", conditions: {} },
                            { resource: "account_statements", action: "export", conditions: {} }
                          ];
                          form.setValue("permissions", accountantPermissions);
                        } else if (template === "sales_manager") {
                          const salesManagerPermissions = [
                            // Core permissions
                            { resource: "vehicles", action: "create", conditions: {} },
                            { resource: "vehicles", action: "read", conditions: {} },
                            { resource: "vehicles", action: "update", conditions: {} },
                            { resource: "users", action: "read", conditions: {} },
                            { resource: "media", action: "create", conditions: {} },
                            { resource: "media", action: "read", conditions: {} },
                            // Sales-focused financial permissions
                            { resource: "pricing", action: "view", conditions: {} },
                            { resource: "pricing", action: "update", conditions: {} },
                            { resource: "pricing", action: "manage_discounts", conditions: {} },
                            { resource: "invoices", action: "view", conditions: {} },
                            { resource: "invoices", action: "create", conditions: {} },
                            { resource: "revenue_data", action: "view", conditions: {} }
                          ];
                          form.setValue("permissions", salesManagerPermissions);
                        }
                      }}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Templates" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="clear">Clear All</SelectItem>
                          <SelectItem value="all">Full Access</SelectItem>
                          <SelectItem value="readonly">Read Only</SelectItem>
                          <SelectItem value="basic">Basic User</SelectItem>
                          <SelectItem value="financial_manager">Financial Manager</SelectItem>
                          <SelectItem value="accountant">Accountant</SelectItem>
                          <SelectItem value="sales_manager">Sales Manager</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={toggleAllPermissions}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {areAllPermissionsSelected() ? "Deselect All" : "Select All"}
                      </Button>
                      <Badge variant="outline">
                        {Object.values(selectedPermissions).reduce((acc, actions) => acc + actions.length, 0)} permissions selected
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid gap-6">
                    {/* Core System Permissions */}
                    <div className="space-y-4">
                      <h4 className="text-md font-medium text-gray-900 border-b pb-2">Core System Permissions</h4>
                      <div className="grid gap-4">
                        {Object.entries(permissionOptions)
                          .filter(([resource]) => !['payments', 'invoices', 'pricing', 'financial_reports', 'cost_analysis', 'account_statements', 'revenue_data'].includes(resource))
                          .map(([resource, actions]) => (
                          <Card key={resource}>
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm capitalize flex items-center gap-2">
                                  <Settings className="w-4 h-4" />
                                  {resource.replace('_', ' ')}
                                  {selectedPermissions[resource] && (
                                    <Badge variant="secondary" className="text-xs">
                                      {selectedPermissions[resource].length}/{actions.length}
                                    </Badge>
                                  )}
                                </CardTitle>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleAllResourcePermissions(resource)}
                                  className="h-6 px-2 text-xs"
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  {areAllResourcePermissionsSelected(resource) ? "None" : "All"}
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {actions.map(action => (
                                  <label
                                    key={`${resource}-${action}`}
                                    className="flex items-center space-x-2 text-sm cursor-pointer"
                                  >
                                    <Checkbox
                                      checked={isPermissionSelected(resource, action)}
                                      onCheckedChange={() => togglePermission(resource, action)}
                                    />
                                    <span className="capitalize">{action.replace('_', ' ')}</span>
                                  </label>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Financial Permissions */}
                    <div className="space-y-4">
                      <h4 className="text-md font-medium text-orange-700 border-b border-orange-200 pb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Financial Data Permissions
                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                          Sensitive
                        </Badge>
                      </h4>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                        <strong>⚠️ Important:</strong> Financial permissions control access to sensitive data including payments, pricing, profit margins, and financial reports. Grant these permissions carefully.
                      </div>
                      <div className="grid gap-4">
                        {Object.entries(permissionOptions)
                          .filter(([resource]) => ['payments', 'invoices', 'pricing', 'financial_reports', 'cost_analysis', 'account_statements', 'revenue_data'].includes(resource))
                          .map(([resource, actions]) => (
                          <Card key={resource} className="border-orange-200">
                            <CardHeader className="pb-3 bg-orange-50/50">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm capitalize flex items-center gap-2">
                                  <Shield className="w-4 h-4 text-orange-600" />
                                  {resource.replace('_', ' ')}
                                  {selectedPermissions[resource] && (
                                    <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                                      {selectedPermissions[resource].length}/{actions.length}
                                    </Badge>
                                  )}
                                </CardTitle>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleAllResourcePermissions(resource)}
                                  className="h-6 px-2 text-xs hover:bg-orange-100"
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  {areAllResourcePermissionsSelected(resource) ? "None" : "All"}
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {actions.map(action => (
                                  <label
                                    key={`${resource}-${action}`}
                                    className="flex items-center space-x-2 text-sm cursor-pointer p-2 rounded hover:bg-orange-50 transition-colors"
                                  >
                                    <Checkbox
                                      checked={isPermissionSelected(resource, action)}
                                      onCheckedChange={() => togglePermission(resource, action)}
                                      className="border-orange-300 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
                                    />
                                    <span className="capitalize">{action.replace('_', ' ')}</span>
                                  </label>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    <Save className="w-4 h-4 mr-2" />
                    {editingRole ? "Update" : "Create"} Role
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Roles</CardTitle>
              <CardDescription>
                {roles.length} roles configured
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              
              <label className="flex items-center space-x-2 text-sm">
                <Checkbox
                  checked={includeSystemRoles}
                  onCheckedChange={setIncludeSystemRoles}
                />
                <span>Include System Roles</span>
              </label>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search roles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchTerm ? "No roles found matching your search." : "No roles found. Create your first role to get started."}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((role) => (
                    <TableRow key={role.roleId}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: role.roleColor || "#64748b" }}
                          />
                          <div>
                            <div className="font-medium">{role.roleName}</div>
                            {role.roleDescription && (
                              <div className="text-sm text-muted-foreground">
                                {role.roleDescription}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{role.roleLevel}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{role._count?.users || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {role.rolePermissions?.length || 0} permissions
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.status === "active" ? "default" : "secondary"}>
                          {role.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.isSystemRole ? "destructive" : "outline"}>
                          {role.isSystemRole ? "System" : "Custom"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(role)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(role.roleId, role.roleName, role.isSystemRole, role._count?.users || 0)}
                            disabled={role.isSystemRole || (role._count?.users || 0) > 0}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}