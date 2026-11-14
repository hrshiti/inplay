# InPlay OTT Backend API

A comprehensive Node.js backend for an OTT (Over-The-Top) streaming platform with secure video streaming, downloads, and payment integration.

## 🚀 Features

### Admin Panel
- ✅ Admin authentication (JWT)
- ✅ Content management (CRUD operations)
- ✅ User management
- ✅ Subscription plan management
- ✅ Analytics dashboard
- ✅ Revenue tracking

### User Panel
- ✅ User registration & authentication
- ✅ Content browsing & search
- ✅ Secure video streaming (HLS)
- ✅ Secure content downloads
- ✅ Subscription management
- ✅ Payment integration (Razorpay)

### Security & Performance
- ✅ JWT authentication
- ✅ Role-based access control
- ✅ Rate limiting
- ✅ Input validation
- ✅ Secure file uploads (Cloudinary)
- ✅ Time-limited signed URLs
- ✅ Download license management

## 🏗️ Architecture

```
backend/
├── config/           # Database, Cloudinary, Razorpay configs
├── controllers/      # Route handlers
├── models/          # MongoDB schemas
├── routes/          # API routes
├── services/        # Business logic
├── middlewares/     # Auth, validation, error handling
├── utils/           # Helper functions
├── validators/      # Input validation
└── constants/       # App constants
```

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT
- **File Storage**: Cloudinary
- **Payments**: Razorpay
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting

## 📦 Installation

1. **Clone and navigate:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment setup:**
   ```bash
   # Copy ENV_SETUP.txt content to .env file
   # Edit .env with your actual credentials
   ```

4. **Start MongoDB** (local or cloud)

5. **Start the server:**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

   **MongoDB Connection:** Auto-connects using `mongoose.connect(process.env.MONGO_URI)`

## 🔧 Configuration

### Environment Variables (.env)

```env
# Environment
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Razorpay
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# Frontend
FRONTEND_URL=http://localhost:3000
```

## 📚 API Documentation

### Authentication Endpoints

#### User Auth
- `POST /api/user/auth/register` - Register new user
- `POST /api/user/auth/login` - User login
- `GET /api/user/auth/profile` - Get user profile
- `POST /api/user/auth/logout` - User logout

#### Admin Auth
- `POST /api/admin/auth/login` - Admin login
- `GET /api/admin/auth/profile` - Get admin profile

### Content Endpoints

#### Public Content
- `GET /api/content/all` - Get all content
- `GET /api/content/trending` - Get trending content
- `GET /api/content/category/:category` - Get content by category

#### Protected Content
- `GET /api/content/:id` - Get content details
- `GET /api/content/:id/stream` - Get streaming URL
- `POST /api/content/:id/download` - Generate download license
- `POST /api/content/validate-download` - Validate download license

### Admin Content Management
- `GET /api/admin/content` - Get all content (admin)
- `POST /api/admin/content` - Create content
- `PUT /api/admin/content/:id` - Update content
- `DELETE /api/admin/content/:id` - Delete content
- `PATCH /api/admin/content/:id/status` - Change content status

### Subscription & Payment

#### User Subscriptions
- `GET /api/user/subscription/status` - Get subscription status
- `POST /api/user/subscription/create-order` - Create subscription order
- `POST /api/user/subscription/verify-payment` - Verify payment

#### Admin Subscriptions
- `GET /api/admin/subscription/plans` - Get all plans
- `POST /api/admin/subscription/plans` - Create plan
- `PUT /api/admin/subscription/plans/:id` - Update plan

### User Management (Admin)
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:id` - Get user details
- `PATCH /api/admin/users/:id/status` - Update user status
- `DELETE /api/admin/users/:id` - Delete user

### Analytics (Admin)
- `GET /api/admin/analytics/dashboard` - Dashboard analytics
- `GET /api/admin/analytics/users` - User analytics
- `GET /api/admin/analytics/content` - Content analytics
- `GET /api/admin/analytics/revenue` - Revenue analytics

## 🔐 Security Features

### Video Security
- **HLS Streaming Only**: No direct MP4 downloads
- **Signed URLs**: Time-limited access (60 minutes for streaming)
- **Access Control**: Subscription/purchase verification
- **Private Storage**: Videos stored privately on Cloudinary

### Download Security
- **License System**: Unique license keys per download
- **Device Limiting**: Max 3 devices per content
- **Time Limits**: Downloads expire after 30 days
- **Access Validation**: License verification before playback
- **Revocation**: Ability to revoke access

### Authentication
- **JWT Tokens**: Secure token-based auth
- **Role-based Access**: Admin vs User permissions
- **Password Hashing**: bcrypt with 12 rounds
- **Rate Limiting**: API rate limiting per IP

## 🎬 OTT Download System

### How Downloads Work:

1. **License Generation**:
   ```javascript
   POST /api/content/:id/download
   {
     "deviceId": "unique-device-id"
   }
   ```

2. **Download URL** (24-hour validity):
   ```javascript
   {
     "licenseKey": "unique-license-key",
     "downloadUrl": "signed-cloudinary-url",
     "expiresAt": "2024-01-30T00:00:00.000Z"
   }
   ```

3. **License Validation** (before playback):
   ```javascript
   POST /api/content/validate-download
   {
     "licenseKey": "license-key",
     "deviceId": "device-id"
   }
   ```

4. **Offline Playback**: App validates license before allowing playback

### Security Measures:
- ✅ Device fingerprinting
- ✅ License expiry (30 days)
- ✅ Access count limits
- ✅ Subscription validation
- ✅ Automatic revocation on logout/expiry

## 💳 Payment Integration

### Razorpay Integration:

1. **Create Order**:
   ```javascript
   POST /api/user/subscription/create-order
   {
     "planId": "plan-id"
   }
   ```

2. **Verify Payment**:
   ```javascript
   POST /api/user/subscription/verify-payment
   {
     "razorpay_order_id": "order_id",
     "razorpay_payment_id": "payment_id",
     "razorpay_signature": "signature"
   }
   ```

3. **Activate Subscription**: Automatic on successful payment

## 📊 Database Schema

### Core Models:
- **User**: Authentication, profiles, subscriptions
- **Content**: Movies, series, metadata, media files
- **SubscriptionPlan**: Pricing, features, limits
- **Payment**: Transactions, Razorpay integration
- **Download**: License management, device tracking

## 🔧 Development

### Available Scripts:
- `npm start` - Production server
- `npm run dev` - Development server with nodemon
- `npm test` - Run tests

### Code Structure:
- **Controllers**: Handle HTTP requests/responses
- **Services**: Business logic, external API calls
- **Models**: Database schemas and methods
- **Routes**: API endpoint definitions
- **Middlewares**: Authentication, validation, error handling

## 🚀 Deployment

1. **Environment Setup**:
   - Set production environment variables
   - Configure MongoDB Atlas
   - Setup Cloudinary production account
   - Configure Razorpay production keys

2. **Build & Deploy**:
   ```bash
   npm run build
   npm start
   ```

3. **Monitoring**:
   - Scheduled cleanup tasks run automatically
   - Error logging to console/files
   - Rate limiting protects against abuse

## 📝 API Response Format

### Success Response:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Error description"
}
```

## 🤝 Contributing

1. Follow the existing code structure
2. Add proper validation and error handling
3. Update documentation for new endpoints
4. Test thoroughly before committing

## 📄 License

This project is licensed under the ISC License.

---

**Built for InPlay OTT Platform** 🎬✨
