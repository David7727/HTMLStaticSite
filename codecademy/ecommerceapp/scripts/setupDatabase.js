const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ecommerce_db',
  user: process.env.DB_USER || 'username',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

const pool = new Pool(dbConfig);

// SQL to create tables
const createTables = `
  -- Create users table
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Create products table
  CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    category VARCHAR(100),
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Create carts table
  CREATE TABLE IF NOT EXISTS carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Create cart_items table
  CREATE TABLE IF NOT EXISTS cart_items (
    id SERIAL PRIMARY KEY,
    cart_id INTEGER REFERENCES carts(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cart_id, product_id)
  );

  -- Create orders table
  CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    shipping_address TEXT,
    billing_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Create order_items table
  CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Create indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
  CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
  CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
  CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
  CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

  -- Create trigger function to update updated_at timestamp
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
  END;
  $$ language 'plpgsql';

  -- Create triggers for updating updated_at
  DROP TRIGGER IF EXISTS update_users_updated_at ON users;
  CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_products_updated_at ON products;
  CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_carts_updated_at ON carts;
  CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON carts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_cart_items_updated_at ON cart_items;
  CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
  CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_order_items_updated_at ON order_items;
  CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

// Sample data for testing
const seedData = `
  -- Insert sample users (password: 'password123')
  INSERT INTO users (email, password_hash, first_name, last_name, is_admin) VALUES
  ('admin@example.com', '$2a$10$rOvY1W0P7JdLWBz1fKjEyeU5k5LKQWNJUGmhXFMhqoZ5PzSbqKM3O', 'Admin', 'User', TRUE),
  ('john.doe@example.com', '$2a$10$rOvY1W0P7JdLWBz1fKjEyeU5k5LKQWNJUGmhXFMhqoZ5PzSbqKM3O', 'John', 'Doe', FALSE),
  ('jane.smith@example.com', '$2a$10$rOvY1W0P7JdLWBz1fKjEyeU5k5LKQWNJUGmhXFMhqoZ5PzSbqKM3O', 'Jane', 'Smith', FALSE)
  ON CONFLICT (email) DO NOTHING;

  -- Insert sample products
  INSERT INTO products (name, description, price, stock_quantity, category, image_url) VALUES
  ('Laptop Computer', 'High-performance laptop with 16GB RAM and 512GB SSD', 999.99, 50, 'Electronics', 'https://example.com/laptop.jpg'),
  ('Wireless Headphones', 'Premium noise-cancelling wireless headphones', 299.99, 100, 'Electronics', 'https://example.com/headphones.jpg'),
  ('Coffee Maker', 'Programmable coffee maker with thermal carafe', 149.99, 25, 'Home & Kitchen', 'https://example.com/coffee-maker.jpg'),
  ('Running Shoes', 'Comfortable running shoes with excellent cushioning', 129.99, 75, 'Sports & Outdoors', 'https://example.com/running-shoes.jpg'),
  ('Smartphone', 'Latest smartphone with advanced camera system', 799.99, 30, 'Electronics', 'https://example.com/smartphone.jpg'),
  ('Backpack', 'Durable hiking backpack with multiple compartments', 79.99, 40, 'Sports & Outdoors', 'https://example.com/backpack.jpg'),
  ('Desk Chair', 'Ergonomic office chair with lumbar support', 199.99, 20, 'Furniture', 'https://example.com/desk-chair.jpg'),
  ('Water Bottle', 'Insulated stainless steel water bottle', 24.99, 200, 'Sports & Outdoors', 'https://example.com/water-bottle.jpg'),
  ('Bluetooth Speaker', 'Portable Bluetooth speaker with excellent sound quality', 89.99, 60, 'Electronics', 'https://example.com/speaker.jpg'),
  ('Yoga Mat', 'Non-slip yoga mat for exercise and meditation', 39.99, 85, 'Sports & Outdoors', 'https://example.com/yoga-mat.jpg')
  ON CONFLICT DO NOTHING;

  -- Create initial carts for users
  INSERT INTO carts (user_id) VALUES
  (2), (3)
  ON CONFLICT DO NOTHING;

  -- Insert sample cart items
  INSERT INTO cart_items (cart_id, product_id, quantity) VALUES
  (1, 1, 1),
  (1, 2, 2),
  (2, 3, 1),
  (2, 4, 1)
  ON CONFLICT DO NOTHING;
`;

async function setupDatabase() {
  try {
    console.log('Setting up database...');

    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✓ Database connection successful');

    // Create tables
    await pool.query(createTables);
    console.log('✓ Tables created successfully');

    // Insert seed data
    await pool.query(seedData);
    console.log('✓ Seed data inserted successfully');

    console.log('Database setup completed successfully!');

  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Function to drop all tables (for testing)
async function dropTables() {
  try {
    console.log('Dropping all tables...');

    const dropTablesQuery = `
      DROP TABLE IF EXISTS order_items CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS cart_items CASCADE;
      DROP TABLE IF EXISTS carts CASCADE;
      DROP TABLE IF EXISTS products CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
    `;

    await pool.query(dropTablesQuery);
    console.log('✓ All tables dropped successfully');

  } catch (error) {
    console.error('Error dropping tables:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--drop')) {
  dropTables();
} else {
  setupDatabase();
}
