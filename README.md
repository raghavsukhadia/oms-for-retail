# OMSMS - Order Management System for Retail SaaS

A comprehensive multi-tenant Order Management System designed for vehicle accessory businesses. This SaaS platform enables businesses to manage vehicle customization orders, installations, workflows, and customer relationships.

## 🚀 **Live Demo**
- **Frontend**: [Deploy to Vercel](https://vercel.com)
- **Backend**: [GCP Cloud Run](https://omsms-backend-610250363653.asia-south1.run.app)
- **Health Check**: [API Status](https://omsms-backend-610250363653.asia-south1.run.app/api/health)

## 🏗️ **Architecture**

### **Tech Stack**
- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + Socket.io
- **Database**: PostgreSQL (GCP Cloud SQL)
- **ORM**: Prisma with master/tenant schema separation
- **Storage**: Google Cloud Storage
- **Authentication**: JWT-based with role-based access control
- **Deployment**: GCP Cloud Run + Vercel

### **Project Structure**
```
retail-oms-saas/
├── packages/
│   ├── frontend/          # Next.js React application
│   ├── backend/           # Express.js API server
│   ├── shared/            # Shared utilities and types
│   └── database/          # Prisma schemas and migrations
├── cloudbuild-backend.yaml
└── README.md
```

## ✨ **Features**

### **Core Functionality**
- ✅ **Multi-tenant Architecture** - Isolated data per organization
- ✅ **User Authentication** - JWT-based with role management
- ✅ **Organization Management** - Settings, branding, user management
- ✅ **Vehicle Workflow System** - Installation stages, payment tracking
- ✅ **Master Data Management** - Departments, roles, locations
- ✅ **Real-time Notifications** - Socket.io integration
- ✅ **Analytics Dashboard** - Business insights and reporting
- ✅ **File Management** - Google Cloud Storage integration

### **User Roles**
- **Admin** - Full system access
- **Manager** - Department oversight
- **Coordinator** - Workflow management
- **Supervisor** - Team supervision
- **Salesperson** - Customer interaction
- **Installer** - Service execution

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 20+
- PostgreSQL database
- Google Cloud Platform account
- Vercel account (for frontend deployment)

### **Local Development**

1. **Clone the repository**
   ```bash
   git clone https://github.com/raghavsukhadia/oms-for-retail.git
   cd oms-for-retail
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Backend (.env)
   MASTER_DATABASE_URL="postgresql://user:pass@localhost:5432/omsms_master"
   TENANT_DATABASE_URL_TEMPLATE="postgresql://user:pass@localhost:5432/omsms_tenant_{database}"
   JWT_SECRET="your-secret-key"
   STORAGE_PROVIDER="local"
   
   # Frontend (.env.local)
   NEXT_PUBLIC_API_URL="http://localhost:8080/api"
   NEXT_PUBLIC_USE_MOCKS="false"
   NEXT_PUBLIC_TENANT="demo"
   ```

4. **Generate Prisma clients**
   ```bash
   cd packages/database
   npx prisma generate --schema prisma/master-schema.prisma
   npx prisma generate --schema prisma/tenant-schema.prisma
   ```

5. **Start development servers**
   ```bash
   # Backend (Terminal 1)
   cd packages/backend
   npm run dev
   
   # Frontend (Terminal 2)
   cd packages/frontend
   npm run dev
   ```

## 🌐 **Deployment**

### **Backend (GCP Cloud Run)**
```bash
# Build and deploy
gcloud builds submit --config cloudbuild-backend.yaml
gcloud run deploy omsms-backend \
  --image gcr.io/retail-oms-saas/omsms-backend:latest \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --env-vars-file=env-vars-gcs.yaml
```

### **Frontend (Vercel)**
```bash
# Deploy to Vercel
vercel --prod
```

## 🗄️ **Database Setup**

### **Master Database**
```sql
-- Create master database
CREATE DATABASE omsms_master;

-- Import master schema
psql -d omsms_master -f setup-master-db.sql
```

### **Tenant Database**
```sql
-- Create tenant database
CREATE DATABASE omsms_tenant_demo;

-- Import tenant schema
psql -d omsms_tenant_demo -f setup-tenant-db.sql
```

## 🔧 **Configuration**

### **Environment Variables**

#### **Backend**
| Variable | Description | Example |
|----------|-------------|---------|
| `MASTER_DATABASE_URL` | Master database connection | `postgresql://user:pass@host:5432/omsms_master` |
| `TENANT_DATABASE_URL_TEMPLATE` | Tenant database template | `postgresql://user:pass@host:5432/omsms_tenant_{database}` |
| `JWT_SECRET` | JWT signing secret | `your-super-secret-key` |
| `STORAGE_PROVIDER` | Storage provider | `gcs` or `local` |
| `GCS_BUCKET_NAME` | GCS bucket name | `omsms-storage-bucket` |
| `GCS_PROJECT_ID` | GCP project ID | `retail-oms-saas` |

#### **Frontend**
| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://omsms-backend-xxx.run.app/api` |
| `NEXT_PUBLIC_USE_MOCKS` | Enable mock data | `false` |
| `NEXT_PUBLIC_TENANT` | Default tenant | `demo` |

## 📊 **API Endpoints**

### **Authentication**
- `POST /api/auth/login` - User login
- `POST /api/auth/tenant-login` - Tenant-specific login
- `POST /api/auth/refresh` - Refresh token

### **Organization**
- `GET /api/organization/settings` - Get organization settings
- `PUT /api/organization/settings` - Update organization settings
- `POST /api/organization/logo` - Upload organization logo

### **Vehicles**
- `GET /api/vehicles` - List vehicles
- `POST /api/vehicles` - Create vehicle
- `PUT /api/vehicles/:id` - Update vehicle
- `GET /api/vehicles/:id/workflows` - Get vehicle workflows

### **Master Data**
- `GET /api/departments` - List departments
- `GET /api/roles` - List roles
- `GET /api/locations` - List locations

## 🔐 **Security Features**

- **JWT Authentication** - Secure token-based auth
- **Role-based Access Control** - Granular permissions
- **CORS Protection** - Configured for production
- **Rate Limiting** - API protection
- **Input Validation** - Zod schema validation
- **SQL Injection Protection** - Prisma ORM

## 🚀 **Performance**

- **Database Indexing** - Optimized queries
- **Connection Pooling** - Efficient database connections
- **Caching** - In-memory caching
- **CDN Ready** - Static asset optimization
- **Real-time Updates** - Socket.io integration

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **Support**

- **Documentation**: [Wiki](https://github.com/raghavsukhadia/oms-for-retail/wiki)
- **Issues**: [GitHub Issues](https://github.com/raghavsukhadia/oms-for-retail/issues)
- **Discussions**: [GitHub Discussions](https://github.com/raghavsukhadia/oms-for-retail/discussions)

## 🎯 **Roadmap**

- [ ] **Mobile App** - React Native application
- [ ] **Advanced Analytics** - Business intelligence dashboard
- [ ] **Payment Integration** - Stripe/PayPal integration
- [ ] **Email Notifications** - Automated email workflows
- [ ] **API Documentation** - Swagger/OpenAPI docs
- [ ] **Multi-language Support** - i18n implementation

---

**Built with ❤️ for the vehicle accessory industry**