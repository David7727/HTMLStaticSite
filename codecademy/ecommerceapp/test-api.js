const axios = require('axios');

// Base URL for the API
const BASE_URL = 'http://localhost:3000';

// Test user data
const testUser = {
  email: 'test@example.com',
  password: 'Password123',
  first_name: 'Test',
  last_name: 'User'
};

// Store authentication token
let authToken = '';

// Helper function to make authenticated requests
const authenticatedRequest = (method, url, data = null) => {
  const config = {
    method,
    url: `${BASE_URL}${url}`,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` })
    }
  };

  if (data) {
    config.data = data;
  }

  return axios(config);
};

// Helper function to log test results
const logTest = (testName, success, data = null, error = null) => {
  const status = success ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${status} - ${testName}`);

  if (success && data) {
    console.log('Response:', JSON.stringify(data, null, 2));
  }

  if (!success && error) {
    console.log('Error:', error.response?.data || error.message);
  }
};

// Test functions
async function testHealthCheck() {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    logTest('Health Check', true, response.data);
  } catch (error) {
    logTest('Health Check', false, null, error);
  }
}

async function testUserRegistration() {
  try {
    const response = await authenticatedRequest('POST', '/api/auth/register', testUser);
    authToken = response.data.token;
    logTest('User Registration', true, response.data);
  } catch (error) {
    logTest('User Registration', false, null, error);
  }
}

async function testUserLogin() {
  try {
    const response = await authenticatedRequest('POST', '/api/auth/login', {
      email: testUser.email,
      password: testUser.password
    });
    authToken = response.data.token;
    logTest('User Login', true, response.data);
  } catch (error) {
    logTest('User Login', false, null, error);
  }
}

async function testGetProfile() {
  try {
    const response = await authenticatedRequest('GET', '/api/users/profile');
    logTest('Get User Profile', true, response.data);
  } catch (error) {
    logTest('Get User Profile', false, null, error);
  }
}

async function testGetProducts() {
  try {
    const response = await authenticatedRequest('GET', '/api/products?page=1&limit=5');
    logTest('Get Products', true, response.data);
    return response.data.products;
  } catch (error) {
    logTest('Get Products', false, null, error);
    return [];
  }
}

async function testGetProductById(productId) {
  try {
    const response = await authenticatedRequest('GET', `/api/products/${productId}`);
    logTest(`Get Product by ID (${productId})`, true, response.data);
  } catch (error) {
    logTest(`Get Product by ID (${productId})`, false, null, error);
  }
}

async function testAddToCart(productId) {
  try {
    const response = await authenticatedRequest('POST', '/api/cart/items', {
      product_id: productId,
      quantity: 2
    });
    logTest('Add to Cart', true, response.data);
  } catch (error) {
    logTest('Add to Cart', false, null, error);
  }
}

async function testGetCart() {
  try {
    const response = await authenticatedRequest('GET', '/api/cart');
    logTest('Get Cart', true, response.data);
    return response.data.cart;
  } catch (error) {
    logTest('Get Cart', false, null, error);
    return null;
  }
}

async function testUpdateCartItem(cartItemId) {
  try {
    const response = await authenticatedRequest('PUT', `/api/cart/items/${cartItemId}`, {
      quantity: 3
    });
    logTest('Update Cart Item', true, response.data);
  } catch (error) {
    logTest('Update Cart Item', false, null, error);
  }
}

async function testCreateOrder() {
  try {
    const response = await authenticatedRequest('POST', '/api/orders', {
      shipping_address: '123 Test Street, Test City, TS 12345',
      billing_address: '123 Test Street, Test City, TS 12345'
    });
    logTest('Create Order', true, response.data);
    return response.data.order;
  } catch (error) {
    logTest('Create Order', false, null, error);
    return null;
  }
}

async function testGetOrders() {
  try {
    const response = await authenticatedRequest('GET', '/api/orders');
    logTest('Get Orders', true, response.data);
  } catch (error) {
    logTest('Get Orders', false, null, error);
  }
}

async function testProductSearch() {
  try {
    const response = await authenticatedRequest('GET', '/api/products?q=laptop&category=Electronics');
    logTest('Product Search', true, response.data);
  } catch (error) {
    logTest('Product Search', false, null, error);
  }
}

async function testGetCategories() {
  try {
    const response = await authenticatedRequest('GET', '/api/products/categories');
    logTest('Get Categories', true, response.data);
  } catch (error) {
    logTest('Get Categories', false, null, error);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting E-commerce API Tests...');
  console.log('=====================================');

  // Health check
  await testHealthCheck();

  // Authentication tests
  console.log('\n📝 Authentication Tests');
  console.log('------------------------');
  await testUserRegistration();
  await testUserLogin();
  await testGetProfile();

  // Product tests
  console.log('\n🛍️ Product Tests');
  console.log('------------------');
  const products = await testGetProducts();
  if (products.length > 0) {
    await testGetProductById(products[0].id);
  }
  await testProductSearch();
  await testGetCategories();

  // Cart tests
  console.log('\n🛒 Cart Tests');
  console.log('---------------');
  if (products.length > 0) {
    await testAddToCart(products[0].id);
    const cart = await testGetCart();
    if (cart && cart.items.length > 0) {
      await testUpdateCartItem(cart.items[0].id);
    }
  }

  // Order tests
  console.log('\n📦 Order Tests');
  console.log('----------------');
  const order = await testCreateOrder();
  await testGetOrders();

  console.log('\n🎉 Tests completed!');
  console.log('=====================================');
  console.log('\n📚 API Documentation available at: http://localhost:3000/api-docs');
  console.log('🔍 Health check available at: http://localhost:3000/health');

  console.log('\n💡 Sample API calls:');
  console.log('- GET /api/products - Get all products');
  console.log('- POST /api/auth/login - Login user');
  console.log('- GET /api/cart - Get user cart');
  console.log('- POST /api/orders - Create order');
}

// Error handling for the script
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled Promise Rejection:', error.message);
  if (error.code === 'ECONNREFUSED') {
    console.log('\n💡 Make sure the server is running on http://localhost:3000');
    console.log('   Run: npm run dev');
  }
  process.exit(1);
});

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.log('❌ Server is not running on http://localhost:3000');
    console.log('💡 Please start the server first:');
    console.log('   npm run dev');
    process.exit(1);
  }

  await runTests();
}

// Run the tests
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  runTests,
  checkServer,
  BASE_URL
};
