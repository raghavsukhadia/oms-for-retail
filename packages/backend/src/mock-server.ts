import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mock data
const mockVehicles = [
  {
    vehicle_id: 'veh_001',
    car_number: 'MH12AB1234',
    owner_name: 'John Smith',
    owner_mobile: '+91 98765 43210',
    owner_email: 'john@example.com',
    model_name: 'Swift',
    brand_name: 'Maruti',
    vehicle_type: 'Hatchback',
    location_id: 'loc_001',
    salesperson_id: 'user_001',
    coordinator_id: 'user_002',
    supervisor_id: 'user_003',
    inward_date: '2024-01-15',
    expected_delivery_date: '2024-01-20',
    actual_delivery_date: null,
    status: 'in_progress',
    vehicle_details: {},
    custom_fields: {},
    created_by: 'user_001',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    vehicle_id: 'veh_002',
    car_number: 'DL8XYZ5678',
    owner_name: 'Sarah Johnson',
    owner_mobile: '+91 98765 43211',
    owner_email: 'sarah@example.com',
    model_name: 'i20',
    brand_name: 'Hyundai',
    vehicle_type: 'Hatchback',
    location_id: 'loc_002',
    salesperson_id: 'user_004',
    coordinator_id: 'user_005',
    supervisor_id: 'user_006',
    inward_date: '2024-01-16',
    expected_delivery_date: '2024-01-21',
    actual_delivery_date: null,
    status: 'pending',
    vehicle_details: {},
    custom_fields: {},
    created_by: 'user_004',
    created_at: '2024-01-16T10:00:00Z',
    updated_at: '2024-01-16T10:00:00Z'
  },
  {
    vehicle_id: 'veh_003',
    car_number: 'KA5DEF9012',
    owner_name: 'Michael Brown',
    owner_mobile: '+91 98765 43212',
    owner_email: 'michael@example.com',
    model_name: 'Creta',
    brand_name: 'Hyundai',
    vehicle_type: 'SUV',
    location_id: 'loc_003',
    salesperson_id: 'user_007',
    coordinator_id: 'user_008',
    supervisor_id: 'user_009',
    inward_date: '2024-01-17',
    expected_delivery_date: '2024-01-22',
    actual_delivery_date: null,
    status: 'completed',
    vehicle_details: {},
    custom_fields: {},
    created_by: 'user_007',
    created_at: '2024-01-17T10:00:00Z',
    updated_at: '2024-01-17T10:00:00Z'
  }
];

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: 'development'
    }
  });
});

// Vehicles endpoints
app.get('/api/vehicles', (req, res) => {
  res.json({
    success: true,
    data: mockVehicles,
    pagination: {
      page: 1,
      limit: 10,
      total: mockVehicles.length,
      totalPages: 1
    }
  });
});

app.get('/api/vehicles/:id', (req, res) => {
  const vehicle = mockVehicles.find(v => v.vehicle_id === req.params.id);
  if (!vehicle) {
    return res.status(404).json({
      success: false,
      error: 'Vehicle not found'
    });
  }
  res.json({
    success: true,
    data: vehicle
  });
});

app.post('/api/vehicles', (req, res) => {
  const newVehicle = {
    vehicle_id: `veh_${Date.now()}`,
    ...req.body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  mockVehicles.push(newVehicle);
  res.status(201).json({
    success: true,
    data: newVehicle
  });
});

app.put('/api/vehicles/:id', (req, res) => {
  const vehicleIndex = mockVehicles.findIndex(v => v.vehicle_id === req.params.id);
  if (vehicleIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Vehicle not found'
    });
  }
  mockVehicles[vehicleIndex] = {
    ...mockVehicles[vehicleIndex],
    ...req.body,
    updated_at: new Date().toISOString()
  };
  res.json({
    success: true,
    data: mockVehicles[vehicleIndex]
  });
});

app.delete('/api/vehicles/:id', (req, res) => {
  const vehicleIndex = mockVehicles.findIndex(v => v.vehicle_id === req.params.id);
  if (vehicleIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Vehicle not found'
    });
  }
  mockVehicles.splice(vehicleIndex, 1);
  res.json({
    success: true,
    message: 'Vehicle deleted successfully'
  });
});

// Mock other endpoints that might be called
app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        user_id: 'user_001',
        email: 'admin@example.com',
        first_name: 'Admin',
        last_name: 'User',
        role_id: 'role_admin',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z'
      }
    ]
  });
});

app.get('/api/locations', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        location_id: 'loc_001',
        location_name: 'Mumbai Central',
        city: 'Mumbai',
        status: 'active'
      },
      {
        location_id: 'loc_002',
        location_name: 'Delhi Central',
        city: 'Delhi',
        status: 'active'
      },
      {
        location_id: 'loc_003',
        location_name: 'Bangalore South',
        city: 'Bangalore',
        status: 'active'
      }
    ]
  });
});

app.get('/api/departments', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        department_id: 'dept_001',
        department_name: 'Sales',
        color_code: '#3B82F6',
        status: 'active'
      }
    ]
  });
});

app.get('/api/roles', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        role_id: 'role_admin',
        role_name: 'Admin',
        role_description: 'System Administrator',
        role_level: 100,
        status: 'active'
      },
      {
        role_id: 'role_user',
        role_name: 'User',
        role_description: 'Standard User',
        role_level: 10,
        status: 'active'
      }
    ]
  });
});

// Mock payments endpoint
app.get('/api/payments', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        payment_id: 'pay_001',
        vehicle_id: 'veh_001',
        amount: 50000,
        paid_amount: 25000,
        outstanding_amount: 25000,
        status: 'pending',
        created_at: '2024-01-15T10:00:00Z'
      }
    ]
  });
});

app.get('/api/payments/summary', (req, res) => {
  res.json({
    success: true,
    data: {
      totalPayments: 1,
      totalOutstanding: 25000,
      totalAmount: 50000,
      totalPaid: 25000,
      statusCounts: {
        pending: 1,
        paid: 0,
        overdue: 0
      }
    }
  });
});

// Mock organization endpoints
app.get('/api/organization/settings', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Demo Organization',
      logo: null,
      address: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '400001',
      phone: '+91 98765 43210',
      email: 'info@demo.com',
      website: 'https://demo.com',
      taxId: 'TAX123456',
      bankDetails: [],
      qrCodes: [],
      socialMedia: {
        facebook: '',
        twitter: '',
        instagram: '',
        linkedin: ''
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true
      },
      features: {
        multiLocation: true,
        advancedReporting: true,
        customBranding: false
      }
    }
  });
});

app.put('/api/organization/settings', (req, res) => {
  res.json({
    success: true,
    data: req.body,
    message: 'Organization settings updated successfully'
  });
});

// Mock logo upload endpoint
app.post('/api/organization/logo', (req, res) => {
  // Simulate file upload processing
  const mockLogoUrl = `https://via.placeholder.com/200x200/3B82F6/FFFFFF?text=Logo`;
  
  res.json({
    success: true,
    data: {
      logoUrl: mockLogoUrl
    },
    message: 'Logo uploaded successfully'
  });
});

// Mock vehicle stats endpoint
app.get('/api/vehicles/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      total: mockVehicles.length,
      pending: mockVehicles.filter(v => v.status === 'pending').length,
      inProgress: mockVehicles.filter(v => v.status === 'in_progress').length,
      completed: mockVehicles.filter(v => v.status === 'completed').length,
      overdue: 0,
      thisWeek: mockVehicles.filter(v => {
        const date = new Date(v.inward_date);
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return date >= weekAgo;
      }).length
    }
  });
});

// Mock vehicle assignments endpoint
app.put('/api/vehicles/:id/assignments', (req, res) => {
  const vehicleIndex = mockVehicles.findIndex(v => v.vehicle_id === req.params.id);
  if (vehicleIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Vehicle not found'
    });
  }
  
  mockVehicles[vehicleIndex] = {
    ...mockVehicles[vehicleIndex],
    ...req.body,
    updated_at: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: mockVehicles[vehicleIndex],
    message: 'Vehicle assignments updated successfully'
  });
});

// Catch-all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 3001;
const server = httpServer.listen(PORT, () => {
  console.log(`🚀 Mock Backend Server started on port ${PORT}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

export default app;
