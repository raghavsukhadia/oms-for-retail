"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, Shield, User, Mail, Phone, Building } from "lucide-react";
import { userApi } from "@/lib/api/users";
import { locationApi } from "@/lib/api/locations";
import { departmentApi } from "@/lib/api/masterData";
import { roleApi, type Role } from "@/lib/api/roles";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

// Form schema
const userSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  mobileNumber: z.string().optional(),
  address: z.string().optional(),
  roleId: z.string().min(1, "Role is required"), // Changed from role enum to roleId
  departmentId: z.string(),
  locationId: z.string(),
});

type UserFormData = z.infer<typeof userSchema>;

interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  mobileNumber?: string;
  address?: string;
  roleId: string; // Changed from role to roleId
  departmentId?: string;
  locationId?: string;
  status: string;
  permissions: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  role?: {
    roleId: string;
    roleName: string;
    roleColor?: string;
  };
  department?: {
    departmentId: string;
    departmentName: string;
    colorCode?: string;
  };
  location?: {
    locationId: string;
    locationName: string;
  };
}

interface Department {
  departmentId: string;
  departmentName: string;
  colorCode?: string;
}

interface Location {
  locationId: string;
  locationName: string;
}

const roleColors = {
  admin: "bg-red-100 text-red-800",
  manager: "bg-blue-100 text-blue-800",
  coordinator: "bg-green-100 text-green-800",
  supervisor: "bg-yellow-100 text-yellow-800",
  salesperson: "bg-purple-100 text-purple-800",
  installer: "bg-gray-100 text-gray-800",
};

const roleIcons = {
  admin: Shield,
  manager: Building,
  coordinator: User,
  supervisor: User,
  salesperson: User,
  installer: User,
};

export function UserRights() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  // Using toast from sonner

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      mobileNumber: "",
      address: "",
      roleId: "", // Will be set to first available role
      departmentId: "none",
      locationId: "none",
    },
  });

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userApi.getUsers();
      if (response.success) {
        setUsers(response.data || []);
      }
    } catch (error) {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const response = await departmentApi.getDepartments();
      if (response.success) {
        setDepartments(response.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    }
  };

  // Fetch locations
  const fetchLocations = async () => {
    try {
      const response = await locationApi.getLocations();
      if (response.success) {
        setLocations(response.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    }
  };

  // Fetch roles
  const fetchRoles = async () => {
    try {
      const response = await roleApi.getActiveRoles();
      if (response.success) {
        const rolesData = Array.isArray(response.data) ? response.data : [];
        setRoles(rolesData);
        
        // Set default role if form is reset
        if (rolesData.length > 0 && !form.getValues("roleId")) {
          // Find salesperson role or default to first role
          const defaultRole = rolesData.find(r => r.roleName === 'salesperson') || rolesData[0];
          form.setValue("roleId", defaultRole.roleId);
        }
      }
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      setRoles([]); // Ensure roles is always an array
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
    fetchLocations();
    fetchRoles();
  }, []);

  // Check if email already exists
  const checkEmailExists = (email: string): boolean => {
    if (editingUser && editingUser.email === email) {
      return false; // Allow same email when editing
    }
    return users.some(user => user.email.toLowerCase() === email.toLowerCase());
  };

  // Handle form submission
  const onSubmit = async (data: UserFormData) => {
    try {
      // Check for duplicate email before submitting
      if (checkEmailExists(data.email)) {
        toast.error("A user with this email address already exists. Please use a different email.");
        return;
      }

      // Remove password from update payload if empty
      const payload = { ...data };
      if (editingUser && !payload.password) {
        delete payload.password;
      }

      // Convert "none" values back to undefined for optional fields
      if (payload.departmentId === "none") {
        payload.departmentId = undefined;
      }
      if (payload.locationId === "none") {
        payload.locationId = undefined;
      }

      const response = editingUser 
        ? await userApi.updateUser(editingUser.userId, payload)
        : await userApi.createUser(payload);

      if (response.success) {
        toast.success(`User ${editingUser ? 'updated' : 'created'} successfully`);
        
        setIsDialogOpen(false);
        setEditingUser(null);
        const defaultRole = Array.isArray(roles) ? (roles.find(r => r.roleName === 'salesperson') || roles[0]) : null;
        form.reset({
          email: "",
          password: "",
          firstName: "",
          lastName: "",
          mobileNumber: "",
          address: "",
          roleId: defaultRole?.roleId || "",
          departmentId: "none",
          locationId: "none",
        });
        fetchUsers();
      } else {
        toast.error(response.error || "Failed to save user");
      }
    } catch (error: any) {
      console.error('User creation error:', error);
      
      // Handle specific error cases
      if (error.status === 409) {
        toast.error("A user with this email address already exists. Please use a different email.");
      } else if (error.status === 400) {
        toast.error(error.message || "Invalid user data. Please check all fields and try again.");
      } else if (error.status === 403) {
        toast.error("You don't have permission to create users.");
      } else {
        toast.error(error.message || "Failed to save user. Please try again.");
      }
    }
  };

  // Handle edit
  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setValue("email", user.email);
    form.setValue("firstName", user.firstName);
    form.setValue("lastName", user.lastName);
    form.setValue("mobileNumber", user.mobileNumber || "");
    form.setValue("address", user.address || "");
    form.setValue("roleId", user.roleId);
    form.setValue("departmentId", user.departmentId || "none");
    form.setValue("locationId", user.locationId || "none");
    form.setValue("password", ""); // Don't pre-fill password
    setIsDialogOpen(true);
  };

  // Handle delete
  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const response = await userApi.deleteUser(userId);

      if (response.success) {
        toast.success("User deleted successfully");
        fetchUsers();
      } else {
        toast.error(response.error || "Failed to delete user");
      }
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    const defaultRole = Array.isArray(roles) ? (roles.find(r => r.roleName === 'salesperson') || roles[0]) : null;
    form.reset({
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      mobileNumber: "",
      address: "",
      roleId: defaultRole?.roleId || "",
      departmentId: "none",
      locationId: "none",
    });
  };

  // Filter users based on search and role
  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role?.roleName === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  // Get role statistics
  const roleStats = users.reduce((acc, user) => {
    const roleName = user.role?.roleName || 'unknown';
    acc[roleName] = (acc[roleName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              const defaultRole = Array.isArray(roles) ? (roles.find(r => r.roleName === 'salesperson') || roles[0]) : null;
              form.reset({
                email: "",
                password: "",
                firstName: "",
                lastName: "",
                mobileNumber: "",
                address: "",
                roleId: defaultRole?.roleId || "",
                departmentId: "none",
                locationId: "none",
              });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "Edit User" : "Add New User"}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? "Update the user information below."
                  : "Create a new user account by filling out the form below."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter first name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter email address" 
                            {...field}
                            disabled={!!editingUser}
                            onChange={(e) => {
                              field.onChange(e);
                              // Clear any existing email validation errors when user types
                              if (form.formState.errors.email) {
                                form.clearErrors("email");
                              }
                            }}
                            onBlur={(e) => {
                              field.onBlur();
                              // Check for duplicate email on blur
                              if (!editingUser && e.target.value && checkEmailExists(e.target.value)) {
                                form.setError("email", {
                                  type: "manual",
                                  message: "A user with this email already exists"
                                });
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>
                          {editingUser ? "New Password (leave empty to keep current)" : "Password"}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder={editingUser ? "Enter new password" : "Enter password"}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mobileNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter mobile number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="roleId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.roleId} value={role.roleId}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: role.roleColor || "#64748b" }}
                                  />
                                  {role.roleName}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="departmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No department</SelectItem>
                            {departments.map((dept) => (
                              <SelectItem key={dept.departmentId} value={dept.departmentId}>
                                {dept.departmentName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No location</SelectItem>
                            {locations.map((location) => (
                              <SelectItem key={location.locationId} value={location.locationId}>
                                {location.locationName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingUser ? "Update" : "Create"} User
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Role Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(roleStats).map(([roleName, count]) => {
          const role = Array.isArray(roles) ? roles.find(r => r.roleName === roleName) : null;
          const IconComponent = roleIcons[roleName as keyof typeof roleIcons] || Shield;
          return (
            <Card key={roleName}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground capitalize">{roleName}s</p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: role?.roleColor || "#64748b" }}
                  />
                  <IconComponent className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                {users.length} users registered
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.roleId} value={role.roleName}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: role.roleColor || "#64748b" }}
                        />
                        {role.roleName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search users..."
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
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department & Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchTerm || roleFilter !== "all" ? "No users found matching your filters." : "No users found. Create your first user to get started."}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const IconComponent = roleIcons[user.role?.roleName as keyof typeof roleIcons] || User;
                    return (
                      <TableRow key={user.userId}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center space-x-1">
                                <Mail className="w-3 h-3" />
                                <span>{user.email}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className="border"
                            style={{ 
                              backgroundColor: user.role?.roleColor ? `${user.role.roleColor}20` : '#64748b20',
                              borderColor: user.role?.roleColor || '#64748b',
                              color: user.role?.roleColor || '#64748b'
                            }}
                          >
                            {user.role?.roleName || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {user.department && (
                              <div className="flex items-center space-x-2">
                                <div
                                  className="w-3 h-3 rounded-full border"
                                  style={{ backgroundColor: user.department.colorCode || "#64748b" }}
                                />
                                <span className="text-sm">{user.department.departmentName}</span>
                              </div>
                            )}
                            {user.location && (
                              <div className="text-sm text-muted-foreground">
                                {user.location.locationName}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {user.mobileNumber && (
                              <div className="flex items-center space-x-2">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                <span className="text-sm">{user.mobileNumber}</span>
                              </div>
                            )}
                            {user.address && (
                              <div className="text-sm text-muted-foreground truncate max-w-32">
                                {user.address}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === "active" ? "default" : "secondary"}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(user.userId)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}