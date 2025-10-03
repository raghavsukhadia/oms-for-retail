'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Phone, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  User,
  Calendar,
  Filter,
  Download,
  Users,
  UserPlus,
  Settings,
  Loader2,
  FileText,
  History
} from "lucide-react";
import { toast } from 'sonner';

interface CallFollowUp {
  id: string;
  callerName: string;
  phoneNumber: string;
  personToContact: string;
  operatorId: string;
  operatorName: string;
  priority: 'low' | 'medium' | 'high';
  status: 'call_entered' | 'active_calls' | 'pending' | 'followed_up' | 'not_received' | 'completed';
  responseTime: number; // in minutes
  callOutcome: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  followUpDate?: string;
  assignedToId?: string;
  assignedToName?: string;
  statusHistory: StatusChange[];
}

interface StatusChange {
  id: string;
  fromStatus: string;
  toStatus: string;
  changedAt: string;
  changedBy: string;
  notes?: string;
}

interface Operator {
  id: string;
  name: string;
  phone: string;
  email: string;
  isActive: boolean;
}

interface AssignedPerson {
  id: string;
  name: string;
  department: string;
  phone: string;
  email: string;
  isActive: boolean;
}

const priorityConfig = {
  low: { label: 'Low', color: 'bg-green-100 text-green-800' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'High', color: 'bg-red-100 text-red-800' }
};

const statusConfig = {
  call_entered: { label: 'Call Entered', color: 'bg-purple-100 text-purple-800', icon: Phone },
  active_calls: { label: 'Active Calls', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  followed_up: { label: 'Followed Up', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  not_received: { label: 'Not Received', color: 'bg-gray-100 text-gray-800', icon: AlertTriangle },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle }
};

export default function EnhancedCallFollowUpTrackerPage() {
  const [calls, setCalls] = useState<CallFollowUp[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<CallFollowUp[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [assignedPersons, setAssignedPersons] = useState<AssignedPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isOperatorDialogOpen, setIsOperatorDialogOpen] = useState(false);
  const [isPersonDialogOpen, setIsPersonDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [editingCall, setEditingCall] = useState<CallFollowUp | null>(null);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [editingPerson, setEditingPerson] = useState<AssignedPerson | null>(null);
  const [selectedCallHistory, setSelectedCallHistory] = useState<CallFollowUp | null>(null);
  const [deleteCallId, setDeleteCallId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    callerName: '',
    phoneNumber: '',
    personToContact: '',
    operatorId: '',
    priority: 'medium' as const,
    status: 'call_entered' as const,
    callOutcome: '',
    notes: '',
    followUpDate: '',
    assignedToId: ''
  });

  const [operatorFormData, setOperatorFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });

  const [personFormData, setPersonFormData] = useState({
    name: '',
    department: '',
    phone: '',
    email: ''
  });

  // Enhanced mock data with status history
  useEffect(() => {
    const mockOperators: Operator[] = [
      { id: 'op_001', name: 'Priya Sharma', phone: '+91-9876543210', email: 'priya@omsms.com', isActive: true },
      { id: 'op_002', name: 'Vikram Singh', phone: '+91-9876543211', email: 'vikram@omsms.com', isActive: true },
      { id: 'op_003', name: 'Neha Gupta', phone: '+91-9876543212', email: 'neha@omsms.com', isActive: true }
    ];

    const mockAssignedPersons: AssignedPerson[] = [
      { id: 'person_001', name: 'Raj Kumar', department: 'Sales', phone: '+91-9876543213', email: 'raj@omsms.com', isActive: true },
      { id: 'person_002', name: 'Amit Patel', department: 'Service', phone: '+91-9876543214', email: 'amit@omsms.com', isActive: true },
      { id: 'person_003', name: 'Suresh Mehta', department: 'Installation', phone: '+91-9876543215', email: 'suresh@omsms.com', isActive: true }
    ];

    const mockCalls: CallFollowUp[] = [
      {
        id: 'call_001',
        callerName: 'John Smith',
        phoneNumber: '+91-9876543210',
        personToContact: 'Raj Kumar',
        operatorId: 'op_001',
        operatorName: 'Priya Sharma',
        priority: 'high',
        status: 'active_calls',
        responseTime: 15,
        callOutcome: 'Customer inquiry about installation status',
        notes: 'Customer wants to know when their car will be ready',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        followUpDate: '2024-01-16T10:00:00Z',
        assignedToId: 'person_001',
        assignedToName: 'Raj Kumar',
        statusHistory: [
          {
            id: 'status_001',
            fromStatus: 'call_entered',
            toStatus: 'active_calls',
            changedAt: '2024-01-15T10:30:00Z',
            changedBy: 'Priya Sharma',
            notes: 'Call picked up and customer inquiry noted'
          }
        ]
      },
      {
        id: 'call_002',
        callerName: 'Sarah Johnson',
        phoneNumber: '+91-9876543211',
        personToContact: 'Amit Patel',
        operatorId: 'op_002',
        operatorName: 'Vikram Singh',
        priority: 'medium',
        status: 'pending',
        responseTime: 30,
        callOutcome: 'Service request for audio system',
        notes: 'Customer needs audio system installation',
        createdAt: '2024-01-15T11:00:00Z',
        updatedAt: '2024-01-15T11:00:00Z',
        followUpDate: '2024-01-17T14:00:00Z',
        assignedToId: 'person_002',
        assignedToName: 'Amit Patel',
        statusHistory: [
          {
            id: 'status_002',
            fromStatus: 'call_entered',
            toStatus: 'pending',
            changedAt: '2024-01-15T11:00:00Z',
            changedBy: 'Vikram Singh',
            notes: 'Service request logged, awaiting technician assignment'
          }
        ]
      },
      {
        id: 'call_003',
        callerName: 'Mike Wilson',
        phoneNumber: '+91-9876543212',
        personToContact: 'Neha Gupta',
        operatorId: 'op_001',
        operatorName: 'Priya Sharma',
        priority: 'low',
        status: 'completed',
        responseTime: 5,
        callOutcome: 'Installation completed successfully',
        notes: 'Customer satisfied with the service',
        createdAt: '2024-01-14T15:30:00Z',
        updatedAt: '2024-01-15T09:00:00Z',
        followUpDate: '2024-01-15T10:00:00Z',
        assignedToId: 'person_003',
        assignedToName: 'Suresh Mehta',
        statusHistory: [
          {
            id: 'status_003',
            fromStatus: 'call_entered',
            toStatus: 'active_calls',
            changedAt: '2024-01-14T15:30:00Z',
            changedBy: 'Priya Sharma',
            notes: 'Call received and logged'
          },
          {
            id: 'status_004',
            fromStatus: 'active_calls',
            toStatus: 'completed',
            changedAt: '2024-01-15T09:00:00Z',
            changedBy: 'Neha Gupta',
            notes: 'Installation completed and customer confirmed satisfaction'
          }
        ]
      }
    ];

    setOperators(mockOperators);
    setAssignedPersons(mockAssignedPersons);
    setCalls(mockCalls);
    // Initially filter out completed calls
    setFilteredCalls(mockCalls.filter(call => call.status !== 'completed'));
  }, []);

  // Filter calls
  useEffect(() => {
    let filtered = calls;

    // By default, exclude completed calls from main table unless specifically filtering for them
    if (statusFilter === 'all') {
      filtered = filtered.filter(call => call.status !== 'completed');
    }

    if (searchTerm) {
      filtered = filtered.filter(call =>
        call.callerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.phoneNumber.includes(searchTerm) ||
        call.personToContact.toLowerCase().includes(searchTerm.toLowerCase()) ||
        call.operatorName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(call => call.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(call => call.priority === priorityFilter);
    }

    setFilteredCalls(filtered);
  }, [calls, searchTerm, statusFilter, priorityFilter]);

  // Utility functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatResponseTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  };

  const calculateResponseTime = (createdAt: string, updatedAt: string) => {
    const created = new Date(createdAt);
    const updated = new Date(updatedAt);
    return Math.floor((updated.getTime() - created.getTime()) / (1000 * 60));
  };

  const handlePhoneClick = (phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`, '_self');
  };

  const handleStatusChange = (callId: string, newStatus: string) => {
    const call = calls.find(c => c.id === callId);
    if (!call) return;

    const statusChange: StatusChange = {
      id: `status_${Date.now()}`,
      fromStatus: call.status,
      toStatus: newStatus,
      changedAt: new Date().toISOString(),
      changedBy: 'Current User', // In real app, get from auth
      notes: `Status changed from ${statusConfig[call.status as keyof typeof statusConfig].label} to ${statusConfig[newStatus as keyof typeof statusConfig].label}`
    };

    const updatedCall: CallFollowUp = {
      ...call,
      status: newStatus as any,
      updatedAt: new Date().toISOString(),
      responseTime: calculateResponseTime(call.createdAt, new Date().toISOString()),
      statusHistory: [...call.statusHistory, statusChange]
    };

    setCalls(calls.map(c => c.id === callId ? updatedCall : c));
    
    // If status changed to completed, show success message
    if (newStatus === 'completed') {
      toast.success(`Call completed! It has been moved to the completed section.`);
    } else {
      toast.success(`Status updated to ${statusConfig[newStatus as keyof typeof statusConfig].label}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingCall) {
        // Update existing call
        const updatedCalls = calls.map(call =>
          call.id === editingCall.id
            ? { 
                ...call, 
                ...formData, 
                updatedAt: new Date().toISOString(),
                responseTime: calculateResponseTime(call.createdAt, new Date().toISOString())
              }
            : call
        );
        setCalls(updatedCalls);
        toast.success('Call follow-up updated successfully');
      } else {
        // Create new call
        const newCall: CallFollowUp = {
          id: `call_${Date.now()}`,
          ...formData,
          operatorName: operators.find(op => op.id === formData.operatorId)?.name || 'Unknown',
          assignedToName: assignedPersons.find(person => person.id === formData.assignedToId)?.name || '',
          responseTime: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          statusHistory: [{
            id: `status_${Date.now()}`,
            fromStatus: '',
            toStatus: formData.status,
            changedAt: new Date().toISOString(),
            changedBy: 'Current User',
            notes: 'Initial call entry'
          }]
        };
        setCalls([newCall, ...calls]);
        toast.success('Call follow-up created successfully');
      }

      setIsDialogOpen(false);
      setEditingCall(null);
      resetForm();
    } catch (error) {
      toast.error('Failed to save call follow-up');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (call: CallFollowUp) => {
    setEditingCall(call);
    setFormData({
      callerName: call.callerName,
      phoneNumber: call.phoneNumber,
      personToContact: call.personToContact,
      operatorId: call.operatorId,
      priority: call.priority,
      status: call.status,
      callOutcome: call.callOutcome,
      notes: call.notes,
      followUpDate: call.followUpDate || '',
      assignedToId: call.assignedToId || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (callId: string) => {
    setCalls(calls.filter(call => call.id !== callId));
    toast.success('Call follow-up deleted successfully');
    setIsDeleteDialogOpen(false);
    setDeleteCallId(null);
  };

  const handleViewHistory = (call: CallFollowUp) => {
    setSelectedCallHistory(call);
    setIsHistoryDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      callerName: '',
      phoneNumber: '',
      personToContact: '',
      operatorId: '',
      priority: 'medium',
      status: 'call_entered',
      callOutcome: '',
      notes: '',
      followUpDate: '',
      assignedToId: ''
    });
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingCall(null);
    resetForm();
  };

  const handleExport = () => {
    const csvContent = [
      ['Caller Name', 'Phone', 'Contact Person', 'Operator', 'Priority', 'Status', 'Response Time', 'Created', 'Notes'],
      ...filteredCalls.map(call => [
        call.callerName,
        call.phoneNumber,
        call.personToContact,
        call.operatorName,
        priorityConfig[call.priority].label,
        statusConfig[call.status].label,
        formatResponseTime(call.responseTime),
        formatDate(call.createdAt),
        call.notes
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-follow-up-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
  };

  // Dashboard statistics
  const stats = {
    activeCalls: calls.filter(call => call.status === 'active_calls').length,
    pending: calls.filter(call => call.status === 'pending').length,
    completed: calls.filter(call => call.status === 'completed').length,
    total: calls.length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Call Follow-Up Tracker</h1>
          <p className="text-muted-foreground">
            Track and manage customer follow-up calls and communications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-8 w-8 text-primary" />
        </div>
      </div>

      {/* Dashboard Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setStatusFilter('active_calls')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.activeCalls}</div>
            <p className="text-xs text-muted-foreground">
              Requiring immediate attention
            </p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setStatusFilter('pending')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting follow-up
            </p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setStatusFilter('completed')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              Successfully resolved
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              All time calls
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Call Follow-Up Management</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOperatorDialogOpen(true)}
              >
                <Users className="mr-2 h-4 w-4" />
                Manage Operators
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsPersonDialogOpen(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Manage Persons
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingCall(null); resetForm(); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Call Follow-Up
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCall ? 'Edit Call Follow-Up' : 'Add New Call Follow Up'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingCall ? 'Update call follow-up details' : 'Add a new call follow-up entry'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="callerName">Caller Name *</Label>
                        <Input
                          id="callerName"
                          value={formData.callerName}
                          onChange={(e) => setFormData({ ...formData, callerName: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number *</Label>
                        <Input
                          id="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="personToContact">Person to Contact *</Label>
                        <Input
                          id="personToContact"
                          value={formData.personToContact}
                          onChange={(e) => setFormData({ ...formData, personToContact: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="operatorId">Operator *</Label>
                        <div className="flex gap-2">
                          <Select
                            value={formData.operatorId}
                            onValueChange={(value) => setFormData({ ...formData, operatorId: value })}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select an operator..." />
                            </SelectTrigger>
                            <SelectContent>
                              {operators.map(operator => (
                                <SelectItem key={operator.id} value={operator.id}>
                                  {operator.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                            onClick={() => setIsOperatorDialogOpen(true)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                          value={formData.priority}
                          onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="call_entered">Call Entered</SelectItem>
                            <SelectItem value="active_calls">Active Calls</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="followed_up">Followed Up</SelectItem>
                            <SelectItem value="not_received">Not Received</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assignedToId">Assigned To *</Label>
                      <div className="flex gap-2">
                        <Select
                          value={formData.assignedToId}
                          onValueChange={(value) => setFormData({ ...formData, assignedToId: value })}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select assigned person..." />
                          </SelectTrigger>
                          <SelectContent>
                            {assignedPersons.map(person => (
                              <SelectItem key={person.id} value={person.id}>
                                {person.name} ({person.department})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                          onClick={() => setIsPersonDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="callOutcome">Call Outcome</Label>
                      <Textarea
                        id="callOutcome"
                        value={formData.callOutcome}
                        onChange={(e) => setFormData({ ...formData, callOutcome: e.target.value })}
                        placeholder="Describe the call outcome..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes *</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes..."
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="followUpDate">Follow-up Date</Label>
                      <Input
                        id="followUpDate"
                        type="datetime-local"
                        value={formData.followUpDate}
                        onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={handleDialogClose}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          editingCall ? 'Update' : 'Add Call Follow Up'
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Bar */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search calls..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="call_entered">Call Entered</SelectItem>
                <SelectItem value="active_calls">Active Calls</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="followed_up">Followed Up</SelectItem>
                <SelectItem value="not_received">Not Received</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          {/* Calls Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caller</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Response Time</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.map((call) => (
                  <TableRow key={call.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <div className="font-medium">{call.callerName}</div>
                        <Button
                          variant="link"
                          className="p-0 h-auto text-blue-600 hover:text-blue-800"
                          onClick={() => handlePhoneClick(call.phoneNumber)}
                        >
                          {call.phoneNumber}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{call.personToContact}</TableCell>
                    <TableCell>{call.operatorName}</TableCell>
                    <TableCell>
                      <Badge className={priorityConfig[call.priority].color}>
                        {priorityConfig[call.priority].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={call.status}
                        onValueChange={(value) => handleStatusChange(call.id, value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call_entered">Call Entered</SelectItem>
                          <SelectItem value="active_calls">Active Calls</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="followed_up">Followed Up</SelectItem>
                          <SelectItem value="not_received">Not Received</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <span className={call.responseTime > 60 ? 'text-red-600 font-medium' : call.responseTime > 30 ? 'text-yellow-600' : 'text-green-600'}>
                        {formatResponseTime(call.responseTime)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={call.notes}>
                        {call.notes}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(call.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewHistory(call)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(call)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDeleteCallId(call.id);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Status History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Call Status History</DialogTitle>
            <DialogDescription>
              Complete status change history for {selectedCallHistory?.callerName}
            </DialogDescription>
          </DialogHeader>
          {selectedCallHistory && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Caller</Label>
                  <div className="text-sm">{selectedCallHistory.callerName}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Phone</Label>
                  <div className="text-sm">{selectedCallHistory.phoneNumber}</div>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Status Changes</Label>
                {selectedCallHistory.statusHistory.map((change, index) => (
                  <div key={change.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {change.fromStatus ? `${change.fromStatus} → ${change.toStatus}` : change.toStatus}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(change.changedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm">
                      <div><strong>Changed by:</strong> {change.changedBy}</div>
                      {change.notes && (
                        <div><strong>Notes:</strong> {change.notes}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsHistoryDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Operator Management Dialog */}
      <Dialog open={isOperatorDialogOpen} onOpenChange={setIsOperatorDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Operators</DialogTitle>
          </DialogHeader>
          
          {/* Existing Operators */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3">Existing Operators</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {operators.map((operator) => (
                  <div key={operator.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{operator.name}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOperators(operators.filter(op => op.id !== operator.id));
                        toast.success('Operator deleted successfully');
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Operator */}
            <div>
              <h3 className="text-sm font-medium mb-3">Add New Operator</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (operatorFormData.name.trim()) {
                  const newOperator: Operator = {
                    id: `op_${Date.now()}`,
                    name: operatorFormData.name.trim(),
                    phone: '',
                    email: '',
                    isActive: true
                  };
                  setOperators([...operators, newOperator]);
                  setOperatorFormData({ name: '', phone: '', email: '' });
                  toast.success('Operator added successfully');
                }
              }} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="operatorName">Operator Name</Label>
                  <Input
                    id="operatorName"
                    value={operatorFormData.name}
                    onChange={(e) => setOperatorFormData({ ...operatorFormData, name: e.target.value })}
                    placeholder="Enter operator name"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsOperatorDialogOpen(false);
                    setOperatorFormData({ name: '', phone: '', email: '' });
                  }} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
                    Add Operator
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assigned Person Management Dialog */}
      <Dialog open={isPersonDialogOpen} onOpenChange={setIsPersonDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Assigned Persons</DialogTitle>
          </DialogHeader>
          
          {/* Existing Assigned Persons */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3">Existing Assigned Persons</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {assignedPersons.map((person) => (
                  <div key={person.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{person.name}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAssignedPersons(assignedPersons.filter(p => p.id !== person.id));
                        toast.success('Assigned person deleted successfully');
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Assigned Person */}
            <div>
              <h3 className="text-sm font-medium mb-3">Add New Assigned Person</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (personFormData.name.trim()) {
                  const newPerson: AssignedPerson = {
                    id: `person_${Date.now()}`,
                    name: personFormData.name.trim(),
                    department: '',
                    phone: '',
                    email: '',
                    isActive: true
                  };
                  setAssignedPersons([...assignedPersons, newPerson]);
                  setPersonFormData({ name: '', department: '', phone: '', email: '' });
                  toast.success('Assigned person added successfully');
                }
              }} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="personName">Person Name</Label>
                  <Input
                    id="personName"
                    value={personFormData.name}
                    onChange={(e) => setPersonFormData({ ...personFormData, name: e.target.value })}
                    placeholder="Enter person name"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsPersonDialogOpen(false);
                    setPersonFormData({ name: '', department: '', phone: '', email: '' });
                  }} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
                    Add Person
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the call follow-up record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCallId && handleDelete(deleteCallId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
