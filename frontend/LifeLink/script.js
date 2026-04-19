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
        // Fetch live data
        setTimeout(() => fetchDonorHistory(), 300);
    } 
    else if (user.role === 'RECIPIENT') {
        const nameDisplay = document.getElementById('recipient-name-display');
        const bloodDisplay = document.getElementById('recipient-blood-display');
        if (nameDisplay) nameDisplay.textContent = user.name;
        if (bloodDisplay) bloodDisplay.textContent = bloodTypeStr;
        navigateTo('recipient-dashboard');
        // Fetch live data
        setTimeout(() => fetchRecipientHistory(), 300);
    }
    else if (user.role === 'ADMIN') {
        const sidebarName = document.getElementById('admin-sidebar-name');
        if (sidebarName) sidebarName.textContent = user.name;
        navigateTo('admin-dashboard');
        // Fetch admin stats and initial data
        setTimeout(() => {
            fetchAdminStats();
            fetchInventory();
        }, 300);
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
        const response = await fetch('http://localhost:5000/api/admin/users', {
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



// ─── DONOR DASHBOARD FUNCTIONS ───────────────────────────

async function scheduleDonation(e) {
    if (e) e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    const location = document.getElementById('donation-location').value;
    const scheduledDate = document.getElementById('donation-datetime').value;
    const btn = document.getElementById('donation-submit-btn');
    const successEl = document.getElementById('donor-schedule-success');
    const errorEl = document.getElementById('donor-schedule-error');
    const errorText = document.getElementById('donor-schedule-error-text');

    // Hide previous messages
    successEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    if (!location || !scheduledDate) {
        errorText.textContent = 'Please fill in all fields.';
        errorEl.classList.remove('hidden');
        return;
    }

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Scheduling...';

    try {
        const response = await fetch('http://localhost:5000/api/donations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ location, scheduledDate })
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to schedule donation.');
        }

        successEl.classList.remove('hidden');
        document.getElementById('donor-schedule-form-inner').reset();
        // Refresh history after scheduling
        setTimeout(() => {
            successEl.classList.add('hidden');
            fetchDonorHistory();
        }, 2000);

    } catch (error) {
        errorText.textContent = error.message;
        errorEl.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function fetchDonorHistory() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const historyList = document.getElementById('donor-history-list');
    if (!historyList) return;

    try {
        const response = await fetch('http://localhost:5000/api/donations/my', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (!data.success) {
            historyList.innerHTML = '<div style="text-align:center;padding:3rem;color:#94a3b8;">Could not load history.</div>';
            return;
        }

        // Update stats
        if (data.stats) {
            const totalEl = document.getElementById('donor-total-donations');
            const livesEl = document.getElementById('donor-lives-saved');
            const nextEl = document.getElementById('donor-next-eligible');
            const bloodEl = document.getElementById('donor-blood-display');

            if (totalEl) totalEl.textContent = data.stats.totalDonations || 0;
            if (livesEl) livesEl.textContent = data.stats.livesSaved || 0;
            if (bloodEl && data.stats.bloodType) bloodEl.textContent = data.stats.bloodType;
            if (nextEl) {
                if (data.stats.nextEligible) {
                    const d = new Date(data.stats.nextEligible);
                    nextEl.textContent = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                } else {
                    nextEl.textContent = 'Eligible Now';
                }
            }
        }

        // Render history
        if (data.data.length === 0) {
            historyList.innerHTML = '<div style="text-align:center;padding:3rem;color:#94a3b8;"><i class="fas fa-calendar-plus" style="font-size:1.5rem;display:block;margin-bottom:0.5rem;"></i>No donations yet. Schedule your first one!</div>';
            return;
        }

        historyList.innerHTML = '';
        data.data.forEach(donation => {
            const date = new Date(donation.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const isScheduled = donation.status === 'SCHEDULED';
            const isCompleted = donation.status === 'COMPLETED';
            const isCancelled = donation.status === 'CANCELLED';

            let statusBadge = '';
            let cardBg = 'bg-gray-50/30';
            let iconBg = 'bg-white border-red-50';

            if (isScheduled) {
                statusBadge = '<span class="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-100/50"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Scheduled</span>';
                cardBg = 'bg-white shadow-sm';
                iconBg = 'bg-amber-50 border-amber-100 text-amber-600';
            } else if (isCompleted) {
                statusBadge = '<span class="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100/50"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Completed</span>';
            } else if (isCancelled) {
                statusBadge = '<span class="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-100/50"><span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> Cancelled</span>';
            }

            const div = document.createElement('div');
            div.className = `group flex flex-col sm:flex-row sm:items-center justify-between p-4 px-6 rounded-2xl border border-gray-100/60 ${cardBg} hover:bg-white hover:border-gray-200 hover:shadow-md transition-all duration-300 gap-4`;
            div.innerHTML = `
                <div class="flex items-center gap-5">
                    <div class="w-12 h-12 ${isScheduled ? iconBg : 'bg-white border border-red-50 text-[#D32F2F]'} rounded-full flex items-center justify-center font-bold shadow-sm group-hover:scale-110 transition-transform">
                        ${escapeHtml(donation.bloodType)}
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-900 text-[1.05rem]">${date}</h4>
                        <p class="text-gray-500 font-medium text-sm mt-0.5">${escapeHtml(donation.location)}</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">${statusBadge}</div>
            `;
            historyList.appendChild(div);
        });

    } catch (error) {
        console.error('Failed to fetch donor history:', error);
        historyList.innerHTML = '<div style="text-align:center;padding:3rem;color:#94a3b8;">Error loading history.</div>';
    }
}


// ─── RECIPIENT DASHBOARD FUNCTIONS ──────────────────────

async function submitBloodRequest(e) {
    if (e) e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    const bloodGroup = document.getElementById('request-blood-group').value;
    const units = document.getElementById('request-units').value;
    const urgency = document.getElementById('request-urgency').value;
    const hospital = document.getElementById('request-hospital').value;
    const btn = document.getElementById('request-submit-btn');
    const successEl = document.getElementById('recipient-request-success');
    const errorEl = document.getElementById('recipient-request-error');
    const errorText = document.getElementById('recipient-request-error-text');

    successEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    if (!bloodGroup || !units || !urgency || !hospital) {
        errorText.textContent = 'Please fill in all fields.';
        errorEl.classList.remove('hidden');
        return;
    }

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Submitting...';

    try {
        const response = await fetch('http://localhost:5000/api/requests', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bloodGroup, units, urgency, hospital })
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to submit request.');
        }

        successEl.classList.remove('hidden');
        document.getElementById('recipient-request-form-inner').reset();
        setTimeout(() => {
            successEl.classList.add('hidden');
            fetchRecipientHistory();
        }, 2000);

    } catch (error) {
        errorText.textContent = error.message;
        errorEl.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function fetchRecipientHistory() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const historyList = document.getElementById('recipient-history-list');
    if (!historyList) return;

    try {
        const response = await fetch('http://localhost:5000/api/requests/my', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (!data.success) {
            historyList.innerHTML = '<div style="text-align:center;padding:3rem;color:#94a3b8;">Could not load history.</div>';
            return;
        }

        // Update stats
        if (data.stats) {
            const bloodEl = document.getElementById('recipient-blood-display');
            const fulfilledEl = document.getElementById('recipient-fulfilled-count');
            if (bloodEl && data.stats.bloodType) bloodEl.textContent = data.stats.bloodType;
            if (fulfilledEl) fulfilledEl.textContent = (data.stats.fulfilled || 0) + ' Requests';
        }

        // Update active tracker
        const activeReq = data.data.find(r => r.status === 'PENDING' || r.status === 'APPROVED');
        const trackerInfo = document.getElementById('recipient-active-info');
        const trackerStatus = document.getElementById('recipient-active-status');
        const stepper = document.getElementById('recipient-stepper');

        if (activeReq && trackerInfo) {
            trackerInfo.textContent = `Request #${activeReq.id.substring(0,8).toUpperCase()} • ${activeReq.units} Units ${activeReq.bloodGroup}`;
            if (trackerStatus) {
                trackerStatus.classList.remove('hidden');
                trackerStatus.querySelector('span:last-child') || null;
                const statusText = activeReq.status === 'PENDING' ? 'Pending' : 'Approved';
                trackerStatus.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> ${statusText}`;
            }
            if (stepper) {
                stepper.classList.remove('opacity-50', 'pointer-events-none');
            }
        } else {
            if (trackerInfo) trackerInfo.textContent = 'No active requests.';
            if (trackerStatus) trackerStatus.classList.add('hidden');
            if (stepper) stepper.classList.add('opacity-50', 'pointer-events-none');
        }

        // Render history
        if (data.data.length === 0) {
            historyList.innerHTML = '<div style="text-align:center;padding:3rem;color:#94a3b8;"><i class="fas fa-clipboard-list" style="font-size:1.5rem;display:block;margin-bottom:0.5rem;"></i>No requests yet. Submit your first one!</div>';
            return;
        }

        historyList.innerHTML = '';
        data.data.forEach(req => {
            const date = new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            let statusBadge = '';
            let cardBg = 'bg-gray-50/30';
            if (req.status === 'PENDING') {
                statusBadge = '<span class="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-100/50"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pending</span>';
                cardBg = 'bg-white shadow-sm';
            } else if (req.status === 'APPROVED') {
                statusBadge = '<span class="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100/50"><span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Approved</span>';
            } else if (req.status === 'REJECTED') {
                statusBadge = '<span class="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-100/50"><span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> Rejected</span>';
            } else if (req.status === 'FULFILLED') {
                statusBadge = '<span class="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100/50"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Fulfilled</span>';
            }

            const div = document.createElement('div');
            div.className = `group flex flex-col sm:flex-row sm:items-center justify-between p-4 px-6 rounded-2xl border border-gray-100/60 ${cardBg} hover:bg-white hover:border-gray-200 hover:shadow-md transition-all duration-300 gap-4`;
            div.innerHTML = `
                <div class="flex items-center gap-5">
                    <div class="w-12 h-12 ${req.status === 'PENDING' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-white border-gray-100 text-gray-600'} rounded-full flex items-center justify-center font-bold shadow-sm border group-hover:scale-110 transition-transform">
                        ${escapeHtml(req.bloodGroup)}
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-900 text-[1.05rem]">${date}</h4>
                        <p class="text-gray-500 font-medium text-sm mt-0.5">${req.units} Units • ${escapeHtml(req.hospital)}</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">${statusBadge}</div>
            `;
            historyList.appendChild(div);
        });

    } catch (error) {
        console.error('Failed to fetch recipient history:', error);
        historyList.innerHTML = '<div style="text-align:center;padding:3rem;color:#94a3b8;">Error loading history.</div>';
    }
}


// ─── ADMIN INVENTORY MANAGEMENT ──────────────────────────

let currentInventoryData = [];

async function fetchInventory() {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Inject extra fields into Add Stock modal if not already present
    injectAddStockFields();

    const searchStr = document.getElementById('admin-inventory-search')?.value || '';
    
    try {
        const response = await fetch(`http://localhost:5000/api/admin/stock?search=${encodeURIComponent(searchStr)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        const tbody = document.getElementById('admin-inventory-tbody');
        if (!tbody) return;

        // --- Column Layout Fix ---
        const tableHead = document.querySelector('#admin-view-inventory thead tr');
        if (tableHead && tableHead.children.length === 4) {
            tableHead.children[2].style.display = 'none'; 
        }

        tbody.innerHTML = '';
        if (!data.success || data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:3rem;color:#84758c;">No inventory found.</td></tr>';
            const unitsEl = document.getElementById('admin-total-units');
            if (unitsEl) unitsEl.textContent = '0';
            return;
        }

        currentInventoryData = data.data;
        let totalUnits = 0;
        let criticals = [];
        const groupLevels = {};

        data.data.forEach(item => {
            totalUnits += item.totalUnits;
            if (item.totalUnits < 10) criticals.push(item.bloodGroup + ' (' + item.totalUnits + ')');
            const percentage = Math.min((item.totalUnits / 100) * 100, 100);
            groupLevels[item.bloodGroup] = { units: item.totalUnits, percentage };
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
                if (info.units < 10) { status = 'Critical'; levelClass = 'level-low'; }
                else if (info.units < 20) { status = 'Low Stock'; levelClass = 'level-low'; }
                else if (info.units > 80) { status = 'Surplus'; levelClass = 'level-surplus'; }
                const card = document.createElement('div');
                card.className = 'matrix-card';
                card.innerHTML = `
                    <div class="matrix-group">${group}</div>
                    <div class="matrix-level-outer">
                        <div class="matrix-level-inner ${levelClass}" style="width:${info.percentage}%;"></div>
                    </div>
                    <span style="font-size:0.7rem; font-weight:700; color:${info.units < 20 ? '#ef4444' : (info.units > 80 ? '#2563eb' : '#16a34a')};">${status}</span>
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

        data.data.forEach((item) => {
            const tr = document.createElement('tr');
            let badgeClass = item.totalUnits < 10 ? 'admin-badge-danger' : 'admin-badge-success';
            
            // To pass the donations array safely to showStockDetails:
            const donationsJson = JSON.stringify(item.donations).replace(/"/g, '&quot;');

            tr.innerHTML = `
                <td>
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        <div style="width:40px;height:40px;background:rgba(211,47,47,0.08);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#D32F2F;font-weight:800;font-size:0.85rem;">${escapeHtml(item.bloodGroup)}</div>
                        <div style="font-weight:600;color:#1a1a2e;">${escapeHtml(item.bloodGroup)}</div>
                    </div>
                </td>
                <td>
                    <div style="line-height:1.4;">
                        <div class="${badgeClass}" style="display:inline-block; font-size:0.75rem; padding:2px 8px; border-radius:6px; font-weight:700;">${item.totalUnits} Units Total</div>
                        <div style="font-size:0.75rem; color:#84758c; font-weight:500; margin-top:3px;">${item.donorCount} Unique Donors</div>
                    </div>
                </td>
                <td style="text-align:right;">
                    <div style="display:flex; justify-content:flex-end; gap:0.6rem;">
                        <button class="admin-btn-icon" style="background:#f8fafc; color:#6366f1; border:1px solid #e2e8f0;" onclick="window.showStockDetails('${item.bloodGroup}', ${donationsJson})" title="View Stock Breakdown">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="admin-btn-icon" style="background:#f8fafc; color:#10b981; border:1px solid #e2e8f0;" onclick="window.showStockDetails('${item.bloodGroup}', ${donationsJson})" title="Manage Record Updates">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Failed to fetch inventory', error);
    }
}

// ─── STOCK DETAILS MODAL (Eye Icon) ─────────────────────

window.showStockDetails = function(bloodGroup, donations) {
    if (!donations) return;

    // Remove existing if any
    const existing = document.getElementById('detailed-stock-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'detailed-stock-modal';
    modal.className = 'modal-backdrop'; 
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(15, 23, 42, 0.6)';
    modal.style.backdropFilter = 'blur(8px)';
    modal.style.zIndex = '3000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.padding = '2rem';

    modal.innerHTML = `
        <div class="modal-content" style="background:#fff; width:100%; max-width:850px; padding:0; overflow:hidden; border-radius:24px; border:none; box-shadow:0 25px 50px -12px rgba(0,0,0,0.15); animation: adminModalIn 0.3s ease-out;">
            <div style="padding:1.75rem 2rem; background:#fff; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:1rem;">
                    <div style="width:48px; height:48px; background:#fef2f2; border-radius:14px; display:flex; align-items:center; justify-content:center; color:#D32F2F; font-size:1.2rem; font-weight:800;">${escapeHtml(bloodGroup)}</div>
                    <div>
                        <h3 style="font-size:1.25rem; font-weight:800; color:#1e293b; letter-spacing:-0.02em;">${escapeHtml(bloodGroup)} Inventory Details</h3>
                        <div style="display:flex; align-items:center; gap:0.5rem; margin-top:2px;">
                            <span style="width:6px; height:6px; background:#10b981; border-radius:50%;"></span>
                            <p style="font-size:0.85rem; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.025em;">Tracking ${donations.length} Active Batches</p>
                        </div>
                    </div>
                </div>
                <button onclick="document.getElementById('detailed-stock-modal').remove()" style="width:40px; height:40px; border-radius:12px; border:1px solid #f1f5f9; background:#fff; color:#94a3b8; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; justify-content:center;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div style="padding:1.5rem 2rem;">
                <div style="margin-bottom:1.5rem; display:flex; align-items:center; justify-content:space-between;">
                    <h4 style="font-size:0.75rem; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.1em;">Stock Breakdown</h4>
                    <div style="font-size:0.75rem; font-weight:700; color:#64748b; background:#f8fafc; padding:4px 12px; border-radius:20px; border:1px solid #f1f5f9;">Live Updates Active</div>
                </div>
                
                <div style="max-height:55vh; overflow-y:auto; margin:0 -2rem; padding:0 2rem;">
                    <table style="width:100%; border-collapse:separate; border-spacing:0 12px;">
                        <thead>
                            <tr style="text-align:left;">
                                <th style="font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; padding:0 1rem;">Donated By</th>
                                <th style="font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; padding:0 1rem;">Donation Date</th>
                                <th style="font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; padding:0 1rem;">Expiration</th>
                                <th style="font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; padding:0 1rem;">Stock</th>
                                <th style="font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; padding:0 1rem; text-align:right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="detail-stock-tbody"></tbody>
                    </table>
                </div>
            </div>

            <div style="padding:1.5rem 2rem; background:#f8fafc; border-top:1px solid #f1f5f9; text-align:right; display:flex; justify-content:space-between; align-items:center;">
                <p style="font-size:0.75rem; color:#94a3b8; font-weight:500;">Note: Shelf life is exactly 42 days from donation.</p>
                <button onclick="document.getElementById('detailed-stock-modal').remove()" style="padding:0.75rem 2rem; border-radius:12px; border:1px solid #e2e8f0; background:#fff; font-weight:700; color:#475569; cursor:pointer; font-size:0.85rem; box-shadow:0 1px 2px rgba(0,0,0,0.05);">Close Matrix</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    const tbody = document.getElementById('detail-stock-tbody');

    donations.forEach(don => {
        const tr = document.createElement('tr');
        tr.style.background = '#fff';
        
        const donDate = new Date(don.donationDate).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });

        tr.innerHTML = `
            <td style="padding:1.15rem 1rem; border:1px solid #f1f5f9; border-right:none; border-top-left-radius:16px; border-bottom-left-radius:16px;">
                <div style="font-weight:700; color:#1e293b; font-size:0.95rem;">${escapeHtml(don.donorName)}</div>
                <div style="font-size:0.7rem; color:#94a3b8; font-weight:500; margin-top:2px;">ID: ${don.id.substring(don.id.length-8).toUpperCase()}</div>
            </td>
            <td style="padding:1.15rem 1rem; border-top:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9;">
                <div style="font-weight:700; color:#475569; font-size:0.9rem;">${donDate}</div>
            </td>
            <td style="padding:1.15rem 1rem; border-top:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9;">
                <div class="expiry-timer" data-expiry="${don.expiryDate}" style="font-size:0.85rem; padding:4px 12px; background:#f8fafc; border-radius:20px; display:inline-block; border:1px solid #f1f5f9; min-width:140px; text-align:center;">Calculating...</div>
            </td>
            <td style="padding:1.15rem 1rem; border-top:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9;">
                <div style="font-weight:800; color:#1e293b; font-size:1rem;">${don.units} Units</div>
            </td>
            <td style="padding:1.15rem 1rem; border:1px solid #f1f5f9; border-left:none; border-top-right-radius:16px; border-bottom-right-radius:16px; text-align:right;">
                <button class="admin-btn-icon" style="background:#f8fafc; color:#10b981; border:1px solid #e2e8f0;" onclick="window.editStock('${don.id}')" title="Edit Batch">
                    <i class="fas fa-pencil-alt"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    updateAllTimers();
};

window.editStock = async function(donationId) {
    const token = localStorage.getItem('token');
    if (!token) return;

    let donation = null;
    let bloodGroup = '';
    currentInventoryData.forEach(g => {
        const found = g.donations.find(d => d.id === donationId);
        if (found) {
            donation = found;
            bloodGroup = g.bloodGroup;
        }
    });
    
    if (!donation) return;

    const existing = document.getElementById('record-edit-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'record-edit-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(15, 23, 42, 0.6)';
    modal.style.backdropFilter = 'blur(4px)';
    modal.style.zIndex = '4000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.padding = '2rem';

    modal.innerHTML = `
        <div class="modal-content" style="background:#fff; width:100%; max-width:500px; padding:2rem; border-radius:24px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1); animation: adminModalIn 0.2s ease-out;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
                <div>
                    <h3 style="font-size:1.25rem; font-weight:800; color:#1e293b; letter-spacing:-0.02em;">Adjust Batch Details</h3>
                    <p style="font-size:0.75rem; color:#94a3b8; font-weight:600; text-transform:uppercase; margin-top:2px;">ID: ${donationId.toUpperCase()}</p>
                </div>
                <button onclick="document.getElementById('record-edit-modal').remove()" style="color:#94a3b8; background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
            </div>

            <form id="record-edit-form" class="space-y-5">
                <input type="hidden" id="edit-id" value="${donationId}">
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.25rem;">
                    <div>
                        <label style="display:block; font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; margin-bottom:0.6rem; letter-spacing:0.05em;">Blood Group</label>
                        <select id="edit-bg" disabled style="width:100%; padding:0.85rem; border-radius:14px; border:1px solid #f1f5f9; background:#f8fafc; font-weight:700; color:#1e293b; cursor:not-allowed;">
                            <option value="${bloodGroup}" selected>${bloodGroup}</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block; font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; margin-bottom:0.6rem; letter-spacing:0.05em;">Units</label>
                        <input type="number" id="edit-units" required min="1" value="${donation.units}" style="width:100%; padding:0.85rem; border-radius:14px; border:1px solid #e2e8f0; font-weight:700; outline:none;">
                    </div>
                </div>

                <div>
                    <label style="display:block; font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; margin-bottom:0.6rem; letter-spacing:0.05em;">Donor Full Name</label>
                    <input type="text" id="edit-donor" required value="${escapeHtml(donation.donorName)}" style="width:100%; padding:0.85rem; border-radius:14px; border:1px solid #e2e8f0; font-weight:700; outline:none;">
                </div>

                <div>
                    <label style="display:block; font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; margin-bottom:0.6rem; letter-spacing:0.05em;">Collection Date</label>
                    <input type="date" id="edit-date" required value="${new Date(donation.donationDate).toISOString().split('T')[0]}" style="width:100%; padding:0.85rem; border-radius:14px; border:1px solid #e2e8f0; font-weight:700; outline:none;">
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.25rem;">
                    <div>
                        <label style="display:block; font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; margin-bottom:0.6rem; letter-spacing:0.05em;">RBC Count</label>
                        <input type="number" step="0.1" id="edit-rbc" value="${donation.rbcCount || ''}" style="width:100%; padding:0.85rem; border-radius:14px; border:1px solid #e2e8f0; font-weight:700; outline:none;">
                    </div>
                    <div>
                        <label style="display:block; font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; margin-bottom:0.6rem; letter-spacing:0.05em;">Plasma (mL)</label>
                        <input type="number" id="edit-plasma" value="${donation.plasmaCount || ''}" style="width:100%; padding:0.85rem; border-radius:14px; border:1px solid #e2e8f0; font-weight:700; outline:none;">
                    </div>
                </div>

                <div style="display:flex; gap:1rem; padding-top:1.5rem;">
                    <button type="button" onclick="document.getElementById('record-edit-modal').remove()" style="flex:1; padding:0.9rem; border-radius:16px; border:1px solid #e2e8f0; background:#fff; font-weight:700; color:#64748b; cursor:pointer;">Cancel</button>
                    <button type="submit" style="flex:1; padding:0.9rem; border-radius:16px; border:none; background:#D32F2F; font-weight:700; color:#fff; cursor:pointer; box-shadow:0 8px 16px rgba(211,47,47,0.25);">Save Batch</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('record-edit-form').onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            bloodGroup: bloodGroup,
            units: document.getElementById('edit-units').value,
            donorName: document.getElementById('edit-donor').value,
            donationDate: document.getElementById('edit-date').value,
            rbcCount: document.getElementById('edit-rbc').value,
            plasmaCount: document.getElementById('edit-plasma').value
        };

        try {
            const res = await fetch(`http://localhost:5000/api/admin/stock/${donationId}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                addToActivityFeed(`Successfully refined batch: <strong>${payload.bloodGroup}</strong>`, 'success');
                modal.remove();
                const detailsModal = document.getElementById('detailed-stock-modal');
                if (detailsModal) detailsModal.remove();
                fetchInventory();
            } else {
                alert(result.message);
            }
        } catch (err) { console.error(err); }
    };
};

// ─── COUNTDOWN TIMER LOGIC ──────────────────────────────

function updateAllTimers() {
    const timers = document.querySelectorAll('.expiry-timer');
    const now = new Date();

    timers.forEach(timer => {
        const expiryDate = new Date(timer.dataset.expiry);
        const diff = expiryDate - now;

        if (diff <= 0) {
            timer.textContent = 'EXPIRED';
            timer.style.color = '#ef4444';
            timer.style.background = '#fef2f2';
            timer.style.borderColor = '#fecaca';
            timer.style.fontWeight = '800';
            return;
        }

        const { days, hours } = calculateRemainingTime(expiryDate);
        
        timer.textContent = `${days}d ${hours}h remaining`;
        timer.style.fontWeight = '700';

        // Color coding
        if (days < 7) {
            timer.style.color = '#ef4444'; // Red
            timer.style.background = '#fef2f2';
            timer.style.borderColor = '#fecaca';
        } else if (days < 14) {
            timer.style.color = '#f59e0b'; // Orange
            timer.style.background = '#fffbeb';
            timer.style.borderColor = '#fef3c7';
        } else {
            timer.style.color = '#10b981'; // Green
            timer.style.background = '#f0fdf4';
            timer.style.borderColor = '#bbf7d0';
        }
    });
}

function calculateRemainingTime(expiryDate) {
    const diff = new Date(expiryDate) - new Date();
    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    };
}

// Run timers every minute
setInterval(updateAllTimers, 60000);



function injectAddStockFields() {
    const form = document.getElementById('admin-add-stock-form');
    if (!form || document.getElementById('add-stock-donor')) return; // Already injected or no form

    const insertPoint = form.querySelector('div:last-of-type'); // Usually before 'Cancel/Add' buttons
    if (!insertPoint) return;

    const extraFields = document.createElement('div');
    extraFields.style.display = 'contents';
    extraFields.innerHTML = `
        <div>
            <label style="font-size:0.8rem; font-weight:600; color:#475569; margin-bottom:0.35rem; display:block;">Donor Full Name</label>
            <input type="text" id="add-stock-donor" required placeholder="John Doe" style="width:100%; padding:0.7rem 1rem; border:1px solid #e6e0d6; border-radius:0.5rem; font-size:0.95rem; outline:none; font-family:inherit;">
        </div>
        <div>
            <label style="font-size:0.8rem; font-weight:600; color:#475569; margin-bottom:0.35rem; display:block;">Donation Date</label>
            <input type="date" id="add-stock-date" required style="width:100%; padding:0.7rem 1rem; border:1px solid #e6e0d6; border-radius:0.5rem; font-size:0.95rem; outline:none; font-family:inherit;">
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
            <div>
                <label style="font-size:0.8rem; font-weight:600; color:#475569; margin-bottom:0.35rem; display:block;">RBC Count</label>
                <input type="number" step="0.1" id="add-stock-rbc" placeholder="4.5" style="width:100%; padding:0.7rem 1rem; border:1px solid #e6e0d6; border-radius:0.5rem; font-size:0.95rem; outline:none; font-family:inherit;">
            </div>
            <div>
                <label style="font-size:0.8rem; font-weight:600; color:#475569; margin-bottom:0.35rem; display:block;">Plasma (mL)</label>
                <input type="number" id="add-stock-plasma" placeholder="300" style="width:100%; padding:0.7rem 1rem; border:1px solid #e6e0d6; border-radius:0.5rem; font-size:0.95rem; outline:none; font-family:inherit;">
            </div>
        </div>
    `;
    form.insertBefore(extraFields, insertPoint);

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('add-stock-date').value = today;
}

async function submitAddStock(e) {
    if (e) e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    const bg = document.getElementById('add-stock-group').value;
    const units = document.getElementById('add-stock-units').value;
    const donorName = document.getElementById('add-stock-donor')?.value;
    const donationDate = document.getElementById('add-stock-date')?.value;
    const rbcCount = document.getElementById('add-stock-rbc')?.value;
    const plasmaCount = document.getElementById('add-stock-plasma')?.value;

    try {
        const response = await fetch('http://localhost:5000/api/admin/stock', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                bloodGroup: bg, 
                units: units,
                donorName: donorName,
                donationDate: donationDate,
                rbcCount: rbcCount,
                plasmaCount: plasmaCount
            })
        });
        const data = await response.json();
        if (data.success) { 
            addToActivityFeed(`Admin replenished ${units} units of <strong>${bg}</strong> from ${donorName}`, 'success');
            document.getElementById('admin-add-stock-form').reset();
            // Re-set today's date after reset
            const today = new Date().toISOString().split('T')[0];
            const dateInput = document.getElementById('add-stock-date');
            if (dateInput) dateInput.value = today;

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
        const response = await fetch(`http://localhost:5000/api/admin/stock/${id}`, {
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
        const response = await fetch('http://localhost:5000/api/admin/requests', {
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
        const response = await fetch(`http://localhost:5000/api/admin/requests/${id}/status`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await response.json();
        if (response.ok && data.success) {
            addToActivityFeed(`Request <strong>${id.substring(0,8)}...</strong> was <strong>${newStatus}</strong>`, newStatus === 'APPROVED' ? 'success' : 'info');
            fetchAdminRequests();
            fetchInventory(); // Refresh inventory since stock may have changed
            fetchAdminStats();
        } else {
            alert(data.message || 'Failed to update request.');
        }
    } catch(err) {
        console.error(err);
    }
}

// ─── ADMIN DONATIONS MANAGEMENT ─────────────────────────

async function fetchAdminDonations() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('http://localhost:5000/api/admin/donations', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        const listDiv = document.getElementById('admin-donations-list');
        if (!listDiv) return;

        listDiv.innerHTML = '';
        if (!data.success || data.data.length === 0) {
            listDiv.innerHTML = '<div style="text-align:center;padding:3rem;color:#84758c;">No donations found.</div>';
            return;
        }

        data.data.forEach(don => {
            const donorName = don.donorProfile?.user?.name || 'Unknown Donor';
            const date = new Date(don.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            let statusBadge = 'admin-badge-primary';
            if (don.status === 'COMPLETED') statusBadge = 'admin-badge-success';
            else if (don.status === 'CANCELLED') statusBadge = 'admin-badge-danger';

            const div = document.createElement('div');
            div.className = 'admin-request-item';
            div.innerHTML = '<div style="display:flex;align-items:center;gap:0.85rem;">' +
                '<div style="width:40px;height:40px;background:rgba(211,47,47,0.08);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#D32F2F;font-weight:800;font-size:0.8rem;">' + escapeHtml(don.bloodType) + '</div>' +
                '<div><div style="font-weight:600;color:#1a1a2e;">' + escapeHtml(donorName) + '</div>' +
                '<div style="font-size:0.78rem;color:#84758c;margin-top:2px;"><span class="' + statusBadge + '">' + escapeHtml(don.status) + '</span> &middot; ' + don.units + ' Unit &middot; ' + date + ' &middot; ' + escapeHtml(don.location) + '</div></div></div>' +
                (don.status === 'SCHEDULED' ? '<div style="display:flex;gap:0.5rem;">' +
                '<button class="admin-btn-icon approve" onclick="updateDonationStatus(\'' + don.id + '\', \'COMPLETED\')" title="Complete"><i class="fas fa-check"></i></button>' +
                '<button class="admin-btn-icon reject" onclick="updateDonationStatus(\'' + don.id + '\', \'CANCELLED\')" title="Cancel"><i class="fas fa-times"></i></button>' +
                '</div>' : '<div style="font-size:0.75rem;color:#94a3b8;font-weight:600;">' + don.status + '</div>');
            listDiv.appendChild(div);
        });
    } catch (err) {
        console.error('Failed to fetch admin donations:', err);
    }
}

async function updateDonationStatus(id, newStatus) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`http://localhost:5000/api/admin/donations/${id}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await response.json();
        if (response.ok && data.success) {
            addToActivityFeed(`Donation <strong>${id.substring(0,8)}...</strong> marked as <strong>${newStatus}</strong>`, newStatus === 'COMPLETED' ? 'success' : 'info');
            fetchAdminDonations();
            fetchInventory(); // Refresh inventory since stock changed
            fetchAdminStats();
        } else {
            alert(data.message || 'Failed to update donation.');
        }
    } catch(err) {
        console.error(err);
    }
}

// ─── ADMIN STATS ────────────────────────────────────────

async function fetchAdminStats() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('http://localhost:5000/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
            const totalUsersEl = document.getElementById('admin-total-users');
            const pendingEl = document.getElementById('admin-pending-count');
            if (totalUsersEl) totalUsersEl.textContent = data.data.totalUsers || 0;
            if (pendingEl) pendingEl.textContent = data.data.pendingRequests || 0;
        }
    } catch(err) {
        console.error('Failed to fetch admin stats:', err);
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
        targetView.style.display = 'block'; 
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
        'admin-view-donations': 'Donation Approvals',
        'admin-view-requests': 'Blood Request Triage',
        'admin-view-users': 'User Directory'
    };
    const titleElem = document.getElementById('admin-page-title');
    if (titleElem) {
        titleElem.textContent = titleMap[viewId] || 'Admin Panel';
    }

    // 5. Trigger Data Refreshes
    if (viewId === 'admin-view-dashboard') { fetchAdminStats(); fetchInventory(); }
    if (viewId === 'admin-view-inventory') fetchInventory();
    if (viewId === 'admin-view-donations') fetchAdminDonations();
    if (viewId === 'admin-view-requests') fetchAdminRequests();
    if (viewId === 'admin-view-users') fetchAdminUsers();
}

// Nav Dropdown functionality
function toggleDropdown(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('nav-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('nav-dropdown');
    const container = document.getElementById('nav-user-container');
    if (dropdown && !dropdown.classList.contains('hidden')) {
        if (container && !container.contains(event.target)) {
            dropdown.classList.add('hidden');
        }
    }
});
