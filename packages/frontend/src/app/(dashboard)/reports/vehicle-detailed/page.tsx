'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  ClipboardList, 
  Filter,
  Loader2,
  FileSpreadsheet,
  FileText,
  Car,
  User,
  Package,
  CreditCard,
  MapPin,
  Calendar,
  Phone,
  Mail
} from "lucide-react";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { reportsApi, type VehicleDetailedReportData } from '@/lib/api/reports';
import { getVehicleStatusDisplay, getInstallationStatusDisplay, getPaymentStatusDisplay } from '@/lib/status-utils';
// import { format } from 'date-fns';

// Fallback format function if date-fns is not available
const format = (date: Date, formatStr: string): string => {
  if (formatStr === 'yyyy-MM-dd') {
    return date.toISOString().split('T')[0];
  }
  if (formatStr === 'dd MMM yyyy') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }
  return date.toLocaleDateString();
};
import { toast } from 'sonner';

export default function VehicleDetailedReportPage() {
  const [data, setData] = useState<VehicleDetailedReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState('');

  const fetchReportData = useCallback(async () => {
    if (!vehicleNumber.trim()) {
      toast.error('Please enter a vehicle number');
      return;
    }

    setLoading(true);
    try {
      const response = await reportsApi.getVehicleDetailedReport(vehicleNumber);
      setData(response.data || []);
      if (response.data && response.data.length === 0) {
        toast.info('No vehicle found with the provided number');
      } else if (response.data && response.data.length > 0) {
        toast.success(`Found ${response.data.length} vehicle(s)`);
      }
    } catch (error) {
      console.error('Failed to fetch vehicle detailed report:', error);
      toast.error('Failed to load vehicle details');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [vehicleNumber]);

  const handleSearch = () => {
    fetchReportData();
  };

  const handleExport = async (format: 'excel' | 'csv') => {
    if (!vehicleNumber.trim()) {
      toast.error('Please search for a vehicle first');
      return;
    }

    try {
      const blob = await reportsApi.exportReport('vehicle-detailed', format, { vehicleNumber });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `vehicle-detailed-report-${vehicleNumber}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export report');
    }
  };

  const getStatusBadge = (status: string, type: 'vehicle' | 'installation' | 'payment' = 'vehicle') => {
    let config;
    switch (type) {
      case 'installation':
        config = getInstallationStatusDisplay(status);
        break;
      case 'payment':
        config = getPaymentStatusDisplay(status);
        break;
      default:
        config = getVehicleStatusDisplay(status);
    }

    return (
      <Badge variant="secondary" className={`${config.bgColor} ${config.textColor}`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-purple-600" />
            Vehicle Detailed Report
          </h1>
          <p className="text-muted-foreground">
            Comprehensive vehicle information including installations and payments
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={() => handleExport('csv')}
            disabled={loading || data.length === 0}
          >
            <FileText className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            variant="outline"
            onClick={() => handleExport('excel')}
            disabled={loading || data.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Search Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Vehicle Search
          </CardTitle>
          <CardDescription>
            Enter a vehicle number to get detailed information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="vehicleNumber">Vehicle Number</Label>
              <Input
                id="vehicleNumber"
                placeholder="Enter vehicle number (e.g., MH14G0007)"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading} className="min-w-[120px]">
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Details */}
      {data.length > 0 && (
        <div className="space-y-6">
          {data.map((vehicle) => (
            <div key={vehicle.vehicleId} className="space-y-6">
              {/* Basic Vehicle Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    Vehicle Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Vehicle Number</Label>
                        <p className="text-lg font-mono font-bold">{vehicle.carNumber}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Brand & Model</Label>
                        <p className="font-medium">{vehicle.brandName} {vehicle.modelName}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Vehicle Type</Label>
                        <p>{vehicle.vehicleType}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Owner</Label>
                        <p className="font-medium flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {vehicle.ownerName}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Mobile</Label>
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {vehicle.ownerMobile}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                        <p className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {vehicle.ownerEmail || 'Not provided'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                        <div>{getStatusBadge(vehicle.status, 'vehicle')}</div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {vehicle.location}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Inward Date</Label>
                        <p className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(vehicle.inwardDate), 'dd MMM yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Team Assignments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Team Assignments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Salesperson</Label>
                      <p className="font-medium">{vehicle.salesperson || 'Not assigned'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Coordinator</Label>
                      <p className="font-medium">{vehicle.coordinator || 'Not assigned'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Supervisor</Label>
                      <p className="font-medium">{vehicle.supervisor || 'Not assigned'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Delivery Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Expected Delivery</Label>
                      <p>{vehicle.expectedDeliveryDate ? format(new Date(vehicle.expectedDeliveryDate), 'dd MMM yyyy') : 'Not set'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Actual Delivery</Label>
                      <p>{vehicle.actualDeliveryDate ? format(new Date(vehicle.actualDeliveryDate), 'dd MMM yyyy') : 'Not delivered'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Installations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Installations ({vehicle.installations.length})
                  </CardTitle>
                  <CardDescription>
                    Products installed in this vehicle
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {vehicle.installations.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">No installations recorded</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Brand</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Installation Date</TableHead>
                            <TableHead>Installer</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vehicle.installations.map((installation, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{installation.productName}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{installation.brandName}</Badge>
                              </TableCell>
                              <TableCell>{installation.categoryName}</TableCell>
                              <TableCell>{format(new Date(installation.installationDate), 'dd MMM yyyy')}</TableCell>
                              <TableCell>{installation.installer}</TableCell>
                              <TableCell className="text-right font-mono">₹{installation.amount.toLocaleString()}</TableCell>
                              <TableCell>{getStatusBadge(installation.status, 'installation')}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Payments */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payments ({vehicle.payments.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {vehicle.payments.length === 0 ? (
                      <p className="text-center py-4 text-muted-foreground">No payments recorded</p>
                    ) : (
                      <div className="space-y-3">
                        {vehicle.payments.map((payment, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">₹{payment.amount.toLocaleString()}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(payment.paymentDate), 'dd MMM yyyy')} • {payment.paymentMethod}
                              </p>
                              {payment.transactionId && (
                                <p className="text-xs text-muted-foreground font-mono">ID: {payment.transactionId}</p>
                              )}
                            </div>
                            <div>{getStatusBadge(payment.status, 'payment')}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Financial Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Amount</span>
                      <span className="font-mono font-bold text-lg">₹{vehicle.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Paid</span>
                      <span className="font-mono font-medium text-green-600">₹{vehicle.totalPaid.toLocaleString()}</span>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Balance</span>
                        <span className={`font-mono font-bold text-lg ${vehicle.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ₹{vehicle.balance.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2">
                      {vehicle.balance > 0 ? (
                        <Badge variant="destructive" className="w-full justify-center">
                          Outstanding Balance
                        </Badge>
                      ) : (
                        <Badge variant="default" className="w-full justify-center bg-green-600">
                          Fully Paid
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Data State */}
      {!loading && data.length === 0 && !vehicleNumber && (
        <Card>
          <CardContent className="text-center py-8">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Search for Vehicle Details</h3>
            <p className="text-muted-foreground">
              Enter a vehicle number above to get comprehensive vehicle information including installations and payments.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && data.length === 0 && vehicleNumber && (
        <Card>
          <CardContent className="text-center py-8">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Vehicle Found</h3>
            <p className="text-muted-foreground">
              No vehicle found with number "{vehicleNumber}". Please check the vehicle number and try again.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
