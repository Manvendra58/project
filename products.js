// DOM Elements
const productList = document.getElementById('product-list');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const categoryFilter = document.getElementById('category-filter');
const sortFilter = document.getElementById('sort-filter');
const loadingSpinner = document.getElementById('loading-spinner');
const noProducts = document.getElementById('no-products');
const errorMessage = document.getElementById('error-message');
const priceRange = document.getElementById('price-range');
const priceValue = document.getElementById('price-value');
const quickViewModal = document.getElementById('quick-view-modal');
const quickViewContent = document.getElementById('quick-view-content');
const closeModal = document.querySelector('.close-modal');
const backToTop = document.getElementById('back-to-top');
const cartCount = document.querySelector('.cart-count');

// Global products array
let products = [];

// Cart state
let cart = JSON.parse(localStorage.getItem('cart')) || [];
updateCartCount();

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    setupEventListeners();
});

// Fetch products from API
async function fetchProducts(category = '', sort = 'newest') {
    try {
        showLoading();
        let url = '/api/products';
        if (category) url += `?category=${category}`;
        if (sort) url += `${category ? '&' : '?'}sort=${sort}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        if (data.success) {
            products = data.products;
            renderProducts();
        } else {
            throw new Error(data.message || 'Failed to fetch products');
        }
    } catch (error) {
        console.error('Error fetching products:', error);
        showError('Failed to load products. Please try again later.');
    } finally {
        hideLoading();
    }
}

// Render Products
function renderProducts(productsToRender = products) {
    if (!productList) return;
    
    productList.innerHTML = '';
    
    if (!productsToRender || productsToRender.length === 0) {
        showNoProducts();
        return;
    }

    productsToRender.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <div class="product-image">
                <img src="${product.image || 'https://via.placeholder.com/300x300'}" 
                     alt="${product.name || 'Product'}"
                     onerror="this.src='https://via.placeholder.com/300x300'">
                <div class="product-badges">
                    ${product.discount ? `<span class="discount-badge">${product.discount}% OFF</span>` : ''}
                    ${product.isNew ? '<span class="new-badge">New</span>' : ''}
                </div>
                <button class="quick-view-btn" data-id="${product._id}">
                    <i class="fas fa-eye"></i> Quick View
                </button>
            </div>
            <div class="product-info">
                <div class="product-header">
                    <h3 class="product-name">${product.name || 'Unnamed Product'}</h3>
                    ${product.brand ? `<p class="product-brand">${product.brand}</p>` : ''}
                </div>
                <div class="product-price">
                    <span class="current-price">₹${(product.price || 0).toLocaleString()}</span>
                </div>
                <div class="product-description">
                    <p>${product.description || 'No description available'}</p>
                </div>
                <div class="product-stock">
                    <p>${product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}</p>
                </div>
                <div class="product-actions">
                    <button class="btn btn-primary add-to-cart" data-id="${product._id}"
                            ${product.stock <= 0 ? 'disabled' : ''}>
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                    <button class="btn btn-secondary order-now" data-id="${product._id}"
                            ${product.stock <= 0 ? 'disabled' : ''}>
                        <i class="fas fa-bolt"></i> Order Now
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        const addToCartBtn = productCard.querySelector('.add-to-cart');
        const orderNowBtn = productCard.querySelector('.order-now');
        const quickViewBtn = productCard.querySelector('.quick-view-btn');

        addToCartBtn.addEventListener('click', () => addToCart(product));
        orderNowBtn.addEventListener('click', () => orderNow(product));
        quickViewBtn.addEventListener('click', () => showQuickView(product));

        productList.appendChild(productCard);
    });
}

// Event Listeners
function setupEventListeners() {
    // Search functionality
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Category and sort filters
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            fetchProducts(categoryFilter.value, sortFilter.value);
        });
    }
    if (sortFilter) {
        sortFilter.addEventListener('change', () => {
            fetchProducts(categoryFilter.value, sortFilter.value);
        });
    }

    // Price range filter
    if (priceRange) {
        priceRange.addEventListener('input', () => {
            const maxPrice = priceRange.value;
            priceValue.textContent = `$0 - $${maxPrice}`;
            filterProducts();
        });
    }

    // Modal close
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            quickViewModal.style.display = 'none';
        });
    }

    // Back to top button
    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Show/hide back to top button
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                backToTop.style.display = 'block';
            } else {
                backToTop.style.display = 'none';
            }
        });
    }
}

// Helper Functions
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.brand.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm)
    );
    renderProducts(filteredProducts);
}

function showLoading() {
    loadingSpinner.style.display = 'block';
    noProducts.style.display = 'none';
    errorMessage.style.display = 'none';
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
}

function showNoProducts() {
    noProducts.style.display = 'block';
    errorMessage.style.display = 'none';
}

function showError(message) {
    errorMessage.style.display = 'block';
    errorMessage.querySelector('p').textContent = message;
    noProducts.style.display = 'none';
}

function filterProducts() {
    const maxPrice = parseFloat(priceRange?.value || 10000);
    const category = categoryFilter?.value || '';
    const sortBy = sortFilter?.value || 'newest';

    let filteredProducts = products.filter(product => 
        product.price <= maxPrice &&
        (category === '' || product.category === category)
    );

    // Sort products
    switch (sortBy) {
        case 'price-low':
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
        case 'newest':
            filteredProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'popular':
            filteredProducts.sort((a, b) => b.rating - a.rating);
            break;
    }

    renderProducts(filteredProducts);
}

// Cart Functions
function addToCart(product) {
    const existingItem = cart.find(item => item._id === product._id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showNotification('Product added to cart!');
}

function orderNow(product) {
    addToCart(product);
    window.location.href = 'checkout.html';
}

function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'block' : 'none';
    }
}

// Quick View Modal
function showQuickView(product) {
    if (!quickViewModal || !quickViewContent) return;
    
    quickViewContent.innerHTML = `
        <div class="quick-view-product">
            <div class="product-image">
                <img src="${product.image || 'images/placeholder.jpg'}" alt="${product.name}">
            </div>
            <div class="product-details">
                <h2>${product.name}</h2>
                <p class="brand">${product.brand}</p>
                <div class="price">
                    <span class="current">₹${product.price.toLocaleString()}</span>
                    ${product.originalPrice ? `<span class="original">₹${product.originalPrice.toLocaleString()}</span>` : ''}
                </div>
                <div class="rating">
                    ${Array(5).fill().map((_, i) => 
                        `<i class="fas fa-star ${i < Math.floor(product.rating || 0) ? 'filled' : ''}"></i>`
                    ).join('')}
                    <span>(${product.reviews || 0} reviews)</span>
                </div>
                <p class="description">${product.description || 'No description available'}</p>
                <div class="actions">
                    <button class="btn btn-primary add-to-cart" data-id="${product._id}">
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add event listeners to quick view buttons
    const addToCartBtn = quickViewContent.querySelector('.add-to-cart');

    addToCartBtn.addEventListener('click', () => {
        addToCart(product);
        quickViewModal.style.display = 'none';
    });

    quickViewModal.style.display = 'block';
}

// Notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}