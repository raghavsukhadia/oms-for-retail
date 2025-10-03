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
  Clock, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Settings, 
  ShoppingCart, 
  Clipboard, 
  Phone, 
  CheckCircle,
  Mail,
  User,
  Calendar,
  DollarSign,
  Users,
  Tag,
  Download,
  Loader2,
  FileText,
  Eye
} from "lucide-react";
import { toast } from 'sonner';

interface CustomerRequirement {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  requirementDescription: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'ordered' | 'procedure' | 'contacted' | 'completed';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  statusHistory: StatusChange[];
  attachments?: string[];
  comments?: RequirementComment[];
}

interface RequirementComment {
  id: string;
  text: string;
  createdAt: string;
  createdBy: string;
  attachments?: string[];
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
}

export default function CustomerRequirementsPage() {
  // State management
  const [requirements, setRequirements] = useState<CustomerRequirement[]>([]);
  const [filteredRequirements, setFilteredRequirements] = useState<CustomerRequirement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<CustomerRequirement | null>(null);
  const [selectedRequirementHistory, setSelectedRequirementHistory] = useState<CustomerRequirement | null>(null);
  const [deleteRequirementId, setDeleteRequirementId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isTeamMemberDialogOpen, setIsTeamMemberDialogOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    requirementDescription: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'pending' as 'pending' | 'in_progress' | 'ordered' | 'procedure' | 'contacted' | 'completed'
  });

  // Attachments and Comments state
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [selectedRequirementForAttachments, setSelectedRequirementForAttachments] = useState<CustomerRequirement | null>(null);
  const [selectedRequirementForComments, setSelectedRequirementForComments] = useState<CustomerRequirement | null>(null);
  const [isAttachmentsDialogOpen, setIsAttachmentsDialogOpen] = useState(false);
  const [isCommentsDialogOpen, setIsCommentsDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentFiles, setCommentFiles] = useState<FileList | null>(null);

  const [teamMemberFormData, setTeamMemberFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    role: ''
  });

  // Mock data
  useEffect(() => {
    const mockRequirements: CustomerRequirement[] = [
      {
        id: 'req_001',
        customerName: 'John Smith',
        customerPhone: '+91-9876543210',
        customerEmail: 'john@example.com',
        requirementDescription: 'Premium Audio System Installation',
        priority: 'high',
        status: 'in_progress',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T14:30:00Z',
        statusHistory: [
          {
            id: 'status_001',
            fromStatus: 'pending',
            toStatus: 'in_progress',
            changedAt: '2024-01-15T14:30:00Z',
            changedBy: 'Raj Kumar',
            notes: 'Started working on requirement'
          }
        ],
        attachments: ['audio_system_specs.pdf', 'installation_guide.pdf'],
        comments: [
          {
            id: 'comment_001',
            text: 'Customer wants premium sound quality with subwoofer',
            createdAt: '2024-01-15T10:30:00Z',
            createdBy: 'John Smith',
            attachments: ['customer_preferences.pdf']
          }
        ]
      },
      {
        id: 'req_002',
        customerName: 'Sarah Johnson',
        customerPhone: '+91-9876543211',
        customerEmail: 'sarah@example.com',
        requirementDescription: 'LED Lighting System Upgrade',
        priority: 'medium',
        status: 'ordered',
        createdAt: '2024-01-15T11:00:00Z',
        updatedAt: '2024-01-15T16:00:00Z',
        statusHistory: [
          {
            id: 'status_002',
            fromStatus: 'pending',
            toStatus: 'in_progress',
            changedAt: '2024-01-15T11:00:00Z',
            changedBy: 'Amit Patel',
            notes: 'Requirement assigned'
          },
          {
            id: 'status_003',
            fromStatus: 'in_progress',
            toStatus: 'ordered',
            changedAt: '2024-01-15T16:00:00Z',
            changedBy: 'Amit Patel',
            notes: 'Materials ordered'
          }
        ],
        attachments: ['led_specifications.pdf'],
        comments: [
          {
            id: 'comment_002',
            text: 'Energy efficient LED installation required',
            createdAt: '2024-01-15T12:00:00Z',
            createdBy: 'Sarah Johnson'
          }
        ]
      },
      {
        id: 'req_003',
        customerName: 'Mike Wilson',
        customerPhone: '+91-9876543212',
        customerEmail: 'mike@example.com',
        requirementDescription: 'Safety Equipment Installation',
        priority: 'high',
        status: 'completed',
        createdAt: '2024-01-15T09:00:00Z',
        updatedAt: '2024-01-18T14:00:00Z',
        completedAt: '2024-01-18T14:00:00Z',
        statusHistory: [
          {
            id: 'status_004',
            fromStatus: 'pending',
            toStatus: 'in_progress',
            changedAt: '2024-01-15T09:00:00Z',
            changedBy: 'Priya Sharma',
            notes: 'Started installation'
          },
          {
            id: 'status_005',
            fromStatus: 'in_progress',
            toStatus: 'completed',
            changedAt: '2024-01-18T14:00:00Z',
            changedBy: 'Priya Sharma',
            notes: 'Installation completed successfully'
          }
        ],
        attachments: ['safety_equipment_list.pdf', 'installation_photos.jpg'],
        comments: [
          {
            id: 'comment_003',
            text: 'Installation completed successfully',
            createdAt: '2024-01-18T14:00:00Z',
            createdBy: 'Mike Wilson',
            attachments: ['completion_certificate.pdf']
          }
        ]
      }
    ];

    const mockTeamMembers: TeamMember[] = [
      {
        id: 'team_001',
        name: 'Raj Kumar',
        email: 'raj@company.com',
        phone: '+91-9876543201',
        department: 'Installation',
        role: 'Senior Technician'
      },
      {
        id: 'team_002',
        name: 'Amit Patel',
        email: 'amit@company.com',
        phone: '+91-9876543202',
        department: 'Installation',
        role: 'Technician'
      },
      {
        id: 'team_003',
        name: 'Priya Sharma',
        email: 'priya@company.com',
        phone: '+91-9876543203',
        department: 'Safety',
        role: 'Safety Specialist'
      }
    ];

    setRequirements(mockRequirements);
    setFilteredRequirements(mockRequirements);
    setTeamMembers(mockTeamMembers);
  }, []);

  // Filter requirements
  useEffect(() => {
    let filtered = requirements.filter(req => req.status !== 'completed');

    if (searchTerm) {
      filtered = filtered.filter(req =>
        req.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.requirementDescription.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(req => req.priority === priorityFilter);
    }

    setFilteredRequirements(filtered);
  }, [requirements, searchTerm, statusFilter, priorityFilter]);

  // Dashboard statistics
  const getStatusCount = (status: string) => {
    return requirements.filter(req => req.status === status).length;
  };


  // Utility functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string, timeString: string) => {
    const date = new Date(`${dateString}T${timeString}`);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      ordered: 'bg-purple-100 text-purple-800',
      procedure: 'bg-orange-100 text-orange-800',
      contacted: 'bg-gray-100 text-gray-800',
      completed: 'bg-green-100 text-green-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Form handlers
  const resetForm = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      requirementDescription: '',
      priority: 'medium',
      status: 'pending'
    });
    setSelectedFiles(null);
    setEditingRequirement(null);
  };

  const handleEdit = (requirement: CustomerRequirement) => {
    setFormData({
      customerName: requirement.customerName,
      customerPhone: requirement.customerPhone,
      requirementDescription: requirement.requirementDescription,
      priority: requirement.priority,
      status: requirement.status
    });
    setEditingRequirement(requirement);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingRequirement) {
      // Update existing requirement
      const updatedRequirements = requirements.map(req =>
        req.id === editingRequirement.id
          ? {
              ...req,
              ...formData,
              updatedAt: new Date().toISOString(),
              completedAt: formData.status === 'completed' ? new Date().toISOString() : undefined
            }
          : req
      );
      setRequirements(updatedRequirements);
      toast.success('Requirement updated successfully');
    } else {
      // Create new requirement
      const newRequirement: CustomerRequirement = {
        id: `req_${Date.now()}`,
        ...formData,
        customerEmail: '', // Default empty
        category: 'General', // Default category
        categoryId: 'general',
        assignedTo: 'Unassigned', // Default assignment
        assignedToId: 'unassigned',
        progress: 0, // Default progress
        estimatedCost: 0, // Default cost
        actualCost: 0,
        targetDate: new Date().toISOString().split('T')[0], // Default to today
        targetTime: '09:00', // Default time
        attachments: selectedFiles ? Array.from(selectedFiles).map(f => f.name) : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        statusHistory: []
      };
      setRequirements([...requirements, newRequirement]);
      toast.success('Requirement created successfully');
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setRequirements(requirements.filter(req => req.id !== id));
    toast.success('Requirement deleted successfully');
    setIsDeleteDialogOpen(false);
    setDeleteRequirementId(null);
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    const updatedRequirements = requirements.map(req => {
      if (req.id === id) {
        const statusChange: StatusChange = {
          id: `status_${Date.now()}`,
          fromStatus: req.status,
          toStatus: newStatus,
          changedAt: new Date().toISOString(),
          changedBy: 'Current User',
          notes: `Status changed to ${newStatus}`
        };

        return {
          ...req,
          status: newStatus as any,
          updatedAt: new Date().toISOString(),
          completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
          statusHistory: [...req.statusHistory, statusChange]
        };
      }
      return req;
    });
    setRequirements(updatedRequirements);
    toast.success('Status updated successfully');
  };

  const handleViewHistory = (requirement: CustomerRequirement) => {
    setSelectedRequirementHistory(requirement);
    setIsHistoryDialogOpen(true);
  };

  const handleExport = () => {
    const csvContent = [
      ['Customer', 'Requirement', 'Status', 'Priority'],
      ...filteredRequirements.map(req => [
        req.customerName,
        req.requirementDescription,
        req.status,
        req.priority
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer-requirements.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Requirements exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Requirements Tracker</h1>
          <p className="text-muted-foreground">
            Track customer requirements, requests, and project specifications
          </p>
        </div>
      </div>

      {/* Dashboard Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('pending')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{getStatusCount('pending')}</div>
            <p className="text-xs text-muted-foreground">Awaiting assignment</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('in_progress')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Settings className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{getStatusCount('in_progress')}</div>
            <p className="text-xs text-muted-foreground">Currently being worked on</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('ordered')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ordered</CardTitle>
            <ShoppingCart className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{getStatusCount('ordered')}</div>
            <p className="text-xs text-muted-foreground">Materials ordered</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('procedure')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Procedure</CardTitle>
            <Clipboard className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{getStatusCount('procedure')}</div>
            <p className="text-xs text-muted-foreground">Following procedures</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('contacted')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contacted</CardTitle>
            <Phone className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{getStatusCount('contacted')}</div>
            <p className="text-xs text-muted-foreground">Customer contacted</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('completed')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{getStatusCount('completed')}</div>
            <p className="text-xs text-muted-foreground">Successfully completed</p>
          </CardContent>
        </Card>
      </div>


      {/* Customer Requirements Management */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Requirements Management</CardTitle>
          <CardDescription>
            Manage customer requirements with simplified tracking and file attachments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search requirements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="procedure">Procedure</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              New Requirement
            </Button>
          </div>

          {/* Requirements Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Requirement</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attachments</TableHead>
                  <TableHead>Comments</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequirements.map((requirement) => (
                  <TableRow key={requirement.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{requirement.customerName}</div>
                        <div className="flex items-center gap-2">
                          <a 
                            href={`tel:${requirement.customerPhone}`}
                            className="text-blue-600 hover:text-blue-800 underline text-sm"
                          >
                            {requirement.customerPhone}
                          </a>
                          {requirement.customerEmail && (
                            <a 
                              href={`mailto:${requirement.customerEmail}`}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Mail className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={requirement.requirementDescription}>
                        {requirement.requirementDescription}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(requirement.priority)}>
                        {requirement.priority.charAt(0).toUpperCase() + requirement.priority.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={requirement.status}
                        onValueChange={(value) => handleStatusChange(requirement.id, value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="ordered">Ordered</SelectItem>
                          <SelectItem value="procedure">Procedure</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequirementForAttachments(requirement);
                            setIsAttachmentsDialogOpen(true);
                          }}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          {requirement.attachments?.length || 0}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRequirementForComments(requirement);
                            setIsCommentsDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {requirement.comments?.length || 0}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewHistory(requirement)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(requirement)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDeleteRequirementId(requirement.id);
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

      {/* Completed Requirements Section */}
      {requirements.filter(req => req.status === 'completed').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Completed Requirements
            </CardTitle>
            <CardDescription>
              Successfully completed customer requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Requirement</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Completed Date</TableHead>
                    <TableHead>Attachments</TableHead>
                    <TableHead>Comments</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requirements.filter(req => req.status === 'completed').map((requirement) => (
                    <TableRow key={requirement.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{requirement.customerName}</div>
                          <div className="flex items-center gap-2">
                            <a 
                              href={`tel:${requirement.customerPhone}`}
                              className="text-blue-600 hover:text-blue-800 underline text-sm"
                            >
                              {requirement.customerPhone}
                            </a>
                            {requirement.customerEmail && (
                              <a 
                                href={`mailto:${requirement.customerEmail}`}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Mail className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={requirement.requirementDescription}>
                          {requirement.requirementDescription}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(requirement.priority)}>
                          {requirement.priority.charAt(0).toUpperCase() + requirement.priority.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{formatDate(requirement.completedAt || requirement.updatedAt)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRequirementForAttachments(requirement);
                              setIsAttachmentsDialogOpen(true);
                            }}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            {requirement.attachments?.length || 0}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRequirementForComments(requirement);
                              setIsCommentsDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {requirement.comments?.length || 0}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewHistory(requirement)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(requirement)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDeleteRequirementId(requirement.id);
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
      )}

      {/* Create/Edit Requirement Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRequirement ? 'Edit Requirement' : 'Add New Requirement'}
            </DialogTitle>
            <DialogDescription>
              {editingRequirement ? 'Update requirement details' : 'Create a new customer requirement'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Customer Phone *</Label>
                <Input
                  id="customerPhone"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="requirementDescription">Requirement Description *</Label>
              <Textarea
                id="requirementDescription"
                value={formData.requirementDescription}
                onChange={(e) => setFormData({ ...formData, requirementDescription: e.target.value })}
                required
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: 'low' | 'medium' | 'high') => setFormData({ ...formData, priority: value })}
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
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="ordered">Ordered</SelectItem>
                    <SelectItem value="procedure">Procedure</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Attachments Section */}
            <div className="space-y-2">
              <Label htmlFor="attachments">Attachments</Label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('pdf-upload')?.click()}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    PDF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    JPEG
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('video-upload')?.click()}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Video
                  </Button>
                </div>
                
                {/* Hidden file inputs */}
                <input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => setSelectedFiles(e.target.files)}
                />
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => setSelectedFiles(e.target.files)}
                />
                <input
                  id="video-upload"
                  type="file"
                  accept="video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => setSelectedFiles(e.target.files)}
                />
                
                {/* Display selected files */}
                {selectedFiles && selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Selected files:</p>
                    <div className="space-y-1">
                      {Array.from(selectedFiles).map((file, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="truncate">{file.name}</span>
                          <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingRequirement ? 'Update Requirement' : 'Add Requirement'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Status History Modal */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Status History</DialogTitle>
            <DialogDescription>
              {selectedRequirementHistory && (
                <>
                  <span>Requirement: {selectedRequirementHistory.requirementDescription}</span>
                  <br />
                  <span>Customer: {selectedRequirementHistory.customerName}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedRequirementHistory && (
            <div className="space-y-4">
              {selectedRequirementHistory.statusHistory.length > 0 ? (
                <div className="space-y-3">
                  {selectedRequirementHistory.statusHistory.map((change) => (
                    <div key={change.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                        <div>
                          <div className="font-medium">
                            {change.fromStatus.charAt(0).toUpperCase() + change.fromStatus.slice(1)} → {change.toStatus.charAt(0).toUpperCase() + change.toStatus.slice(1)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDateTime(change.changedAt, '00:00')} by {change.changedBy}
                          </div>
                          {change.notes && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {change.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No status changes yet</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsHistoryDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attachments Dialog */}
      <Dialog open={isAttachmentsDialogOpen} onOpenChange={setIsAttachmentsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Attachments</DialogTitle>
            <DialogDescription>
              {selectedRequirementForAttachments && (
                <>
                  <span>Requirement: {selectedRequirementForAttachments.requirementDescription}</span>
                  <br />
                  <span>Customer: {selectedRequirementForAttachments.customerName}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedRequirementForAttachments && (
            <div className="space-y-4">
              {selectedRequirementForAttachments.attachments && selectedRequirementForAttachments.attachments.length > 0 ? (
                <div className="space-y-3">
                  {selectedRequirementForAttachments.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium">{attachment}</div>
                          <div className="text-sm text-muted-foreground">PDF Document</div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://via.placeholder.com/800x600/0066cc/ffffff?text=${attachment}`, '_blank')}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No attachments yet</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsAttachmentsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comments Dialog */}
      <Dialog open={isCommentsDialogOpen} onOpenChange={setIsCommentsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comments & Attachments</DialogTitle>
            <DialogDescription>
              {selectedRequirementForComments && (
                <>
                  <span>Requirement: {selectedRequirementForComments.requirementDescription}</span>
                  <br />
                  <span>Customer: {selectedRequirementForComments.customerName}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedRequirementForComments && (
            <div className="space-y-4">
              {/* Existing Comments */}
              {selectedRequirementForComments.comments && selectedRequirementForComments.comments.length > 0 ? (
                <div className="space-y-3">
                  {selectedRequirementForComments.comments.map((comment) => (
                    <div key={comment.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-medium">{comment.createdBy}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <p className="text-sm mb-2">{comment.text}</p>
                      {comment.attachments && comment.attachments.length > 0 && (
                        <div className="space-y-1">
                          {comment.attachments.map((attachment, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm text-blue-600">
                              <FileText className="h-4 w-4" />
                              <span>{attachment}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No comments yet</p>
                </div>
              )}

              {/* Add New Comment */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Add Comment</h4>
                <div className="space-y-3">
                  <Textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('comment-file-upload')?.click()}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Attach Files
                    </Button>
                    <input
                      id="comment-file-upload"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => setCommentFiles(e.target.files)}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (newComment.trim()) {
                          const newCommentObj: RequirementComment = {
                            id: `comment_${Date.now()}`,
                            text: newComment,
                            createdAt: new Date().toISOString(),
                            createdBy: 'Current User',
                            attachments: commentFiles ? Array.from(commentFiles).map(f => f.name) : []
                          };
                          
                          const updatedRequirements = requirements.map(req =>
                            req.id === selectedRequirementForComments.id
                              ? { ...req, comments: [...(req.comments || []), newCommentObj] }
                              : req
                          );
                          setRequirements(updatedRequirements);
                          
                          setNewComment('');
                          setCommentFiles(null);
                          toast.success('Comment added successfully');
                        }
                      }}
                    >
                      Add Comment
                    </Button>
                  </div>
                  {commentFiles && commentFiles.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Selected files:</p>
                      {Array.from(commentFiles).map((file, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="truncate">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsCommentsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the requirement record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRequirementId && handleDelete(deleteRequirementId)}
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
