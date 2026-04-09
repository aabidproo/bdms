/**
 * LifeLink - Single Page Application Router & Registration Logic
 */

// === DOM Element Queries ===
const navLinks = document.querySelectorAll('.nav-link, .nav-login, .logo');
const pageSections = document.querySelectorAll('.page-section');

// === Navigation & SPA Routing ===
const DASHBOARD_ROUTES = ['donor-dashboard', 'recipient-dashboard', 'admin-dashboard'];

function navigateTo(targetId) {
    // Route & Role Protection
    if (DASHBOARD_ROUTES.includes(targetId)) {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        if (!token || !userStr) {
            targetId = 'login';
        } else {
            try {
                const user = JSON.parse(userStr);
                const role = user.role;
                let expectedDash = '';
                if (role === 'DONOR') expectedDash = 'donor-dashboard';
                else if (role === 'RECIPIENT') expectedDash = 'recipient-dashboard';
                else if (role === 'ADMIN') expectedDash = 'admin-dashboard';
                
                if (targetId !== expectedDash && expectedDash !== '') {
                    targetId = expectedDash;
                }
            } catch (e) {
                logout();
                return;
            }
        }
    }

    if (targetId === 'admin-dashboard' && localStorage.getItem('token')) {
        fetchAdminUsers();
    }

    pageSections.forEach(section => {
        section.classList.remove('active');
    });

    const targetSection = document.getElementById(targetId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        const target = link.getAttribute('data-target');
        e.preventDefault(); 
        if (target) {
            navigateTo(target);
            if (target === 'login') {
                // reset slider if returning to login naturally
                document.getElementById('login').classList.remove('sign-up-active');
                resetAuthWizard();
            }
        }
    });
});

// === Auth Panel Logic (Sliding & Validation) ===
let authStep = 1;
let authRole = null;

function toggleAuthMode() {
    const authSection = document.getElementById('login');
    if (authSection) {
        authSection.classList.toggle('sign-up-active');
        if (!authSection.classList.contains('sign-up-active')) {
            // Reset when going back to sign-in view
            resetAuthWizard();
        }
    }
}

function selectAuthRole(role) {
    authRole = role;
    const cards = document.querySelectorAll('.auth-role-card');
    cards.forEach(card => {
        card.classList.remove('border-indigo-500', 'bg-indigo-50', 'ring-2', 'ring-indigo-300');
        card.classList.add('border-gray-100');
    });
    
    const selectedCard = document.querySelector(`.auth-role-card[data-role="${role}"]`);
    if (selectedCard) {
        selectedCard.classList.remove('border-gray-100');
        selectedCard.classList.add('border-indigo-500', 'bg-indigo-50', 'ring-2', 'ring-indigo-300');
    }
}

function showError(msg) {
    const errorBox = document.getElementById('auth-error-box');
    const errorText = document.getElementById('auth-error-text');
    errorText.textContent = msg;
    errorBox.classList.remove('hidden');
}

function hideError() {
    document.getElementById('auth-error-box').classList.add('hidden');
}

function nextAuthStep() {
    hideError();
    if (authStep === 1) {
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-password').value;
        const conf = document.getElementById('reg-confirm').value;
        
        if (!email || !pass) {
            return showError('Please provide an email and password.');
        }
        if (pass.length < 6) {
            return showError('Password must be at least 6 characters.');
        }
        if (pass !== conf) {
            return showError('Passwords do not match.');
        }
        if (!authRole) {
            return showError('Please select whether you are joining as a Donor or Recipient.');
        }

        document.getElementById('auth-step-1').classList.add('hidden');
        document.getElementById('auth-step-1').classList.remove('block');
        document.getElementById('auth-step-2').classList.remove('hidden');
        document.getElementById('auth-step-2').classList.add('block');
        
        const isRecipient = authRole === 'recipient';
        document.getElementById('auth-total-steps').textContent = isRecipient ? '2' : '3';
        document.getElementById('auth-current-step').textContent = '2';
        
        // Setup Step 2 next button based on role
        const step2Btn = document.getElementById('step-2-next-btn');
        if (isRecipient) {
            step2Btn.innerHTML = 'Register <i class="fas fa-check ml-2"></i>';
            step2Btn.onclick = completeRegistration;
            step2Btn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-indigo-600');
            step2Btn.classList.add('bg-green-600', 'hover:bg-green-700');
        } else {
            step2Btn.innerHTML = 'Continue <i class="fas fa-arrow-right ml-2"></i>';
            step2Btn.onclick = nextAuthStep;
            step2Btn.classList.remove('bg-green-600', 'hover:bg-green-700');
            step2Btn.classList.add('bg-indigo-600');
        }

        authStep = 2;
    } else if (authStep === 2) {
        const name = document.getElementById('reg-name').value;
        const phone = document.getElementById('reg-phone').value;
        const address = document.getElementById('reg-address').value;
        const blood = document.getElementById('reg-blood').value;

        if (!name || name.length < 2) return showError('Name must be at least 2 characters.');
        if (!phone || phone.length < 7) return showError('Phone number must be at least 7 characters.');
        if (!address) return showError('Address is required.');
        if (!blood) return showError('Please select a blood type.');

        if (authRole === 'donor') {
            document.getElementById('auth-step-2').classList.add('hidden');
            document.getElementById('auth-step-2').classList.remove('block');
            document.getElementById('auth-step-3').classList.remove('hidden');
            document.getElementById('auth-step-3').classList.add('block');
            document.getElementById('auth-current-step').textContent = '3';
            authStep = 3;
            checkEligibility();
        }
    }
}

function prevAuthStep() {
    hideError();
    if (authStep === 2) {
        document.getElementById('auth-step-2').classList.add('hidden');
        document.getElementById('auth-step-2').classList.remove('block');
        document.getElementById('auth-step-1').classList.remove('hidden');
        document.getElementById('auth-step-1').classList.add('block');
        document.getElementById('auth-current-step').textContent = '1';
        document.getElementById('auth-total-steps').textContent = '3';
        authStep = 1;
    } else if (authStep === 3) {
        document.getElementById('auth-step-3').classList.add('hidden');
        document.getElementById('auth-step-3').classList.remove('block');
        document.getElementById('auth-step-2').classList.remove('hidden');
        document.getElementById('auth-step-2').classList.add('block');
        document.getElementById('auth-current-step').textContent = '2';
        authStep = 2;
    }
}

function checkEligibility() {
    const checks = document.querySelectorAll('.eligibility-check');
    let allChecked = true;
    checks.forEach(check => {
        if (!check.checked) allChecked = false;
    });

    const regBtn = document.getElementById('final-register-btn');
    if (allChecked) {
        regBtn.removeAttribute('disabled');
        regBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-indigo-600');
        regBtn.classList.add('hover:bg-green-700', 'hover:shadow-lg', 'active:scale-95', 'bg-green-600');
    } else {
        regBtn.setAttribute('disabled', 'true');
        regBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-indigo-600');
        regBtn.classList.remove('hover:bg-green-700', 'hover:shadow-lg', 'active:scale-95', 'bg-green-600');
    }
}

async function completeRegistration() {
    hideError();
    let btn;
    if (authRole === 'recipient') {
        const name = document.getElementById('reg-name').value;
        const phone = document.getElementById('reg-phone').value;
        const address = document.getElementById('reg-address').value;
        const blood = document.getElementById('reg-blood').value;
        
        if (!name || name.length < 2) return showError('Name must be at least 2 characters.');
        if (!phone || phone.length < 7) return showError('Phone number must be at least 7 characters.');
        if (!address) return showError('Address is required.');
        if (!blood) return showError('Please select a blood type.');
        
        btn = document.getElementById('step-2-next-btn');
    } else {
        const dob = document.getElementById('reg-dob').value;
        const gender = document.getElementById('reg-gender').value;
        const weight = document.getElementById('reg-weight').value;
        
        if (!dob) return showError('Date of Birth is required.');
        if (!gender) return showError('Gender is required.');
        if (!weight || parseFloat(weight) < 50) return showError('Weight must be at least 50kg.');
        
        btn = document.getElementById('final-register-btn');
    }

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
    
    try {
        const payload = {
            email: document.getElementById('reg-email').value,
            password: document.getElementById('reg-password').value,
            confirmPassword: document.getElementById('reg-confirm').value,
            name: document.getElementById('reg-name').value,
            role: authRole.toUpperCase(),
            phone: document.getElementById('reg-phone').value,
            address: document.getElementById('reg-address').value,
            bloodType: document.getElementById('reg-blood').value,
            medicalCondition: document.getElementById('reg-medical').value || null
        };

        if (authRole === 'donor') {
            payload.dateOfBirth = new Date(document.getElementById('reg-dob').value).toISOString();
            payload.gender = document.getElementById('reg-gender').value;
            payload.weight = parseFloat(document.getElementById('reg-weight').value);
            const lastDonation = document.getElementById('reg-last-donation').value;
            if (lastDonation) {
                payload.lastDonationDate = new Date(lastDonation).toISOString();
            }
        }
        
        const response = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            let errorMsg = data.message || 'Registration failed';
            if (data.error && Array.isArray(data.error.issues)) {
                 errorMsg = data.error.issues[0].message;
            } else if (data.error && typeof data.error === 'string') {
                 errorMsg = data.error;
            }
            throw new Error(errorMsg);
        }

        // Hide Step 2/3 & Footer, show Success screen
        document.getElementById(`auth-step-${authRole === 'donor' ? 3 : 2}`).classList.add('hidden');
        document.getElementById(`auth-step-${authRole === 'donor' ? 3 : 2}`).classList.remove('block');
        document.getElementById('auth-footer-toggle').classList.add('hidden');
        document.getElementById('auth-footer-toggle').classList.remove('block');
        
        document.getElementById('auth-success').classList.remove('hidden');
        document.getElementById('auth-current-step').parentElement.classList.add('hidden');
        document.getElementById('auth-error-box').classList.add('hidden');
    } catch (error) {
        showError(error.message);
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function resetAuthWizard() {
    hideError();
    authStep = 1;
    authRole = null;
    
    // Reset view visibility
    document.getElementById('auth-step-1').classList.remove('hidden');
    document.getElementById('auth-step-1').classList.add('block');
    document.getElementById('auth-step-2').classList.add('hidden');
    document.getElementById('auth-step-2').classList.remove('block');
    document.getElementById('auth-step-3').classList.add('hidden');
    document.getElementById('auth-step-3').classList.remove('block');
    
    const successScreen = document.getElementById('auth-success');
    if(successScreen) successScreen.classList.add('hidden');
    
    document.getElementById('auth-footer-toggle').classList.remove('hidden');
    document.getElementById('auth-footer-toggle').classList.add('block');
    document.getElementById('auth-current-step').parentElement.classList.remove('hidden');
    document.getElementById('auth-current-step').textContent = '1';
    document.getElementById('auth-total-steps').textContent = '3';

    // Reset Forms
    document.querySelectorAll('#auth-step-1 input').forEach(input => input.value = '');
    document.querySelectorAll('#auth-step-2 input').forEach(input => input.value = '');
    document.querySelectorAll('#auth-step-3 input:not([type="checkbox"])').forEach(input => input.value = '');
    document.querySelectorAll('#auth-step-2 select, #auth-step-3 select').forEach(select => select.selectedIndex = 0);
    document.querySelectorAll('.eligibility-check').forEach(input => input.checked = false);
    
    // Reset Step 2 button
    const step2Btn = document.getElementById('step-2-next-btn');
    if(step2Btn) {
        step2Btn.innerHTML = 'Continue <i class="fas fa-arrow-right ml-2"></i>';
        step2Btn.onclick = nextAuthStep;
        step2Btn.classList.remove('bg-green-600', 'hover:bg-green-700');
        step2Btn.classList.add('bg-indigo-600');
    }

    // Reset Cards
    const cards = document.querySelectorAll('.auth-role-card');
    cards.forEach(card => {
        card.classList.remove('border-indigo-500', 'bg-indigo-50', 'ring-2', 'ring-indigo-300');
        card.classList.add('border-gray-100');
    });

    checkEligibility();
}

// === Session & Login Logic ===
function showLoginError(msg) {
    const errorBox = document.getElementById('login-error-box');
    const errorText = document.getElementById('login-error-text');
    if(errorText && errorBox) {
        errorText.textContent = msg;
        errorBox.classList.remove('hidden');
    }
}

function hideLoginError() {
    const errorBox = document.getElementById('login-error-box');
    if(errorBox) errorBox.classList.add('hidden');
}

async function handleLogin(e) {
    e.preventDefault();
    hideLoginError();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
    
    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Login failed. Please check your credentials.');
        }
        
        // Save to LocalStorage
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        
        // Hide auth slide panel side effect if it's there
        const loginSec = document.getElementById('login');
        if (loginSec) loginSec.classList.remove('sign-up-active');
        
        // Route to Dashboard
        routeUserToDashboard(data.data.user);
        
        // Reset Login Form
        document.getElementById('login-form-inner').reset();
    } catch (error) {
        showLoginError(error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function routeUserToDashboard(user) {
    if (!user || !user.role) return;
    updateNav(user);
    
    // Default blood type for non-admins
    const bloodTypeStr = user.donorProfile?.bloodType || user.recipientProfile?.bloodType || 'Unknown';
    
    if (user.role === 'DONOR') {
        const nameDisplay = document.getElementById('donor-name-display');
        const bloodDisplay = document.getElementById('donor-blood-display');
        if (nameDisplay) nameDisplay.textContent = user.name;
        if (bloodDisplay) bloodDisplay.textContent = bloodTypeStr;
        navigateTo('donor-dashboard');
    } 
    else if (user.role === 'RECIPIENT') {
        const nameDisplay = document.getElementById('recipient-name-display');
        const bloodDisplay = document.getElementById('recipient-blood-display');
        if (nameDisplay) nameDisplay.textContent = user.name;
        if (bloodDisplay) bloodDisplay.textContent = bloodTypeStr;
        navigateTo('recipient-dashboard');
    }
    else if (user.role === 'ADMIN') {
        navigateTo('admin-dashboard');
    }
}

function updateNav(user) {
    const navUserContainer = document.getElementById('nav-user-container');
    const navLoginBtn = document.getElementById('nav-login-btn');
    const navUserName = document.getElementById('nav-user-name');
    
    if (user && navUserContainer && navLoginBtn && navUserName) {
        navUserName.textContent = user.name;
        navLoginBtn.classList.add('hidden');
        navUserContainer.classList.remove('hidden');
        navUserContainer.classList.add('flex');
    } else if (navUserContainer && navLoginBtn) {
        navLoginBtn.classList.remove('hidden');
        navUserContainer.classList.add('hidden');
        navUserContainer.classList.remove('flex');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateNav(null);
    navigateTo('login');
    const loginSec = document.getElementById('login');
    if (loginSec) loginSec.classList.remove('sign-up-active');
}

function checkAuthOnLoad() {
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');
    if (resetToken) {
        navigateTo('login');
        showResetBlock();
        return;
    }

    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
        try {
            const user = JSON.parse(userStr);
            routeUserToDashboard(user);
        } catch (e) {
            logout();
        }
    } else {
        updateNav(null);
    }
}

// Run auth check on initialization
document.addEventListener('DOMContentLoaded', checkAuthOnLoad);

async function fetchAdminUsers() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('http://localhost:5000/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            logout();
            showLoginError('Session expired. Please login again.');
            return;
        }

        const data = await response.json();
        const tbody = document.getElementById('admin-users-tbody');
        const counter = document.getElementById('admin-total-users');
        
        if (data.success && tbody) {
            const users = data.data;
            if (counter) counter.textContent = users.length;
            
            tbody.innerHTML = '';
            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="px-6 py-8 text-center text-gray-500 text-sm">No users found.</td></tr>';
                return;
            }

            users.forEach(u => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="px-6 py-4 border-b border-gray-100 font-medium text-gray-900">${escapeHtml(u.name)}</td>
                    <td class="px-6 py-4 border-b border-gray-100 text-gray-500">${escapeHtml(u.email)}</td>
                    <td class="px-6 py-4 border-b border-gray-100">
                        <span class="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">${escapeHtml(u.role)}</span>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) {
        console.error('Failed to fetch users:', e);
    }
}

function escapeHtml(unsafe) {
    return (unsafe || '').toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// === Forgot & Reset Password Logic ===
function showForgotBlock(e) {
    if (e) e.preventDefault();
    document.getElementById('auth-signin-card').classList.add('hidden');
    document.getElementById('auth-signup-card').classList.add('hidden');
    document.getElementById('auth-reset-card').classList.add('hidden');
    document.getElementById('auth-forgot-card').classList.remove('hidden');
    hideForgotError();
    hideForgotSuccess();
}

function showSignInBlock() {
    document.getElementById('auth-signin-card').classList.remove('hidden');
    document.getElementById('auth-signup-card').classList.remove('hidden');
    document.getElementById('auth-forgot-card').classList.add('hidden');
    document.getElementById('auth-reset-card').classList.add('hidden');
    document.getElementById('login').classList.remove('sign-up-active');
}

function showResetBlock() {
    document.getElementById('auth-signin-card').classList.add('hidden');
    document.getElementById('auth-signup-card').classList.add('hidden');
    document.getElementById('auth-forgot-card').classList.add('hidden');
    document.getElementById('auth-reset-card').classList.remove('hidden');
    hideResetError();
    hideResetSuccess();
}

function showForgotError(msg) {
    const errorBox = document.getElementById('forgot-error-box');
    const errorText = document.getElementById('forgot-error-text');
    errorText.textContent = msg;
    errorBox.classList.remove('hidden');
    document.getElementById('forgot-success-box').classList.add('hidden');
}

function hideForgotError() {
    document.getElementById('forgot-error-box').classList.add('hidden');
}

function showForgotSuccess(msg) {
    const successBox = document.getElementById('forgot-success-box');
    const successText = document.getElementById('forgot-success-text');
    successText.textContent = msg;
    successBox.classList.remove('hidden');
    document.getElementById('forgot-error-box').classList.add('hidden');
}

function hideForgotSuccess() {
    document.getElementById('forgot-success-box').classList.add('hidden');
}

async function handleForgotPassword(e) {
    e.preventDefault();
    hideForgotError();
    hideForgotSuccess();
    
    const email = document.getElementById('forgot-email').value;
    const btn = document.getElementById('forgot-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    try {
        const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'An error occurred.');
        
        showForgotSuccess(data.message);
        document.getElementById('forgot-form').reset();
    } catch (error) {
        showForgotError(error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function showResetError(msg) {
    const errorBox = document.getElementById('reset-error-box');
    const errorText = document.getElementById('reset-error-text');
    errorText.textContent = msg;
    errorBox.classList.remove('hidden');
    document.getElementById('reset-success-box').classList.add('hidden');
}

function hideResetError() {
    document.getElementById('reset-error-box').classList.add('hidden');
}

function showResetSuccess(msg) {
    const successBox = document.getElementById('reset-success-box');
    const successText = document.getElementById('reset-success-text');
    successText.textContent = msg;
    successBox.classList.remove('hidden');
    document.getElementById('reset-error-box').classList.add('hidden');
}

function hideResetSuccess() {
    document.getElementById('reset-success-box').classList.add('hidden');
}

async function handleResetPassword(e) {
    e.preventDefault();
    hideResetError();
    hideResetSuccess();
    
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) return showResetError('No reset token found in URL.');
    
    const newPassword = document.getElementById('reset-password').value;
    const confirmPassword = document.getElementById('reset-confirm').value;
    
    if (newPassword !== confirmPassword) {
        return showResetError('Passwords do not match.');
    }
    
    const btn = document.getElementById('reset-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    
    try {
        const response = await fetch('http://localhost:5000/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'An error occurred.');
        
        showResetSuccess(data.message);
        document.getElementById('reset-form').reset();
        
        // Remove token from URL and redirect to login after 2 seconds
        setTimeout(() => {
            window.history.replaceState({}, document.title, window.location.pathname);
            showSignInBlock();
        }, 2000);
        
    } catch (error) {
        showResetError(error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

