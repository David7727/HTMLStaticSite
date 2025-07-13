const express = require('express');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const { validateProduct, validateProductUpdate, validateId, validatePagination, validateSearch } = require('../middleware/validation');
const db = require('../config/database');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - price
 *         - stock_quantity
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the product
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 255
 *           description: The product name
 *         description:
 *           type: string
 *           maxLength: 1000
 *           description: The product description
 *         price:
 *           type: number
 *           format: decimal
 *           minimum: 0.01
 *           description: The product price
 *         stock_quantity:
 *           type: integer
 *           minimum: 0
 *           description: The quantity in stock
 *         category:
 *           type: string
 *           maxLength: 100
 *           description: The product category
 *         image_url:
 *           type: string
 *           format: url
 *           description: URL to product image
 *         is_active:
 *           type: boolean
 *           description: Whether the product is active
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     ProductCreate:
 *       type: object
 *       required:
 *         - name
 *         - price
 *         - stock_quantity
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 255
 *         description:
 *           type: string
 *           maxLength: 1000
 *         price:
 *           type: number
 *           format: decimal
 *           minimum: 0.01
 *         stock_quantity:
 *           type: integer
 *           minimum: 0
 *         category:
 *           type: string
 *           maxLength: 100
 *         image_url:
 *           type: string
 *           format: url
 *         is_active:
 *           type: boolean
 *     ProductUpdate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 255
 *         description:
 *           type: string
 *           maxLength: 1000
 *         price:
 *           type: number
 *           format: decimal
 *           minimum: 0.01
 *         stock_quantity:
 *           type: integer
 *           minimum: 0
 *         category:
 *           type: string
 *           maxLength: 100
 *         image_url:
 *           type: string
 *           format: url
 *         is_active:
 *           type: boolean
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products with optional search and pagination
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of products per page
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query for product name or description
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: min_price
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: max_price
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: in_stock
 *         schema:
 *           type: boolean
 *         description: Filter for products in stock only
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       500:
 *         description: Internal server error
 */
router.get('/', validatePagination, validateSearch, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { q, category, min_price, max_price, in_stock } = req.query;

    // Build WHERE clause
    const conditions = ['is_active = true'];
    const params = [];
    let paramCount = 1;

    if (q) {
      conditions.push(`(name ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
      params.push(`%${q}%`);
      paramCount++;
    }

    if (category) {
      conditions.push(`category ILIKE $${paramCount}`);
      params.push(`%${category}%`);
      paramCount++;
    }

    if (min_price) {
      conditions.push(`price >= $${paramCount}`);
      params.push(parseFloat(min_price));
      paramCount++;
    }

    if (max_price) {
      conditions.push(`price <= $${paramCount}`);
      params.push(parseFloat(max_price));
      paramCount++;
    }

    if (in_stock === 'true') {
      conditions.push('stock_quantity > 0');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM products ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get products
    const productsQuery = `
      SELECT id, name, description, price, stock_quantity, category, image_url, is_active, created_at, updated_at
      FROM products
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const result = await db.query(productsQuery, [...params, limit, offset]);

    res.json({
      products: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve products'
    });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', validateId, async (req, res) => {
  try {
    const productId = req.params.id;

    const result = await db.query(
      'SELECT id, name, description, price, stock_quantity, category, image_url, is_active, created_at, updated_at FROM products WHERE id = $1 AND is_active = true',
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Product not found',
        message: 'Product with the specified ID not found'
      });
    }

    res.json({
      product: result.rows[0]
    });

  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve product'
    });
  }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductCreate'
 *           example:
 *             name: New Product
 *             description: A great new product
 *             price: 99.99
 *             stock_quantity: 50
 *             category: Electronics
 *             image_url: https://example.com/image.jpg
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin privileges required
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateToken, requireAdmin, validateProduct, async (req, res) => {
  try {
    const { name, description, price, stock_quantity, category, image_url, is_active } = req.body;

    const result = await db.query(
      `INSERT INTO products (name, description, price, stock_quantity, category, image_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, description, price, stock_quantity, category, image_url, is_active, created_at, updated_at`,
      [name, description || null, price, stock_quantity, category || null, image_url || null, is_active !== undefined ? is_active : true]
    );

    res.status(201).json({
      message: 'Product created successfully',
      product: result.rows[0]
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create product'
    });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update product by ID (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductUpdate'
 *           example:
 *             name: Updated Product Name
 *             price: 149.99
 *             stock_quantity: 25
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error or no fields to update
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin privileges required
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticateToken, requireAdmin, validateId, validateProductUpdate, async (req, res) => {
  try {
    const productId = req.params.id;
    const { name, description, price, stock_quantity, category, image_url, is_active } = req.body;

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      updateValues.push(name);
      paramCount++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramCount}`);
      updateValues.push(description);
      paramCount++;
    }

    if (price !== undefined) {
      updateFields.push(`price = $${paramCount}`);
      updateValues.push(price);
      paramCount++;
    }

    if (stock_quantity !== undefined) {
      updateFields.push(`stock_quantity = $${paramCount}`);
      updateValues.push(stock_quantity);
      paramCount++;
    }

    if (category !== undefined) {
      updateFields.push(`category = $${paramCount}`);
      updateValues.push(category);
      paramCount++;
    }

    if (image_url !== undefined) {
      updateFields.push(`image_url = $${paramCount}`);
      updateValues.push(image_url);
      paramCount++;
    }

    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount}`);
      updateValues.push(is_active);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'Update failed',
        message: 'No fields to update'
      });
    }

    // Add product ID to the end of values array
    updateValues.push(productId);

    const query = `
      UPDATE products
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, description, price, stock_quantity, category, image_url, is_active, created_at, updated_at
    `;

    const result = await db.query(query, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Product not found',
        message: 'Product with the specified ID not found'
      });
    }

    res.json({
      message: 'Product updated successfully',
      product: result.rows[0]
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update product'
    });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete product by ID (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin privileges required
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authenticateToken, requireAdmin, validateId, async (req, res) => {
  try {
    const productId = req.params.id;

    // Soft delete by setting is_active to false
    const result = await db.query(
      'UPDATE products SET is_active = false WHERE id = $1 AND is_active = true RETURNING id',
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Product not found',
        message: 'Product with the specified ID not found'
      });
    }

    res.json({
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete product'
    });
  }
});

/**
 * @swagger
 * /api/products/categories:
 *   get:
 *     summary: Get all product categories
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Internal server error
 */
router.get('/categories', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND is_active = true ORDER BY category'
    );

    const categories = result.rows.map(row => row.category);

    res.json({
      categories
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve categories'
    });
  }
});

module.exports = router;
