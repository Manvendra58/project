document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData) {
        window.location.href = 'login.html';
        return;
    }

    // Update profile information
    document.getElementById('profile-name').textContent = userData.name;
    document.getElementById('profile-email').textContent = userData.email;
    document.getElementById('profile-name-input').value = userData.name;
    document.getElementById('profile-email-input').value = userData.email;
    if (userData.phone) {
        document.getElementById('profile-phone').value = userData.phone;
    }

    // Handle profile form submission
    const profileForm = document.getElementById('profileForm');
    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('profile-name-input').value,
            email: document.getElementById('profile-email-input').value,
            phone: document.getElementById('profile-phone').value
        };

        try {
            const response = await fetch('/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                // Update local storage
                userData.name = formData.name;
                userData.email = formData.email;
                userData.phone = formData.phone;
                localStorage.setItem('userData', JSON.stringify(userData));
                
                // Update displayed name
                document.getElementById('profile-name').textContent = formData.name;
                
                showNotification('Profile updated successfully', 'success');
            } else {
                const data = await response.json();
                showNotification(data.message || 'Error updating profile', 'error');
            }
        } catch (error) {
            showNotification('Error updating profile', 'error');
        }
    });

    // Handle security form submission
    const securityForm = document.getElementById('securityForm');
    securityForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-new-password').value;
        
        if (newPassword !== confirmPassword) {
            showNotification('New passwords do not match', 'error');
            return;
        }

        try {
            const response = await fetch('/api/users/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            if (response.ok) {
                showNotification('Password updated successfully', 'success');
                securityForm.reset();
            } else {
                const data = await response.json();
                showNotification(data.message || 'Error updating password', 'error');
            }
        } catch (error) {
            showNotification('Error updating password', 'error');
        }
    });

    // Load orders
    loadOrders();

    // Load addresses
    loadAddresses();

    // Handle menu navigation
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.profile-section');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all items and sections
            menuItems.forEach(i => i.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Show corresponding section
            const targetId = this.getAttribute('href').substring(1);
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Handle logout
    document.getElementById('logout-btn').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('userData');
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });

    // Handle add address button
    const addAddressBtn = document.getElementById('add-address-btn');
    if (addAddressBtn) {
        addAddressBtn.addEventListener('click', function() {
            const addressForm = document.getElementById('addressForm');
            if (addressForm) {
                addressForm.style.display = 'block';
            }
        });
    }

    // Handle address form submission
    const addressForm = document.getElementById('addressForm');
    if (addressForm) {
        addressForm.addEventListener('submit', addAddress);
    }
});

function loadOrders() {
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    const ordersList = document.getElementById('orders-list');
    
    if (orders.length === 0) {
        ordersList.innerHTML = `
            <div class="no-orders">
                <i class="fas fa-shopping-bag"></i>
                <p>No orders yet</p>
            </div>
        `;
        return;
    }
    
    ordersList.innerHTML = orders.map(order => `
        <div class="order-card">
            <div class="order-header">
                <h3>Order #${order.id}</h3>
                <span class="order-date">${new Date(order.date).toLocaleDateString()}</span>
            </div>
            <div class="order-items">
                ${order.items.map(item => `
                    <div class="order-item">
                        <img src="${item.image}" alt="${item.name}">
                        <div class="item-details">
                            <h4>${item.name}</h4>
                            <p>Quantity: ${item.quantity}</p>
                            <p>Price: $${item.price}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="order-total">
                <p>Total: $${order.total}</p>
                <span class="order-status ${order.status.toLowerCase()}">${order.status}</span>
            </div>
        </div>
    `).join('');
}

async function loadAddresses() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Please login to view addresses', 'error');
            return;
        }

        const response = await fetch('/api/addresses', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch addresses');
        }

        const data = await response.json();
        const addressesList = document.getElementById('addresses-list');
        
        if (!data.addresses || data.addresses.length === 0) {
            addressesList.innerHTML = `
                <div class="no-addresses">
                    <i class="fas fa-map-marker-alt"></i>
                    <p>No addresses saved</p>
                </div>
            `;
            return;
        }
        
        addressesList.innerHTML = data.addresses.map(address => `
            <div class="address-card">
                <div class="address-header">
                    <h3>${address.type}</h3>
                    <div class="address-actions">
                        <button class="btn btn-edit" onclick="editAddress('${address.type}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-delete" onclick="deleteAddress('${address.type}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="address-details">
                    <p>${address.street}</p>
                    <p>${address.city}, ${address.state} ${address.zipCode}</p>
                    <p>${address.country}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading addresses:', error);
        showNotification('Error loading addresses', 'error');
    }
}

// Edit address
function editAddress(type) {
    const user = JSON.parse(localStorage.getItem('userData'));
    const address = user.addresses.find(addr => addr.type === type);
    
    if (address) {
        document.getElementById('addressType').value = address.type;
        document.getElementById('street').value = address.street;
        document.getElementById('city').value = address.city;
        document.getElementById('state').value = address.state;
        document.getElementById('zipCode').value = address.zipCode;
        document.getElementById('country').value = address.country;
        
        // Show address form
        document.getElementById('addressForm').style.display = 'block';
        document.getElementById('addressForm').scrollIntoView({ behavior: 'smooth' });
    }
}

// Delete address
async function deleteAddress(type) {
    if (!confirm('Are you sure you want to delete this address?')) {
        return;
    }

    try {
        const response = await fetch('/api/users/address', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ type })
        });

        if (response.ok) {
            showNotification('Address deleted successfully', 'success');
            loadAddresses();
        } else {
            const data = await response.json();
            showNotification(data.message || 'Error deleting address', 'error');
        }
    } catch (error) {
        showNotification('Error deleting address', 'error');
    }
}

// Show notification
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
} 