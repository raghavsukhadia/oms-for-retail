'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarIcon, 
  Download, 
  Search, 
  Car, 
  Filter,
  Loader2,
  FileSpreadsheet,
  FileText
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
import { reportsApi, type VehicleInwardReportData, type ReportFilters } from '@/lib/api/reports';
import { getInstallationStatusDisplay, getPaymentStatusDisplay } from '@/lib/status-utils';
// import { format } from 'date-fns';

// Fallback format function if date-fns is not available
const format = (date: Date, formatStr: string): string => {
  if (formatStr === 'yyyy-MM-dd') {
    return date.toISOString().split('T')[0];
  }
  if (formatStr === 'dd-MM-yyyy') {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
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

export default function VehicleInwardReportPage() {
  const [data, setData] = useState<VehicleInwardReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    fromDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 30 days ago
    tillDate: format(new Date(), 'yyyy-MM-dd'), // today
    page: 1,
    limit: 50
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await reportsApi.getVehicleInwardReport(filters);
      setData(response.data || []);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch vehicle inward report:', error);
      toast.error('Failed to load report data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handleSearch = () => {
    fetchReportData();
  };

  const handleExport = async (format: 'excel' | 'csv') => {
    try {
      const blob = await reportsApi.exportReport('vehicle-inward', format, filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `vehicle-inward-report.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export report');
    }
  };

  const getStatusBadge = (status: string, type: 'installation' | 'payment' = 'installation') => {
    const config = type === 'installation' 
      ? getInstallationStatusDisplay(status)
      : getPaymentStatusDisplay(status);

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
            <Car className="h-8 w-8 text-blue-600" />
            Vehicle Inward Report
          </h1>
          <p className="text-muted-foreground">
            Track vehicle intake, delivery schedules, and status progression
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={() => handleExport('csv')}
            disabled={loading}
          >
            <FileText className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            variant="outline"
            onClick={() => handleExport('excel')}
            disabled={loading}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter the report data by date range and other criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="fromDate">From Date</Label>
              <Input
                id="fromDate"
                type="date"
                value={filters.fromDate || ''}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tillDate">Till Date</Label>
              <Input
                id="tillDate"
                type="date"
                value={filters.tillDate || ''}
                onChange={(e) => handleFilterChange('tillDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Vehicle Status</Label>
              <Select value={filters.vehicleStatus || 'all'} onValueChange={(value) => handleFilterChange('vehicleStatus', value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="quality_check">Quality Check</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} disabled={loading} className="w-full">
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {data.length} of {pagination.total} results
        </div>
        <div className="text-sm text-muted-foreground">
          Page {pagination.page} of {pagination.totalPages}
        </div>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Inward Data</CardTitle>
          <CardDescription>
            Complete list of vehicle inward records with delivery tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading report data...</span>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No data found for the selected filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S.NO</TableHead>
                    <TableHead>Inward Date</TableHead>
                    <TableHead>Owner Name</TableHead>
                    <TableHead>Mobile No.</TableHead>
                    <TableHead>Model Name</TableHead>
                    <TableHead>Car Number</TableHead>
                    <TableHead>Exp Delivered Date</TableHead>
                    <TableHead>Delivered Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Salesperson</TableHead>
                    <TableHead>Installation</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, index) => (
                    <TableRow key={row.vehicleId}>
                      <TableCell>{(pagination.page - 1) * pagination.limit + index + 1}</TableCell>
                      <TableCell>{format(new Date(row.inwardDate), 'dd-MM-yyyy')}</TableCell>
                      <TableCell className="font-medium">{row.ownerName}</TableCell>
                      <TableCell>{row.mobileNo}</TableCell>
                      <TableCell>{row.modelName}</TableCell>
                      <TableCell className="font-mono">{row.carNumber}</TableCell>
                      <TableCell>{row.expDeliveredDate ? format(new Date(row.expDeliveredDate), 'dd-MM-yyyy') : '-'}</TableCell>
                      <TableCell>{row.deliveredDate ? format(new Date(row.deliveredDate), 'dd-MM-yyyy') : '-'}</TableCell>
                      <TableCell>{row.location}</TableCell>
                      <TableCell>{row.salesperson}</TableCell>
                                                  <TableCell>{getStatusBadge(row.installation, 'installation')}</TableCell>
                            <TableCell>{getStatusBadge(row.payment, 'payment')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }))}
            disabled={pagination.page <= 1 || loading}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.totalPages, (prev.page || 1) + 1) }))}
            disabled={pagination.page >= pagination.totalPages || loading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
