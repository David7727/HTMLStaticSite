const express = require('express');
const { authenticateToken, requireAdmin, requireOwnershipOrAdmin } = require('../middleware/auth');
const { validateOrder, validateOrderStatusUpdate, validateId, validatePagination } = require('../middleware/validation');
const db = require('../config/database');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Order ID
 *         user_id:
 *           type: integer
 *           description: User ID who placed the order
 *         total_amount:
 *           type: number
 *           format: decimal
 *           description: Total amount of the order
 *         status:
 *           type: string
 *           enum: [pending, processing, shipped, delivered, cancelled]
 *           description: Order status
 *         shipping_address:
 *           type: string
 *           description: Shipping address
 *         billing_address:
 *           type: string
 *           description: Billing address
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderItem'
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     OrderItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         order_id:
 *           type: integer
 *         product_id:
 *           type: integer
 *         quantity:
 *           type: integer
 *         price:
 *           type: number
 *           format: decimal
 *         product:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *             description:
 *               type: string
 *             category:
 *               type: string
 *             image_url:
 *               type: string
 *         subtotal:
 *           type: number
 *           format: decimal
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     CreateOrder:
 *       type: object
 *       required:
 *         - shipping_address
 *       properties:
 *         shipping_address:
 *           type: string
 *           minLength: 10
 *           maxLength: 500
 *           description: Shipping address
 *         billing_address:
 *           type: string
 *           minLength: 10
 *           maxLength: 500
 *           description: Billing address (optional, defaults to shipping address)
 *     UpdateOrderStatus:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [pending, processing, shipped, delivered, cancelled]
 *           description: New order status
 */

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get user's orders (or all orders for admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
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
 *         description: Number of orders per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, shipped, delivered, cancelled]
 *         description: Filter by order status
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
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
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateToken, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { status } = req.query;
    const userId = req.user.id;
    const isAdmin = req.user.is_admin;

    // Build WHERE clause
    const conditions = [];
    const params = [];
    let paramCount = 1;

    if (!isAdmin) {
      conditions.push(`user_id = $${paramCount}`);
      params.push(userId);
      paramCount++;
    }

    if (status) {
      conditions.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM orders ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get orders
    const ordersQuery = `
      SELECT o.id, o.user_id, o.total_amount, o.status, o.shipping_address, o.billing_address, o.created_at, o.updated_at,
             u.first_name, u.last_name, u.email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const ordersResult = await db.query(ordersQuery, [...params, limit, offset]);

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      ordersResult.rows.map(async (order) => {
        const itemsResult = await db.query(
          `SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price, oi.created_at, oi.updated_at,
                  p.name, p.description, p.category, p.image_url,
                  (oi.quantity * oi.price) as subtotal
           FROM order_items oi
           JOIN products p ON oi.product_id = p.id
           WHERE oi.order_id = $1
           ORDER BY oi.created_at`,
          [order.id]
        );

        const items = itemsResult.rows.map(item => ({
          id: item.id,
          order_id: item.order_id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: parseFloat(item.price),
          product: {
            id: item.product_id,
            name: item.name,
            description: item.description,
            category: item.category,
            image_url: item.image_url
          },
          subtotal: parseFloat(item.subtotal),
          created_at: item.created_at,
          updated_at: item.updated_at
        }));

        return {
          id: order.id,
          user_id: order.user_id,
          total_amount: parseFloat(order.total_amount),
          status: order.status,
          shipping_address: order.shipping_address,
          billing_address: order.billing_address,
          user: isAdmin ? {
            first_name: order.first_name,
            last_name: order.last_name,
            email: order.email
          } : undefined,
          items,
          created_at: order.created_at,
          updated_at: order.updated_at
        };
      })
    );

    res.json({
      orders: ordersWithItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve orders'
    });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order:
 *                   $ref: '#/components/schemas/Order'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access forbidden (not your order)
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticateToken, validateId, async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.is_admin;

    // Get order
    const orderResult = await db.query(
      `SELECT o.id, o.user_id, o.total_amount, o.status, o.shipping_address, o.billing_address, o.created_at, o.updated_at,
              u.first_name, u.last_name, u.email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Order not found',
        message: 'Order with the specified ID not found'
      });
    }

    const order = orderResult.rows[0];

    // Check if user owns the order or is admin
    if (!isAdmin && order.user_id !== userId) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'You can only access your own orders'
      });
    }

    // Get order items
    const itemsResult = await db.query(
      `SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price, oi.created_at, oi.updated_at,
              p.name, p.description, p.category, p.image_url,
              (oi.quantity * oi.price) as subtotal
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1
       ORDER BY oi.created_at`,
      [orderId]
    );

    const items = itemsResult.rows.map(item => ({
      id: item.id,
      order_id: item.order_id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: parseFloat(item.price),
      product: {
        id: item.product_id,
        name: item.name,
        description: item.description,
        category: item.category,
        image_url: item.image_url
      },
      subtotal: parseFloat(item.subtotal),
      created_at: item.created_at,
      updated_at: item.updated_at
    }));

    res.json({
      order: {
        id: order.id,
        user_id: order.user_id,
        total_amount: parseFloat(order.total_amount),
        status: order.status,
        shipping_address: order.shipping_address,
        billing_address: order.billing_address,
        user: isAdmin ? {
          first_name: order.first_name,
          last_name: order.last_name,
          email: order.email
        } : undefined,
        items,
        created_at: order.created_at,
        updated_at: order.updated_at
      }
    });

  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve order'
    });
  }
});

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order from cart
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrder'
 *           example:
 *             shipping_address: "123 Main St, City, State 12345"
 *             billing_address: "123 Main St, City, State 12345"
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 order:
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         description: Validation error or empty cart
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateToken, validateOrder, async (req, res) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const { shipping_address, billing_address } = req.body;
    const userId = req.user.id;

    // Get user's cart
    const cartResult = await client.query(
      'SELECT id FROM carts WHERE user_id = $1',
      [userId]
    );

    if (cartResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Order creation failed',
        message: 'No cart found for user'
      });
    }

    const cartId = cartResult.rows[0].id;

    // Get cart items with product details
    const cartItemsResult = await client.query(
      `SELECT ci.product_id, ci.quantity, p.price, p.stock_quantity, p.name
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1 AND p.is_active = true`,
      [cartId]
    );

    if (cartItemsResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Order creation failed',
        message: 'Cart is empty'
      });
    }

    const cartItems = cartItemsResult.rows;

    // Check stock availability and calculate total
    let totalAmount = 0;
    for (const item of cartItems) {
      if (item.quantity > item.stock_quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Insufficient stock',
          message: `Not enough stock for ${item.name}. Available: ${item.stock_quantity}, Requested: ${item.quantity}`
        });
      }
      totalAmount += item.quantity * parseFloat(item.price);
    }

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, total_amount, shipping_address, billing_address)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, total_amount, status, shipping_address, billing_address, created_at, updated_at`,
      [userId, totalAmount, shipping_address, billing_address || shipping_address]
    );

    const order = orderResult.rows[0];

    // Create order items and update stock
    const orderItems = [];
    for (const item of cartItems) {
      // Create order item
      const orderItemResult = await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)
         RETURNING id, order_id, product_id, quantity, price, created_at, updated_at`,
        [order.id, item.product_id, item.quantity, item.price]
      );

      orderItems.push(orderItemResult.rows[0]);

      // Update product stock
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    // Clear cart
    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);

    await client.query('COMMIT');

    // Get full order details with items
    const fullOrderResult = await db.query(
      `SELECT o.id, o.user_id, o.total_amount, o.status, o.shipping_address, o.billing_address, o.created_at, o.updated_at
       FROM orders o
       WHERE o.id = $1`,
      [order.id]
    );

    const itemsResult = await db.query(
      `SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price, oi.created_at, oi.updated_at,
              p.name, p.description, p.category, p.image_url,
              (oi.quantity * oi.price) as subtotal
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1
       ORDER BY oi.created_at`,
      [order.id]
    );

    const items = itemsResult.rows.map(item => ({
      id: item.id,
      order_id: item.order_id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: parseFloat(item.price),
      product: {
        id: item.product_id,
        name: item.name,
        description: item.description,
        category: item.category,
        image_url: item.image_url
      },
      subtotal: parseFloat(item.subtotal),
      created_at: item.created_at,
      updated_at: item.updated_at
    }));

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: order.id,
        user_id: order.user_id,
        total_amount: parseFloat(order.total_amount),
        status: order.status,
        shipping_address: order.shipping_address,
        billing_address: order.billing_address,
        items,
        created_at: order.created_at,
        updated_at: order.updated_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create order error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create order'
    });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update order status (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateOrderStatus'
 *           example:
 *             status: shipped
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 order:
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin privileges required
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id/status', authenticateToken, requireAdmin, validateId, validateOrderStatusUpdate, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    // Update order status
    const result = await db.query(
      `UPDATE orders
       SET status = $1
       WHERE id = $2
       RETURNING id, user_id, total_amount, status, shipping_address, billing_address, created_at, updated_at`,
      [status, orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Order not found',
        message: 'Order with the specified ID not found'
      });
    }

    const order = result.rows[0];

    // Get order items
    const itemsResult = await db.query(
      `SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price, oi.created_at, oi.updated_at,
              p.name, p.description, p.category, p.image_url,
              (oi.quantity * oi.price) as subtotal
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1
       ORDER BY oi.created_at`,
      [orderId]
    );

    const items = itemsResult.rows.map(item => ({
      id: item.id,
      order_id: item.order_id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: parseFloat(item.price),
      product: {
        id: item.product_id,
        name: item.name,
        description: item.description,
        category: item.category,
        image_url: item.image_url
      },
      subtotal: parseFloat(item.subtotal),
      created_at: item.created_at,
      updated_at: item.updated_at
    }));

    res.json({
      message: 'Order status updated successfully',
      order: {
        id: order.id,
        user_id: order.user_id,
        total_amount: parseFloat(order.total_amount),
        status: order.status,
        shipping_address: order.shipping_address,
        billing_address: order.billing_address,
        items,
        created_at: order.created_at,
        updated_at: order.updated_at
      }
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update order status'
    });
  }
});

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   put:
 *     summary: Cancel order (only if status is pending or processing)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 order:
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         description: Order cannot be cancelled
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access forbidden (not your order)
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id/cancel', authenticateToken, validateId, async (req, res) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const orderId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.is_admin;

    // Get order
    const orderResult = await client.query(
      'SELECT id, user_id, status FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Order not found',
        message: 'Order with the specified ID not found'
      });
    }

    const order = orderResult.rows[0];

    // Check if user owns the order or is admin
    if (!isAdmin && order.user_id !== userId) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'You can only cancel your own orders'
      });
    }

    // Check if order can be cancelled
    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({
        error: 'Cancellation failed',
        message: 'Order cannot be cancelled. Only pending or processing orders can be cancelled.'
      });
    }

    // Get order items to restore stock
    const itemsResult = await client.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
      [orderId]
    );

    // Restore stock for each item
    for (const item of itemsResult.rows) {
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    // Update order status to cancelled
    const updateResult = await client.query(
      `UPDATE orders
       SET status = 'cancelled'
       WHERE id = $1
       RETURNING id, user_id, total_amount, status, shipping_address, billing_address, created_at, updated_at`,
      [orderId]
    );

    await client.query('COMMIT');

    // Get full order details
    const fullItemsResult = await db.query(
      `SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price, oi.created_at, oi.updated_at,
              p.name, p.description, p.category, p.image_url,
              (oi.quantity * oi.price) as subtotal
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1
       ORDER BY oi.created_at`,
      [orderId]
    );

    const items = fullItemsResult.rows.map(item => ({
      id: item.id,
      order_id: item.order_id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: parseFloat(item.price),
      product: {
        id: item.product_id,
        name: item.name,
        description: item.description,
        category: item.category,
        image_url: item.image_url
      },
      subtotal: parseFloat(item.subtotal),
      created_at: item.created_at,
      updated_at: item.updated_at
    }));

    const updatedOrder = updateResult.rows[0];

    res.json({
      message: 'Order cancelled successfully',
      order: {
        id: updatedOrder.id,
        user_id: updatedOrder.user_id,
        total_amount: parseFloat(updatedOrder.total_amount),
        status: updatedOrder.status,
        shipping_address: updatedOrder.shipping_address,
        billing_address: updatedOrder.billing_address,
        items,
        created_at: updatedOrder.created_at,
        updated_at: updatedOrder.updated_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cancel order error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to cancel order'
    });
  } finally {
    client.release();
  }
});

module.exports = router;
