const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Requested-With']
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'OMSMS Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Mock API endpoints for frontend
app.get('/api/public/plans', (req, res) => {
  res.json([
    {
      id: 'starter',
      name: 'Starter',
      price: 29,
      description: 'Perfect for small businesses',
      features: [
        'Up to 100 vehicles',
        'Up to 10 users',
        '10GB storage',
        'Basic support',
        'Standard workflows'
      ]
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 99,
      description: 'Ideal for growing companies',
      features: [
        'Up to 1,000 vehicles',
        'Up to 50 users',
        '100GB storage',
        'Priority support',
        'Custom workflows',
        'API access'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 299,
      description: 'For large organizations',
      features: [
        'Unlimited vehicles',
        'Unlimited users',
        '1TB storage',
        'Premium support',
        'Custom workflows',
        'API access',
        'SSO integration',
        'Custom branding'
      ]
    }
  ]);
});

app.post('/api/public/check-subdomain', (req, res) => {
  const { subdomain } = req.body;
  
  // Mock subdomain availability check
  const unavailableSubdomains = ['admin', 'api', 'www', 'app', 'dashboard'];
  
  if (unavailableSubdomains.includes(subdomain.toLowerCase())) {
    res.json({ available: false, message: 'This subdomain is not available' });
  } else {
    res.json({ available: true, message: 'Subdomain is available' });
  }
});

app.post('/api/public/signup', (req, res) => {
  const { organizationName, subdomain, firstName, lastName, email, password } = req.body;
  
  // Mock signup response
  console.log('Signup attempt:', { organizationName, subdomain, firstName, lastName, email });
  
  res.json({
    success: true,
    message: 'Organization created successfully!',
    data: {
      organizationId: 'org_' + Math.random().toString(36).substr(2, 9),
      subdomain: subdomain,
      adminUserId: 'user_' + Math.random().toString(36).substr(2, 9),
      workspaceUrl: `https://${subdomain}.omsms.com`
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password, subdomain } = req.body;
  
  // Mock login response
  console.log('Login attempt:', { email, subdomain });
  
  res.json({
    success: true,
    message: 'Login successful!',
    data: {
      token: 'mock_jwt_token_' + Math.random().toString(36).substr(2, 9),
      user: {
        id: 'user_' + Math.random().toString(36).substr(2, 9),
        email: email,
        firstName: 'John',
        lastName: 'Doe',
        role: 'admin'
      },
      organization: {
        id: 'org_' + Math.random().toString(36).substr(2, 9),
        name: 'Demo Organization',
        subdomain: subdomain
      }
    }
  });
});

// Handle OPTIONS requests for CORS preflight
app.options('*', (req, res) => {
  res.status(200).end();
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 OMSMS Mock Backend Server running on http://localhost:${PORT}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 CORS enabled for: http://localhost:3000`);
});
