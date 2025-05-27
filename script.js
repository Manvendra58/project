// DOM Elements
const productList = document.getElementById('product-list');
const categorySelect = document.getElementById('category');
const sortSelect = document.getElementById('sort');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const offersList = document.querySelector('.offers-grid');

// Products Data
let products = [];
let currentPage = 1;
const productsPerPage = 12;

// Authentication Functions
async function login(email, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token);
            window.location.href = 'index.html';
        } else {
            const error = await response.json();
            showAlert(error.message, 'error');
        }
    } catch (error) {
        console.error('Error logging in:', error);
        showAlert('An error occurred while logging in', 'error');
    }
}

// Products Functions
async function fetchProducts(category = '', sort = 'newest') {
    try {
        let url = '/api/products';
        if (category) url += `?category=${category}`;
        if (sort) url += `${category ? '&' : '?'}sort=${sort}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }
        products = await response.json();
        console.log('Fetched products:', products);
        renderProducts();
        updatePagination();
    } catch (error) {
        console.error('Error fetching products:', error);
        showAlert('Error loading products', 'error');
    }
}

function renderProducts() {
    if (!productList) return;

    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const currentProducts = products.slice(startIndex, endIndex);

    productList.innerHTML = currentProducts.map(product => `
        <div class="product-card">
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x300'">
                <div class="product-overlay">
                    <button class="quick-view" onclick="quickView('${product._id}')">Quick View</button>
                </div>
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <div class="product-rating">
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="far fa-star"></i>
                    <span>(4.0)</span>
                </div>
                <p class="price">₹${product.price.toLocaleString()}</p>
                <button class="view-details" onclick="viewProduct('${product._id}')">View Details</button>
            </div>
        </div>
    `).join('');

    // Add event listeners for add to cart buttons
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            addToCart(productId);
        });
    });
}

function generateRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return `
        ${Array(fullStars).fill('<i class="fas fa-star"></i>').join('')}
        ${hasHalfStar ? '<i class="fas fa-star-half-alt"></i>' : ''}
        ${Array(emptyStars).fill('<i class="far fa-star"></i>').join('')}
    `;
}

function updatePagination() {
    if (!document.querySelector('.pagination')) return;

    const totalPages = Math.ceil(products.length / productsPerPage);
    const pageNumbers = document.querySelector('.page-numbers');
    
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

function changePage(page) {
    currentPage = page;
    renderProducts();
    window.scrollTo(0, 0);
}

// Offers Functions
function updateCountdown() {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59);

    const diff = end - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const countdown = document.querySelector('.countdown');
    if (countdown) {
        countdown.textContent = `Ends in: ${hours}:${minutes}:${seconds}`;
    }
}

// Utility Functions
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
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginForm.querySelector('#email').value;
        const password = loginForm.querySelector('#password').value;
        login(email, password);
    });
}

if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = signupForm.querySelector('#name').value;
        const username = signupForm.querySelector('#username').value;
        const email = signupForm.querySelector('#email').value;
        const password = signupForm.querySelector('#password').value;
        const confirmPassword = signupForm.querySelector('#confirm-password').value;

        if (password !== confirmPassword) {
            showAlert('Passwords do not match', 'error');
            return;
        }

        signup(name, username, email, password);
    });
}

if (categorySelect) {
    categorySelect.addEventListener('change', () => {
        currentPage = 1;
        fetchProducts(categorySelect.value, sortSelect.value);
    });
}

if (sortSelect) {
    sortSelect.addEventListener('change', () => {
        currentPage = 1;
        fetchProducts(categorySelect.value, sortSelect.value);
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication status
    const token = localStorage.getItem('token');
    const authButtons = document.querySelector('.auth-buttons');
    
    if (token && authButtons) {
        authButtons.innerHTML = `
            <button class="btn btn-primary" onclick="logout()">Logout</button>
        `;
    }

    // Initialize pages
    if (window.location.pathname.includes('products.html')) {
        fetchProducts();
    } else if (window.location.pathname.includes('offers.html')) {
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }
}); 