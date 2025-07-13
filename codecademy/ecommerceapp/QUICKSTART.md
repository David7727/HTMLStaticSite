# Quick Start Guide

Get your e-commerce API up and running in 5 minutes!

## Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [PostgreSQL](https://www.postgresql.org/) (v12+)

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
Create a PostgreSQL database:
```sql
CREATE DATABASE ecommerce_db;
CREATE USER ecommerce_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE ecommerce_db TO ecommerce_user;
```

### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` file:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce_db
DB_USER=ecommerce_user
DB_PASSWORD=your_password

JWT_SECRET=your-super-secret-jwt-key-here
PORT=3000
```

### 4. Initialize Database
```bash
npm run db:setup
```

### 5. Start Server
```bash
npm run dev
```

## 🎯 Test the API

### Option 1: Automated Test Script
```bash
npm run test:api
```

### Option 2: Manual Testing
Visit [http://localhost:3000/api-docs](http://localhost:3000/api-docs) for interactive API documentation.

### Option 3: Quick cURL Commands

**1. Register a user:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123","first_name":"Test","last_name":"User"}'
```

**2. Login (save the token):**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}'
```

**3. Get products:**
```bash
curl -X GET http://localhost:3000/api/products
```

**4. Add to cart (replace YOUR_TOKEN):**
```bash
curl -X POST http://localhost:3000/api/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"product_id":1,"quantity":2}'
```

**5. Create order:**
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"shipping_address":"123 Main St, City, State 12345"}'
```

## 🔑 Default Login Credentials

**Admin User:**
- Email: `admin@example.com`
- Password: `password123`

**Test Users:**
- Email: `john.doe@example.com` / Password: `password123`
- Email: `jane.smith@example.com` / Password: `password123`

## 📚 Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/products` | Get all products |
| GET | `/api/cart` | Get user's cart |
| POST | `/api/cart/items` | Add item to cart |
| POST | `/api/orders` | Create order |
| GET | `/api/orders` | Get user's orders |

## 🛠️ Development Commands

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run API tests
npm run test:api

# Reset database (drop and recreate)
npm run db:setup -- --drop && npm run db:setup
```

## 🔍 Health Check

Visit [http://localhost:3000/health](http://localhost:3000/health) to verify the server is running.

## 📖 Full Documentation

For complete API documentation, visit [http://localhost:3000/api-docs](http://localhost:3000/api-docs) when the server is running.

## 🐛 Troubleshooting

**Database connection error?**
- Check PostgreSQL is running
- Verify database credentials in `.env`
- Ensure database exists

**Server won't start?**
- Check if port 3000 is available
- Verify all environment variables are set
- Check Node.js version (requires v16+)

**Authentication errors?**
- Make sure JWT_SECRET is set in `.env`
- Check token format: `Bearer <token>`

## 🎉 Next Steps

1. Explore the interactive API docs at `/api-docs`
2. Test different endpoints with sample data
3. Build a frontend application
4. Add payment processing
5. Deploy to production

Happy coding! 🚀