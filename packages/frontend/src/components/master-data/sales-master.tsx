"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, IndianRupee, Target, MapPin } from "lucide-react";
import { userApi } from "@/lib/api/masterData";
import { apiClient } from "@/lib/api/client";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// Form schema
const salesPersonSchema = z.object({
  userId: z.string().min(1, "User selection is required"),
  employeeCode: z.string().optional(),
  territory: z.string().optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  targetAmount: z.number().min(0).optional(),
  managerId: z.string().optional(),
});

type SalesPersonFormData = z.infer<typeof salesPersonSchema>;

interface SalesPerson {
  salespersonId: string;
  userId: string;
  employeeCode?: string;
  territory?: string;
  commissionRate?: number;
  targetAmount?: number;
  managerId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber?: string;
    department?: {
      departmentName: string;
    };
    location?: {
      locationName: string;
    };
  };
  manager?: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface User {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export function SalesMaster() {
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSalesPerson, setEditingSalesPerson] = useState<SalesPerson | null>(null);
  // Using toast from sonner

  const form = useForm<SalesPersonFormData>({
    resolver: zodResolver(salesPersonSchema),
    defaultValues: {
      userId: "",
      employeeCode: "",
      territory: "",
      commissionRate: 0,
      targetAmount: 0,
      managerId: "",
    },
  });

  // Fetch sales persons
  const fetchSalesPersons = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/sales");
      if (response.success) {
        setSalesPersons(response.data || []);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch sales persons",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch users with salesperson role who don't have sales person records
  const fetchAvailableUsers = async () => {
    try {
      const response = await userApi.getUsers({ role: 'salesperson' });
      if (response.success) {
        setUsers(response.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  // Fetch managers for assignment
  const fetchManagers = async () => {
    try {
      const response = await userApi.getUsers({ role: 'manager' });
      if (response.success) {
        setManagers(response.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch managers:", error);
    }
  };

  useEffect(() => {
    fetchSalesPersons();
    fetchAvailableUsers();
    fetchManagers();
  }, []);

  // Handle form submission
  const onSubmit = async (data: SalesPersonFormData) => {
    try {
      const url = editingSalesPerson
        ? `/api/sales/${editingSalesPerson.salespersonId}`
        : "/api/sales";
      
      const method = editingSalesPerson ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Sales person ${editingSalesPerson ? 'updated' : 'created'} successfully`,
        });
        
        setIsDialogOpen(false);
        setEditingSalesPerson(null);
        form.reset();
        fetchSalesPersons();
        fetchAvailableUsers();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to save sales person",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save sales person",
        variant: "destructive",
      });
    }
  };

  // Handle edit
  const handleEdit = (salesPerson: SalesPerson) => {
    setEditingSalesPerson(salesPerson);
    form.setValue("userId", salesPerson.userId);
    form.setValue("employeeCode", salesPerson.employeeCode || "");
    form.setValue("territory", salesPerson.territory || "");
    form.setValue("commissionRate", salesPerson.commissionRate || 0);
    form.setValue("targetAmount", salesPerson.targetAmount || 0);
    form.setValue("managerId", salesPerson.managerId || "");
    setIsDialogOpen(true);
  };

  // Handle delete
  const handleDelete = async (salespersonId: string) => {
    if (!confirm("Are you sure you want to delete this sales person?")) return;

    try {
      const response = await fetch(`/api/sales/${salespersonId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Sales person deleted successfully",
        });
        fetchSalesPersons();
        fetchAvailableUsers();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to delete sales person",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete sales person",
        variant: "destructive",
      });
    }
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingSalesPerson(null);
    form.reset();
  };

  // Filter sales persons based on search
  const filteredSalesPersons = salesPersons.filter((sp) =>
    sp.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sp.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sp.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sp.territory?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Master</h1>
          <p className="text-muted-foreground">
            Manage sales persons and their territories
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => form.reset()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Sales Person
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingSalesPerson ? "Edit Sales Person" : "Add New Sales Person"}
              </DialogTitle>
              <DialogDescription>
                {editingSalesPerson
                  ? "Update the sales person information below."
                  : "Create a new sales person record by filling out the form below."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!!editingSalesPerson}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {editingSalesPerson ? (
                            <SelectItem value={editingSalesPerson.userId}>
                              {editingSalesPerson.user.firstName} {editingSalesPerson.user.lastName}
                            </SelectItem>
                          ) : (
                            users
                              .filter(user => !salesPersons.some(sp => sp.userId === user.userId))
                              .map((user) => (
                                <SelectItem key={user.userId} value={user.userId}>
                                  {user.firstName} {user.lastName} ({user.email})
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="employeeCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter employee code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="territory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Territory</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter territory" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="commissionRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commission Rate (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Amount</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="managerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manager</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select manager" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No manager assigned</SelectItem>
                          {managers.map((manager) => (
                            <SelectItem key={manager.userId} value={manager.userId}>
                              {manager.firstName} {manager.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingSalesPerson ? "Update" : "Create"} Sales Person
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
              <CardTitle>Sales Persons</CardTitle>
              <CardDescription>
                {salesPersons.length} sales persons configured
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search sales persons..."
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
                  <TableHead>Sales Person</TableHead>
                  <TableHead>Territory & Manager</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSalesPersons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchTerm ? "No sales persons found matching your search." : "No sales persons found. Create your first sales person to get started."}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSalesPersons.map((salesPerson) => (
                    <TableRow key={salesPerson.salespersonId}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {salesPerson.user.firstName} {salesPerson.user.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {salesPerson.employeeCode && `Code: ${salesPerson.employeeCode}`}
                          </div>
                          {salesPerson.user.department && (
                            <div className="text-sm text-muted-foreground">
                              {salesPerson.user.department.departmentName}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {salesPerson.territory && (
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              <span className="text-sm">{salesPerson.territory}</span>
                            </div>
                          )}
                          {salesPerson.manager && (
                            <div className="text-sm text-muted-foreground">
                              Manager: {salesPerson.manager.firstName} {salesPerson.manager.lastName}
                            </div>
                          )}
                          {salesPerson.user.location && (
                            <div className="text-sm text-muted-foreground">
                              {salesPerson.user.location.locationName}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {salesPerson.commissionRate && (
                            <div className="flex items-center space-x-2">
                              <IndianRupee className="w-3 h-3 text-green-600" />
                              <span className="text-sm">{salesPerson.commissionRate}% commission</span>
                            </div>
                          )}
                          {salesPerson.targetAmount && (
                            <div className="flex items-center space-x-2">
                              <Target className="w-3 h-3 text-blue-600" />
                              <span className="text-sm">Target: ₹{salesPerson.targetAmount.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">{salesPerson.user.email}</div>
                          {salesPerson.user.mobileNumber && (
                            <div className="text-sm text-muted-foreground">
                              {salesPerson.user.mobileNumber}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={salesPerson.status === "active" ? "default" : "secondary"}>
                          {salesPerson.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(salesPerson)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(salesPerson.salespersonId)}
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