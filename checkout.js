// DOM Elements
const steps = document.querySelectorAll('.step');
const checkoutSteps = document.querySelectorAll('.checkout-step');
const backBtn = document.getElementById('back-btn');
const nextBtn = document.getElementById('next-btn');
const placeOrderBtn = document.getElementById('place-order-btn');
const shippingForm = document.getElementById('shipping-form');
const paymentForm = document.getElementById('payment-form');
const promoCodeInput = document.getElementById('promo-code');
const applyPromoBtn = document.getElementById('apply-promo');
const cartCount = document.querySelector('.cart-count');

// Additional DOM Elements
const paymentMethodBtns = document.querySelectorAll('.payment-method');
const cardFields = document.querySelector('.card-fields');
const paypalFields = document.querySelector('.paypal-fields');
const billingAddressCheckbox = document.getElementById('same-as-shipping');
const billingForm = document.getElementById('billing-form');

// Constants
const SHIPPING_COST = 100;
const TAX_RATE = 0.18;
const PROMO_CODES = {
    'WELCOME10': { discount: 0.10, type: 'percentage' },
    'FREESHIP': { discount: SHIPPING_COST, type: 'fixed' },
    'SAVE20': { discount: 0.20, type: 'percentage' }
};



// State
let currentStep = 1;
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let appliedPromo = null;
let orderData = {
    shipping: {},
    payment: {},
    items: [],
    summary: {
        subtotal: 0,
        shipping: SHIPPING_COST,
        tax: 0,
        total: 0,
        discount: 0
    }
};

// Enhanced State Management
let state = {
    ...orderData,
    paymentMethod: PAYMENT_METHODS.CREDIT_CARD,
    cardType: null,
    billingIsSameAsShipping: true,
    validationErrors: new Set(),
    processingPayment: false
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (cart.length === 0) {
        showNotification('Your cart is empty. Please add items before checkout.', 'error');
        setTimeout(() => window.location.href = 'cart.html', 2000);
        return;
    }

    updateCartCount();
    updateOrderSummary();
    setupEventListeners();
    formatCardInputs();
    validateForms();
    setupEnhancedEventListeners();
    initializeSecureFields();
});

// Event Listeners
function setupEventListeners() {
    // Navigation buttons
    backBtn.addEventListener('click', goToPreviousStep);
    nextBtn.addEventListener('click', goToNextStep);
    placeOrderBtn.addEventListener('click', placeOrder);

    // Promo code
    applyPromoBtn.addEventListener('click', applyPromoCode);
    promoCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyPromoCode();
        }
    });

    // Form validation
    shippingForm.addEventListener('input', validateShippingForm);
    paymentForm.addEventListener('input', validatePaymentForm);

    // Auto-save form data
    shippingForm.addEventListener('change', saveShippingData);
    paymentForm.addEventListener('change', savePaymentData);

    // Load saved form data
    loadSavedFormData();
}

// Enhanced Event Listeners
function setupEnhancedEventListeners() {
    // Existing event listeners
    setupEventListeners();

    // Payment method selection
    paymentMethodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const method = btn.dataset.method;
            updatePaymentMethod(method);
        });
    });

    // Billing address toggle
    billingAddressCheckbox?.addEventListener('change', (e) => {
        state.billingIsSameAsShipping = e.checked;
        toggleBillingForm();
    });

    // Real-time card validation
    const cardNumber = document.getElementById('card-number');
    cardNumber?.addEventListener('input', (e) => {
        const number = e.target.value.replace(/\s/g, '');
        const cardType = detectCardType(number);
        updateCardTypeUI(cardType);
    });
}

// Step Navigation
function goToNextStep() {
    if (currentStep === 1 && !validateShippingForm()) {
        showNotification('Please fill in all required shipping information.', 'error');
        return;
    }
    if (currentStep === 2 && !validatePaymentForm()) {
        showNotification('Please fill in all required payment information.', 'error');
        return;
    }

    if (currentStep < 3) {
        currentStep++;
        updateStepUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function goToPreviousStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStepUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function updateStepUI() {
    // Update step indicators
    steps.forEach(step => {
        const stepNumber = parseInt(step.dataset.step);
        step.classList.toggle('active', stepNumber === currentStep);
        step.classList.toggle('completed', stepNumber < currentStep);
    });

    // Show/hide forms with animation
    checkoutSteps.forEach(step => {
        const stepNumber = parseInt(step.id.split('-')[1]);
        if (stepNumber === currentStep) {
            step.style.display = 'block';
            step.style.animation = 'fadeIn 0.3s ease-out';
        } else {
            step.style.display = 'none';
        }
    });

    // Update buttons
    backBtn.style.display = currentStep === 1 ? 'none' : 'inline-block';
    nextBtn.style.display = currentStep === 3 ? 'none' : 'inline-block';
    placeOrderBtn.style.display = currentStep === 3 ? 'inline-block' : 'none';

    // Update review section if on last step
    if (currentStep === 3) {
        updateReviewSection();
    }
}

// Form Validation
function validateShippingForm() {
    const requiredFields = shippingForm.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');
        } else {
            field.classList.remove('error');
        }
    });

    // Validate email format
    const email = document.getElementById('email');
    if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        isValid = false;
        email.classList.add('error');
    }

    // Validate phone number
    const phone = document.getElementById('phone');
    if (phone.value && !/^\+?[\d\s-]{10,}$/.test(phone.value)) {
        isValid = false;
        phone.classList.add('error');
    }

    if (isValid) {
        saveShippingData();
    }

    return isValid;
}

function validatePaymentForm() {
    const isValid = validateBasicPaymentFields();
    
    if (state.paymentMethod === PAYMENT_METHODS.CREDIT_CARD) {
        return isValid && validateCreditCardFields();
    } else if (state.paymentMethod === PAYMENT_METHODS.PAYPAL) {
        return isValid && validatePayPalFields();
    }
    
    return false;
}

function validateBasicPaymentFields() {
    const requiredFields = paymentForm.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');
        } else {
            field.classList.remove('error');
        }
    });

    return isValid;
}

function validateCreditCardFields() {
    const cardNumber = document.getElementById('card-number').value.replace(/\s/g, '');
    const expiry = document.getElementById('expiry').value;
    const cvv = document.getElementById('cvv').value;
    const cardName = document.getElementById('card-name').value;

    let isValid = true;
    state.validationErrors.clear();

    // Card number validation
    if (!validateCardNumber(cardNumber)) {
        isValid = false;
        state.validationErrors.add('Invalid card number');
        showFieldError('card-number', 'Please enter a valid card number');
    }

    // Expiry validation
    if (!validateExpiry(expiry)) {
        isValid = false;
        state.validationErrors.add('Invalid expiry date');
        showFieldError('expiry', 'Please enter a valid expiry date');
    }

    // CVV validation
    if (!validateCVV(cvv)) {
        isValid = false;
        state.validationErrors.add('Invalid CVV');
        showFieldError('cvv', 'Please enter a valid CVV');
    }

    // Cardholder name validation
    if (!validateCardholderName(cardName)) {
        isValid = false;
        state.validationErrors.add('Invalid cardholder name');
        showFieldError('card-name', 'Please enter the cardholder name');
    }

    return isValid;
}

// Enhanced Card Validation Helpers
function validateCardNumber(number) {
    // Luhn algorithm implementation
    let sum = 0;
    let isEven = false;
    
    // Loop through values starting from the rightmost digit
    for (let i = number.length - 1; i >= 0; i--) {
        let digit = parseInt(number.charAt(i));

        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        isEven = !isEven;
    }

    return sum % 10 === 0 && detectCardType(number) !== null;
}

function validateExpiry(expiry) {
    const [month, year] = expiry.split('/').map(val => parseInt(val.trim()));
    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;

    return month >= 1 && month <= 12 &&
           year >= currentYear &&
           (year > currentYear || month >= currentMonth);
}

function validateCVV(cvv) {
    const cvvRegex = state.cardType === 'AMEX' ? /^[0-9]{4}$/ : /^[0-9]{3}$/;
    return cvvRegex.test(cvv);
}

function validateCardholderName(name) {
    return /^[a-zA-Z\s-']{2,}$/.test(name.trim());
}

// Enhanced UI Updates
function updatePaymentMethod(method) {
    state.paymentMethod = method;
    paymentMethodBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.method === method);
    });
    
    cardFields.style.display = method === PAYMENT_METHODS.CREDIT_CARD ? 'block' : 'none';
    paypalFields.style.display = method === PAYMENT_METHODS.PAYPAL ? 'block' : 'none';
    
    validatePaymentForm();
}

function updateCardTypeUI(cardType) {
    state.cardType = cardType;
    const cardTypeIcon = document.getElementById('card-type-icon');
    if (cardTypeIcon) {
        cardTypeIcon.className = `fa fa-cc-${cardType?.toLowerCase() || 'credit-card'}`;
    }
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    
    field.classList.add('error');
    field.parentNode.appendChild(errorDiv);
    
    setTimeout(() => {
        field.classList.remove('error');
        errorDiv.remove();
    }, 3000);
}

// Data Management
function saveShippingData() {
    orderData.shipping = {
        fullName: document.getElementById('full-name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        state: document.getElementById('state').value,
        zip: document.getElementById('zip').value,
        country: document.getElementById('country').value,
        saveAddress: document.getElementById('save-address').checked
    };

    if (orderData.shipping.saveAddress) {
        localStorage.setItem('savedShipping', JSON.stringify(orderData.shipping));
    }
}

function savePaymentData() {
    orderData.payment = {
        cardName: document.getElementById('card-name').value,
        cardNumber: document.getElementById('card-number').value,
        expiry: document.getElementById('expiry').value,
        cvv: document.getElementById('cvv').value,
        saveCard: document.getElementById('save-card').checked
    };

    if (orderData.payment.saveCard) {
        localStorage.setItem('savedPayment', JSON.stringify(orderData.payment));
    }
}

function loadSavedFormData() {
    const savedShipping = JSON.parse(localStorage.getItem('savedShipping'));
    const savedPayment = JSON.parse(localStorage.getItem('savedPayment'));

    if (savedShipping) {
        Object.entries(savedShipping).forEach(([key, value]) => {
            const field = document.getElementById(key);
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = value;
                } else {
                    field.value = value;
                }
            }
        });
    }

    if (savedPayment) {
        Object.entries(savedPayment).forEach(([key, value]) => {
            const field = document.getElementById(key);
            if (field) {
                if (field.type === 'checkbox') {
                    field.checked = value;
                } else {
                    field.value = value;
                }
            }
        });
    }
}

// Order Summary
function updateOrderSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = appliedPromo === 'FREESHIP' ? 0 : SHIPPING_COST;
    const tax = subtotal * TAX_RATE;
    
    let discount = 0;
    if (appliedPromo && PROMO_CODES[appliedPromo]) {
        const promo = PROMO_CODES[appliedPromo];
        discount = promo.type === 'percentage' ? subtotal * promo.discount : promo.discount;
    }
    
    const total = subtotal + shipping + tax - discount;

    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('shipping').textContent = formatCurrency(shipping);
    document.getElementById('tax').textContent = formatCurrency(tax);
    document.getElementById('total').textContent = formatCurrency(total);

    orderData.summary = { subtotal, shipping, tax, total, discount };
    orderData.items = cart;
}

// Promo Code
function applyPromoCode() {
    const code = promoCodeInput.value.trim().toUpperCase();
    
    if (PROMO_CODES[code]) {
        appliedPromo = code;
        updateOrderSummary();
        showNotification(`Promo code "${code}" applied successfully!`, 'success');
        promoCodeInput.value = '';
        promoCodeInput.classList.add('success');
        setTimeout(() => promoCodeInput.classList.remove('success'), 2000);
    } else {
        showNotification('Invalid promo code', 'error');
        promoCodeInput.classList.add('error');
        setTimeout(() => promoCodeInput.classList.remove('error'), 2000);
    }
}

// Review Section
function updateReviewSection() {
    // Shipping review
    const shippingHtml = `
        <div class="review-item">
            <i class="fas fa-user"></i>
            <div class="item-details">
                <h4>${orderData.shipping.fullName}</h4>
                <p>${orderData.shipping.address}</p>
                <p>${orderData.shipping.city}, ${orderData.shipping.state} ${orderData.shipping.zip}</p>
                <p>${orderData.shipping.country}</p>
                <p><i class="fas fa-phone"></i> ${orderData.shipping.phone}</p>
                <p><i class="fas fa-envelope"></i> ${orderData.shipping.email}</p>
            </div>
        </div>
    `;
    document.getElementById('review-shipping').innerHTML = shippingHtml;

    // Payment review
    const cardNumber = orderData.payment.cardNumber.replace(/\d{4}(?=\d{4})/g, '**** ');
    const paymentHtml = `
        <div class="review-item">
            <i class="fas fa-credit-card"></i>
            <div class="item-details">
                <h4>${orderData.payment.cardName}</h4>
                <p>${cardNumber}</p>
                <p>Expires: ${orderData.payment.expiry}</p>
            </div>
        </div>
    `;
    document.getElementById('review-payment').innerHTML = paymentHtml;

    // Items review
    const itemsHtml = cart.map(item => `
        <div class="review-item">
            <img src="${item.image}" alt="${item.name}">
            <div class="item-details">
                <h4>${item.name}</h4>
                <p>Quantity: ${item.quantity}</p>
                <p>${formatCurrency(item.price * item.quantity)}</p>
            </div>
        </div>
    `).join('');
    document.getElementById('review-items').innerHTML = itemsHtml;
}

// Place Order
function placeOrder() {
    // Create order object
    const order = {
        id: Date.now(),
        date: new Date().toISOString(),
        ...orderData,
        status: 'Processing',
        trackingNumber: generateTrackingNumber()
    };

    // Save order to localStorage
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));

    // Clear cart
    localStorage.removeItem('cart');
    cart = [];

    // Show success message and redirect
    showNotification('Order placed successfully!', 'success');
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 2000);
}

// Helper Functions
function formatCardInputs() {
    const cardNumber = document.getElementById('card-number');
    const expiry = document.getElementById('expiry');

    cardNumber.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(\d{4})/g, '$1 ').trim();
        e.target.value = value;
    });

    expiry.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.slice(0, 2) + '/' + value.slice(2);
        }
        e.target.value = value;
    });
}

function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function generateTrackingNumber() {
    return 'TR' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

function validateForms() {
    validateShippingForm();
    validatePaymentForm();
}

// Enhanced Security Features
function securePlaceOrder() {
    if (state.processingPayment) return;
    
    state.processingPayment = true;
    showLoadingUI();

    // Tokenize sensitive data
    const paymentData = tokenizePaymentData();
    
    // Create secure order object
    const secureOrder = {
        ...orderData,
        payment: paymentData,
        billing: state.billingIsSameAsShipping ? orderData.shipping : getBillingData()
    };

    // Simulate API call with encryption
    simulateSecureApiCall(secureOrder)
        .then(handleOrderSuccess)
        .catch(handleOrderError)
        .finally(() => {
            state.processingPayment = false;
            hideLoadingUI();
        });
}

function tokenizePaymentData() {
    // In a real implementation, this would use a payment processor's SDK
    return {
        token: btoa(JSON.stringify({
            last4: orderData.payment.cardNumber.slice(-4),
            expiry: orderData.payment.expiry
        })),
        cardType: state.cardType
    };
}

// Enhanced UI Feedback
function showLoadingUI() {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="loading-spinner"></div>
        <p>Processing your payment...</p>
    `;
    document.body.appendChild(loadingOverlay);
}

function hideLoadingUI() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.classList.add('fade-out');
        setTimeout(() => overlay.remove(), 300);
    }
}
