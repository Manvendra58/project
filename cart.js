// DOM Elements
const cartItemsList = document.getElementById('cart-items-list');
const emptyCart = document.getElementById('empty-cart');
const subtotalElement = document.getElementById('subtotal');
const shippingElement = document.getElementById('shipping');
const taxElement = document.getElementById('tax');
const totalElement = document.getElementById('total');
const checkoutBtn = document.getElementById('checkout-btn');
const cartCount = document.querySelector('.cart-count');

// Constants
const SHIPPING_COST = 100;
const TAX_RATE = 0.18; // 8% tax rate

// Cart state
let cart = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Load cart from localStorage
    try {
        const savedCart = localStorage.getItem('cart');
        cart = savedCart ? JSON.parse(savedCart) : [];
        
        // Ensure each item has required properties
        cart = cart.map(item => ({
            ...item,
            quantity: item.quantity || 1,
            price: parseFloat(item.price) || 0,
            originalPrice: parseFloat(item.originalPrice) || parseFloat(item.price) || 0,
            image: item.image || 'images/placeholder.jpg',
            brand: item.brand || 'Generic'
        }));
        
        updateCart();
        renderCartItems();
        updateOrderSummary();
        setupEventListeners();
    } catch (error) {
        console.error('Error loading cart:', error);
        cart = [];
        updateCart();
        renderCartItems();
    }
});

// Event Listeners
function setupEventListeners() {
    // Checkout button
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) {
            showNotification('Your cart is empty!', 'error');
            return;
        }
        window.location.href = 'checkout.html';
    });
}

// Render Cart Items
function renderCartItems() {
    if (!cartItemsList) return;
    
    cartItemsList.innerHTML = '';
    
    if (cart.length === 0) {
        emptyCart.style.display = 'block';
        return;
    }

    emptyCart.style.display = 'none';
    const template = document.getElementById('cart-item-template');

    cart.forEach((item, index) => {
        const clone = template.content.cloneNode(true);
        
        // Set item data
        const imgElement = clone.querySelector('.item-image img');
        imgElement.src = item.image;
        imgElement.alt = item.name;
        
        clone.querySelector('.item-name').textContent = item.name;
        clone.querySelector('.item-brand').textContent = item.brand;
        clone.querySelector('.current-price').textContent = `$${item.price.toFixed(2)}`;
        clone.querySelector('.original-price').textContent = `$${item.originalPrice.toFixed(2)}`;
        clone.querySelector('.quantity').textContent = item.quantity;
        clone.querySelector('.total-price').textContent = `$${(item.price * item.quantity).toFixed(2)}`;

        // Add event listeners to buttons
        const decreaseBtn = clone.querySelector('.decrease');
        const increaseBtn = clone.querySelector('.increase');
        const removeBtn = clone.querySelector('.btn-remove');

        decreaseBtn.addEventListener('click', () => updateQuantity(index, -1));
        increaseBtn.addEventListener('click', () => updateQuantity(index, 1));
        removeBtn.addEventListener('click', () => removeItem(index));

        cartItemsList.appendChild(clone);
    });
}

// Update Quantity
function updateQuantity(index, change) {
    if (index < 0 || index >= cart.length) return;
    
    const item = cart[index];
    const newQuantity = item.quantity + change;

    if (newQuantity < 1) {
        removeItem(index);
        return;
    }

    item.quantity = newQuantity;
    updateCart();
    renderCartItems();
    updateOrderSummary();
    showNotification(`Quantity updated to ${newQuantity}`, 'success');
}

// Remove Item
function removeItem(index) {
    if (index < 0 || index >= cart.length) return;
    
    const removedItem = cart[index];
    cart.splice(index, 1);
    updateCart();
    renderCartItems();
    updateOrderSummary();
    showNotification(`${removedItem.name} removed from cart`, 'success');
}

// Update Order Summary
function updateOrderSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + SHIPPING_COST + tax;

    if (subtotalElement) subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
    if (shippingElement) shippingElement.textContent = `$${SHIPPING_COST.toFixed(2)}`;
    if (taxElement) taxElement.textContent = `$${tax.toFixed(2)}`;
    if (totalElement) totalElement.textContent = `$${total.toFixed(2)}`;

    // Update cart count
    updateCartCount();
}

// Update Cart
function updateCart() {
    try {
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
    } catch (error) {
        console.error('Error updating cart:', error);
        showNotification('Error updating cart', 'error');
    }
}

// Update Cart Count
function updateCartCount() {
    if (!cartCount) return;
    
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    cartCount.textContent = totalItems;
}

// Show Notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function createCartItemElement(item, index) {
    const template = document.getElementById('cart-item-template');
    const clone = template.content.cloneNode(true);
    
    // Set item details
    clone.querySelector('.item-name').textContent = item.name;
    clone.querySelector('.item-price').textContent = `$${item.price.toFixed(2)}`;
    clone.querySelector('.item-quantity').value = item.quantity;
    
    // Remove wishlist button and related functionality
    const removeBtn = clone.querySelector('.btn-remove');
    removeBtn.addEventListener('click', () => removeFromCart(index));
    
    return clone;
} 