'use client';

import { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VehicleRecordsTable } from '@/components/vehicle-records/vehicle-records-table';

export default function VehicleRecordsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white bg-slate-700 py-3 px-6 rounded">
          WELCOME, OMSMS
        </h1>
        <p className="text-sm text-gray-600 mt-2">
          Comprehensive vehicle records and workflow management
        </p>
      </div>

      {/* Vehicle Records Table */}
      <VehicleRecordsTable />
    </div>
  );
}



