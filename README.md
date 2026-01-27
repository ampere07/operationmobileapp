# Ampere Cloud Business Management System

A full-stack business management application with Laravel backend and React TypeScript frontend featuring secure login authentication.

## Configuration

### Database Setup
- Database: amperecloudbusinessmanagementsystem (already created)
- Host: 127.0.0.1:3306
- Username: root
- Password: (no password)
- Backend configured: Yes

### Create Database Tables
After creating the database, you need to run migrations to create tables:
```bash
# Run from project root
./setup-database.bat
```

## Quick Start

### First Time Setup (Recommended)
If you encounter TypeScript, ESLint, or dependency conflicts, run the setup script first:
```bash
# Run from project root
./setup-dependencies.bat
```

### Option 1: Use the simple startup script (Recommended)
```bash
# Run from project root - opens both servers in separate windows
./start-simple.bat
```

### Option 2: Use the concurrent startup script
```bash
# Run from project root - requires concurrently package
npm install  # Install concurrently if not already installed
npm start
```

### Option 3: Manual startup

#### Backend (Laravel)
```bash
cd backend
npm start
# or alternatively: php artisan serve
```

#### Frontend (React)
```bash
cd frontend
npm start
```

## URLs
- Frontend: http://localhost:3000 (Login Interface)
- Backend API: http://localhost:8000
- API Health Check: http://localhost:8000/api/health
- Login Endpoint: POST http://localhost:8000/api/login
- Forgot Password: POST http://localhost:8000/api/forgot-password

## Login Credentials
- Email: admin@ampere.com
- Password: admin123

## Features

### Authentication System
- Clean login interface
- No registration (admin only)
- Forgot password functionality
- Secure API authentication
- Error handling and validation

### Professional Design
- Modern dark theme interface
- Responsive login forms
- Professional typography
- Clean user experience

### Clean Code Implementation
- Minimal comments (2 words max)
- Clean TypeScript interfaces
- Optimized React components
- Professional code structure

### API Endpoints
- POST /api/login - User authentication
- POST /api/forgot-password - Password reset
- GET /api/health - Health check

## Project Structure
```
├── backend/          # Laravel PHP API
│   ├── routes/api.php   # API endpoints (login, auth, health)
│   └── .env            # Environment config
├── frontend/         # React TypeScript app
│   ├── src/components/ # React components
│   │   ├── Login.tsx        # Login interface with forgot password
│   │   └── Dashboard.tsx    # Main dashboard after login
│   ├── src/config/     # API configuration
│   │   └── api.ts          # Axios configuration
│   └── src/services/   # API services
│       └── api.ts          # Authentication API functions
├── start-simple.bat     # Simple startup script (Recommended)
├── start.bat           # Original startup script
├── setup-database.bat  # Database migration script
├── setup-dependencies.bat  # Dependency cleanup script
└── test-connectivity.bat   # Test all API endpoints
```

## Testing Authentication

After starting both servers, you can test the authentication system:
```bash
# Test login endpoint
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ampere.com","password":"admin123"}'

# Test forgot password
curl -X POST http://localhost:8000/api/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ampere.com"}'

# Test health check
curl http://localhost:8000/api/health
```

Or use the test script:
```bash
./test-connectivity.bat
```

## Troubleshooting

### TypeScript Errors
If you see TypeScript errors during development:
- Run the dependency cleanup script
- Restart the development server

**Solution:** Run the setup script:
```bash
./setup-dependencies.bat
```

### Login Issues
If you cannot log in:
- Verify backend is running on port 8000
- Check credentials: admin@ampere.com / admin123
- Check browser console for API errors

**Solution:** Test the login endpoint:
```bash
curl -X POST http://localhost:8000/api/login -H "Content-Type: application/json" -d '{"email":"admin@ampere.com","password":"admin123"}'
```

### Port Already in Use
If ports 3000 or 8000 are busy:
- Frontend: React will automatically suggest port 3001
- Backend: Stop other PHP/Laravel servers or kill processes using port 8000

### Database Connection Issues
1. Make sure MySQL is running
2. Create database: amperecloudbusinessmanagementsystem (Already done)
3. Check credentials in backend/.env (Already configured)
4. **Run database migrations to create tables:**
   ```bash
   ./setup-database.bat
   ```
5. Test the backend health endpoint: http://localhost:8000/api/health

### Backend API Issues
If the login fails or API is not responding:
1. Ensure backend is running: `cd backend && npm start`
2. Check Laravel logs in `backend/storage/logs/`
3. Test API manually using curl commands shown above
4. Verify CORS settings are configured properly