// DOM Elements
const productList = document.getElementById('product-list');
const categorySelect = document.getElementById('category');
const sortSelect = document.getElementById('sort');

// Products Data
let products = [];
let currentPage = 1;
const productsPerPage = 12;

// Fetch products from API
async function fetchProducts(category = '', sort = 'newest') {
    try {
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
            console.log('Fetched products:', products);
            renderProducts();
            updatePagination();
        } else {
            throw new Error(data.message || 'Failed to fetch products');
        }
    } catch (error) {
        console.error('Error fetching products:', error);
        showAlert('Error loading products', 'error');
    }
}

// Render products in the grid
function renderProducts() {
    if (!productList) return;

    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const currentProducts = products.slice(startIndex, endIndex);

    productList.innerHTML = currentProducts.map(product => `
        <div class="product-card">
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
        </div>
    `).join('');

    // Add event listeners
    addProductEventListeners();
}

function addProductEventListeners() {
    // Quick view buttons
    document.querySelectorAll('.quick-view-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const productId = button.dataset.id;
            try {
                const product = await productManager.getProductById(productId);
                showQuickView(product);
            } catch (error) {
                console.error('You must be logged in to access this feature.:', error);
                showAlert('You must be logged in to access this feature.', 'error');
            }
        });
    });
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', async () => {
            const productId = button.dataset.id;
            try {
                await addToCart(productId);
                showAlert('Product added to cart', 'success');
            } catch (error) {
                console.error('You must be logged in to access this feature.:', error);
                showAlert('You must be logged in to access this feature.', 'error');
            }
        });
    });

    // Add to wishlist buttons
    document.querySelectorAll('.add-to-wishlist').forEach(button => {
        button.addEventListener('click', async () => {
            const productId = button.dataset.id;
            try {
                await addToWishlist(productId);
                showAlert('Product added to wishlist', 'success');
            } catch (error) {
                console.error('You must be logged in to access this feature.:', error);
                showAlert('You must be logged in to access this feature.', 'error');
            }
        });
    });

    // Order now buttons
    document.querySelectorAll('.order-now').forEach(button => {
        button.addEventListener('click', async () => {
            const productId = button.dataset.id;
            try {
                await orderNow(productId);
            } catch (error) {
                console.error('You must be logged in to access this feature.:', error);
                showAlert('You must be logged in to access this feature.', 'error');
            }
        });
    });
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(products.length / productsPerPage);
    const pageNumbers = document.querySelector('.page-numbers');
    
    if (!pageNumbers) return;
    
    pageNumbers.innerHTML = '';
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            pageNumbers.innerHTML += `
                <span class="${i === currentPage ? 'active' : ''}" 
                      onclick="changePage(${i})">${i}</span>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            pageNumbers.innerHTML += '<span>...</span>';
        }
    }
}

// Change page
function changePage(page) {
    currentPage = page;
    renderProducts();
    window.scrollTo(0, 0);
}

// Quick view product
function quickView(productId) {
    // Implement quick view functionality
    console.log('Quick view product:', productId);
}

// Show alert
function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    document.body.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, 3000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initial load
    fetchProducts();

    // Category change
    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            currentPage = 1;
            fetchProducts(categorySelect.value, sortSelect.value);
        });
    }

    // Sort change
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            currentPage = 1;
            fetchProducts(categorySelect.value, sortSelect.value);
        });
    }
}); 