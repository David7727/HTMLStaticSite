const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validateCartItem, validateCartItemUpdate, validateId } = require('../middleware/validation');
const db = require('../config/database');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CartItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Cart item ID
 *         cart_id:
 *           type: integer
 *           description: Cart ID
 *         product_id:
 *           type: integer
 *           description: Product ID
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Quantity of the product
 *         product:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             name:
 *               type: string
 *             description:
 *               type: string
 *             price:
 *               type: number
 *               format: decimal
 *             stock_quantity:
 *               type: integer
 *             category:
 *               type: string
 *             image_url:
 *               type: string
 *         subtotal:
 *           type: number
 *           format: decimal
 *           description: Quantity * product price
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     Cart:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *         total_amount:
 *           type: number
 *           format: decimal
 *           description: Total amount of all items in cart
 *         total_items:
 *           type: integer
 *           description: Total number of items in cart
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     AddToCart:
 *       type: object
 *       required:
 *         - product_id
 *         - quantity
 *       properties:
 *         product_id:
 *           type: integer
 *           minimum: 1
 *           description: ID of the product to add
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: Quantity to add
 *     UpdateCartItem:
 *       type: object
 *       required:
 *         - quantity
 *       properties:
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           description: New quantity for the cart item
 */

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get current user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cart:
 *                   $ref: '#/components/schemas/Cart'
 *             example:
 *               cart:
 *                 id: 1
 *                 user_id: 1
 *                 items:
 *                   - id: 1
 *                     cart_id: 1
 *                     product_id: 1
 *                     quantity: 2
 *                     product:
 *                       id: 1
 *                       name: Laptop Computer
 *                       price: 999.99
 *                       stock_quantity: 50
 *                     subtotal: 1999.98
 *                 total_amount: 1999.98
 *                 total_items: 2
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get or create cart for user
    let cartResult = await db.query(
      'SELECT id, user_id, created_at, updated_at FROM carts WHERE user_id = $1',
      [userId]
    );

    if (cartResult.rows.length === 0) {
      // Create cart if it doesn't exist
      cartResult = await db.query(
        'INSERT INTO carts (user_id) VALUES ($1) RETURNING id, user_id, created_at, updated_at',
        [userId]
      );
    }

    const cart = cartResult.rows[0];

    // Get cart items with product details
    const itemsResult = await db.query(
      `SELECT
         ci.id, ci.cart_id, ci.product_id, ci.quantity, ci.created_at, ci.updated_at,
         p.name, p.description, p.price, p.stock_quantity, p.category, p.image_url,
         (ci.quantity * p.price) as subtotal
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1 AND p.is_active = true
       ORDER BY ci.created_at DESC`,
      [cart.id]
    );

    const items = itemsResult.rows.map(item => ({
      id: item.id,
      cart_id: item.cart_id,
      product_id: item.product_id,
      quantity: item.quantity,
      product: {
        id: item.product_id,
        name: item.name,
        description: item.description,
        price: parseFloat(item.price),
        stock_quantity: item.stock_quantity,
        category: item.category,
        image_url: item.image_url
      },
      subtotal: parseFloat(item.subtotal),
      created_at: item.created_at,
      updated_at: item.updated_at
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      cart: {
        id: cart.id,
        user_id: cart.user_id,
        items,
        total_amount: totalAmount,
        total_items: totalItems,
        created_at: cart.created_at,
        updated_at: cart.updated_at
      }
    });

  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve cart'
    });
  }
});

/**
 * @swagger
 * /api/cart/items:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddToCart'
 *           example:
 *             product_id: 1
 *             quantity: 2
 *     responses:
 *       201:
 *         description: Item added to cart successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 cart_item:
 *                   $ref: '#/components/schemas/CartItem'
 *       400:
 *         description: Validation error or insufficient stock
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */
router.post('/items', authenticateToken, validateCartItem, async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    const userId = req.user.id;

    // Check if product exists and is active
    const productResult = await db.query(
      'SELECT id, name, price, stock_quantity FROM products WHERE id = $1 AND is_active = true',
      [product_id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Product not found',
        message: 'Product not found or is not available'
      });
    }

    const product = productResult.rows[0];

    // Check if there's enough stock
    if (product.stock_quantity < quantity) {
      return res.status(400).json({
        error: 'Insufficient stock',
        message: `Only ${product.stock_quantity} items available in stock`
      });
    }

    // Get or create cart for user
    let cartResult = await db.query(
      'SELECT id FROM carts WHERE user_id = $1',
      [userId]
    );

    if (cartResult.rows.length === 0) {
      cartResult = await db.query(
        'INSERT INTO carts (user_id) VALUES ($1) RETURNING id',
        [userId]
      );
    }

    const cartId = cartResult.rows[0].id;

    // Check if item already exists in cart
    const existingItemResult = await db.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
      [cartId, product_id]
    );

    let cartItem;

    if (existingItemResult.rows.length > 0) {
      // Update existing item
      const existingItem = existingItemResult.rows[0];
      const newQuantity = existingItem.quantity + quantity;

      // Check if total quantity exceeds stock
      if (newQuantity > product.stock_quantity) {
        return res.status(400).json({
          error: 'Insufficient stock',
          message: `Cannot add ${quantity} more items. Only ${product.stock_quantity - existingItem.quantity} more items can be added`
        });
      }

      const updateResult = await db.query(
        `UPDATE cart_items
         SET quantity = $1
         WHERE id = $2
         RETURNING id, cart_id, product_id, quantity, created_at, updated_at`,
        [newQuantity, existingItem.id]
      );

      cartItem = updateResult.rows[0];
    } else {
      // Create new cart item
      const insertResult = await db.query(
        `INSERT INTO cart_items (cart_id, product_id, quantity)
         VALUES ($1, $2, $3)
         RETURNING id, cart_id, product_id, quantity, created_at, updated_at`,
        [cartId, product_id, quantity]
      );

      cartItem = insertResult.rows[0];
    }

    // Get full cart item details with product info
    const fullItemResult = await db.query(
      `SELECT
         ci.id, ci.cart_id, ci.product_id, ci.quantity, ci.created_at, ci.updated_at,
         p.name, p.description, p.price, p.stock_quantity, p.category, p.image_url,
         (ci.quantity * p.price) as subtotal
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.id = $1`,
      [cartItem.id]
    );

    const fullItem = fullItemResult.rows[0];

    const responseItem = {
      id: fullItem.id,
      cart_id: fullItem.cart_id,
      product_id: fullItem.product_id,
      quantity: fullItem.quantity,
      product: {
        id: fullItem.product_id,
        name: fullItem.name,
        description: fullItem.description,
        price: parseFloat(fullItem.price),
        stock_quantity: fullItem.stock_quantity,
        category: fullItem.category,
        image_url: fullItem.image_url
      },
      subtotal: parseFloat(fullItem.subtotal),
      created_at: fullItem.created_at,
      updated_at: fullItem.updated_at
    };

    res.status(201).json({
      message: 'Item added to cart successfully',
      cart_item: responseItem
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add item to cart'
    });
  }
});

/**
 * @swagger
 * /api/cart/items/{id}:
 *   put:
 *     summary: Update cart item quantity
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Cart item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCartItem'
 *           example:
 *             quantity: 3
 *     responses:
 *       200:
 *         description: Cart item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 cart_item:
 *                   $ref: '#/components/schemas/CartItem'
 *       400:
 *         description: Validation error or insufficient stock
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access forbidden (not your cart item)
 *       404:
 *         description: Cart item not found
 *       500:
 *         description: Internal server error
 */
router.put('/items/:id', authenticateToken, validateId, validateCartItemUpdate, async (req, res) => {
  try {
    const itemId = req.params.id;
    const { quantity } = req.body;
    const userId = req.user.id;

    // Check if cart item exists and belongs to user
    const itemResult = await db.query(
      `SELECT ci.id, ci.product_id, ci.quantity, c.user_id
       FROM cart_items ci
       JOIN carts c ON ci.cart_id = c.id
       WHERE ci.id = $1`,
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Cart item not found',
        message: 'Cart item with the specified ID not found'
      });
    }

    const cartItem = itemResult.rows[0];

    if (cartItem.user_id !== userId) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'You can only update items in your own cart'
      });
    }

    // Check product stock
    const productResult = await db.query(
      'SELECT stock_quantity FROM products WHERE id = $1 AND is_active = true',
      [cartItem.product_id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Product not found',
        message: 'Associated product not found or is not available'
      });
    }

    const stockQuantity = productResult.rows[0].stock_quantity;

    if (quantity > stockQuantity) {
      return res.status(400).json({
        error: 'Insufficient stock',
        message: `Only ${stockQuantity} items available in stock`
      });
    }

    // Update cart item
    const updateResult = await db.query(
      `UPDATE cart_items
       SET quantity = $1
       WHERE id = $2
       RETURNING id, cart_id, product_id, quantity, created_at, updated_at`,
      [quantity, itemId]
    );

    // Get full cart item details with product info
    const fullItemResult = await db.query(
      `SELECT
         ci.id, ci.cart_id, ci.product_id, ci.quantity, ci.created_at, ci.updated_at,
         p.name, p.description, p.price, p.stock_quantity, p.category, p.image_url,
         (ci.quantity * p.price) as subtotal
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.id = $1`,
      [itemId]
    );

    const fullItem = fullItemResult.rows[0];

    const responseItem = {
      id: fullItem.id,
      cart_id: fullItem.cart_id,
      product_id: fullItem.product_id,
      quantity: fullItem.quantity,
      product: {
        id: fullItem.product_id,
        name: fullItem.name,
        description: fullItem.description,
        price: parseFloat(fullItem.price),
        stock_quantity: fullItem.stock_quantity,
        category: fullItem.category,
        image_url: fullItem.image_url
      },
      subtotal: parseFloat(fullItem.subtotal),
      created_at: fullItem.created_at,
      updated_at: fullItem.updated_at
    };

    res.json({
      message: 'Cart item updated successfully',
      cart_item: responseItem
    });

  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update cart item'
    });
  }
});

/**
 * @swagger
 * /api/cart/items/{id}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Cart item ID
 *     responses:
 *       200:
 *         description: Item removed from cart successfully
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
 *         description: Access forbidden (not your cart item)
 *       404:
 *         description: Cart item not found
 *       500:
 *         description: Internal server error
 */
router.delete('/items/:id', authenticateToken, validateId, async (req, res) => {
  try {
    const itemId = req.params.id;
    const userId = req.user.id;

    // Check if cart item exists and belongs to user
    const itemResult = await db.query(
      `SELECT ci.id, c.user_id
       FROM cart_items ci
       JOIN carts c ON ci.cart_id = c.id
       WHERE ci.id = $1`,
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Cart item not found',
        message: 'Cart item with the specified ID not found'
      });
    }

    const cartItem = itemResult.rows[0];

    if (cartItem.user_id !== userId) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'You can only remove items from your own cart'
      });
    }

    // Delete cart item
    await db.query('DELETE FROM cart_items WHERE id = $1', [itemId]);

    res.json({
      message: 'Item removed from cart successfully'
    });

  } catch (error) {
    console.error('Remove cart item error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to remove item from cart'
    });
  }
});

/**
 * @swagger
 * /api/cart/clear:
 *   delete:
 *     summary: Clear all items from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete all cart items for the user
    await db.query(
      `DELETE FROM cart_items
       WHERE cart_id IN (SELECT id FROM carts WHERE user_id = $1)`,
      [userId]
    );

    res.json({
      message: 'Cart cleared successfully'
    });

  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to clear cart'
    });
  }
});

module.exports = router;
