const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = process.env.PORT || 5000;
require('dotenv').config();

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/krishnamart', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
})
.then(() => {
    console.log('Connected to MongoDB successfully');
    // Verify the connection
    const db = mongoose.connection;
    console.log('Database name:', db.name);
    console.log('Database host:', db.host);
    console.log('Database port:', db.port);
})
.catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit the process if we can't connect to MongoDB
});

// Add connection event handlers
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected from MongoDB');
});

// Handle process termination
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
    } catch (err) {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
    }
});

// Cart Item Schema
const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

// Order Schema
const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        name: String,
        price: Number,
        quantity: Number,
        image: String
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    shippingAddress: {
        name: String,
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
        phone: String
    },
    paymentMethod: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// User Information Schema
const userInfoSchema = new mongoose.Schema({
    addresses: [{
        type: {
            type: String,
            enum: ['home', 'office', 'other'],
            required: true
        },
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
        isDefault: {
            type: Boolean,
            default: false
        }
    }],
    phone: String,
    preferences: {
        language: {
            type: String,
            default: 'en'
        },
        currency: {
            type: String,
            default: 'USD'
        },
        notifications: {
            email: {
                type: Boolean,
                default: true
            },
            sms: {
                type: Boolean,
                default: false
            }
        }
    }
});

// User Schema
const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Name is required'],
        trim: true
    },
    username: { 
        type: String, 
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
        maxlength: [20, 'Username cannot be more than 20 characters long'],
        match: [/^[a-zA-Z0-9]+$/, 'Username can only contain letters and numbers']
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
    },
    password: { 
        type: String, 
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long']
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    cart: [cartItemSchema],
    orders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    }],
    info: userInfoSchema,
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema);

// Product Schema
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    stock: { type: Number, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

// Category Schema
const categorySchema = new mongoose.Schema({
    name: String,
    image: String,
    description: String
});

const Category = mongoose.model('Category', categorySchema);

// Order Schema
const Order = mongoose.model('Order', orderSchema);

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ message: 'Access denied' });

    jwt.verify(token, 'your-secret-key', (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
    try {
        // Check MongoDB connection
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({ 
                success: false,
                message: 'Database connection error. Please try again later.' 
            });
        }

        const { name, username, email, password } = req.body;
        
        // Check for existing email and username
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            const field = existingUser.email === email ? 'email' : 'username';
            return res.status(400).json({
                success: false,
                message: `This ${field} is already registered`,
                field
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const user = new User({
            name,
            username,
            email,
            password: hashedPassword
        });

        // Save user
        const savedUser = await user.save();
        
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                id: savedUser._id,
                name: savedUser.name,
                username: savedUser.username,
                email: savedUser.email,
                createdAt: savedUser.createdAt
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        // Handle duplicate key error
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                success: false,
                message: `This ${field} is already registered`,
                field
            });
        }

        res.status(500).json({
            success: false,
            message: 'An error occurred during signup. Please try again.'
        });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign({ id: user._id }, 'your-secret-key');
        
        // Return user data along with token
        res.json({ 
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                joinDate: user.joinDate,
                status: user.status
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get current user data
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all products
app.get('/api/products', async (req, res) => {
    try {
        console.log('MongoDB Connection Status:', mongoose.connection.readyState);
        console.log('MongoDB Connection String:', process.env.MONGODB_URI);
        
        if (mongoose.connection.readyState !== 1) {
            console.error('MongoDB is not connected');
            return res.status(500).json({
                success: false,
                error: 'Database connection error',
                message: 'MongoDB is not connected'
            });
        }

        console.log('Fetching products with query:', req.query);
        const { category, sort } = req.query;
        let query = {};
        
        if (category) {
            query.category = category;
        }
        
        let sortOption = { createdAt: -1 }; // Default sort by newest
        if (sort === 'price-low') {
            sortOption = { price: 1 };
        } else if (sort === 'price-high') {
            sortOption = { price: -1 };
        }
        
        console.log('MongoDB query:', query);
        console.log('Sort option:', sortOption);
        
        const products = await Product.find(query).sort(sortOption);
        console.log('Found products:', products.length);
        
        if (!products || products.length === 0) {
            console.log('No products found in database');
            return res.status(200).json({
                success: true,
                message: 'No products found',
                products: []
            });
        }
        
        res.json({
            success: true,
            products
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Error fetching products',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        console.log('Received product data:', req.body);
        const product = new Product(req.body);
        const savedProduct = await product.save();
        console.log('Product saved successfully:', savedProduct);
        res.status(201).json(savedProduct);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(400).json({ 
            error: 'Error creating product', 
            details: error.message,
            validationErrors: error.errors
        });
    }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        console.log('Updating product:', req.params.id, 'with data:', req.body);
        const product = await Product.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { 
                new: true,
                runValidators: true 
            }
        );
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        console.log('Product updated successfully:', product);
        res.json(product);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(400).json({ 
            error: 'Error updating product', 
            details: error.message,
            validationErrors: error.errors
        });
    }
});

app.get('/api/products/featured', async (req, res) => {
    try {
        const products = await Product.find().limit(4);
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Category Routes
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Order Routes
app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { items, shippingAddress, paymentMethod } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Calculate total amount
        const totalAmount = items.reduce((total, item) => total + (item.price * item.quantity), 0);

        // Create order
        const order = new Order({
            orderId: `ORD-${Date.now()}`,
            items,
            totalAmount,
            shippingAddress,
            paymentMethod,
            status: 'pending',
            paymentStatus: 'pending',
            user: user._id // Associate order with user
        });

        // Save order
        const savedOrder = await order.save();

        // Add order to user's orders
        user.orders.push(savedOrder._id);
        
        // Clear user's cart after successful order
        user.cart = [];
        
        await user.save();

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            order: savedOrder
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating order',
            error: error.message
        });
    }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate({
                path: 'orders',
                populate: {
                    path: 'items.product'
                }
            });
            
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            orders: user.orders
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching orders',
            error: error.message
        });
    }
});

app.get('/api/orders/:status', async (req, res) => {
    try {
        const orders = await Order.find({ status: req.params.status }).sort({ date: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching orders' });
    }
});

app.get('/api/order/:orderId', async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.orderId });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching order' });
    }
});

app.put('/api/orders/:orderId/status', async (req, res) => {
    try {
        const order = await Order.findOneAndUpdate(
            { orderId: req.params.orderId },
            { status: req.body.status },
            { new: true }
        );
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Error updating order status' });
    }
});

app.put('/api/orders/:orderId/cancel', async (req, res) => {
    try {
        const order = await Order.findOneAndUpdate(
            { orderId: req.params.orderId },
            { status: 'cancelled' },
            { new: true }
        );
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Error cancelling order' });
    }
});

// User Routes
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find().sort({ joinDate: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching users' });
    }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate('orders');
        res.json(user);
    } catch (error) {
        res.status(404).json({ error: 'User not found' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: 'Error updating user' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ error: 'Error deleting user' });
    }
});

// Newsletter subscription
app.post('/api/newsletter', async (req, res) => {
    try {
        const { email } = req.body;
        // Here you would typically save the email to your database
        res.json({ message: 'Successfully subscribed to newsletter' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Cart Routes
app.post('/api/cart/add', authenticateToken, async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check if product is already in cart
        const existingItem = user.cart.find(item => item.product.toString() === productId);
        if (existingItem) {
            existingItem.quantity += quantity || 1;
        } else {
            user.cart.push({
                product: productId,
                quantity: quantity || 1
            });
        }

        await user.save();
        
        // Populate product details for response
        await user.populate('cart.product');
        
        res.json({
            success: true,
            message: 'Product added to cart',
            cart: user.cart
        });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding to cart',
            error: error.message
        });
    }
});

app.get('/api/cart', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('cart.product');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            cart: user.cart
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching cart',
            error: error.message
        });
    }
});

app.delete('/api/cart/:productId', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.cart = user.cart.filter(item => item.product.toString() !== req.params.productId);
        await user.save();

        res.json({
            success: true,
            message: 'Product removed from cart',
            cart: user.cart
        });
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing from cart',
            error: error.message
        });
    }
});

// Dashboard Routes
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('cart.product')
            .populate('orders');
        
        res.json({
            cart: user.cart,
            orders: user.orders
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update user profile
app.put('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.name = name;
        user.email = email;
        user.phone = phone;
        
        await user.save();
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        res.status(400).json({ error: 'Error updating profile' });
    }
});

// Update user address
app.put('/api/users/address', authenticateToken, async (req, res) => {
    try {
        const { type, street, city, state, zipCode, country } = req.body;
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const address = {
            type,
            street,
            city,
            state,
            zipCode,
            country
        };

        // Check if address type already exists
        const existingAddressIndex = user.addresses.findIndex(addr => addr.type === type);
        if (existingAddressIndex !== -1) {
            user.addresses[existingAddressIndex] = address;
        } else {
            user.addresses.push(address);
        }

        await user.save();
        res.json({ message: 'Address updated successfully' });
    } catch (error) {
        res.status(400).json({ error: 'Error updating address' });
    }
});

// Change password
app.put('/api/users/password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        
        await user.save();
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(400).json({ error: 'Error updating password' });
    }
});

// Check database status
app.get('/api/status', async (req, res) => {
    try {
        const productCount = await Product.countDocuments();
        const categories = await Product.distinct('category');
        
        res.json({
            success: true,
            database: {
                connected: mongoose.connection.readyState === 1,
                productCount,
                categories
            }
        });
    } catch (error) {
        console.error('Error checking database status:', error);
        res.status(500).json({
            success: false,
            error: 'Error checking database status',
            message: error.message
        });
    }
});

// Address Routes
app.post('/api/addresses', authenticateToken, async (req, res) => {
    try {
        const { type, street, city, state, zipCode, country } = req.body;
        
        // Validate required fields
        if (!type || !street || !city || !state || !zipCode || !country) {
            return res.status(400).json({
                success: false,
                message: 'All address fields are required'
            });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if address type already exists
        const existingAddress = user.addresses.find(addr => addr.type === type);
        if (existingAddress) {
            return res.status(400).json({
                success: false,
                message: 'Address type already exists'
            });
        }

        // Add new address
        user.addresses.push({
            type,
            street,
            city,
            state,
            zipCode,
            country
        });

        await user.save();

        res.json({
            success: true,
            message: 'Address added successfully',
            addresses: user.addresses
        });
    } catch (error) {
        console.error('Error adding address:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding address',
            error: error.message
        });
    }
});

app.get('/api/addresses', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            addresses: user.addresses
        });
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching addresses',
            error: error.message
        });
    }
});

app.delete('/api/addresses/:type', authenticateToken, async (req, res) => {
    try {
        const { type } = req.params;
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Remove address by type
        user.addresses = user.addresses.filter(addr => addr.type !== type);
        await user.save();

        res.json({
            success: true,
            message: 'Address deleted successfully',
            addresses: user.addresses
        });
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting address',
            error: error.message
        });
    }
});

// Payment Routes
app.post('/api/payments/create-order', authenticateToken, async (req, res) => {
    try {
        const { amount, currency = 'INR', items } = req.body;
        
        // Validate required fields
        if (!amount || !items || !Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                message: 'Amount and items are required'
            });
        }

        // Here you would typically integrate with a payment gateway
        // For this example, we'll create a mock order
        const order = {
            orderId: `ORD-${Date.now()}`,
            amount,
            currency,
            items,
            status: 'pending',
            createdAt: new Date()
        };

        // Save order to user's orders
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.orders.push(order);
        await user.save();

        res.json({
            success: true,
            order,
            message: 'Order created successfully'
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating order',
            error: error.message
        });
    }
});

app.post('/api/payments/verify', authenticateToken, async (req, res) => {
    try {
        const { orderId, paymentId, signature } = req.body;
        
        // Validate required fields
        if (!orderId || !paymentId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and Payment ID are required'
            });
        }

        // Here you would typically verify the payment with your payment gateway
        // For this example, we'll simulate a successful payment
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Find and update the order
        const order = user.orders.find(o => o.orderId === orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        order.status = 'completed';
        order.paymentId = paymentId;
        order.completedAt = new Date();

        await user.save();

        res.json({
            success: true,
            order,
            message: 'Payment verified successfully'
        });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying payment',
            error: error.message
        });
    }
});

app.get('/api/payments/orders', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            orders: user.orders
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching orders',
            error: error.message
        });
    }
});

// User Information Routes
app.put('/api/user/info', authenticateToken, async (req, res) => {
    try {
        const { addresses, phone, preferences } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update user info
        user.info = {
            ...user.info,
            addresses: addresses || user.info.addresses,
            phone: phone || user.info.phone,
            preferences: preferences || user.info.preferences
        };

        await user.save();
        res.json({
            success: true,
            message: 'User information updated successfully',
            info: user.info
        });
    } catch (error) {
        console.error('Error updating user info:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user information',
            error: error.message
        });
    }
});

app.get('/api/user/info', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json({
            success: true,
            info: user.info
        });
    } catch (error) {
        console.error('Error fetching user info:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user information',
            error: error.message
        });
    }
});

// User Data API Endpoints
app.get('/api/user/data', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password')
            .populate('orders')
            .populate('cart.items.product');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            userData: {
                name: user.name,
                email: user.email,
                username: user.username,
                info: user.info
            },
            orders: user.orders,
            cart: user.cart
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ message: 'Error fetching user data' });
    }
});

app.post('/api/user/data/update', authenticateToken, async (req, res) => {
    try {
        const { name, email, info } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (name) user.name = name;
        if (email) user.email = email;
        if (info) user.info = info;

        await user.save();
        res.json({ message: 'User data updated successfully', user: user });
    } catch (error) {
        console.error('Error updating user data:', error);
        res.status(500).json({ message: 'Error updating user data' });
    }
});

app.get('/api/user/orders', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('orders');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user.orders);
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ message: 'Error fetching user orders' });
    }
});

app.get('/api/user/cart', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('cart.items.product');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user.cart);
    } catch (error) {
        console.error('Error fetching user cart:', error);
        res.status(500).json({ message: 'Error fetching user cart' });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin Schema
const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'superadmin'],
        default: 'admin'
    },
    lastLogin: {
        type: Date,
        default: Date.now
    }
});

const Admin = mongoose.model('Admin', adminSchema);

// Admin Authentication Middleware
const authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findById(decoded.id);
        
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        req.admin = admin;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

// Admin Routes
app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin/views/login.html'));
});

app.get('/admin/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin/views/dashboard.html'));
});

// Admin API Routes
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await Admin.findOne({ username });

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const validPassword = await bcrypt.compare(password, admin.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);
        admin.lastLogin = Date.now();
        await admin.save();

        res.json({
            success: true,
            token,
            admin: {
                id: admin._id,
                name: admin.name,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during login'
        });
    }
});

app.get('/admin/api/verify', authenticateAdmin, (req, res) => {
    res.json({
        success: true,
        admin: {
            id: req.admin._id,
            name: req.admin.name,
            role: req.admin.role
        }
    });
});

// Dashboard Stats
app.get('/admin/api/stats', authenticateAdmin, async (req, res) => {
    try {
        const [
            totalUsers,
            totalProducts,
            totalOrders,
            totalRevenue,
            recentOrders
        ] = await Promise.all([
            User.countDocuments(),
            Product.countDocuments(),
            Order.countDocuments(),
            Order.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            Order.find().sort({ createdAt: -1 }).limit(5).populate('user')
        ]);

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalProducts,
                totalOrders,
                totalRevenue: totalRevenue[0]?.total || 0,
                recentOrders
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics'
        });
    }
});

// Products Management
app.get('/admin/api/products', authenticateAdmin, async (req, res) => {
    try {
        const products = await Product.find().populate('category');
        res.json({
            success: true,
            products
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching products'
        });
    }
});

// Orders Management
app.get('/admin/api/orders', authenticateAdmin, async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user')
            .populate('items.product')
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            orders
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching orders'
        });
    }
});

// Users Management
app.get('/admin/api/users', authenticateAdmin, async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users'
        });
    }
});

// Categories Management
app.get('/admin/api/categories', authenticateAdmin, async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json({
            success: true,
            categories
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching categories'
        });
    }
});

// Settings Management
app.get('/admin/api/settings', authenticateAdmin, async (req, res) => {
    try {
        const settings = await Settings.findOne();
        res.json({
            success: true,
            settings: settings || {}
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching settings'
        });
    }
});

// Serve Admin Static Files
app.use('/admin/public', express.static(path.join(__dirname, 'admin/public')));

// Get local IP address
const os = require('os');
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// Error handling for server
const server = app.listen(PORT, '0.0.0.0', (error) => {
    if (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
    
    const localIP = getLocalIP();
    console.log('=================================');
    console.log('Server Information:');
    console.log('=================================');
    console.log(`Server is running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`Network: http://${localIP}:${PORT}`);
    console.log('=================================');
    console.log('MongoDB Information:');
    console.log('=================================');
    console.log('Mongoose connected to MongoDB');
    console.log(`Database name: ${mongoose.connection.name}`);
    console.log(`Database host: ${mongoose.connection.host}`);
    console.log(`Database port: ${mongoose.connection.port}`);
    console.log('=================================');
});

// Handle server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try a different port.`);
    } else {
        console.error('Server error:', error);
    }
    process.exit(1);
});

// Handle process termination
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
}); 