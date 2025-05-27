document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Get cart items from localStorage
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        window.location.href = 'cart.html';
        return;
    }

    // Initialize payment form
    initializePaymentForm();
    
    // Load order summary
    loadOrderSummary(cart);

    // Handle payment method selection
    const paymentMethods = document.querySelectorAll('.payment-method');
    paymentMethods.forEach(method => {
        method.addEventListener('click', function() {
            paymentMethods.forEach(m => m.classList.remove('selected'));
            this.classList.add('selected');
            updatePaymentForm(this.querySelector('input').value);
        });
    });

    // Handle form input validation
    const formInputs = document.querySelectorAll('.payment-form input');
    formInputs.forEach(input => {
        input.addEventListener('input', validateForm);
    });

    // Handle card number formatting
    const cardNumberInput = document.getElementById('card-number');
    cardNumberInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(\d{4})/g, '$1 ').trim();
        e.target.value = value;
    });

    // Handle expiry date formatting
    const expiryDateInput = document.getElementById('expiry-date');
    expiryDateInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.slice(0, 2) + '/' + value.slice(2);
        }
        e.target.value = value;
    });

    // Handle CVV input
    const cvvInput = document.getElementById('cvv');
    cvvInput.addEventListener('input', function(e) {
        e.target.value = e.target.value.replace(/\D/g, '');
    });

    // Handle pay button click
    const payButton = document.getElementById('pay-button');
    payButton.addEventListener('click', processPayment);
});

function loadOrderSummary(cart) {
    const orderSummary = document.getElementById('order-summary');
    const subtotalElement = document.getElementById('subtotal');
    const shippingElement = document.getElementById('shipping');
    const taxElement = document.getElementById('tax');
    const totalElement = document.getElementById('total');

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal > 0 ? 100 : 0; // Flat shipping rate
    const tax = subtotal * 0.18; // 18% tax
    const total = subtotal + shipping + tax;

    // Update order summary
    orderSummary.innerHTML = cart.map(item => `
        <div class="summary-item">
            <span>${item.name} x ${item.quantity}</span>
            <span>₹${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');

    // Update totals
    subtotalElement.textContent = `₹${subtotal.toFixed(2)}`;
    shippingElement.textContent = `₹${shipping.toFixed(2)}`;
    taxElement.textContent = `₹${tax.toFixed(2)}`;
    totalElement.textContent = `₹${total.toFixed(2)}`;

    return { subtotal, shipping, tax, total };
}

function initializePaymentForm() {
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
    updatePaymentForm(paymentMethod);
}

function updatePaymentForm(method) {
    const cardForm = document.querySelector('.payment-form');
    if (method === 'card') {
        cardForm.style.display = 'block';
    } else {
        cardForm.style.display = 'none';
    }
    validateForm();
}

function validateForm() {
    const payButton = document.getElementById('pay-button');
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
    let isValid = true;

    if (paymentMethod === 'card') {
        const cardNumber = document.getElementById('card-number').value;
        const expiryDate = document.getElementById('expiry-date').value;
        const cvv = document.getElementById('cvv').value;
        const cardName = document.getElementById('card-name').value;

        isValid = cardNumber.length === 19 &&
                 expiryDate.length === 5 &&
                 cvv.length === 3 &&
                 cardName.length > 0;
    }

    payButton.disabled = !isValid;
}

async function processPayment() {
    const payButton = document.getElementById('pay-button');
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorMessage = document.getElementById('error-message');

    try {
        // Show loading state
        payButton.disabled = true;
        loadingSpinner.style.display = 'block';
        errorMessage.style.display = 'none';

        // Get cart items
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const { total } = loadOrderSummary(cart);

        // Create order
        const orderResponse = await fetch('/api/payments/create-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                amount: total,
                currency: 'INR',
                items: cart
            })
        });

        if (!orderResponse.ok) {
            throw new Error('Failed to create order');
        }

        const orderData = await orderResponse.json();

        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify payment
        const verifyResponse = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                orderId: orderData.order.orderId,
                paymentId: `PAY-${Date.now()}`,
                signature: 'mock-signature'
            })
        });

        if (!verifyResponse.ok) {
            throw new Error('Payment verification failed');
        }

        // Clear cart
        localStorage.removeItem('cart');

        // Show success message and redirect
        showNotification('Payment successful! Redirecting to orders page...', 'success');
        setTimeout(() => {
            window.location.href = 'order-details.html';
        }, 2000);

    } catch (error) {
        console.error('Payment error:', error);
        errorMessage.textContent = error.message || 'Payment failed. Please try again.';
        errorMessage.style.display = 'block';
        payButton.disabled = false;
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
} 