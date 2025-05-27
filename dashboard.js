// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Fetch user data from API
    fetchUserData();
});

async function fetchUserData() {
    try {
        const response = await fetch('/api/user/data', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }

        const data = await response.json();
        
        // Update welcome message with user's name
        if (data.userData && data.userData.name) {
            document.getElementById('user-name').textContent = data.userData.name;
        }

        // Update quick stats
        updateQuickStats(data.orders);

        // Load recommended products
        loadRecommendedProducts();

        // Handle logout
        document.getElementById('logout-btn').addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
        // Handle error appropriately
    }
}

// Function to calculate total items in orders
function calculateTotalOrderItems(orders) {
    if (!Array.isArray(orders)) return 0;
    return orders.reduce((total, order) => {
        if (order.items && Array.isArray(order.items)) {
            return total + order.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        }
        return total + 1;
    }, 0);
}

// Function to update quick stats
function updateQuickStats(orders) {
    try {
        const totalOrders = orders.length;
        const totalItems = calculateTotalOrderItems(orders);

        // Update stats display
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            const statType = card.querySelector('h3').textContent.toLowerCase();
            const statValue = card.querySelector('.stat-value');
            
            switch(statType) {
                case 'orders':
                    statValue.textContent = totalOrders;
                    break;
                case 'items':
                    statValue.textContent = totalItems;
                    break;
            }
        });

        // Update recent orders section
        updateRecentOrders(orders);
    } catch (error) {
        console.error('Error updating quick stats:', error);
    }
}

// Function to update recent orders section
function updateRecentOrders(orders) {
    const ordersContainer = document.querySelector('.orders-container');
    if (!ordersContainer) return;

    if (orders.length === 0) {
        ordersContainer.innerHTML = `
            <div class="no-orders">
                <i class="fas fa-shopping-bag"></i>
                <p>No recent orders</p>
                <a href="products.html" class="btn btn-primary">Start Shopping</a>
            </div>
        `;
        return;
    }

    // Sort orders by date (newest first)
    const sortedOrders = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Display up to 5 recent orders
    const recentOrders = sortedOrders.slice(0, 5);
    
    ordersContainer.innerHTML = recentOrders.map(order => `
        <div class="order-card">
            <div class="order-header">
                <span class="order-id">Order #${order.orderId || 'N/A'}</span>
                <span class="order-date">${new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
            <div class="order-items">
                ${order.items ? order.items.map(item => `
                    <div class="order-item">
                        <img src="${item.image || 'images/placeholder.jpg'}" alt="${item.name}">
                        <div class="item-details">
                            <h4>${item.name}</h4>
                            <p>Quantity: ${item.quantity || 1}</p>
                            <p>Price: $${item.price || 0}</p>
                        </div>
                    </div>
                `).join('') : ''}
            </div>
            <div class="order-footer">
                <span class="order-total">Total: $${order.totalAmount || 0}</span>
                <span class="order-status ${order.status || 'pending'}">${order.status || 'Pending'}</span>
            </div>
        </div>
    `).join('');
}

// Function to add product to cart
async function addToCart(productId) {
    try {
        const response = await fetch('/api/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                productId: productId,
                quantity: 1
            })
        });

        if (!response.ok) {
            throw new Error('Failed to add product to cart');
        }

        const data = await response.json();
        if (data.success) {
            alert('Product added to cart!');
            // Optionally refresh cart display if needed
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('Failed to add product to cart. Please try again.');
    }
}

// Function to load recommended products
async function loadRecommendedProducts() {
    try {
        const response = await fetch('/api/products/featured', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch recommended products');
        }

        const products = await response.json();
        const productsContainer = document.querySelector('.products-grid');
        if (!productsContainer) return;

        productsContainer.innerHTML = products.map(product => `
            <div class="product-card">
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p class="price">$${product.price.toFixed(2)}</p>
                <button class="add-to-cart" data-id="${product._id}">Add to Cart</button>
            </div>
        `).join('');

        // Add event listeners to the new product cards
        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', function() {
                const productId = this.getAttribute('data-id');
                addToCart(productId);
            });
        });
    } catch (error) {
        console.error('Error loading recommended products:', error);
    }
}

// Helper function to get product by ID
function getProductById(id) {
    // In a real application, this would fetch from an API
    const products = [
        {
            id: 1,
            name: "Premium Headphones",
            price: 199.99,
            image: "images/headphones.jpg",
            category: "Electronics"
        },
        {
            id: 2,
            name: "Smart Watch",
            price: 149.99,
            image: "images/smartwatch.jpg",
            category: "Electronics"
        },
        {
            id: 3,
            name: "Wireless Earbuds",
            price: 79.99,
            image: "images/earbuds.jpg",
            category: "Electronics"
        }
    ];
    
    return products.find(product => product.id === parseInt(id));
} 