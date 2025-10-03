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
  Wrench, 
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
  History,
  Car,
  Phone,
  Paperclip,
  MessageCircle,
  X,
  Send,
  Building,
  Eye,
  DollarSign
} from "lucide-react";
import { toast } from 'sonner';

interface ServiceJob {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  vehicleModel: string;
  vehicleRegistration: string;
  serviceType: string;
  serviceTypeId: string;
  technicianId: string;
  technicianName: string;
  priority: 'low' | 'medium' | 'high';
  status: 'new_complaint' | 'under_inspection' | 'sent_to_service_centre' | 'received' | 'completed';
  estimatedCost: number;
  actualCost?: number;
  scheduledDate: string;
  scheduledTime: string;
  notes?: string;
  attachments: string[];
  comments: {
    id: string;
    author: string;
    message: string;
    timestamp: string;
    type: 'comment' | 'status_update' | 'attachment_added';
    attachments?: string[]; // Comment-specific attachments
  }[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
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

interface Technician {
  id: string;
  name: string;
  specialization: string;
  phone: string;
  email: string;
  isActive: boolean;
  workload: number;
}

interface ServiceType {
  id: string;
  name: string;
  category: string;
  baseCost: number;
  estimatedDuration: number; // in hours
  description: string;
  isActive: boolean;
}

const priorityConfig = {
  low: { label: 'Low', color: 'bg-green-100 text-green-800' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'High', color: 'bg-red-100 text-red-800' }
};

const statusConfig = {
  new_complaint: { label: 'New Complaint', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  under_inspection: { label: 'Under Inspection', color: 'bg-yellow-100 text-yellow-800', icon: Eye },
  sent_to_service_centre: { label: 'Sent to Service Centre', color: 'bg-blue-100 text-blue-800', icon: Building },
  received: { label: 'Received', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle }
};

export default function ServiceTrackerPage() {
  const [serviceJobs, setServiceJobs] = useState<ServiceJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<ServiceJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<ServiceJob | null>(null);
  const [selectedJobHistory, setSelectedJobHistory] = useState<ServiceJob | null>(null);
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedJobAttachments, setSelectedJobAttachments] = useState<ServiceJob | null>(null);
  const [isAttachmentsDialogOpen, setIsAttachmentsDialogOpen] = useState(false);
  const [selectedJobComments, setSelectedJobComments] = useState<ServiceJob | null>(null);
  const [isCommentsDialogOpen, setIsCommentsDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    vehicleModel: '',
    vehicleRegistration: '',
    priority: 'medium' as const,
    status: 'new_complaint' as const,
    scheduledDate: '',
    notes: '',
    attachments: [] as string[]
  });


  // Enhanced mock data
  useEffect(() => {
    const mockServiceJobs: ServiceJob[] = [
      {
        id: 'job_001',
        customerName: 'John Smith',
        customerPhone: '+91-9876543210',
        customerEmail: 'john@example.com',
        vehicleModel: 'Swift',
        vehicleRegistration: 'MH12AB1234',
        serviceType: 'Audio System Repair',
        serviceTypeId: 'service_001',
        technicianId: 'tech_001',
        technicianName: 'Raj Kumar',
        priority: 'high',
        status: 'under_inspection',
        estimatedCost: 5000,
        actualCost: 4500,
        scheduledDate: '2024-01-16',
        scheduledTime: '10:00',
        notes: 'Customer reported audio system not working properly',
        attachments: ['audio_diagnosis.pdf', 'before_photo.jpg', 'photos_1758198823126.jpeg'],
        comments: [
          {
            id: 'comment_001',
            author: 'Raj Kumar',
            message: 'Initial inspection completed. Found loose wiring connection.',
            timestamp: '2024-01-15T14:30:00Z',
            type: 'comment',
            attachments: ['wiring_diagram.pdf', 'inspection_photo.jpg']
          }
        ],
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T14:30:00Z',
        statusHistory: [
          {
            id: 'status_001',
            fromStatus: 'new_complaint',
            toStatus: 'under_inspection',
            changedAt: '2024-01-15T14:30:00Z',
            changedBy: 'Raj Kumar',
            notes: 'Job assigned and inspection started'
          }
        ]
      },
      {
        id: 'job_002',
        customerName: 'Sarah Johnson',
        customerPhone: '+91-9876543211',
        customerEmail: 'sarah@example.com',
        vehicleModel: 'Honda City',
        vehicleRegistration: 'MH13CD5678',
        serviceType: 'Engine Diagnostic',
        serviceTypeId: 'service_002',
        technicianId: 'tech_002',
        technicianName: 'Amit Patel',
        priority: 'medium',
        status: 'sent_to_service_centre',
        estimatedCost: 3000,
        actualCost: 3200,
        scheduledDate: '2024-01-17',
        scheduledTime: '14:00',
        notes: 'Engine making unusual noise, needs diagnostic',
        attachments: ['engine_noise.mp3'],
        comments: [
          {
            id: 'comment_002',
            author: 'Amit Patel',
            message: 'Engine diagnostic completed. Found timing belt issue.',
            timestamp: '2024-01-15T16:00:00Z',
            type: 'comment',
            attachments: ['engine_report.pdf']
          }
        ],
        createdAt: '2024-01-15T11:00:00Z',
        updatedAt: '2024-01-15T16:00:00Z',
        statusHistory: [
          {
            id: 'status_002',
            fromStatus: 'new_complaint',
            toStatus: 'under_inspection',
            changedAt: '2024-01-15T11:00:00Z',
            changedBy: 'Amit Patel',
            notes: 'Job assigned for diagnostic'
          },
          {
            id: 'status_003',
            fromStatus: 'under_inspection',
            toStatus: 'sent_to_service_centre',
            changedAt: '2024-01-15T16:00:00Z',
            changedBy: 'Amit Patel',
            notes: 'Diagnostic complete, sent to service centre for repair'
          }
        ]
      },
      {
        id: 'job_003',
        customerName: 'Mike Wilson',
        customerPhone: '+91-9876543212',
        customerEmail: 'mike@example.com',
        vehicleModel: 'Toyota Innova',
        vehicleRegistration: 'MH14EF9012',
        serviceType: 'AC Service',
        serviceTypeId: 'service_004',
        technicianId: 'tech_003',
        technicianName: 'Suresh Mehta',
        priority: 'low',
        status: 'completed',
        estimatedCost: 2000,
        actualCost: 1800,
        scheduledDate: '2024-01-15',
        scheduledTime: '09:00',
        notes: 'AC not cooling properly',
        attachments: ['ac_before.jpg', 'ac_after.jpg'],
        comments: [
          {
            id: 'comment_003',
            author: 'Suresh Mehta',
            message: 'AC service completed successfully. Customer satisfied.',
            timestamp: '2024-01-15T12:00:00Z',
            type: 'comment'
          }
        ],
        createdAt: '2024-01-15T08:00:00Z',
        updatedAt: '2024-01-15T12:00:00Z',
        completedAt: '2024-01-15T12:00:00Z',
        statusHistory: [
          {
            id: 'status_004',
            fromStatus: 'new_complaint',
            toStatus: 'under_inspection',
            changedAt: '2024-01-15T08:00:00Z',
            changedBy: 'Suresh Mehta',
            notes: 'Job assigned for AC service'
          },
          {
            id: 'status_005',
            fromStatus: 'under_inspection',
            toStatus: 'completed',
            changedAt: '2024-01-15T12:00:00Z',
            changedBy: 'Suresh Mehta',
            notes: 'AC service completed successfully'
          }
        ]
      }
    ];

    setServiceJobs(mockServiceJobs);
    // Initially filter out completed jobs
    setFilteredJobs(mockServiceJobs.filter(job => job.status !== 'completed'));
  }, []);

  // Filter service jobs
  useEffect(() => {
    let filtered = serviceJobs;

    // By default, exclude completed jobs from main table unless specifically filtering for them
    if (statusFilter === 'all') {
      filtered = filtered.filter(job => job.status !== 'completed');
    }

    if (searchTerm) {
      filtered = filtered.filter(job =>
        job.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.customerPhone.includes(searchTerm) ||
        job.vehicleModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.vehicleRegistration.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.technicianName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(job => job.priority === priorityFilter);
    }

    setFilteredJobs(filtered);
  }, [serviceJobs, searchTerm, statusFilter, priorityFilter]);

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

  const formatCost = (estimated: number, actual?: number) => {
    if (actual && actual > 0) {
      return `₹${estimated} Actual: ₹${actual}`;
    }
    return `₹${estimated}`;
  };

  const formatScheduledDateTime = (date: string, time: string) => {
    const scheduledDateTime = new Date(`${date}T${time}`);
    return scheduledDateTime.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePhoneClick = (phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`, '_self');
  };

  const handleStatusChange = (jobId: string, newStatus: string) => {
    const job = serviceJobs.find(j => j.id === jobId);
    if (!job) return;

    const statusChange: StatusChange = {
      id: `status_${Date.now()}`,
      fromStatus: job.status,
      toStatus: newStatus,
      changedAt: new Date().toISOString(),
      changedBy: 'Current User', // In real app, get from auth
      notes: `Status changed from ${statusConfig[job.status as keyof typeof statusConfig].label} to ${statusConfig[newStatus as keyof typeof statusConfig].label}`
    };

    const updatedJob: ServiceJob = {
      ...job,
      status: newStatus as any,
      updatedAt: new Date().toISOString(),
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
      statusHistory: [...job.statusHistory, statusChange]
    };

    setServiceJobs(serviceJobs.map(j => j.id === jobId ? updatedJob : j));
    
    // If status changed to completed, show success message
    if (newStatus === 'completed') {
      toast.success(`Service job completed! It has been moved to the completed section.`);
    } else {
      toast.success(`Status updated to ${statusConfig[newStatus as keyof typeof statusConfig].label}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingJob) {
        // Update existing job
        const updatedJobs = serviceJobs.map(job =>
          job.id === editingJob.id
            ? { 
                ...job, 
                ...formData,
                updatedAt: new Date().toISOString()
              }
            : job
        );
        setServiceJobs(updatedJobs);
        toast.success('Service job updated successfully');
      } else {
        // Create new job
        const newJob: ServiceJob = {
          id: `job_${Date.now()}`,
          ...formData,
          serviceType: 'General Service',
          serviceTypeId: 'general',
          technicianId: 'unassigned',
          technicianName: 'Unassigned',
          estimatedCost: 0,
          actualCost: 0,
          scheduledTime: '',
          attachments: formData.attachments,
          comments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          statusHistory: [{
            id: `status_${Date.now()}`,
            fromStatus: '',
            toStatus: formData.status,
            changedAt: new Date().toISOString(),
            changedBy: 'Current User',
            notes: 'Initial service job entry'
          }]
        };
        setServiceJobs([newJob, ...serviceJobs]);
        toast.success('Service job created successfully');
      }

      setIsDialogOpen(false);
      setEditingJob(null);
      resetForm();
    } catch (error) {
      toast.error('Failed to save service job');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (job: ServiceJob) => {
    setEditingJob(job);
    setFormData({
      customerName: job.customerName,
      customerPhone: job.customerPhone,
      customerEmail: job.customerEmail || '',
      vehicleModel: job.vehicleModel,
      vehicleRegistration: job.vehicleRegistration,
      priority: job.priority,
      status: job.status,
      scheduledDate: job.scheduledDate || '',
      notes: job.notes || '',
      attachments: job.attachments || []
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (jobId: string) => {
    setServiceJobs(serviceJobs.filter(job => job.id !== jobId));
    toast.success('Service job deleted successfully');
    setIsDeleteDialogOpen(false);
    setDeleteJobId(null);
  };

  const handleViewHistory = (job: ServiceJob) => {
    setSelectedJobHistory(job);
    setIsHistoryDialogOpen(true);
  };

  const handleViewAttachments = (job: ServiceJob) => {
    console.log('Opening attachments for job:', job);
    console.log('Job attachments:', job.attachments);
    setSelectedJobAttachments(job);
    setIsAttachmentsDialogOpen(true);
  };

  const handleViewComments = (job: ServiceJob) => {
    console.log('Opening comments for job:', job);
    console.log('Job comments:', job.comments);
    setSelectedJobComments(job);
    setIsCommentsDialogOpen(true);
    // Clear previous form data
    setNewComment('');
    setSelectedFiles(null);
  };

  const handleViewFile = (fileName: string) => {
    const fileType = fileName.includes('.jpg') || fileName.includes('.png') || fileName.includes('.jpeg') ? 'image' :
                    fileName.includes('.pdf') ? 'pdf' :
                    fileName.includes('.mp4') || fileName.includes('.avi') ? 'video' : 'document';
    
    // Create URLs for different file types
    let fileUrl: string;
    if (fileType === 'image') {
      // Use a simple placeholder that always works
      fileUrl = `https://via.placeholder.com/800x600/0066cc/ffffff?text=${encodeURIComponent(fileName)}`;
    } else if (fileType === 'pdf') {
      // Use a simple placeholder for PDFs
      fileUrl = `https://via.placeholder.com/800x600/ff0000/ffffff?text=PDF+Document`;
    } else if (fileType === 'video') {
      // Use a simple placeholder for videos
      fileUrl = `https://via.placeholder.com/800x600/00ff00/ffffff?text=Video+File`;
    } else {
      // For other documents, use a placeholder
      fileUrl = `https://via.placeholder.com/800x600/0066cc/ffffff?text=${encodeURIComponent(fileName)}`;
    }
    
    // Open file in new tab
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  const handleAddComment = () => {
    if (!selectedJobComments || !newComment.trim()) return;
    
    // Handle file attachments if any
    let newAttachments: string[] = [];
    if (selectedFiles && selectedFiles.length > 0) {
      newAttachments = Array.from(selectedFiles).map(file => {
        const timestamp = Date.now();
        const extension = file.name.split('.').pop();
        return `comment_${timestamp}.${extension}`;
      });
    }

    const comment = {
      id: `comment_${Date.now()}`,
      author: 'Current User',
      message: newComment.trim(),
      timestamp: new Date().toISOString(),
      type: 'comment' as const,
      attachments: newAttachments
    };

    const updatedJobs = serviceJobs.map(job =>
      job.id === selectedJobComments.id
        ? { 
            ...job, 
            comments: [...job.comments, comment]
          }
        : job
    );
    setServiceJobs(updatedJobs);
    setNewComment('');
    setSelectedFiles(null);
    toast.success('Comment added successfully');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files);
  };

  const handleAttachmentUpload = (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newAttachments = Array.from(files).map(file => {
        const timestamp = Date.now();
        const extension = file.name.split('.').pop();
        return `${type}_${timestamp}.${extension}`;
      });
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...newAttachments]
      }));
      toast.success(`${files.length} ${type} file(s) added successfully`);
    }
  };

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
    toast.success('Attachment removed');
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      vehicleModel: '',
      vehicleRegistration: '',
      priority: 'medium',
      status: 'new_complaint',
      scheduledDate: '',
      notes: '',
      attachments: []
    });
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingJob(null);
    resetForm();
  };

  const handleExport = () => {
    const csvContent = [
      ['Customer Name', 'Phone', 'Vehicle', 'Service Type', 'Technician', 'Priority', 'Status', 'Estimated Cost', 'Actual Cost', 'Scheduled', 'Notes'],
      ...filteredJobs.map(job => [
        job.customerName,
        job.customerPhone,
        `${job.vehicleModel} ${job.vehicleRegistration}`,
        job.serviceType,
        job.technicianName,
        priorityConfig[job.priority].label,
        statusConfig[job.status].label,
        `₹${job.estimatedCost}`,
        job.actualCost ? `₹${job.actualCost}` : '',
        formatScheduledDateTime(job.scheduledDate, job.scheduledTime),
        job.notes || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service-jobs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
  };

  // Dashboard statistics
  const stats = {
    newComplaints: serviceJobs.filter(job => job.status === 'new_complaint').length,
    underInspection: serviceJobs.filter(job => job.status === 'under_inspection').length,
    atServiceCentre: serviceJobs.filter(job => job.status === 'sent_to_service_centre').length,
    received: serviceJobs.filter(job => job.status === 'received').length,
    completed: serviceJobs.filter(job => job.status === 'completed').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Tracker</h1>
          <p className="text-muted-foreground">
            Manage service jobs, maintenance, and repair operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Wrench className="h-8 w-8 text-primary" />
        </div>
      </div>

      {/* Dashboard Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setStatusFilter('new_complaint')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Complaints</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.newComplaints}</div>
            <p className="text-xs text-muted-foreground">
              Requiring immediate attention
            </p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setStatusFilter('under_inspection')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Inspection</CardTitle>
            <Eye className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.underInspection}</div>
            <p className="text-xs text-muted-foreground">
              Currently being inspected
            </p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setStatusFilter('sent_to_service_centre')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Service Centre</CardTitle>
            <Building className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.atServiceCentre}</div>
            <p className="text-xs text-muted-foreground">
              Sent for repair
            </p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setStatusFilter('received')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Received</CardTitle>
            <CheckCircle className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.received}</div>
            <p className="text-xs text-muted-foreground">
              Back from service centre
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
              Successfully completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Service Job Management</CardTitle>
            <div className="flex gap-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingJob(null); resetForm(); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Service Job
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingJob ? 'Edit Service Job' : 'Add New Service Job'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingJob ? 'Update service job details' : 'Add a new service job entry'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="vehicleModel">Vehicle Model *</Label>
                        <Input
                          id="vehicleModel"
                          value={formData.vehicleModel}
                          onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vehicleRegistration">Vehicle Registration *</Label>
                        <Input
                          id="vehicleRegistration"
                          value={formData.vehicleRegistration}
                          onChange={(e) => setFormData({ ...formData, vehicleRegistration: e.target.value })}
                          required
                        />
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
                            <SelectItem value="new_complaint">New Complaint</SelectItem>
                            <SelectItem value="under_inspection">Under Inspection</SelectItem>
                            <SelectItem value="sent_to_service_centre">Sent to Service Centre</SelectItem>
                            <SelectItem value="received">Received</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scheduledDate">Scheduled Date *</Label>
                      <Input
                        id="scheduledDate"
                        type="date"
                        value={formData.scheduledDate}
                        onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="attachments">Attachments</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <div className="flex flex-col items-center space-y-2">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-8 w-8 text-gray-400" />
                            <span className="text-sm text-gray-600">Upload Photos, Videos, or PDFs</span>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => document.getElementById('attachment-photos')?.click()}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Photos
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => document.getElementById('attachment-videos')?.click()}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Videos
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => document.getElementById('attachment-pdfs')?.click()}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              PDFs
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500">
                            Drag and drop files here, or click to browse
                          </p>
                          <input
                            id="attachment-photos"
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handleAttachmentUpload(e, 'photos')}
                          />
                          <input
                            id="attachment-videos"
                            type="file"
                            accept="video/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handleAttachmentUpload(e, 'videos')}
                          />
                          <input
                            id="attachment-pdfs"
                            type="file"
                            accept=".pdf"
                            multiple
                            className="hidden"
                            onChange={(e) => handleAttachmentUpload(e, 'pdfs')}
                          />
                        </div>
                        {formData.attachments.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-sm font-medium">Selected Files:</p>
                            {formData.attachments.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm">{file}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAttachment(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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
                          editingJob ? 'Update' : 'Add Service Job'
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
                  placeholder="Search service jobs..."
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
                <SelectItem value="new_complaint">New Complaint</SelectItem>
                <SelectItem value="under_inspection">Under Inspection</SelectItem>
                <SelectItem value="sent_to_service_centre">Sent to Service Centre</SelectItem>
                <SelectItem value="received">Received</SelectItem>
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

          {/* Service Jobs Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Attachments</TableHead>
                    <TableHead>Comments</TableHead>
                    <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map((job) => (
                  <TableRow key={job.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <div className="font-medium">{job.customerName}</div>
                        <Button
                          variant="link"
                          className="p-0 h-auto text-blue-600 hover:text-blue-800"
                          onClick={() => handlePhoneClick(job.customerPhone)}
                        >
                          {job.customerPhone}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{job.vehicleModel}</div>
                        <div className="text-sm text-muted-foreground">{job.vehicleRegistration}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityConfig[job.priority].color}>
                        {priorityConfig[job.priority].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={job.status}
                        onValueChange={(value) => handleStatusChange(job.id, value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new_complaint">New Complaint</SelectItem>
                          <SelectItem value="under_inspection">Under Inspection</SelectItem>
                          <SelectItem value="sent_to_service_centre">Sent to Service Centre</SelectItem>
                          <SelectItem value="received">Received</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {job.scheduledDate && (
                          <div className="font-medium">{formatDate(job.scheduledDate)}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{job.attachments.length}</span>
                        <Paperclip className="h-4 w-4 text-blue-600" />
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto text-blue-600 hover:text-blue-800"
                          onClick={() => handleViewAttachments(job)}
                        >
                          View
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{job.comments.length}</span>
                        <MessageCircle className="h-4 w-4 text-green-600" />
                        {job.comments.length === 0 ? (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-green-600 hover:text-green-800"
                            onClick={() => handleViewComments(job)}
                          >
                            No comments
                          </Button>
                        ) : (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-green-600 hover:text-green-800"
                            onClick={() => handleViewComments(job)}
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewHistory(job)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(job)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDeleteJobId(job.id);
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
            <DialogTitle>Service Job Status History</DialogTitle>
            <DialogDescription>
              Complete status change history for {selectedJobHistory?.customerName}
            </DialogDescription>
          </DialogHeader>
          {selectedJobHistory && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Customer</Label>
                  <div className="text-sm">{selectedJobHistory.customerName}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Vehicle</Label>
                  <div className="text-sm">{selectedJobHistory.vehicleModel} {selectedJobHistory.vehicleRegistration}</div>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Status Changes</Label>
                {selectedJobHistory.statusHistory.map((change, index) => (
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

      {/* Attachments Dialog */}
      <Dialog open={isAttachmentsDialogOpen} onOpenChange={setIsAttachmentsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Attachments
            </DialogTitle>
            <DialogDescription>
              {selectedJobAttachments && (
                <>
                  <span>Vehicle: {selectedJobAttachments.vehicleModel} ({selectedJobAttachments.vehicleRegistration})</span>
                  <br />
                  <span>Customer: {selectedJobAttachments.customerName}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedJobAttachments && (
            <div className="space-y-4">
              {selectedJobAttachments.attachments.length > 0 ? (
                <div className="space-y-3">
                  {selectedJobAttachments.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-6 w-6 text-blue-600" />
                        <div>
                          <div className="font-medium">{attachment}</div>
                          <div className="text-sm text-muted-foreground">
                            {attachment.includes('.jpg') || attachment.includes('.png') || attachment.includes('.jpeg') ? 'Image file' : 
                             attachment.includes('.pdf') ? 'PDF Document' : 
                             attachment.includes('.mp4') || attachment.includes('.avi') ? 'Video file' : 'File'}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-blue-600"
                          onClick={() => handleViewFile(attachment)}
                        >
                          View
                        </Button>
                        <Button variant="outline" size="sm" className="text-green-600">
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No attachments found</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsAttachmentsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comments & Attachments Dialog */}
      <Dialog open={isCommentsDialogOpen} onOpenChange={setIsCommentsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Comments & Attachments
            </DialogTitle>
            <DialogDescription>
              {selectedJobComments && (
                <>
                  <span>Vehicle: {selectedJobComments.vehicleModel} ({selectedJobComments.vehicleRegistration})</span>
                  <br />
                  <span>Customer: {selectedJobComments.customerName}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedJobComments && (
            <div className="space-y-6">
              {/* Existing Comments */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Comments</Label>
                {selectedJobComments.comments.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {selectedJobComments.comments.map((comment) => (
                      <div key={comment.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{comment.author}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(comment.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm">{comment.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No comments yet</p>
                  </div>
                )}
              </div>

              {/* Comment Attachments */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Comment Attachments</Label>
                {(() => {
                  const allCommentAttachments = selectedJobComments.comments
                    .filter(comment => comment.attachments && comment.attachments.length > 0)
                    .flatMap(comment => 
                      comment.attachments!.map(attachment => ({
                        attachment,
                        comment: comment.message,
                        author: comment.author,
                        timestamp: comment.timestamp
                      }))
                    );
                  
                  return allCommentAttachments.length > 0 ? (
                    <div className="space-y-3 max-h-40 overflow-y-auto">
                      {allCommentAttachments.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <div>
                              <div className="font-medium text-sm">{item.attachment}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.attachment.includes('.jpg') || item.attachment.includes('.png') || item.attachment.includes('.jpeg') ? 'Image file' : 
                                 item.attachment.includes('.pdf') ? 'PDF Document' : 
                                 item.attachment.includes('.mp4') || item.attachment.includes('.avi') ? 'Video file' : 'File'}
                              </div>
                              <div className="text-xs text-gray-500">
                                From: {item.author} - {item.comment.substring(0, 30)}...
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-blue-600"
                              onClick={() => handleViewFile(item.attachment)}
                            >
                              View
                            </Button>
                            <Button variant="outline" size="sm" className="text-green-600">
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No comment attachments yet</p>
                    </div>
                  );
                })()}
              </div>

              {/* Add Comment */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Add Comment</Label>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Enter your comment..."
                  className="min-h-[100px]"
                />
              </div>

              {/* Attach Files */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Attach Files (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    Choose Files
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedFiles ? `${selectedFiles.length} file(s) selected` : 'No file chosen'}
                  </span>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCommentsDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleAddComment} disabled={!newComment.trim()}>
              <Send className="mr-2 h-4 w-4" />
              Add Comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the service job record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteJobId && handleDelete(deleteJobId)}
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
