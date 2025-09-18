"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, Users, Palette } from "lucide-react";
import { departmentApi, userApi } from "@/lib/api/masterData";
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
const departmentSchema = z.object({
  departmentName: z.string().min(1, "Department name is required").max(255),
  colorCode: z.string().optional(),
  description: z.string().optional(),
  headUserId: z.string(),
});

type DepartmentFormData = z.infer<typeof departmentSchema>;

interface Department {
  departmentId: string;
  departmentName: string;
  colorCode?: string;
  description?: string;
  headUserId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  headUser?: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  _count?: {
    users: number;
  };
}

interface User {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export function DepartmentMaster() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  // Using toast from sonner

  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      departmentName: "",
      colorCode: "",
      description: "",
      headUserId: "none",
    },
  });

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await departmentApi.getDepartments();
      if (response.success) {
        setDepartments(response.data || []);
      }
    } catch (error) {
      toast.error("Failed to fetch departments");
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for head user selection
  const fetchUsers = async () => {
    try {
      // Get managers and supervisors separately since role parameter doesn't support multiple values
      const [managersResponse, supervisorsResponse] = await Promise.all([
        userApi.getUsers({ role: 'manager' }),
        userApi.getUsers({ role: 'supervisor' })
      ]);
      
      const managers = managersResponse.success ? managersResponse.data || [] : [];
      const supervisors = supervisorsResponse.success ? supervisorsResponse.data || [] : [];
      
      // Combine and deduplicate users
      const combinedUsers = [...managers, ...supervisors];
      const uniqueUsers = combinedUsers.filter((user, index, self) => 
        index === self.findIndex(u => u.userId === user.userId)
      );
      
      setUsers(uniqueUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchUsers();
  }, []);

  // Handle form submission
  const onSubmit = async (data: DepartmentFormData) => {
    try {
      // Convert "none" values back to undefined for optional fields
      const payload = { ...data };
      if (payload.headUserId === "none") {
        payload.headUserId = undefined;
      }

      const response = editingDepartment
        ? await departmentApi.updateDepartment(editingDepartment.departmentId, payload)
        : await departmentApi.createDepartment(payload);

      if (response.success) {
        toast.success(`Department ${editingDepartment ? 'updated' : 'created'} successfully`);
        
        setIsDialogOpen(false);
        setEditingDepartment(null);
        form.reset({
          departmentName: "",
          colorCode: "",
          description: "",
          headUserId: "none",
        });
        fetchDepartments();
      } else {
        toast.error(response.error || "Failed to save department");
      }
    } catch (error) {
      toast.error("Failed to save department");
    }
  };

  // Handle edit
  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    form.setValue("departmentName", department.departmentName);
    form.setValue("colorCode", department.colorCode || "");
    form.setValue("description", department.description || "");
    form.setValue("headUserId", department.headUserId || "none");
    setIsDialogOpen(true);
  };

  // Handle delete
  const handleDelete = async (departmentId: string) => {
    if (!confirm("Are you sure you want to delete this department?")) return;

    try {
      const response = await departmentApi.deleteDepartment(departmentId);

      if (response.success) {
        toast.success("Department deleted successfully");
        fetchDepartments();
      } else {
        toast.error(response.error || "Failed to delete department");
      }
    } catch (error) {
      toast.error("Failed to delete department");
    }
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingDepartment(null);
    form.reset({
      departmentName: "",
      colorCode: "",
      description: "",
      headUserId: "none",
    });
  };

  // Filter departments based on search
  const filteredDepartments = departments.filter((dept) =>
    dept.departmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Department Master</h1>
          <p className="text-muted-foreground">
            Manage departments and their configurations
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => form.reset({
              departmentName: "",
              colorCode: "",
              description: "",
              headUserId: "none",
            })}>
              <Plus className="w-4 h-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingDepartment ? "Edit Department" : "Add New Department"}
              </DialogTitle>
              <DialogDescription>
                {editingDepartment
                  ? "Update the department information below."
                  : "Create a new department by filling out the form below."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="departmentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter department name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="colorCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <ColorPicker
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription>
                        Choose a color to identify this department
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="headUserId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department Head</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department head" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No head assigned</SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.userId} value={user.userId}>
                              {user.firstName} {user.lastName} ({user.email})
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter department description (optional)" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingDepartment ? "Update" : "Create"} Department
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Departments</CardTitle>
              <CardDescription>
                {departments.length} departments configured
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search departments..."
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
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Head</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchTerm ? "No departments found matching your search." : "No departments found. Create your first department to get started."}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDepartments.map((department) => (
                    <TableRow key={department.departmentId}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: department.colorCode || "#64748b" }}
                          />
                          <div>
                            <div className="font-medium">{department.departmentName}</div>
                            {department.description && (
                              <div className="text-sm text-muted-foreground">
                                {department.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {department.headUser ? (
                          <div>
                            <div className="font-medium">
                              {department.headUser.firstName} {department.headUser.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {department.headUser.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No head assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{department._count?.users || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={department.status === "active" ? "default" : "secondary"}>
                          {department.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(department.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(department)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(department.departmentId)}
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