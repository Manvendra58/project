document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    
    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form values
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Validate inputs
            if (!email || !password) {
                showError('Please enter both email and password');
                return;
            }

            try {
                // Show loading state
                const submitBtn = loginForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
                submitBtn.disabled = true;

                // Send login request to server
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Login failed');
                }

                // Store token and user data in localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('userData', JSON.stringify(data.user));

                // Initialize empty arrays for orders and rewards if they don't exist
                if (!localStorage.getItem('orders')) {
                    localStorage.setItem('orders', JSON.stringify([]));
                }
                if (!localStorage.getItem('rewards')) {
                    localStorage.setItem('rewards', '0');
                }

                // Show success message
                showSuccess('Login successful!');

                // Redirect to dashboard after a short delay
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);

            } catch (error) {
                showError(error.message);
            } finally {
                // Reset button state
                if (submitBtn) {
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.disabled = false;
                }
            }
        });
    }

    // Handle signup form submission
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form values
            const name = document.getElementById('name').value.trim();
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Clear previous errors
            clearErrors();
            
            // Validate form
            if (!name || !username || !email || !password || !confirmPassword) {
                showError('Please fill in all fields');
                return;
            }

            // Validate username format
            if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
                showError('Username must be 3-20 characters long and contain only letters and numbers');
                document.getElementById('username').classList.add('error');
                return;
            }

            // Validate email format
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showError('Please enter a valid email address');
                document.getElementById('email').classList.add('error');
                return;
            }
            
            if (password !== confirmPassword) {
                showError('Passwords do not match');
                document.getElementById('password').classList.add('error');
                document.getElementById('confirmPassword').classList.add('error');
                return;
            }

            // Password strength validation
            if (password.length < 8) {
                showError('Password must be at least 8 characters long');
                document.getElementById('password').classList.add('error');
                return;
            }
            if (!/[A-Z]/.test(password)) {
                showError('Password must contain at least one uppercase letter');
                document.getElementById('password').classList.add('error');
                return;
            }
            if (!/[a-z]/.test(password)) {
                showError('Password must contain at least one lowercase letter');
                document.getElementById('password').classList.add('error');
                return;
            }
            if (!/[0-9]/.test(password)) {
                showError('Password must contain at least one number');
                document.getElementById('password').classList.add('error');
                return;
            }
            if (!/[!@#$%^&*]/.test(password)) {
                showError('Password must contain at least one special character (!@#$%^&*)');
                document.getElementById('password').classList.add('error');
                return;
            }

            try {
                // Show loading state
                const submitBtn = signupForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
                submitBtn.disabled = true;

                // Send signup request to server
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, username, email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    if (data.field) {
                        document.getElementById(data.field).classList.add('error');
                    }
                    throw new Error(data.message || 'Signup failed');
                }

                // Show success message
                showSuccess('Account created successfully! Redirecting to login...');

                // Redirect to login page after a short delay
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);

            } catch (error) {
                showError(error.message);
            } finally {
                // Reset button state
                if (submitBtn) {
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.disabled = false;
                }
            }
        });
    }

    // Handle forgot password form submission
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get email value
            const email = document.getElementById('email').value;
            
            // Validate email
            if (!email) {
                showError('Please enter your email address');
                return;
            }

            try {
                // Show loading state
                const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending reset link...';
                submitBtn.disabled = true;

                // Send forgot password request to server
                const response = await fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Failed to send reset link');
                }

                // Show success message
                showSuccess('Password reset instructions have been sent to your email address');

                // Redirect back to login page after a short delay
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);

            } catch (error) {
                showError(error.message);
            } finally {
                // Reset button state
                if (submitBtn) {
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.disabled = false;
                }
            }
        });
    }
});

// Helper Functions
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-error';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    // Remove any existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Add new alert
    document.body.insertBefore(errorDiv, document.body.firstChild);
    
    // Remove alert after 5 seconds
    setTimeout(() => errorDiv.remove(), 5000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success';
    successDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    // Remove any existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Add new alert
    document.body.insertBefore(successDiv, document.body.firstChild);
    
    // Remove alert after 5 seconds
    setTimeout(() => successDiv.remove(), 5000);
}

// Helper function to clear error states
function clearErrors() {
    const errorFields = ['name', 'username', 'email', 'password', 'confirmPassword'];
    errorFields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.classList.remove('error');
        }
    });
} 