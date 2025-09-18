'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { vehicleApi, type VehicleWithRelations } from '@/lib/api/vehicles';
import { toast } from 'sonner';
import { calculateOverallProgress, getWorkflowStage, getStageDisplayName, getStageColor, formatSalespersonName } from '@/lib/progress-utils';
import { useVehicles } from '@/lib/hooks/useVehicles';

interface VehicleRecord extends VehicleWithRelations {
  workflowInstances?: Array<{
    workflowType: string;
    currentStage: string;
    status: string;
  }>;
}

export function VehicleRecordsTable() {
  // Use shared vehicle data hook for consistency
  const { vehicles, loading, error, refreshVehicles } = useVehicles({ 
    includeWorkflows: true,
    autoRefresh: false 
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [installationFilter, setInstallationFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Note: Using shared utility functions from progress-utils for consistency

  // Filter vehicles based on search and filters
  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = !searchTerm || 
      vehicle.carNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.modelName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.location?.locationName.toLowerCase().includes(searchTerm.toLowerCase());

    const installationStage = getWorkflowStage(vehicle, 'installation');
    const accountStage = getWorkflowStage(vehicle, 'payment');
    
    const matchesInstallation = !installationFilter || installationFilter === 'all' || installationStage === installationFilter;
    const matchesAccount = !accountFilter || accountFilter === 'all' || accountStage === accountFilter;

    return matchesSearch && matchesInstallation && matchesAccount;
  });

  // Sort vehicles
  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
    if (!sortField) return 0;
    
    let aValue: any = '';
    let bValue: any = '';
    
    switch (sortField) {
      case 'id':
        aValue = parseInt(a.vehicleId.slice(-4), 16); // Use last 4 chars as numeric
        bValue = parseInt(b.vehicleId.slice(-4), 16);
        break;
      case 'owner':
        aValue = a.ownerName;
        bValue = b.ownerName;
        break;
      case 'carNumber':
        aValue = a.carNumber;
        bValue = b.carNumber;
        break;
      case 'inwardDate':
        aValue = a.inwardDate ? new Date(a.inwardDate) : new Date(0);
        bValue = b.inwardDate ? new Date(b.inwardDate) : new Date(0);
        break;
      case 'expectedDate':
        aValue = a.expectedDeliveryDate ? new Date(a.expectedDeliveryDate) : new Date(0);
        bValue = b.expectedDeliveryDate ? new Date(b.expectedDeliveryDate) : new Date(0);
        break;
      case 'progress':
        aValue = calculateOverallProgress(a);
        bValue = calculateOverallProgress(b);
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-gray-50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
        )}
      </div>
    </TableHead>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading vehicle records...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        {/* Search and Filter Section */}
        <div className="bg-slate-600 text-white p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-4">Search Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search vehicles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white text-black"
                />
              </div>
            </div>

            {/* Installation Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Installation</label>
              <Select value={installationFilter} onValueChange={setInstallationFilter}>
                <SelectTrigger className="bg-white text-black">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="order_confirmed">Order Confirmed</SelectItem>
                  <SelectItem value="start_installation">Installation Started</SelectItem>
                  <SelectItem value="quality_checked">Quality Checked</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Account Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Account</label>
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="bg-white text-black">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button className="bg-green-600 hover:bg-green-700">
                Search
              </Button>
              <Button 
                onClick={refreshVehicles}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
                title="Refresh vehicle data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <SortableHeader field="id">
                  <span className="font-semibold">ID ▼</span>
                </SortableHeader>
                <TableHead className="font-semibold">Customer Details</TableHead>
                <TableHead className="font-semibold">Car Details</TableHead>
                <TableHead className="font-semibold">Location Details</TableHead>
                <TableHead className="font-semibold">Installed Stage</TableHead>
                <TableHead className="font-semibold">Account Stage</TableHead>
                <SortableHeader field="progress">
                  <span className="font-semibold">Progress</span>
                </SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedVehicles.map((vehicle, index) => {
                const installationStage = getWorkflowStage(vehicle, 'installation');
                const accountStage = getWorkflowStage(vehicle, 'payment');
                const progress = calculateOverallProgress(vehicle);
                
                return (
                  <TableRow key={vehicle.vehicleId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {/* ID */}
                    <TableCell>
                      <div className="flex items-center">
                        <span className="text-yellow-600 mr-2">▼</span>
                        <span className="font-medium">{index + 1}</span>
                      </div>
                    </TableCell>

                    {/* Customer Details */}
                    <TableCell>
                      <div className="space-y-1">
                        <div><strong>Owner Name:</strong> {vehicle.ownerName}</div>
                        <div><strong>Inward Date:</strong> {vehicle.inwardDate ? new Date(vehicle.inwardDate).toLocaleDateString() : 'Not set'}</div>
                        <div><strong>Expected Date:</strong> {vehicle.expectedDeliveryDate ? new Date(vehicle.expectedDeliveryDate).toLocaleDateString() : 'Not set'}</div>
                      </div>
                    </TableCell>

                    {/* Car Details */}
                    <TableCell>
                      <div className="space-y-1">
                        <div><strong>Model:</strong> {vehicle.modelName || vehicle.brandName || 'Audi'}</div>
                        <div><strong>Car No:</strong> {vehicle.carNumber}</div>
                      </div>
                    </TableCell>

                    {/* Location Details */}
                    <TableCell>
                      <div className="space-y-1">
                        <div><strong>Location:</strong> {vehicle.location?.locationName || 'Not assigned'}</div>
                        <div><strong>Type:</strong> {vehicle.vehicleType || 'Retail'}</div>
                        <div><strong>Sales Person:</strong> {formatSalespersonName(vehicle.salesperson)}</div>
                      </div>
                    </TableCell>

                    {/* Installation Stage */}
                    <TableCell>
                      <Badge className={`${getStageColor(installationStage)} text-white`}>
                        {getStageDisplayName(installationStage)}
                      </Badge>
                    </TableCell>

                    {/* Account Stage */}
                    <TableCell>
                      <Badge className={`${getStageColor(accountStage)} text-white`}>
                        {accountStage === 'payment' ? 'Payment' : getStageDisplayName(accountStage)}
                      </Badge>
                    </TableCell>

                    {/* Progress */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-center font-semibold">{progress}%</div>
                        <div className="text-center text-sm text-gray-600">{progress}/100</div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Empty State */}
        {sortedVehicles.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-600">No vehicles found matching your criteria.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
