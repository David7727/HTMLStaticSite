# E-commerce REST API

A comprehensive e-commerce REST API built with Node.js, Express, and PostgreSQL. This API provides all the essential functionality needed for an online store, including user authentication, product management, shopping cart, and order processing.

## Features

- **User Authentication & Authorization**
  - User registration and login with JWT tokens
  - Password hashing with bcrypt
  - Role-based access control (Admin/User)
  - Profile management

- **Product Management**
  - CRUD operations for products
  - Product search and filtering
  - Category management
  - Stock tracking
  - Image URL support

- **Shopping Cart**
  - Add/remove items from cart
  - Update item quantities
  - Cart persistence per user
  - Stock validation

- **Order Management**
  - Create orders from cart
  - Order status tracking
  - Order history
  - Cancel orders
  - Admin order management

- **API Documentation**
  - Interactive Swagger/OpenAPI documentation
  - Comprehensive endpoint documentation
  - Request/response examples

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Documentation**: Swagger/OpenAPI
- **Security**: Helmet, CORS

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v16 or higher)
- [PostgreSQL](https://www.postgresql.org/) (v12 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ecommerceapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=ecommerce_db
   DB_USER=your_username
   DB_PASSWORD=your_password
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   ```

4. **Set up the database**
   
   First, create a PostgreSQL database:
   ```sql
   CREATE DATABASE ecommerce_db;
   ```
   
   Then run the setup script:
   ```bash
   npm run db:setup
   ```

5. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `http://localhost:3000`

## API Documentation

Once the server is running, you can access the interactive API documentation at:
- **Swagger UI**: `http://localhost:3000/api-docs`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token

### Users
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `DELETE /api/users/profile` - Delete user account
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID (Admin only)
- `DELETE /api/users/:id` - Delete user by ID (Admin only)

### Products
- `GET /api/products` - Get all products (with search/filter)
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)
- `GET /api/products/categories` - Get all categories

### Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items/:id` - Update cart item quantity
- `DELETE /api/cart/items/:id` - Remove item from cart
- `DELETE /api/cart/clear` - Clear entire cart

### Orders
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create order from cart
- `PUT /api/orders/:id/status` - Update order status (Admin only)
- `PUT /api/orders/:id/cancel` - Cancel order

## Usage Examples

### Register a new user
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "Password123",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "Password123"
  }'
```

### Get products with search
```bash
curl -X GET "http://localhost:3000/api/products?q=laptop&category=Electronics&page=1&limit=10"
```

### Add item to cart (requires authentication)
```bash
curl -X POST http://localhost:3000/api/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "product_id": 1,
    "quantity": 2
  }'
```

### Create order (requires authentication)
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "shipping_address": "123 Main St, City, State 12345",
    "billing_address": "123 Main St, City, State 12345"
  }'
```

## Database Schema

### Users Table
- `id` (Primary Key)
- `email` (Unique)
- `password_hash`
- `first_name`
- `last_name`
- `is_admin`
- `created_at`
- `updated_at`

### Products Table
- `id` (Primary Key)
- `name`
- `description`
- `price`
- `stock_quantity`
- `category`
- `image_url`
- `is_active`
- `created_at`
- `updated_at`

### Carts Table
- `id` (Primary Key)
- `user_id` (Foreign Key)
- `created_at`
- `updated_at`

### Cart Items Table
- `id` (Primary Key)
- `cart_id` (Foreign Key)
- `product_id` (Foreign Key)
- `quantity`
- `created_at`
- `updated_at`

### Orders Table
- `id` (Primary Key)
- `user_id` (Foreign Key)
- `total_amount`
- `status` (pending, processing, shipped, delivered, cancelled)
- `shipping_address`
- `billing_address`
- `created_at`
- `updated_at`

### Order Items Table
- `id` (Primary Key)
- `order_id` (Foreign Key)
- `product_id` (Foreign Key)
- `quantity`
- `price` (Price at time of order)
- `created_at`
- `updated_at`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Default Admin User
After running the database setup, you can login with:
- **Email**: `admin@example.com`
- **Password**: `password123`

### Default Test Users
- **Email**: `john.doe@example.com`, **Password**: `password123`
- **Email**: `jane.smith@example.com`, **Password**: `password123`

## Error Handling

The API returns consistent error responses in the following format:

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": [] // Optional validation details
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Validation

All endpoints include comprehensive input validation:

- **Email format validation**
- **Password strength requirements**
- **Required field validation**
- **Data type validation**
- **Business logic validation**

## Security Features

- **Password hashing** with bcrypt
- **JWT authentication** with expiration
- **Input validation** and sanitization
- **SQL injection protection** with parameterized queries
- **CORS configuration**
- **Security headers** with Helmet
- **Rate limiting** (configurable)

## Testing

### Manual Testing
Use the provided Swagger documentation at `/api-docs` for interactive testing.

### Sample Data
The database setup script includes sample data:
- 3 users (including 1 admin)
- 10 products across different categories
- Sample cart items for testing

## Development Scripts

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Set up database (create tables and seed data)
npm run db:setup

# Drop all tables (for testing)
npm run db:setup -- --drop

# Run tests (when implemented)
npm test
```

## Production Deployment

### Environment Variables
Make sure to set secure values for production:

```env
NODE_ENV=production
JWT_SECRET=your-super-secure-production-jwt-secret
DATABASE_URL=your-production-database-url
```

### Database
- Use a managed PostgreSQL service (AWS RDS, Google Cloud SQL, etc.)
- Enable SSL connections
- Set up regular backups
- Configure connection pooling

### Security
- Use HTTPS in production
- Set up proper CORS origins
- Configure rate limiting
- Use environment variables for all secrets
- Enable logging and monitoring

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support or questions, please open an issue in the repository or contact the development team.

## Changelog

### Version 1.0.0
- Initial release
- User authentication and authorization
- Product management with CRUD operations
- Shopping cart functionality
- Order processing system
- Comprehensive API documentation
- Database setup and migrations
- Input validation and error handling