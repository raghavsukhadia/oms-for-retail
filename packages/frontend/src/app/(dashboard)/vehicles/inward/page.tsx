'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Upload, Save, X, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileUpload } from '@/components/ui/file-upload';

import { vehicleInwardSchema, type VehicleInwardFormData } from '@/lib/validations/vehicles';
import { vehicleApi, type VehicleWithRelations } from '@/lib/api/vehicles';
import { locationApi, departmentApi, userApi, productApi } from '@/lib/api/masterData';
import type { 
  LocationWithCount, 
  DepartmentWithRelations, 
  UserWithRelations, 
  ProductWithCategory
} from '@/lib/api/masterData';

export default function VehicleInwardPage() {
  const router = useRouter();
  
  // Form state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [editingVehicle, setEditingVehicle] = useState<VehicleWithRelations | null>(null);

  // Master data state
  const [locations, setLocations] = useState<LocationWithCount[]>([]);
  const [departments, setDepartments] = useState<DepartmentWithRelations[]>([]);
  const [salespeople, setSalespeople] = useState<UserWithRelations[]>([]);
  const [coordinators, setCoordinators] = useState<UserWithRelations[]>([]);
  const [supervisors, setSupervisors] = useState<UserWithRelations[]>([]);
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [vehicles, setVehicles] = useState<VehicleWithRelations[]>([]);

  // Form setup
  const form = useForm<VehicleInwardFormData>({
    resolver: zodResolver(vehicleInwardSchema) as any,
    defaultValues: {
      carNumber: '',
      ownerName: '',
      ownerMobile: '',
      ownerEmail: '',
      ownerAddress: '',
      modelName: '',
      brandName: '',
      vehicleType: '',
      locationId: '',
      salespersonId: '',
      coordinatorId: '',
      supervisorId: '',
      inwardDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: '',
      vehicleRemarks: '',
      accountsRemarks: '',
      products: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'products'
  });

  // Load master data
  useEffect(() => {
    loadMasterData();
    loadVehicles();
  }, []);

  const loadMasterData = async () => {
    setIsLoading(true);
    try {
      const [
        locationsRes,
        departmentsRes,
        salespeopleRes,
        coordinatorsRes,
        supervisorsRes,
        productsRes,
        brandsRes
      ] = await Promise.all([
        locationApi.getActiveLocations(),
        departmentApi.getActiveDepartments(),
        userApi.getSalespeople(),
        userApi.getCoordinators(),
        userApi.getSupervisors(),
        productApi.getProducts(),
        productApi.getBrands()
      ]);

      if (locationsRes.success) setLocations(locationsRes.data || []);
      if (departmentsRes.success) setDepartments(departmentsRes.data || []);
      if (salespeopleRes.success) setSalespeople(salespeopleRes.data || []);
      if (coordinatorsRes.success) setCoordinators(coordinatorsRes.data || []);
      if (supervisorsRes.success) setSupervisors(supervisorsRes.data || []);
      if (productsRes.success) setProducts(productsRes.data || []);
      if (brandsRes.success) setBrands(brandsRes.data || []);
    } catch (error) {
      console.error('Error loading master data:', error);
      toast.error('Failed to load master data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadVehicles = async () => {
    try {
      const response = await vehicleApi.getVehicles({ limit: 50, sortBy: 'createdAt', sortOrder: 'desc' });
      if (response.success) {
        setVehicles(response.data || []);
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const loadProductsAndBrands = async () => {
    try {
      const [productsRes, brandsRes] = await Promise.all([
        productApi.getProducts(),
        productApi.getBrands()
      ]);

      if (productsRes.success) setProducts(productsRes.data || []);
      if (brandsRes.success) setBrands(brandsRes.data || []);
    } catch (error) {
      console.error('Error loading products and brands:', error);
    }
  };

  const addProduct = () => {
    append({
      productName: '',
      brandName: '',
      price: 0,
      quantity: 1,
      departmentName: '',
      amount: 0
    });
  };

  const removeProduct = (index: number) => {
    remove(index);
  };

  const onSubmit = async (data: VehicleInwardFormData) => {
    setIsSaving(true);
    try {
      // Prepare vehicle data
      const vehicleData = {
        carNumber: data.carNumber,
        ownerName: data.ownerName,
        ownerMobile: data.ownerMobile,
        ownerEmail: data.ownerEmail,
        ownerAddress: data.ownerAddress,
        modelName: data.modelName,
        brandName: data.brandName,
        vehicleType: data.vehicleType,
        locationId: data.locationId || undefined,
        salespersonId: data.salespersonId || undefined,
        coordinatorId: data.coordinatorId || undefined,
        supervisorId: data.supervisorId || undefined,
        inwardDate: data.inwardDate,
        expectedDeliveryDate: data.expectedDeliveryDate,
        vehicleDetails: {
          vehicleRemarks: data.vehicleRemarks,
          accountsRemarks: data.accountsRemarks,
          products: data.products
        }
      };

      let response;
      if (editingVehicle) {
        // Update existing vehicle
        response = await vehicleApi.updateVehicle(editingVehicle.vehicleId, vehicleData);
        if (response.success) {
          toast.success('Vehicle updated successfully');
          setEditingVehicle(null);
        }
      } else {
        // Create new vehicle
        response = await vehicleApi.createVehicle(vehicleData);
        if (response.success) {
          toast.success('Vehicle created successfully');
        }
      }
      
      if (response.success) {
        form.reset({
          carNumber: '',
          ownerName: '',
          ownerMobile: '',
          ownerEmail: '',
          ownerAddress: '',
          modelName: '',
          brandName: '',
          vehicleType: '',
          locationId: '',
          salespersonId: '',
          coordinatorId: '',
          supervisorId: '',
          inwardDate: new Date().toISOString().split('T')[0],
          expectedDeliveryDate: '',
          vehicleRemarks: '',
          accountsRemarks: '',
          products: []
        });
        setUploadedFiles([]); // Clear uploaded files
        loadVehicles(); // Refresh the vehicles list
        loadProductsAndBrands(); // Refresh products and brands to get new suggestions
      } else {
        toast.error(response.error || `Failed to ${editingVehicle ? 'update' : 'create'} vehicle`);
      }
    } catch (error: any) {
      console.error(`Error ${editingVehicle ? 'updating' : 'creating'} vehicle:`, error);
      toast.error(error.message || `Failed to ${editingVehicle ? 'update' : 'create'} vehicle`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setUploadedFiles([]);
    setEditingVehicle(null);
  };

  const handleEdit = (vehicle: VehicleWithRelations) => {
    setEditingVehicle(vehicle);
    form.reset({
      carNumber: vehicle.carNumber,
      ownerName: vehicle.ownerName,
      ownerMobile: vehicle.ownerMobile || '',
      ownerEmail: vehicle.ownerEmail || '',
      ownerAddress: vehicle.ownerAddress || '',
      modelName: vehicle.modelName || '',
      brandName: vehicle.brandName || '',
      vehicleType: vehicle.vehicleType || '',
      locationId: vehicle.locationId || '',
      salespersonId: vehicle.salespersonId || '',
      coordinatorId: vehicle.coordinatorId || '',
      supervisorId: vehicle.supervisorId || '',
      inwardDate: vehicle.inwardDate ? new Date(vehicle.inwardDate).toISOString().split('T')[0] : '',
      expectedDeliveryDate: vehicle.expectedDeliveryDate ? new Date(vehicle.expectedDeliveryDate).toISOString().split('T')[0] : '',
      vehicleRemarks: (vehicle.vehicleDetails as any)?.vehicleRemarks || '',
      accountsRemarks: (vehicle.vehicleDetails as any)?.accountsRemarks || '',
      products: (vehicle.vehicleDetails as any)?.products || []
    });
  };

  const handleDelete = async (vehicleId: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) {
      return;
    }

    try {
      const response = await vehicleApi.deleteVehicle(vehicleId);
      if (response.success) {
        toast.success('Vehicle deleted successfully');
        loadVehicles(); // Refresh the list
      } else {
        toast.error(response.error || 'Failed to delete vehicle');
      }
    } catch (error: any) {
      console.error('Error deleting vehicle:', error);
      toast.error(error.message || 'Failed to delete vehicle');
    }
  };

  const handlePrint = (vehicle: VehicleWithRelations) => {
    // Create a printable view
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Vehicle Inward Details - ${vehicle.carNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .details { margin-bottom: 20px; }
              .label { font-weight: bold; display: inline-block; width: 150px; }
              .value { display: inline-block; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Vehicle Inward Details</h1>
              <p>Date: ${new Date().toLocaleDateString()}</p>
            </div>
            <div class="details">
              <p><span class="label">Car Number:</span> <span class="value">${vehicle.carNumber}</span></p>
              <p><span class="label">Owner Name:</span> <span class="value">${vehicle.ownerName}</span></p>
              <p><span class="label">Mobile:</span> <span class="value">${vehicle.ownerMobile || '-'}</span></p>
              <p><span class="label">Model:</span> <span class="value">${vehicle.modelName || '-'}</span></p>
              <p><span class="label">Brand:</span> <span class="value">${vehicle.brandName || '-'}</span></p>
              <p><span class="label">Vehicle Type:</span> <span class="value">${vehicle.vehicleType || '-'}</span></p>
              <p><span class="label">Location:</span> <span class="value">${vehicle.location?.locationName || '-'}</span></p>
              <p><span class="label">Sales Person:</span> <span class="value">${vehicle.salesperson ? formatUserName(vehicle.salesperson as any) : '-'}</span></p>
              <p><span class="label">Inward Date:</span> <span class="value">${vehicle.inwardDate ? formatDate(vehicle.inwardDate.toString()) : '-'}</span></p>
              <p><span class="label">Expected Delivery:</span> <span class="value">${vehicle.expectedDeliveryDate ? formatDate(vehicle.expectedDeliveryDate.toString()) : '-'}</span></p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const formatUserName = (user: { firstName?: string; lastName?: string; email: string }) => {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-lg">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          {editingVehicle ? 'Edit Vehicle Inward' : 'Vehicle Inward'}
        </h1>
        {editingVehicle && (
          <Button variant="outline" onClick={handleCancel}>
            Cancel Edit
          </Button>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Main Vehicle Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>
                {editingVehicle ? `Edit Vehicle Information - ${editingVehicle.carNumber}` : 'Vehicle Information'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Row 1 */}
                <FormField
                  control={form.control}
                  name="inwardDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inward Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ownerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter owner name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ownerMobile"
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

                {/* Row 2 */}
                <FormField
                  control={form.control}
                  name="modelName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter model name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="carNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Car Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter car number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expectedDeliveryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Delivery Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Row 3 */}
                <FormField
                  control={form.control}
                  name="salespersonId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sales Person</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sales person" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {salespeople.map((person) => (
                            <SelectItem key={person.userId} value={person.userId}>
                              {formatUserName(person)}
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
                  name="vehicleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vehicle type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                          <SelectItem value="luxury">Luxury</SelectItem>
                          <SelectItem value="economy">Economy</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Full width fields */}
                <div className="md:col-span-2 lg:col-span-3">
                  <FormField
                    control={form.control}
                    name="vehicleRemarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Remarks</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter vehicle remarks" 
                            className="min-h-[80px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <FormField
                    control={form.control}
                    name="accountsRemarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Accounts Remarks</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter accounts remarks" 
                            className="min-h-[80px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Attach Image Section */}
                <div className="md:col-span-2 lg:col-span-3">
                  <div className="space-y-2">
                    <FormLabel>Attach Images</FormLabel>
                    <FileUpload
                      accept="image/*"
                      multiple={true}
                      maxFiles={5}
                      maxSizeBytes={5 * 1024 * 1024} // 5MB
                      value={uploadedFiles}
                      onFileSelect={setUploadedFiles}
                      onFileRemove={(index) => {
                        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product List Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Product List</CardTitle>
                <Button type="button" onClick={addProduct} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {fields.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`products.${index}.productName`}
                            render={({ field }) => (
                              <div className="relative">
                                <Input 
                                  placeholder="Type or select product" 
                                  value={field.value || ''}
                                  onChange={field.onChange}
                                  list={`products-list-${index}`}
                                />
                                <datalist id={`products-list-${index}`}>
                                  {products.map((product) => (
                                    <option key={product.productId} value={product.productName} />
                                  ))}
                                </datalist>
                              </div>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`products.${index}.brandName`}
                            render={({ field }) => (
                              <div className="relative">
                                <Input 
                                  placeholder="Type or select brand" 
                                  value={field.value || ''}
                                  onChange={field.onChange}
                                  list={`brands-list-${index}`}
                                />
                                <datalist id={`brands-list-${index}`}>
                                  {brands.map((brand) => (
                                    <option key={brand} value={brand} />
                                  ))}
                                </datalist>
                              </div>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`products.${index}.price`}
                            render={({ field }) => (
                              <Input 
                                type="number" 
                                placeholder="Price" 
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`products.${index}.departmentName`}
                            render={({ field }) => (
                              <div className="relative">
                                <Input 
                                  placeholder="Type or select department" 
                                  value={field.value || ''}
                                  onChange={field.onChange}
                                  list={`departments-list-${index}`}
                                />
                                <datalist id={`departments-list-${index}`}>
                                  {departments.map((dept) => (
                                    <option key={dept.departmentId} value={dept.departmentName} />
                                  ))}
                                </datalist>
                              </div>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProduct(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  No products added. Click "Add" to add products.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              {editingVehicle ? 'Update Vehicle' : 'Save Vehicle'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Ordered List Card */}
      <Card>
        <CardHeader>
          <CardTitle>Ordered List</CardTitle>
        </CardHeader>
        <CardContent>
          {vehicles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S.NO</TableHead>
                  <TableHead>Inward Date</TableHead>
                  <TableHead>Owner Name</TableHead>
                  <TableHead>Model Name</TableHead>
                  <TableHead>Car Number</TableHead>
                  <TableHead>Sales Person</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Edit</TableHead>
                  <TableHead>Remove</TableHead>
                  <TableHead>Print</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle, index) => (
                  <TableRow key={vehicle.vehicleId}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      {vehicle.inwardDate ? formatDate(vehicle.inwardDate.toString()) : '-'}
                    </TableCell>
                    <TableCell>{vehicle.ownerName}</TableCell>
                    <TableCell>{vehicle.modelName || '-'}</TableCell>
                    <TableCell>{vehicle.carNumber}</TableCell>
                    <TableCell>
                      {vehicle.salesperson ? formatUserName(vehicle.salesperson as any) : '-'}
                    </TableCell>
                    <TableCell>{vehicle.location?.locationName || '-'}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => router.push(`/vehicles/${vehicle.vehicleId}/workflow`)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Workflow
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleEdit(vehicle)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleDelete(vehicle.vehicleId)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handlePrint(vehicle)}
                        className="text-green-600 hover:text-green-800"
                      >
                        Print
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-gray-500">
              No vehicles found. Add a vehicle to see it here.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}