/**
 * LifeLink - Single Page Application Router & Registration Logic
 */


// === Admin Dashboard Enhancements ===
function toggleAdminSidebar() {
    const sidebar = document.getElementById('admin-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('sidebar-collapsed');
        // Change icon based on state
        const icon = document.querySelector('header button i');
        if (icon) {
            icon.className = sidebar.classList.contains('sidebar-collapsed') ? 'fas fa-arrow-right' : 'fas fa-bars';
        }
    }
}

function addToActivityFeed(eventText, type = 'info') {
    const feed = document.getElementById('admin-activity-feed');
    if (!feed) return;
    
    const item = document.createElement('div');
    item.className = 'activity-item';
    
    let iconClass = 'info-circle';
    let bgColor = 'rgba(99,102,241,0.1)';
    let color = '#6366f1';
    
    if (type === 'success') {
        iconClass = 'plus';
        bgColor = 'rgba(22,163,74,0.1)';
        color = '#16a34a';
    } else if (type === 'alert') {
        iconClass = 'heartbeat';
        bgColor = 'rgba(211,47,47,0.1)';
        color = '#D32F2F';
    }
    
    item.innerHTML = `
        <div class="activity-icon" style="background:${bgColor}; color:${color};"><i class="fas fa-${iconClass}"></i></div>
        <div class="activity-content">
            <div>${eventText}</div>
            <div class="activity-time">Just now</div>
        </div>
    `;
    
    feed.prepend(item);
    // Keep only last 10
    if (feed.children.length > 10) {
        feed.removeChild(feed.lastChild);
    }
}

// === DOM Element Queries ===
const navLinks = document.querySelectorAll('.nav-link, .nav-login, .logo');
const pageSections = document.querySelectorAll('.page-section');

// === Navigation & SPA Routing ===
const DASHBOARD_ROUTES = ['donor-dashboard', 'recipient-dashboard', 'admin-dashboard'];

function navigateTo(targetId) {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr && !DASHBOARD_ROUTES.includes(targetId) && targetId !== 'login') {
        try {
            const user = JSON.parse(userStr);
            if (user.role === 'DONOR') targetId = 'donor-dashboard';
            else if (user.role === 'RECIPIENT') targetId = 'recipient-dashboard';
            else if (user.role === 'ADMIN') targetId = 'admin-dashboard';
        } catch (e) {
            logout();
            return;
        }
    }

    if (DASHBOARD_ROUTES.includes(targetId)) {
        if (!token || !userStr) {
            targetId = 'login';
        } else {
            try {
                const user = JSON.parse(userStr);
                let expectedDash = '';
                if (user.role === 'DONOR') expectedDash = 'donor-dashboard';
                else if (user.role === 'RECIPIENT') expectedDash = 'recipient-dashboard';
                else if (user.role === 'ADMIN') expectedDash = 'admin-dashboard';
                
                if (targetId !== expectedDash && expectedDash !== '') targetId = expectedDash;
            } catch (e) {
                logout();
                return;
            }
        }
    }

    if (targetId === 'admin-dashboard' && token) {
        navigateAdmin('admin-view-dashboard');
        fetchAdminUsers();
        fetchInventory();
        fetchAdminRequests();
    }

    // Explicitly hide all sections and show only the target
    pageSections.forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none'; // HARD HIDE
    });

    const targetSection = document.getElementById(targetId);
    if (targetSection) {
        targetSection.classList.add('active');
        // Admin dashboard needs flex, others block
        if (targetId === 'admin-dashboard') {
            targetSection.style.display = 'flex';
        } else {
            targetSection.style.display = 'block';
        }
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
        
        const response = await fetch('http://localhost:5001/api/auth/register', {
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
        const response = await fetch('http://localhost:5001/api/auth/login', {
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
        const sidebarName = document.getElementById('admin-sidebar-name');
        if (sidebarName) sidebarName.textContent = user.name;
        navigateTo('admin-dashboard');
    }
}

function updateNav(user) {
    const navUserContainer = document.getElementById('nav-user-container');
    const navLoginBtn = document.getElementById('nav-login-btn');
    const navUserName = document.getElementById('nav-user-name');
    
    if (user && navUserContainer && navLoginBtn && navUserName) {
        navUserName.textContent = user.name;
        navUserName.style.cursor = 'pointer';
        navUserName.style.textDecoration = 'underline';
        navUserName.style.textDecorationStyle = 'dotted';
        navUserName.style.textUnderlineOffset = '4px';
        navUserName.onclick = goToDashboard;
        navLoginBtn.classList.add('hidden');
        navUserContainer.classList.remove('hidden');
        navUserContainer.classList.add('flex');
        // Hide public nav links when logged in
        document.querySelectorAll('.nav-link[data-target]').forEach(link => {
            link.style.display = 'none';
        });
    } else if (navUserContainer && navLoginBtn) {
        navLoginBtn.classList.remove('hidden');
        navUserContainer.classList.add('hidden');
        navUserContainer.classList.remove('flex');
        // Show public nav links when logged out
        document.querySelectorAll('.nav-link[data-target]').forEach(link => {
            link.style.display = '';
        });
    }
}

function goToDashboard() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        navigateTo('login');
        return;
    }
    try {
        const user = JSON.parse(userStr);
        if (user.role === 'ADMIN') navigateTo('admin-dashboard');
        else if (user.role === 'RECIPIENT') navigateTo('recipient-dashboard');
        else navigateTo('donor-dashboard');
    } catch (e) {
        navigateTo('login');
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

// Run initialization on load
document.addEventListener('DOMContentLoaded', () => {
    checkAuthOnLoad();
});


async function fetchAdminUsers() {
    fetchInventory();
    fetchAdminRequests();
    const token = localStorage.getItem('token');
    if (!token) return;

    // Update sidebar name
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const u = JSON.parse(userStr);
            const sidebarName = document.getElementById('admin-sidebar-name');
            if (sidebarName) sidebarName.textContent = u.name;
        } catch(e) {}
    }

    try {
        const response = await fetch('http://localhost:5001/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
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
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:3rem;color:#84758c;">No users found.</td></tr>';
                return;
            }

            users.forEach(u => {
                const initial = (u.name || '?').charAt(0).toUpperCase();
                const roleBadge = u.role === 'ADMIN' ? 'admin-badge-danger' :
                                  u.role === 'DONOR' ? 'admin-badge-success' : 'admin-badge-primary';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div style="display:flex;align-items:center;gap:0.75rem;">
                            <div style="width:36px;height:36px;background:rgba(211,47,47,0.08);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#D32F2F;font-weight:700;font-size:0.9rem;">${initial}</div>
                            <div><div style="font-weight:600;">${escapeHtml(u.name)}</div></div>
                        </div>
                    </td>
                    <td style="color:#64748b;">${escapeHtml(u.email)}</td>
                    <td><span class="${roleBadge}">${escapeHtml(u.role)}</span></td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) {
        console.error('Failed to fetch users:', e);
    }
}

function filterUserTable(query) {
    const rows = document.querySelectorAll('#admin-users-tbody tr');
    const q = query.toLowerCase();
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
    });
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
        const response = await fetch('http://localhost:5001/api/auth/forgot-password', {
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
        const response = await fetch('http://localhost:5001/api/auth/reset-password', {
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



// ─── ADMIN INVENTORY MANAGEMENT ──────────────────────────

async function fetchInventory() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const searchStr = document.getElementById('admin-inventory-search')?.value || '';
    const sortVal = document.getElementById('admin-inventory-sort')?.value || 'latest';

    try {
        const response = await fetch(`http://localhost:5001/api/admin/stock?search=${encodeURIComponent(searchStr)}&sort=${sortVal}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        const tbody = document.getElementById('admin-inventory-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (!data.success || data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:3rem;color:#84758c;">No inventory found.</td></tr>';
            const unitsEl = document.getElementById('admin-total-units');
            if (unitsEl) unitsEl.textContent = '0';
            return;
        }

        let totalUnits = 0;
        let criticals = [];
        const groupLevels = {};

        data.data.forEach(item => {
            totalUnits += item.units;
            if (item.units < 5) criticals.push(item.bloodGroup + ' (' + item.units + ')');
            const percentage = Math.min((item.units / 50) * 100, 100);
            groupLevels[item.bloodGroup] = { units: item.units, percentage };
        });

        // Update Supply Matrix
        const matrixContainer = document.getElementById('supply-matrix-container');
        if (matrixContainer) {
            matrixContainer.innerHTML = '';
            const allGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
            allGroups.forEach(group => {
                const info = groupLevels[group] || { units: 0, percentage: 0 };
                let status = 'Stable';
                let levelClass = 'level-optimal';
                if (info.units < 5) { status = 'Critical'; levelClass = 'level-low'; }
                else if (info.units < 15) { status = 'Low Stock'; levelClass = 'level-low'; }
                else if (info.units > 40) { status = 'Surplus'; levelClass = 'level-surplus'; }
                const card = document.createElement('div');
                card.className = 'matrix-card';
                card.innerHTML = `
                    <div class="matrix-group">${group}</div>
                    <div class="matrix-level-outer">
                        <div class="matrix-level-inner ${levelClass}" style="width:${info.percentage}%;"></div>
                    </div>
                    <span style="font-size:0.7rem; font-weight:700; color:${info.units < 15 ? '#ef4444' : (info.units > 40 ? '#2563eb' : '#16a34a')};">${status}</span>
                `;
                matrixContainer.appendChild(card);
            });
        }

        const unitsEl = document.getElementById('admin-total-units');
        if (unitsEl) unitsEl.textContent = totalUnits;

        const critCard = document.getElementById('admin-critical-card');
        const critText = document.getElementById('admin-critical-text');
        if (critCard && critText) {
            if (criticals.length > 0) {
                critCard.style.borderLeftColor = '#be123c';
                critText.textContent = criticals.join(', ');
                critText.style.color = '#be123c';
            } else {
                critCard.style.borderLeftColor = '#16a34a';
                critText.textContent = 'All stable';
                critText.style.color = '#16a34a';
            }
        }

        data.data.forEach(item => {
            const tr = document.createElement('tr');
            let badgeClass = item.units < 5 ? 'admin-badge-danger' : 'admin-badge-success';
            let stockLabel = item.units < 5 ? 'Low: ' + item.units + ' Total' : item.units + ' Total Stock';
            const expDate = item.expirationDate ? new Date(item.expirationDate).toLocaleDateString() : 'N/A';
            tr.innerHTML = '<td><div style="display:flex;align-items:center;gap:0.75rem;"><div style="width:40px;height:40px;background:rgba(211,47,47,0.08);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#D32F2F;font-weight:800;font-size:0.85rem;">' + escapeHtml(item.bloodGroup) + '</div><div style="font-weight:600;">' + escapeHtml(item.bloodGroup) + '</div></div></td>' +
                '<td><span class="' + badgeClass + '">' + stockLabel + '</span></td>' +
                '<td style="color:#64748b;">' + expDate + '</td>' +
                '<td style="text-align:right;"><button class="admin-btn-icon delete" onclick="deleteStock(\'' + item.id + '\')" title="Delete"><i class="fas fa-trash"></i></button></td>';
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Failed to fetch inventory', error);
    }
}



async function submitAddStock(e) {
    if (e) e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    const bg = document.getElementById('add-stock-group').value;
    const units = document.getElementById('add-stock-units').value;

    try {
        const response = await fetch('http://localhost:5001/api/admin/stock', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bloodGroup: bg, units: units })
        });
        const data = await response.json();
        if (data.success) { addToActivityFeed(`Admin replenished ${units} units of <strong>${bg}</strong>`, 'success');
            document.getElementById('admin-add-stock-form').reset();
            document.getElementById('add-stock-modal').classList.add('hidden');
            fetchInventory(); 
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error(error);
    }
}

async function deleteStock(id) {
    if (!confirm('Are you sure you want to completely erase this stock listing?')) return;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`http://localhost:5001/api/admin/stock/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) fetchInventory();
    } catch(err) {
        console.error(err);
    }
}

// ─── ADMIN REQUESTS MANAGEMENT ───────────────────────────

async function fetchAdminRequests() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('http://localhost:5001/api/admin/requests', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        const listDiv = document.getElementById('admin-requests-list');
        if (!listDiv) return;

        listDiv.innerHTML = '';
        if (!data.success || data.data.length === 0) {
            listDiv.innerHTML = '<div style="text-align:center;padding:3rem;color:#84758c;">No active request alerts.</div>';
            const pendingEl = document.getElementById('admin-pending-count');
            if (pendingEl) pendingEl.textContent = '0';
            return;
        }

        // Count pending
        const pendingCount = data.data.filter(r => r.status === 'PENDING').length;
        const pendingEl = document.getElementById('admin-pending-count');
        if (pendingEl) pendingEl.textContent = pendingCount;

        data.data.forEach(req => {
            let urgencyBadge = 'admin-badge-success';
            if (req.urgency === 'High') urgencyBadge = 'admin-badge-primary';
            else if (req.urgency === 'Critical') urgencyBadge = 'admin-badge-danger';

            const div = document.createElement('div');
            div.className = 'admin-request-item';
            div.innerHTML = '<div style="display:flex;align-items:center;gap:0.85rem;">' +
                '<div style="width:40px;height:40px;background:rgba(211,47,47,0.08);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#D32F2F;font-weight:800;font-size:0.8rem;">' + escapeHtml(req.bloodGroup) + '</div>' +
                '<div><div style="font-weight:600;color:#1a1a2e;">' + escapeHtml(req.hospital) + '</div>' +
                '<div style="font-size:0.78rem;color:#84758c;margin-top:2px;"><span class="' + urgencyBadge + '">' + escapeHtml(req.urgency) + '</span> &middot; ' + req.units + ' Units &middot; <strong>' + escapeHtml(req.status) + '</strong></div></div></div>' +
                '<div style="display:flex;gap:0.5rem;">' +
                '<button class="admin-btn-icon approve" onclick="updateReqStatus(\'' + req.id + '\', \'APPROVED\')" title="Approve"><i class="fas fa-check"></i></button>' +
                '<button class="admin-btn-icon reject" onclick="updateReqStatus(\'' + req.id + '\', \'REJECTED\')" title="Reject"><i class="fas fa-times"></i></button>' +
                '</div>';
            listDiv.appendChild(div);
        });
    } catch (err) {
        console.error(err);
    }
}

async function updateReqStatus(id, newStatus) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`http://localhost:5001/api/admin/requests/${id}/status`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        if (response.ok) { addToActivityFeed(`Request for <strong>${id.substring(0,6)}...</strong> was <strong>${newStatus}</strong>`, 'info'); fetchAdminRequests(); }
    } catch(err) {
        console.error(err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
        try {
            const user = JSON.parse(userStr);
            updateNav(user);
            routeUserToDashboard(user);
        } catch (e) {
            logout();
        }
    } else {
        navigateTo('home');
        updateNav(null);
    }
});

/**
 * ═══════════════════════════════════════════════
 * ADMIN SUB-NAVIGATION LOGIC
 * ═══════════════════════════════════════════════
 */
function navigateAdmin(viewId) {
    console.log('Navigating Admin to:', viewId);
    
    // 1. Hide all views
    document.querySelectorAll('.admin-view').forEach(view => {
        view.classList.remove('active');
        view.style.display = 'none';
    });

    // 2. Show target view
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add('active');
        // If it's the dashboard, we might need flex, but mostly block is fine for internal views
        targetView.style.display = 'block'; 
        
        // Specific handling for dashboard layout (which uses grids/flex internally)
        if (viewId === 'admin-view-dashboard') {
            targetView.style.display = 'block'; // Containers are block, internal elements are flex
        }
    }

    // 3. Update Sidebar Links
    document.querySelectorAll('.admin-sidebar-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.getElementById('link-' + viewId);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // 4. Update Header Title
    const titleMap = {
        'admin-view-dashboard': 'Dashboard Overview',
        'admin-view-inventory': 'Inventory Management',
        'admin-view-requests': 'Blood Request Triage',
        'admin-view-users': 'User Directory'
    };
    const titleElem = document.getElementById('admin-page-title');
    if (titleElem) {
        titleElem.textContent = titleMap[viewId] || 'Admin Panel';
    }

    // 5. Trigger Data Refreshes if needed
    if (viewId === 'admin-view-inventory') fetchInventory();
    if (viewId === 'admin-view-requests') fetchAdminRequests();
    if (viewId === 'admin-view-users') fetchAdminUsers();
}
