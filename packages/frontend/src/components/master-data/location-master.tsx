"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, MapPin, Phone, Mail, Building } from "lucide-react";
import { locationApi } from "@/lib/api/locations";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// Form schema
const locationSchema = z.object({
  locationName: z.string().min(1, "Location name is required").max(255),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  contactPerson: z.string().optional(),
  contactMobile: z.string().optional(),
  contactEmail: z.string().email("Invalid email format").optional().or(z.literal("")),
});

type LocationFormData = z.infer<typeof locationSchema>;

interface Location {
  locationId: string;
  locationName: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  contactPerson?: string;
  contactMobile?: string;
  contactEmail?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    vehicles: number;
    users: number;
  };
}

export function LocationMaster() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  // Using toast from sonner

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      locationName: "",
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      contactPerson: "",
      contactMobile: "",
      contactEmail: "",
    },
  });

  // Fetch locations
  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await locationApi.getLocations();
      if (response.success) {
        setLocations(response.data || []);
      }
    } catch (error) {
      toast.error("Failed to fetch locations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // Handle form submission
  const onSubmit = async (data: LocationFormData) => {
    try {
      // Clean the data - convert empty strings to undefined for optional fields
      const cleanedData = {
        ...data,
        address: data.address?.trim() || undefined,
        city: data.city?.trim() || undefined,
        state: data.state?.trim() || undefined,
        country: data.country?.trim() || undefined,
        postalCode: data.postalCode?.trim() || undefined,
        contactPerson: data.contactPerson?.trim() || undefined,
        contactMobile: data.contactMobile?.trim() || undefined,
        contactEmail: data.contactEmail?.trim() || undefined,
      };

      const response = editingLocation
        ? await locationApi.updateLocation(editingLocation.locationId, cleanedData)
        : await locationApi.createLocation(cleanedData);

      if (response.success) {
        toast.success(`Location ${editingLocation ? 'updated' : 'created'} successfully`);
        
        setIsDialogOpen(false);
        setEditingLocation(null);
        form.reset();
        fetchLocations();
      } else {
        toast.error(response.error || "Failed to save location");
      }
    } catch (error) {
      toast.error("Failed to save location");
    }
  };

  // Handle edit
  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    form.setValue("locationName", location.locationName);
    form.setValue("address", location.address || "");
    form.setValue("city", location.city || "");
    form.setValue("state", location.state || "");
    form.setValue("country", location.country || "");
    form.setValue("postalCode", location.postalCode || "");
    form.setValue("contactPerson", location.contactPerson || "");
    form.setValue("contactMobile", location.contactMobile || "");
    form.setValue("contactEmail", location.contactEmail || "");
    setIsDialogOpen(true);
  };

  // Handle delete
  const handleDelete = async (locationId: string) => {
    if (!confirm("Are you sure you want to delete this location?")) return;

    try {
      const response = await locationApi.deleteLocation(locationId);

      if (response.success) {
        toast.success("Location deleted successfully");
        fetchLocations();
      } else {
        toast.error(response.error || "Failed to delete location");
      }
    } catch (error) {
      toast.error("Failed to delete location");
    }
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingLocation(null);
    form.reset();
  };

  // Filter locations based on search
  const filteredLocations = locations.filter((location) =>
    location.locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Location Master</h1>
          <p className="text-muted-foreground">
            Manage business locations and their contact information
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => form.reset()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingLocation ? "Edit Location" : "Add New Location"}
              </DialogTitle>
              <DialogDescription>
                {editingLocation
                  ? "Update the location information below."
                  : "Create a new location by filling out the form below."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="locationName"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Location Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter location name" {...field} />
                        </FormControl>
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
                          <Input placeholder="Enter address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter city" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter state" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter country" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter postal code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter contact person name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactMobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Mobile</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter mobile number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter email address" {...field} />
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
                    {editingLocation ? "Update" : "Create"} Location
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
              <CardTitle>Locations</CardTitle>
              <CardDescription>
                {locations.length} locations configured
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search locations..."
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
                  <TableHead>Location</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchTerm ? "No locations found matching your search." : "No locations found. Create your first location to get started."}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLocations.map((location) => (
                    <TableRow key={location.locationId}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Building className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">{location.locationName}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {location.address && (
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              <span className="text-sm">{location.address}</span>
                            </div>
                          )}
                          {(location.city || location.state || location.country) && (
                            <div className="text-sm text-muted-foreground">
                              {[location.city, location.state, location.country].filter(Boolean).join(", ")}
                              {location.postalCode && ` ${location.postalCode}`}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {location.contactPerson && (
                            <div className="text-sm font-medium">{location.contactPerson}</div>
                          )}
                          {location.contactMobile && (
                            <div className="flex items-center space-x-2">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <span className="text-sm">{location.contactMobile}</span>
                            </div>
                          )}
                          {location.contactEmail && (
                            <div className="flex items-center space-x-2">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              <span className="text-sm">{location.contactEmail}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="font-medium">{location._count?.vehicles || 0}</span> vehicles
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">{location._count?.users || 0}</span> users
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={location.status === "active" ? "default" : "secondary"}>
                          {location.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(location)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(location.locationId)}
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