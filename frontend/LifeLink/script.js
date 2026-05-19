

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

function addToActivityFeed(eventText, type = 'info', date = null) {
    const feed = document.getElementById('admin-activity-feed');
    if (!feed) return;
    
    const item = document.createElement('div');
    item.className = 'activity-item';
    
    let iconClass = 'info-circle';
    let bgColor = 'rgba(99,102,241,0.1)';
    let color = '#6366f1';
    
    if (type === 'success' || type === 'donation' || type === 'inventory') {
        iconClass = type === 'donation' ? 'heart-pulse' : (type === 'inventory' ? 'box' : 'plus');
        bgColor = 'rgba(22,163,74,0.1)';
        color = '#16a34a';
    } else if (type === 'alert' || type === 'request') {
        iconClass = type === 'request' ? 'hand-holding-medical' : 'heartbeat';
        bgColor = 'rgba(211,47,47,0.1)';
        color = '#D32F2F';
    } else if (type === 'user') {
        iconClass = 'user-plus';
        bgColor = 'rgba(99,102,241,0.1)';
        color = '#6366f1';
    }
    
    const timeText = date ? formatTimeAgo(new Date(date)) : 'Just now';
    
    item.innerHTML = `
        <div class="activity-icon" style="background:${bgColor}; color:${color};"><i class="fas fa-${iconClass}"></i></div>
        <div class="activity-content">
            <div>${eventText}</div>
            <div class="activity-time">${timeText}</div>
        </div>
    `;
    
    feed.prepend(item);
    // Keep only last 10
    if (feed.children.length > 10) {
        feed.removeChild(feed.lastChild);
    }
}

function formatTimeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// === DOM Element Queries ===
const navLinks = document.querySelectorAll('.nav-link, .nav-login, .logo, .mobile-nav-link, #mobile-nav-login-btn');
const pageSections = document.querySelectorAll('.page-section');

// === Navigation & SPA Routing ===
const DASHBOARD_ROUTES = ['donor-dashboard', 'recipient-dashboard', 'admin-dashboard', 'profile-settings'];

window.RoleStore = {
  activeRole: null, // "donor" or "recipient"
  userRoles: [], // e.g. ["donor", "recipient"]
  userRole: null, // original registration role e.g. "donor"
  
  init(user) {
    if (!user) return;
    this.userRoles = user.user_roles || (user.role ? [user.role.toLowerCase()] : []);
    this.userRole = user.role ? user.role.toLowerCase() : null;
    this.activeRole = user.last_active_role ? user.last_active_role.toLowerCase() : (user.role ? user.role.toLowerCase() : 'donor');
    this.renderToggle();
  },
  
  async setActiveRole(role) {
    // If user already has this role, just switch
    if (this.userRoles.includes(role)) {
      this.activeRole = role;
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.last_active_role = role;
      localStorage.setItem('user', JSON.stringify(user));
      renderDashboardForActiveRole(role);

      // Persist server-side
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await fetch('http://localhost:5001/api/user/active-role', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ role })
          });
        } catch (err) { console.error('Failed to sync active role:', err); }
      }
      this.renderToggle();
      return;
    }

    // User doesn't have this role yet — auto-provision it!
    const token = localStorage.getItem('token');
    if (!token) return;

    // Show a brief loading state on the toggle
    this.renderToggle('loading');

    try {
      const res = await fetch('http://localhost:5001/api/user/add-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role })
      });
      const data = await res.json();

      if (data.success && data.data) {
        // Update local storage with fresh dual-role user data
        localStorage.setItem('user', JSON.stringify(data.data));
        this.userRoles = data.data.user_roles || [];
        this.activeRole = role;

        // Re-render dashboard for the new role
        renderDashboardForActiveRole(role);
        this.renderToggle();
      } else {
        alert(data.message || 'Failed to add role.');
        this.renderToggle();
      }
    } catch (err) {
      console.error('Auto-provision role error:', err);
      alert('Something went wrong. Please try again.');
      this.renderToggle();
    }
  },
  
  renderToggle(state) {
    const container = document.getElementById('nav-role-toggle-container');
    if (!container) return;

    // NEVER show toggle for admin users
    if (this.userRole === 'admin') {
      container.classList.add('hidden');
      container.classList.remove('flex');
      return;
    }

    // Show toggle for ANY donor or recipient user (not admins)
    const isEligible = this.userRole === 'donor' || this.userRole === 'recipient' ||
                       this.userRoles.includes('donor') || this.userRoles.includes('recipient');

    if (!isEligible) {
      container.classList.add('hidden');
      container.classList.remove('flex');
      return;
    }

    container.classList.remove('hidden');
    container.classList.add('flex');
    
    if (state === 'loading') {
      container.innerHTML = `
        <div class="flex items-center bg-white/10 p-0.5 rounded-full border border-white/20 select-none">
          <span class="px-4 py-1.5 text-xs font-black text-white/70"><i class="fas fa-spinner fa-spin"></i> Switching...</span>
        </div>
      `;
      return;
    }

    const isDonor = this.activeRole === 'donor';
    container.innerHTML = `
      <div class="flex items-center bg-white/10 p-0.5 rounded-full border border-white/20 select-none">
        <button onclick="window.RoleStore.setActiveRole('donor')" 
          class="px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${isDonor ? 'bg-white text-[#b11e28] shadow' : 'text-white hover:bg-white/10'}">
          Donor
        </button>
        <button onclick="window.RoleStore.setActiveRole('recipient')" 
          class="px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${!isDonor ? 'bg-white text-[#b11e28] shadow' : 'text-white hover:bg-white/10'}">
          Recipient
        </button>
      </div>
    `;
  }
};

function renderDashboardForActiveRole(role) {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) return;
    
    if (role === 'donor') {
        navigateTo('donor-dashboard');
        const profileEndpoint = 'http://localhost:5001/api/users/profile';
        fetch(profileEndpoint, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(res => {
            if (res.success && res.data) {
                const profile = res.data;
                const bloodType = profile.donorProfile?.bloodType || 'Unknown';
                
                const nameDisplay = document.getElementById('donor-name-display');
                const bloodDisplay = document.getElementById('donor-blood-display');
                
                if (nameDisplay) nameDisplay.textContent = profile.name;
                if (bloodDisplay) bloodDisplay.textContent = bloodType;
                
                populateDetailedProfile(profile, 'donor');
            }
        }).catch(err => console.error('Error fetching donor profile:', err));

        setTimeout(() => fetchDonorHistory(), 300);
        setTimeout(() => fetchDonorMatchedRequests(), 300);
    } else if (role === 'recipient') {
        navigateTo('recipient-dashboard');
        const profileEndpoint = 'http://localhost:5001/api/users/profile';
        fetch(profileEndpoint, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(res => {
            if (res.success && res.data) {
                const profile = res.data;
                const bloodType = profile.recipientProfile?.bloodType || 'Unknown';
                
                const nameDisplay = document.getElementById('recipient-name-display');
                const bloodDisplay = document.getElementById('recipient-blood-display');
                
                if (nameDisplay) nameDisplay.textContent = profile.name;
                if (bloodDisplay) bloodDisplay.textContent = bloodType;
                
                populateDetailedProfile(profile, 'recipient');
            }
        }).catch(err => console.error('Error fetching recipient profile:', err));

        setTimeout(() => fetchRecipientHistory(), 300);
    }
}

window.navigateTo = function(targetId) {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr && !DASHBOARD_ROUTES.includes(targetId) && targetId !== 'login') {
        try {
            const user = JSON.parse(userStr);
            const active = user.last_active_role ? user.last_active_role.toLowerCase() : (user.role ? user.role.toLowerCase() : 'donor');
            if (user.role === 'ADMIN') targetId = 'admin-dashboard';
            else if (active === 'donor') targetId = 'donor-dashboard';
            else if (active === 'recipient') targetId = 'recipient-dashboard';
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
                const roles = user.user_roles || (user.role ? [user.role.toLowerCase()] : []);
                
                let allowedRoutes = ['profile-settings'];
                if (user.role === 'ADMIN') {
                    allowedRoutes.push('admin-dashboard');
                }
                if (roles.includes('donor')) {
                    allowedRoutes.push('donor-dashboard');
                }
                if (roles.includes('recipient')) {
                    allowedRoutes.push('recipient-dashboard');
                }
                
                const active = user.last_active_role ? user.last_active_role.toLowerCase() : (user.role ? user.role.toLowerCase() : 'donor');
                let defaultDash = 'donor-dashboard';
                if (user.role === 'ADMIN') defaultDash = 'admin-dashboard';
                else if (active === 'recipient') defaultDash = 'recipient-dashboard';
                
                if (!allowedRoutes.includes(targetId)) {
                    targetId = defaultDash;
                }
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
            closeMobileMenu();
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

window.selectAuthRole = function(role) {
    authRole = role;
    const cards = document.querySelectorAll('.auth-role-card');
    cards.forEach(card => {
        card.classList.remove('border-gray-900', 'bg-gray-50', 'shadow-md');
        card.classList.add('border-gray-100');
        const icon = card.querySelector('i');
        if (icon) {
            icon.classList.remove('text-[#b11e28]');
            icon.classList.add('text-gray-400');
        }
    });
    
    const selectedCard = document.querySelector(`.auth-role-card[data-role="${role}"]`);
    if (selectedCard) {
        selectedCard.classList.remove('border-gray-100');
        selectedCard.classList.add('border-gray-900', 'bg-gray-50', 'shadow-md');
        const icon = selectedCard.querySelector('i');
        if (icon) {
            icon.classList.remove('text-gray-400');
            icon.classList.add('text-[#b11e28]');
        }
    }
    
    const titleEl = document.getElementById('auth-signup-title');
    if (titleEl) {
        titleEl.textContent = role === 'donor' ? 'Join as Donor' : 'Join as Recipient';
    }

    updateStepper(authStep);
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

// --- Auto-tick helpers for DOB and Weight ---
function autoTickAge() {
    const dobInput = document.getElementById('reg-dob');
    const chkAge = document.getElementById('chk-age');
    if (!dobInput || !chkAge || !dobInput.value) return;

    const dob = new Date(dobInput.value);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    chkAge.checked = (age >= 18 && age <= 65);
    checkEligibility();
}

function autoTickWeight() {
    const weightInput = document.getElementById('reg-weight');
    const chkWeight = document.getElementById('chk-weight');
    const weightError = document.getElementById('weight-error');
    if (!weightInput || !chkWeight) return;

    const val = parseFloat(weightInput.value);

    // Show error for invalid weight
    if (weightInput.value !== '' && (isNaN(val) || val <= 0)) {
        if (weightError) weightError.classList.remove('hidden');
        chkWeight.checked = false;
    } else {
        if (weightError) weightError.classList.add('hidden');
        chkWeight.checked = (val >= 50 && val > 0);
    }
    checkEligibility();
}

// Attach auto-tick event listeners once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const dobField = document.getElementById('reg-dob');
    const weightField = document.getElementById('reg-weight');
    if (dobField) dobField.addEventListener('change', autoTickAge);
    if (weightField) weightField.addEventListener('input', autoTickWeight);
});

function updateStepper(step) {
    const progress = document.getElementById('stepper-progress');
    const isRecipient = authRole === 'recipient';
    const totalSteps = isRecipient ? 2 : 3;
    const dots = [1, 2, 3];
    
    // Handle visibility of 3rd dot
    const step3Dot = document.getElementById('step-dot-3');
    if (step3Dot) {
        step3Dot.style.display = isRecipient ? 'none' : 'flex';
    }

    // Update progress line width
    let width = 0;
    if (totalSteps === 2) {
        width = step === 1 ? 0 : 100;
    } else {
        width = step === 1 ? 0 : (step === 2 ? 50 : 100);
    }
    
    if (progress) progress.style.width = `${width}%`;
    
    dots.forEach(d => {
        const dot = document.getElementById(`step-dot-${d}`);
        if (!dot) return;
        
        if (d < step) {
            dot.classList.add('completed');
            dot.classList.remove('active');
            dot.innerHTML = '<i class="fas fa-check text-xs"></i><span class="step-label">Done</span>';
        } else if (d === step) {
            dot.classList.add('active');
            dot.classList.remove('completed');
            dot.innerHTML = `${d}<span class="step-label">${d === 1 ? 'Role' : (d === 2 ? (isRecipient ? 'Details' : 'Account') : 'Details')}</span>`;
        } else {
            dot.classList.remove('active', 'completed');
            dot.innerHTML = `${d}<span class="step-label">${d === 1 ? 'Role' : (d === 2 ? (isRecipient ? 'Details' : 'Account') : 'Details')}</span>`;
        }
    });
}

function nextAuthStep() {
    hideError();
    const currentStepEl = document.getElementById(`auth-step-${authStep}`);
    
    // Step 1: Name, Phone, Role
    if (authStep === 1) {
        const name = document.getElementById('reg-name').value;
        const phone = document.getElementById('reg-phone').value;

        if (!name || name.length < 2) return showError('Name must be at least 2 characters.');
        if (!phone || phone.length < 7) return showError('Phone number must be at least 7 characters.');
        if (!authRole) return showError('Please select whether you are joining as a Donor or Recipient.');

        // Transition out Step 1, in Step 2
        currentStepEl.classList.add('fade-out');
        setTimeout(() => {
            currentStepEl.classList.add('hidden');
            currentStepEl.classList.remove('block', 'fade-out', 'fade-in');
            
            const step2 = document.getElementById('auth-step-2');
            step2.classList.remove('hidden');
            step2.classList.add('block', 'fade-in');
            
            authStep = 2;
            updateStepper(2);
            
            const isRecipient = authRole === 'recipient';
            const step2Btn = document.getElementById('step-2-next-btn');
            if (isRecipient) {
                step2Btn.innerHTML = 'Register <i class="fas fa-check ml-2"></i>';
                step2Btn.onclick = completeRegistration;
            } else {
                step2Btn.innerHTML = 'Continue <i class="fas fa-arrow-right ml-2"></i>';
                step2Btn.onclick = nextAuthStep;
            }
        }, 400);
    }
    // Step 2: Email, Password, Blood, Address
    else if (authStep === 2) {
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-password').value;
        const conf = document.getElementById('reg-confirm').value;
        const blood = document.getElementById('reg-blood').value;
        const address = document.getElementById('reg-address').value;

        if (!email) return showError('Email is required.');
        if (!pass) return showError('Password is required.');
        if (pass.length < 6) return showError('Password must be at least 6 characters.');
        if (pass !== conf) return showError('Passwords do not match.');
        if (!blood) return showError('Please select a blood type.');
        if (!address) return showError('Address is required.');

        if (authRole === 'donor') {
            currentStepEl.classList.add('fade-out');
            setTimeout(() => {
                currentStepEl.classList.add('hidden');
                currentStepEl.classList.remove('block', 'fade-out', 'fade-in');
                
                const step3 = document.getElementById('auth-step-3');
                step3.classList.remove('hidden');
                step3.classList.add('block', 'fade-in');
                
                authStep = 3;
                updateStepper(3);
                checkEligibility();
            }, 400);
        }
    }
}


function prevAuthStep() {
    hideError();
    const currentStepEl = document.getElementById(`auth-step-${authStep}`);
    
    if (authStep === 2) {
        currentStepEl.classList.add('fade-out');
        setTimeout(() => {
            currentStepEl.classList.add('hidden');
            currentStepEl.classList.remove('block', 'fade-out', 'fade-in');
            
            const step1 = document.getElementById('auth-step-1');
            step1.classList.remove('hidden');
            step1.classList.add('block', 'fade-in');
            
            authStep = 1;
            updateStepper(1);
        }, 400);
    } else if (authStep === 3) {
        currentStepEl.classList.add('fade-out');
        setTimeout(() => {
            currentStepEl.classList.add('hidden');
            currentStepEl.classList.remove('block', 'fade-out', 'fade-in');
            
            const step2 = document.getElementById('auth-step-2');
            step2.classList.remove('hidden');
            step2.classList.add('block', 'fade-in');
            
            authStep = 2;
            updateStepper(2);
        }, 400);
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
        regBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        regBtn.classList.add('hover:bg-red-800', 'hover:shadow-lg', 'active:scale-95');
    } else {
        regBtn.setAttribute('disabled', 'true');
        regBtn.classList.add('opacity-50', 'cursor-not-allowed');
        regBtn.classList.remove('hover:bg-red-800', 'hover:shadow-lg', 'active:scale-95');
    }
}

async function completeRegistration() {
    hideError();
    let btn;

    // Common validation for both roles (fields from Steps 1 & 2)
    const name = document.getElementById('reg-name').value;
    const phone = document.getElementById('reg-phone').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    const blood = document.getElementById('reg-blood').value;
    const province = document.getElementById('reg-province').value;
    const district = document.getElementById('reg-district').value;
    const address = document.getElementById('reg-address').value;

    if (!name || name.length < 2) return showError('Name must be at least 2 characters.');
    if (!phone || phone.length < 7) return showError('Phone number must be at least 7 characters.');
    if (!email) return showError('Email is required.');
    if (!pass || pass.length < 6) return showError('Password must be at least 6 characters.');
    if (!blood) return showError('Please select a blood type.');
    if (!province) return showError('Please select a province.');
    if (!district) return showError('Please select a district.');
    if (!address) return showError('Address is required.');

    if (authRole === 'recipient') {
        btn = document.getElementById('step-2-next-btn');
    } else {
        const dob = document.getElementById('reg-dob').value;
        const gender = document.getElementById('reg-gender').value;
        const weight = document.getElementById('reg-weight').value;
        
        if (!dob) return showError('Date of Birth is required.');
        if (!gender) return showError('Gender is required.');
        if (!weight || parseFloat(weight) <= 0) return showError('Weight must be a positive number.');
        if (parseFloat(weight) < 50) return showError('Weight must be at least 50kg.');
        
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
            province: document.getElementById('reg-province').value,
            district: document.getElementById('reg-district').value,
            address: document.getElementById('reg-address').value,
            bloodType: document.getElementById('reg-blood').value,
            medicalCondition: document.getElementById('reg-medical').value || null
        };

        if (authRole === 'donor') {
            payload.dateOfBirth = new Date(document.getElementById('reg-dob').value).toISOString();
            payload.gender = document.getElementById('reg-gender').value;
            payload.weight = parseFloat(document.getElementById('reg-weight').value);
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
        const stepper = document.getElementById('auth-stepper');
        if (stepper) stepper.classList.add('hidden');
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
    updateStepper(1);
    
    const titleEl = document.getElementById('auth-signup-title');
    if (titleEl) titleEl.textContent = 'Create Your Account';

    document.querySelectorAll('.auth-role-card').forEach(card => {
        card.classList.remove('border-gray-900', 'bg-gray-50', 'shadow-md');
        card.classList.add('border-gray-100');
        const icon = card.querySelector('i');
        if (icon) {
            icon.classList.remove('text-[#b11e28]');
            icon.classList.add('text-gray-400');
        }
    });
    document.querySelectorAll('.auth-step').forEach(step => {
        step.classList.add('hidden');
        step.classList.remove('block', 'fade-in', 'fade-out');
    });
    
    document.getElementById('auth-step-1').classList.remove('hidden');
    document.getElementById('auth-step-1').classList.add('block', 'fade-in');
    
    const stepper = document.getElementById('auth-stepper');
    if (stepper) stepper.classList.remove('hidden');
    
    const successScreen = document.getElementById('auth-success');
    if(successScreen) successScreen.classList.add('hidden');
    
    document.getElementById('auth-footer-toggle').classList.remove('hidden');
    document.getElementById('auth-footer-toggle').classList.add('block');

    // Reset Forms
    document.querySelectorAll('.auth-step input').forEach(input => {
        input.value = '';
        input.classList.remove('input-valid', 'input-invalid');
    });
    document.querySelectorAll('.auth-step select').forEach(select => {
        select.selectedIndex = 0;
        select.classList.remove('input-valid', 'input-invalid');
    });
    document.querySelectorAll('.eligibility-check').forEach(input => input.checked = false);

    // Hide weight error
    const weightError = document.getElementById('weight-error');
    if (weightError) weightError.classList.add('hidden');
    
    // Reset Step 2 button
    const step2Btn = document.getElementById('step-2-next-btn');
    if(step2Btn) {
        step2Btn.innerHTML = 'Continue <i class="fas fa-arrow-right ml-2"></i>';
        step2Btn.onclick = nextAuthStep;
    }

    // Reset Cards
    const cards = document.querySelectorAll('.auth-role-card');
    cards.forEach(card => {
        card.classList.remove('border-[#b11e28]', 'bg-red-50/50', 'ring-2', 'ring-[#b11e28]/30', 'shadow-md');
        card.classList.add('border-gray-100');
        card.querySelector('i').classList.remove('text-[#b11e28]');
        card.querySelector('i').classList.add('text-gray-400');
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
        
        window.RoleStore.init(data.data.user);
        
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
    const token = localStorage.getItem('token');
    
    const profileEndpoint = 'http://localhost:5001/api/users/profile';
    
    if (user.role === 'DONOR') {
        navigateTo('donor-dashboard');
        fetch(profileEndpoint, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(res => {
            if (res.success && res.data) {
                const profile = res.data;
                const bloodType = profile.donorProfile?.bloodType || 'Unknown';
                
                const nameDisplay = document.getElementById('donor-name-display');
                const bloodDisplay = document.getElementById('donor-blood-display');
                
                if (nameDisplay) nameDisplay.textContent = profile.name;
                if (bloodDisplay) bloodDisplay.textContent = bloodType;
                
                populateDetailedProfile(profile, 'donor');
                
                // Keep local storage in sync (include avatar)
                const updatedUser = { ...user, name: profile.name, avatar: profile.avatar || '' };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                updateNav(updatedUser);
            }
        }).catch(err => console.error('Error fetching donor profile:', err));

        setTimeout(() => fetchDonorHistory(), 300);
    } 
    else if (user.role === 'RECIPIENT') {
        navigateTo('recipient-dashboard');
        fetch(profileEndpoint, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(res => {
            if (res.success && res.data) {
                const profile = res.data;
                const bloodType = profile.recipientProfile?.bloodType || 'Unknown';
                
                const nameDisplay = document.getElementById('recipient-name-display');
                const bloodDisplay = document.getElementById('recipient-blood-display');
                
                if (nameDisplay) nameDisplay.textContent = profile.name;
                if (bloodDisplay) bloodDisplay.textContent = bloodType;
                
                populateDetailedProfile(profile, 'recipient');

                // Keep local storage in sync (include avatar)
                const updatedUser = { ...user, name: profile.name, avatar: profile.avatar || '' };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                updateNav(updatedUser);
            }
        }).catch(err => console.error('Error fetching recipient profile:', err));

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
    const navUserAvatar = document.getElementById('nav-user-avatar');
    const adminSidebarAvatar = document.getElementById('admin-sidebar-avatar');
    
    // Mobile navigation variables
    const mobileUserSection = document.getElementById('mobile-nav-user-section');
    const mobileLoginBtn = document.getElementById('mobile-nav-login-btn');
    const mobileNavName = document.getElementById('mobile-nav-name');
    const mobileNavAvatar = document.getElementById('mobile-nav-avatar');

    if (user && navUserContainer && navLoginBtn && navUserName) {
        navUserName.textContent = user.name;
        if (mobileNavName) mobileNavName.textContent = user.name;
        
        let avatarUrl = '';
        if (user.avatar) {
            avatarUrl = user.avatar;
        } else {
            avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&size=100`;
        }

        if (navUserAvatar) {
            navUserAvatar.src = avatarUrl;
            navUserAvatar.classList.remove('hidden');
        }
        if (mobileNavAvatar) {
            mobileNavAvatar.src = avatarUrl;
        }

        if (adminSidebarAvatar) {
            if (user.avatar) {
                adminSidebarAvatar.innerHTML = `<img src="${user.avatar}" class="w-full h-full object-cover">`;
            } else {
                adminSidebarAvatar.textContent = user.name.charAt(0).toUpperCase();
            }
        }

        navLoginBtn.classList.add('hidden');
        navUserContainer.classList.remove('hidden');
        navUserContainer.classList.add('flex');

        if (mobileLoginBtn) mobileLoginBtn.classList.add('hidden');
        if (mobileUserSection) mobileUserSection.classList.remove('hidden');

        // Hide public nav links when logged in
        document.querySelectorAll('.nav-link[data-target]').forEach(link => {
            link.style.display = 'none';
        });
        document.querySelectorAll('.mobile-nav-link[data-target]').forEach(link => {
            link.style.display = 'none';
        });

        // Start real-time notifications
        const notifContainer = document.getElementById('nav-notification-container');
        if (notifContainer) {
            notifContainer.classList.remove('hidden');
            notifContainer.classList.add('flex');
        }
        startNotificationInterval();
    } else if (navUserContainer && navLoginBtn) {
        navLoginBtn.classList.remove('hidden');
        navUserContainer.classList.add('hidden');
        navUserContainer.classList.remove('flex');

        if (mobileLoginBtn) mobileLoginBtn.classList.remove('hidden');
        if (mobileUserSection) mobileUserSection.classList.add('hidden');

        // Show public nav links when logged out
        document.querySelectorAll('.nav-link[data-target]').forEach(link => {
            link.style.display = '';
        });
        document.querySelectorAll('.mobile-nav-link[data-target]').forEach(link => {
            link.style.display = '';
        });

        // Stop notifications polling
        const notifContainer = document.getElementById('nav-notification-container');
        if (notifContainer) {
            notifContainer.classList.add('hidden');
            notifContainer.classList.remove('flex');
        }
        stopNotificationInterval();
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
        const active = user.last_active_role ? user.last_active_role.toLowerCase() : (user.role ? user.role.toLowerCase() : 'donor');
        if (user.role === 'ADMIN') navigateTo('admin-dashboard');
        else if (active === 'recipient') navigateTo('recipient-dashboard');
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
    
    // Hide role toggle
    const toggleContainer = document.getElementById('nav-role-toggle-container');
    if (toggleContainer) {
        toggleContainer.classList.add('hidden');
        toggleContainer.classList.remove('flex');
    }
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
    initNepalLocations();
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
        const response = await fetch('http://localhost:5001/api/donations', {
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
        const response = await fetch('http://localhost:5001/api/donations/my', {
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
            const bloodEl = document.getElementById('donor-blood-display');

            if (totalEl) totalEl.textContent = data.stats.totalDonations || 0;
            if (livesEl) livesEl.textContent = data.stats.livesSaved || 0;
            if (bloodEl && data.stats.bloodType) bloodEl.textContent = data.stats.bloodType;
            
            // Fetch real clinical eligibility
            fetchDonorEligibility();
        }

        // Update Active Stepper Tracker
        const activeDonation = data.data.find(d => ['SCHEDULED', 'DONATED', 'SCREENED'].includes(d.status)) || data.data.find(d => d.status === 'COMPLETED');
        updateDonorStepper(activeDonation);

        // Render history
        if (data.data.length === 0) {
            updateDonorStepper(null);
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

function updateDonorStepper(activeDonation) {
    const stepper = document.getElementById('donor-stepper');
    const progressLine = document.getElementById('donor-stepper-progress');
    const infoText = document.getElementById('donor-active-info');
    if (!stepper || !progressLine) return;

    if (!activeDonation) {
        stepper.classList.add('opacity-50', 'pointer-events-none');
        progressLine.style.width = '0%';
        if (infoText) {
            infoText.innerHTML = 'You have no active appointments. Book one to begin your next life-saving journey.';
        }
        resetDonorStepperUI();
        return;
    }

    resetDonorStepperUI();

    stepper.classList.remove('opacity-50', 'pointer-events-none');

    const status = activeDonation.status;
    const dateStr = new Date(activeDonation.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = new Date(activeDonation.scheduledDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const stepIds = ['donor-step-scheduled', 'donor-step-donated', 'donor-step-tested', 'donor-step-completed'];
    const icons = ['fa-calendar-alt', 'fa-hand-holding-heart', 'fa-microscope', 'fa-heartbeat'];

    let activeIndex = 0; // 0 = Scheduled, 1 = Donated, 2 = Screened, 3 = Completed
    if (status === 'SCHEDULED') activeIndex = 0;
    else if (status === 'DONATED') activeIndex = 1;
    else if (status === 'SCREENED') activeIndex = 2;
    else if (status === 'COMPLETED') activeIndex = 3;

    // Set progress bar width
    if (status === 'SCHEDULED') progressLine.style.width = '0%';
    else if (status === 'DONATED') progressLine.style.width = '33.333%';
    else if (status === 'SCREENED') progressLine.style.width = '66.666%';
    else if (status === 'COMPLETED') progressLine.style.width = '100%';

    stepIds.forEach((id, index) => {
        const el = document.getElementById(id);
        if (!el) return;
        const iconDiv = el.querySelector('.step-icon');
        const label = el.querySelector('p');

        if (iconDiv) {
            if (index < activeIndex) {
                // Completed previous step
                iconDiv.className = 'step-icon w-10 h-10 rounded-full flex items-center justify-center bg-[#D32F2F] text-white shadow-[0_0_15px_rgba(211,47,47,0.3)] transition-transform hover:scale-110 z-10';
                iconDiv.innerHTML = '<i class="fas fa-check text-sm"></i>';
                if (label) label.className = 'text-sm font-bold text-gray-900 hidden md:block';
            } else if (index === activeIndex) {
                if (status === 'COMPLETED') {
                    // Final step is checked
                    iconDiv.className = 'step-icon w-10 h-10 rounded-full flex items-center justify-center bg-[#D32F2F] text-white shadow-[0_0_15px_rgba(211,47,47,0.3)] transition-transform hover:scale-110 z-10';
                    iconDiv.innerHTML = '<i class="fas fa-check text-sm"></i>';
                    if (label) label.className = 'text-sm font-bold text-gray-900 hidden md:block';
                } else {
                    // Active pulsing step
                    iconDiv.className = 'step-icon w-10 h-10 rounded-full flex items-center justify-center bg-white border-[3px] border-[#D32F2F] text-[#D32F2F] shadow-sm transition-transform hover:scale-110 relative z-10';
                    iconDiv.innerHTML = `<div class="absolute inset-0 bg-[#D32F2F] rounded-full animate-ping opacity-25"></div><span class="w-2.5 h-2.5 bg-[#D32F2F] rounded-full relative z-10"></span>`;
                    if (label) label.className = 'text-sm font-bold text-[#D32F2F] hidden md:block';
                }
            } else {
                // Inactive future step
                iconDiv.className = 'step-icon w-10 h-10 rounded-full flex items-center justify-center bg-white text-gray-400 border-2 border-gray-100 shadow-sm transition-transform hover:scale-110 z-10';
                iconDiv.innerHTML = `<i class="fas ${icons[index]} text-sm"></i>`;
                if (label) label.className = 'text-sm font-bold text-gray-500 hidden md:block';
            }
        }
    });

    if (infoText) {
        if (status === 'SCHEDULED') {
            infoText.innerHTML = `You have an upcoming donation scheduled on <span class="font-extrabold text-[#D32F2F]">${dateStr}</span> at <span class="font-extrabold text-gray-800">${escapeHtml(activeDonation.location)}</span>.`;
        } else if (status === 'DONATED') {
            infoText.innerHTML = `Thank you for donating blood on <span class="font-extrabold text-[#D32F2F]">${dateStr}</span>! Your blood is currently being prepared for clinical screening.`;
        } else if (status === 'SCREENED') {
            infoText.innerHTML = `Your blood sample from <span class="font-extrabold text-indigo-600">${dateStr}</span> has been screened successfully. Preparing for inventory storage.`;
        } else if (status === 'COMPLETED') {
            infoText.innerHTML = `Thank you for your life-saving donation on <span class="font-extrabold text-emerald-600">${dateStr}</span>! Your blood has been tested, approved, and added to the inventory to save lives.`;
        }
    }
}

function resetDonorStepperUI() {
    const stepIds = ['donor-step-scheduled', 'donor-step-donated', 'donor-step-tested', 'donor-step-completed'];
    const icons = ['fa-calendar-alt', 'fa-hand-holding-heart', 'fa-microscope', 'fa-heartbeat'];
    
    stepIds.forEach((id, index) => {
        const el = document.getElementById(id);
        if (!el) return;
        const iconDiv = el.querySelector('.step-icon');
        const label = el.querySelector('p');
        
        if (iconDiv) {
            iconDiv.className = 'step-icon w-10 h-10 rounded-full flex items-center justify-center bg-white text-gray-400 border-2 border-gray-100 shadow-sm transition-transform hover:scale-110 z-10';
            iconDiv.innerHTML = `<i class="fas ${icons[index]} text-sm"></i>`;
        }
        if (label) {
            label.className = 'text-sm font-bold text-gray-500 hidden md:block';
        }
    });
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
        const response = await fetch('http://localhost:5001/api/requests', {
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
        const response = await fetch('http://localhost:5001/api/requests/my', {
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
        const activeReq = data.data.find(r => ['PENDING', 'APPROVED', 'DISPATCHED'].includes(r.status)) || data.data.find(r => r.status === 'FULFILLED');
        updateRecipientStepper(activeReq);

        const trackerInfo = document.getElementById('recipient-active-info');
        const trackerStatus = document.getElementById('recipient-active-status');

        if (activeReq && trackerInfo) {
            const idShort = activeReq.id.substring(0,8).toUpperCase();
            trackerInfo.innerHTML = `Active: <strong>#${idShort}</strong> &bull; ${activeReq.bloodGroup} &bull; ${activeReq.units} Units`;
            
            if (trackerStatus) {
                trackerStatus.classList.remove('hidden');
                let colorClass = 'bg-amber-50 text-amber-600 border-amber-100/50';
                let dotClass = 'bg-amber-500';
                let label = activeReq.status;

                if (activeReq.status === 'APPROVED') {
                    colorClass = 'bg-blue-50 text-blue-600 border-blue-100/50';
                    dotClass = 'bg-blue-500';
                } else if (activeReq.status === 'DISPATCHED') {
                    colorClass = 'bg-purple-50 text-purple-600 border-purple-100/50';
                    dotClass = 'bg-purple-500';
                } else if (activeReq.status === 'FULFILLED') {
                    colorClass = 'bg-emerald-50 text-emerald-600 border-emerald-100/50';
                    dotClass = 'bg-emerald-500';
                }

                trackerStatus.className = `px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${colorClass} border shadow-sm`;
                trackerStatus.innerHTML = `<span class="w-1.5 h-1.5 rounded-full ${dotClass} ${activeReq.status === 'PENDING' ? 'animate-pulse' : ''}"></span> ${label}`;
            }
        } else {
            if (trackerInfo) trackerInfo.textContent = 'No active requests.';
            if (trackerStatus) trackerStatus.classList.add('hidden');
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
                statusBadge = '<span class="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 bg-red-50 text-[#b11e28] border border-red-100/50"><span class="w-1.5 h-1.5 rounded-full bg-[#b11e28]"></span> Approved</span>';
            } else if (req.status === 'REJECTED') {
                statusBadge = '<span class="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-100/50"><span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> Rejected</span>';
            } else if (req.status === 'FULFILLED') {
                statusBadge = '<span class="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100/50"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Fulfilled</span>';
            }

            const div = document.createElement('div');
            div.className = `group flex flex-col sm:flex-row sm:items-center justify-between p-4 px-6 rounded-2xl border border-gray-100/60 ${cardBg} hover:bg-white hover:border-gray-200 hover:shadow-md transition-all duration-300 gap-4 cursor-pointer`;
            div.onclick = () => {
                // Highlight selected request
                Array.from(historyList.children).forEach(child => {
                    child.classList.remove('border-red-500', 'bg-red-50/10');
                });
                div.classList.add('border-red-500', 'bg-red-50/10');
                fetchRecipientMatchedDonors(req.id, req);
            };
            div.innerHTML = `
                <div class="flex items-center gap-5">
                    <div class="w-12 h-12 ${req.status === 'PENDING' ? 'bg-red-50 border-red-100 text-[#b11e28]' : 'bg-white border-gray-100 text-gray-600'} rounded-full flex items-center justify-center font-bold shadow-sm border group-hover:scale-110 transition-transform">
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

        // Auto-select latest active request to show matches
        if (data.data.length > 0) {
            const firstCard = historyList.firstElementChild;
            if (firstCard) firstCard.click();
        }

    } catch (error) {
        console.error('Failed to fetch recipient history:', error);
        historyList.innerHTML = '<div style="text-align:center;padding:3rem;color:#94a3b8;">Error loading history.</div>';
    }
}

function updateRecipientStepper(activeReq) {
    const stepper = document.getElementById('recipient-stepper');
    const progressLine = document.getElementById('recipient-stepper-progress');
    if (!stepper || !progressLine) return;

    if (!activeReq) {
        stepper.classList.add('opacity-50', 'pointer-events-none');
        progressLine.style.width = '0%';
        resetStepperUI();
        return;
    }

    stepper.classList.remove('opacity-50', 'pointer-events-none');
    resetStepperUI();

    const steps = {
        'PENDING': 1,
        'APPROVED': 2,
        'DISPATCHED': 3,
        'FULFILLED': 4
    };

    const currentStep = steps[activeReq.status] || 1;
    const progressWidths = ['0%', '0%', '33.333%', '66.666%', '100%'];
    progressLine.style.width = progressWidths[currentStep];

    const stepIds = ['step-submitted', 'step-approved', 'step-dispatched', 'step-delivered'];
    
    stepIds.forEach((id, index) => {
        const el = document.getElementById(id);
        if (!el) return;
        const iconDiv = el.querySelector('.step-icon');
        const label = el.querySelector('p');
        
        if (index + 1 < currentStep) {
            // Completed steps
            iconDiv.className = 'step-icon w-10 h-10 rounded-full flex items-center justify-center bg-[#b11e28] text-white shadow-[0_0_15px_rgba(177,30,40,0.3)] transition-transform hover:scale-110 z-10';
            iconDiv.innerHTML = '<i class="fas fa-check text-sm"></i>';
            label.className = 'text-sm font-bold text-gray-900 hidden md:block';
        } else if (index + 1 === currentStep) {
            // Current active step
            iconDiv.className = 'step-icon w-10 h-10 rounded-full flex items-center justify-center bg-white border-[3px] border-[#b11e28] text-[#b11e28] shadow-sm transition-transform hover:scale-110 relative z-10';
            // Add ping animation for active step
            iconDiv.innerHTML = `<div class="absolute inset-0 bg-[#b11e28] rounded-full animate-ping opacity-25"></div><span class="w-2.5 h-2.5 bg-[#b11e28] rounded-full relative z-10"></span>`;
            label.className = 'text-sm font-bold text-[#b11e28] hidden md:block';
        } else {
            // Pending steps
            // Keep default style from HTML
        }
    });
}

function resetStepperUI() {
    const stepIds = ['step-submitted', 'step-approved', 'step-dispatched', 'step-delivered'];
    const icons = ['fa-file-medical', 'fa-check', 'fa-shipping-fast', 'fa-house-user'];
    
    stepIds.forEach((id, index) => {
        const el = document.getElementById(id);
        if (!el) return;
        const iconDiv = el.querySelector('.step-icon');
        const label = el.querySelector('p');
        
        iconDiv.className = 'step-icon w-10 h-10 rounded-full flex items-center justify-center bg-white text-gray-400 border-2 border-gray-100 shadow-sm transition-transform hover:scale-110 z-10';
        iconDiv.innerHTML = `<i class="fas ${icons[index]} text-sm"></i>`;
        label.className = 'text-sm font-bold text-gray-500 hidden md:block';
    });
}



// ─── ADMIN INVENTORY MANAGEMENT ──────────────────────────

let currentInventoryData = [];

// ─── TOAST NOTIFICATION SYSTEM ──────────────────────────
function showToast(message, type = 'success') {
    const existing = document.querySelectorAll('.lifelink-toast');
    existing.forEach((t, i) => t.style.top = (16 + (i + 1) * 64) + 'px');

    const toast = document.createElement('div');
    toast.className = 'lifelink-toast';
    const bgMap = { success: '#10b981', error: '#ef4444', info: '#6366f1', warning: '#f59e0b' };
    const iconMap = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
    toast.style.cssText = `position:fixed;top:16px;right:16px;z-index:9999;padding:0.85rem 1.25rem;border-radius:12px;background:${bgMap[type] || bgMap.success};color:#fff;font-weight:600;font-size:0.85rem;box-shadow:0 8px 24px rgba(0,0,0,0.15);display:flex;align-items:center;gap:0.6rem;animation:toastIn 0.3s ease-out;max-width:380px;font-family:'Inter',sans-serif;`;
    toast.innerHTML = `<i class="fas ${iconMap[type] || iconMap.success}"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'toastOut 0.3s ease-in forwards'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// ─── KPI SUMMARY CARDS ─────────────────────────────────
async function fetchKPISummary() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('http://localhost:5001/api/admin/inventory/summary', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!data.success) return;

        const { totalUnits, criticalCount, expiringWeekCount, lastUpdated } = data.data;

        const container = document.getElementById('kpi-cards-container');
        if (!container) return;

        // Format last updated as relative time
        const ago = getTimeAgo(new Date(lastUpdated));

        container.innerHTML = `
            <div class="kpi-card">
                <div class="kpi-icon" style="background:rgba(99,102,241,0.1);color:#6366f1;"><i class="fas fa-layer-group"></i></div>
                <div class="kpi-data">
                    <div class="kpi-value">${totalUnits}</div>
                    <div class="kpi-label">Total Units in Stock</div>
                    <div class="kpi-sub">All blood groups</div>
                </div>
            </div>
            <div class="kpi-card ${criticalCount > 0 ? 'kpi-alert' : ''}">
                <div class="kpi-icon" style="background:rgba(239,68,68,0.1);color:#ef4444;"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="kpi-data">
                    <div class="kpi-value">${criticalCount}</div>
                    <div class="kpi-label">Critical Stock</div>
                    <div class="kpi-sub">Groups 0-2 units</div>
                </div>
            </div>
            <div class="kpi-card ${expiringWeekCount > 0 ? 'kpi-warning' : ''}">
                <div class="kpi-icon" style="background:rgba(245,158,11,0.1);color:#f59e0b;"><i class="fas fa-clock"></i></div>
                <div class="kpi-data">
                    <div class="kpi-value">${expiringWeekCount}</div>
                    <div class="kpi-label">Expiring This Week</div>
                    <div class="kpi-sub">Next 7 days</div>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon" style="background:rgba(16,185,129,0.1);color:#10b981;"><i class="fas fa-sync-alt"></i></div>
                <div class="kpi-data">
                    <div class="kpi-value kpi-time">${ago}</div>
                    <div class="kpi-label">Last Updated</div>
                    <div class="kpi-sub">${new Date(lastUpdated).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })}</div>
                </div>
            </div>
        `;
    } catch (err) {
        console.error('KPI fetch error:', err);
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// Auto-refresh KPI every 5 minutes
setInterval(fetchKPISummary, 5 * 60 * 1000);

// ─── STATUS BADGE HELPER ────────────────────────────────
function getStatusBadge(units) {
    const baseStyle = "padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 500; display: inline-block;";
    if (units >= 6) {
        return `<span style="${baseStyle} background-color: #EAF3DE; color: #27500A;">🟢 ${units} Fresh</span>`;
    } else if (units >= 3) {
        return `<span style="${baseStyle} background-color: #FAEEDA; color: #633806;">🟡 ${units} Low</span>`;
    } else {
        return `<span style="${baseStyle} background-color: #FCEBEB; color: #791F1F;">🔴 ${units} Critical</span>`;
    }
}

// ─── EXPIRATION DISPLAY HELPER ──────────────────────────
function getExpiryDisplay(daysRemaining, status) {
    if (daysRemaining === null || daysRemaining === undefined) {
        return '<span style="color:#94a3b8; font-weight: 500;">—</span>';
    }
    if (status === 'expired' || daysRemaining < 0) {
        return '<span style="color: #791F1F; font-weight: 600;">🔴 EXPIRED 🔴</span>';
    }
    if (daysRemaining <= 6) {
        return `<span style="color: #791F1F; font-weight: 600;">EXPIRES IN ${daysRemaining}d 🔴</span>`;
    }
    if (daysRemaining <= 29) {
        return `<span style="color: #633806; font-weight: 500;">🟡 ${daysRemaining}d ⚠️</span>`;
    }
    return `<span style="color: #27500A; font-weight: 500;">🟢 ${daysRemaining}d remaining</span>`;
}

async function fetchInventory() {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Inject extra fields into Add Stock modal if not already present
    injectAddStockFields();

    const searchStr = document.getElementById('admin-inventory-search')?.value || '';
    
    try {
        const response = await fetch(`http://localhost:5001/api/admin/stock?search=${encodeURIComponent(searchStr)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        const tbody = document.getElementById('admin-inventory-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (!data.success || data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:3rem;color:#84758c;">No inventory found.</td></tr>';
            const unitsEl = document.getElementById('admin-total-units');
            if (unitsEl) unitsEl.textContent = '0';
            
            const matrixContainer = document.getElementById('supply-matrix-container');
            if (matrixContainer) {
                matrixContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:2rem; color:#94a3b8; font-size:0.9rem;">No blood stock available in matrix.</div>';
            }
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

        // Render inventory rows with Status Badges + Expiration Column
        data.data.forEach((item) => {
            const tr = document.createElement('tr');
            
            const activeBatchesCount = (item.donations || []).filter(d => d.units > 0 && d.expirationStatus !== 'expired').length;
            const batchText = activeBatchesCount === 1 ? '1 active batch' : `${activeBatchesCount} active batches`;

            tr.innerHTML = `
                <td>
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        <div style="width:40px;height:40px;background:rgba(211,47,47,0.08);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#D32F2F;font-weight:800;font-size:0.85rem;">${escapeHtml(item.bloodGroup)}</div>
                        <div style="font-weight:600;color:#1a1a2e;">${escapeHtml(item.bloodGroup)}</div>
                    </div>
                </td>
                <td>
                    <div style="line-height:1.4;">
                        ${getStatusBadge(item.totalUnits)}
                        <div style="font-size:0.75rem; color:#84758c; font-weight:500; margin-top:3px;">${item.donorCount} Unique Donors</div>
                    </div>
                </td>
                <td>
                    ${getExpiryDisplay(item.groupDaysRemaining, item.groupExpirationStatus)}
                </td>
                <td>
                    <div style="font-weight: 500; color: #475569; font-size: 0.85rem;">
                        ${batchText}
                    </div>
                </td>
                <td style="text-align:right;">
                    <div style="display:flex; justify-content:flex-end; gap:0.6rem;">
                        <button class="admin-btn-icon" style="background:#f8fafc; color:#6366f1; border:1px solid #e2e8f0;" onclick="window.showStockDetails('${item.bloodGroup}')" title="View Stock Breakdown">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Also refresh KPI cards
        fetchKPISummary();
    } catch (error) {
        console.error('Failed to fetch inventory', error);
    }
}

// ─── STOCK DETAILS MODAL (Eye Icon) — ENHANCED ──────────

window.showStockDetails = async function(bloodGroup) {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Remove existing if any
    const existing = document.getElementById('detailed-stock-modal');
    if (existing) existing.remove();

    // Create modal shell immediately for fast perceived load
    const modal = document.createElement('div');
    modal.id = 'detailed-stock-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.6);backdrop-filter:blur(8px);z-index:3000;display:flex;align-items:center;justify-content:center;padding:2rem;';
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
        <div class="modal-content" style="background:#fff; width:100%; max-width:850px; padding:0; overflow:hidden; border-radius:24px; border:none; box-shadow:0 25px 50px -12px rgba(0,0,0,0.15); animation:adminModalIn 0.3s ease-out;">
            <div style="padding:2rem; text-align:center; color:#94a3b8;">
                <i class="fas fa-spinner fa-spin" style="font-size:1.5rem;"></i>
                <p style="margin-top:0.5rem; font-weight:600;">Loading batch details...</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Fetch batch data from API
    try {
        const response = await fetch(`http://localhost:5001/api/admin/stock/${encodeURIComponent(bloodGroup)}/batches`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (!result.success) {
            modal.querySelector('.modal-content').innerHTML = '<div style="padding:2rem;text-align:center;color:#ef4444;">Failed to load batch data.</div>';
            return;
        }

        const { status, totalUnits, batchCount, batches } = result.data;

        // Status badge for header
        const badgeHtml = getStatusBadge(totalUnits);

        const modalContent = modal.querySelector('.modal-content');
        modalContent.innerHTML = `
            <div style="padding:1.75rem 2rem; background:#fff; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:1rem;">
                    <div style="width:48px; height:48px; background:#fef2f2; border-radius:14px; display:flex; align-items:center; justify-content:center; color:#D32F2F; font-size:1.2rem; font-weight:800;">${escapeHtml(bloodGroup)}</div>
                    <div>
                        <div style="display:flex; align-items:center; gap:0.6rem;">
                            <h3 style="font-size:1.25rem; font-weight:800; color:#1e293b; letter-spacing:-0.02em; margin:0;">${escapeHtml(bloodGroup)} Inventory Details</h3>
                            ${badgeHtml}
                        </div>
                        <div style="display:flex; align-items:center; gap:0.5rem; margin-top:4px;">
                            <span style="width:6px; height:6px; background:#10b981; border-radius:50%;"></span>
                            <p style="font-size:0.8rem; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.025em; margin:0;">TRACKING ${batchCount} ACTIVE BATCHES</p>
                        </div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:0.75rem;">
                    <div style="font-size:0.7rem; font-weight:700; color:#64748b; background:#f8fafc; padding:4px 12px; border-radius:20px; border:1px solid #f1f5f9;">Live updates active</div>
                    <button onclick="document.getElementById('detailed-stock-modal').remove()" style="width:40px; height:40px; border-radius:12px; border:1px solid #f1f5f9; background:#fff; color:#94a3b8; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <div style="padding:1.5rem 2rem;">
                <div style="margin-bottom:1rem; display:flex; align-items:center; justify-content:space-between;">
                    <h4 style="font-size:0.75rem; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.1em; margin:0;">Stock Breakdown</h4>
                    <span style="font-size:0.8rem; font-weight:700; color:#1e293b;">${totalUnits} Units Total</span>
                </div>
                
                <div style="max-height:400px; overflow-y:auto; margin:0 -2rem; padding:0 2rem;">
                    ${batchCount === 0 ? '<div style="text-align:center; padding:3rem; color:#94a3b8;"><i class="fas fa-box-open" style="font-size:1.5rem; display:block; margin-bottom:0.5rem;"></i>No active batches for this blood group.</div>' : `
                    <table style="width:100%; border-collapse:separate; border-spacing:0 10px;">
                        <thead>
                            <tr style="text-align:left;">
                                <th style="font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; padding:0 0.75rem;">Donated By</th>
                                <th style="font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; padding:0 0.75rem;">Donation Date</th>
                                <th style="font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; padding:0 0.75rem;">Expiration</th>
                                <th style="font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; padding:0 0.75rem;">Stock</th>
                                <th style="font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; padding:0 0.75rem;">Tested</th>
                                <th style="font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; padding:0 0.75rem; text-align:right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="detail-stock-tbody"></tbody>
                    </table>`}
                </div>
            </div>

            <div style="padding:1.25rem 2rem; background:#f8fafc; border-top:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; gap:8px;">
                    <button onclick="if(window.modalOldestBatchId) window.editStock(window.modalOldestBatchId); else alert('No batches available.');" style="padding:6px 12px; border-radius:4px; border:0.5px solid #d1d5db; background:transparent; font-weight:500; color:#475569; cursor:pointer; font-size:12px;"><i class="fas fa-pencil-alt" style="margin-right:4px;"></i> Edit</button>
                    <button onclick="if(window.modalOldestBatchId) window.openDispatchModal(window.modalOldestBatchId, window.modalOldestBatchUnits, '${escapeHtml(bloodGroup)}'); else alert('No batches available.');" style="padding:6px 12px; border-radius:4px; border:0.5px solid #d1d5db; background:transparent; font-weight:500; color:#475569; cursor:pointer; font-size:12px;"><i class="fas fa-arrow-right" style="margin-right:4px;"></i> Dispatch</button>
                    <button onclick="if(window.modalOldestBatchId) window.openAlertModal(window.modalOldestBatchId, '${escapeHtml(bloodGroup)}'); else alert('No batches available.');" style="padding:6px 12px; border-radius:4px; border:0.5px solid #d1d5db; background:transparent; font-weight:500; color:#475569; cursor:pointer; font-size:12px;"><i class="fas fa-bell" style="margin-right:4px;"></i> Set Alert</button>
                </div>
                <button onclick="document.getElementById('detailed-stock-modal').remove()" style="padding:0.65rem 1.5rem; border-radius:12px; border:1px solid #e2e8f0; background:#fff; font-weight:700; color:#475569; cursor:pointer; font-size:0.85rem; box-shadow:0 1px 2px rgba(0,0,0,0.05);">Close</button>
            </div>
        `;

        if (batchCount > 0 && batches && batches.length > 0) {
            window.modalOldestBatchId = batches[0].id;
            window.modalOldestBatchUnits = batches[0].units;
        } else {
            window.modalOldestBatchId = null;
            window.modalOldestBatchUnits = null;
        }

        // Populate batch rows
        if (batchCount > 0) {
            const tbody = document.getElementById('detail-stock-tbody');
            batches.forEach(don => {
                const tr = document.createElement('tr');
                tr.style.background = '#fff';
                
                const donDate = new Date(don.donationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                // Expiry display for modal
                let expiryHtml = '';
                if (don.daysRemaining < 0) {
                    expiryHtml = `<span style="color:#791F1F; font-weight:700; background:#FCEBEB; padding:3px 10px; border-radius:20px; font-size:0.8rem;">EXPIRED 🔴</span>`;
                } else if (don.daysRemaining <= 6) {
                    expiryHtml = `<span style="color:#791F1F; font-weight:700; background:#FCEBEB; padding:3px 10px; border-radius:20px; font-size:0.8rem;">${don.daysRemaining}d ${don.hoursRemaining}h 🔴</span>`;
                } else if (don.daysRemaining <= 29) {
                    expiryHtml = `<span style="color:#633806; font-weight:700; background:#FAEEDA; padding:3px 10px; border-radius:20px; font-size:0.8rem;">${don.daysRemaining}d ${don.hoursRemaining}h ⚠️</span>`;
                } else {
                    expiryHtml = `<span style="color:#27500A; font-weight:700; background:#EAF3DE; padding:3px 10px; border-radius:20px; font-size:0.8rem;">${don.daysRemaining}d ${don.hoursRemaining}h</span>`;
                }

                tr.innerHTML = `
                    <td style="padding:1rem 0.75rem; border:1px solid #f1f5f9; border-right:none; border-top-left-radius:14px; border-bottom-left-radius:14px;">
                        <div style="font-weight:700; color:#1e293b; font-size:0.9rem;">${escapeHtml(don.donorName)}</div>
                        <div style="font-size:0.68rem; color:#94a3b8; font-weight:500; margin-top:2px;">ID: ${don.shortId}</div>
                    </td>
                    <td style="padding:1rem 0.75rem; border-top:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9;">
                        <div style="font-weight:700; color:#475569; font-size:0.85rem;">${donDate}</div>
                    </td>
                    <td style="padding:1rem 0.75rem; border-top:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9;">
                        ${expiryHtml}
                    </td>
                    <td style="padding:1rem 0.75rem; border-top:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9;">
                        <div style="font-weight:800; color:#1e293b; font-size:0.95rem;">${don.units} Units</div>
                    </td>
                    <td style="padding:1rem 0.75rem; border-top:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9;">
                        <span style="font-size:0.85rem;">${don.tested ? '✓' : '—'}</span>
                    </td>
                    <td style="padding:1rem 0.75rem; border:1px solid #f1f5f9; border-left:none; border-top-right-radius:14px; border-bottom-right-radius:14px; text-align:right;">
                        <div style="display:flex; justify-content:flex-end; gap:0.4rem;">
                            <button class="admin-btn-icon" style="background:#f8fafc; color:#6366f1; border:1px solid #e2e8f0;" onclick="window.editStock('${don.id}')" title="Edit"><i class="fas fa-pencil-alt"></i></button>
                            <button class="admin-btn-icon" style="background:#f8fafc; color:#10b981; border:1px solid #e2e8f0;" onclick="window.openDispatchModal('${don.id}', ${don.units}, '${escapeHtml(bloodGroup)}')" title="Dispatch"><i class="fas fa-share-square"></i></button>
                            <button class="admin-btn-icon" style="background:#f8fafc; color:#ef4444; border:1px solid #e2e8f0;" onclick="deleteStock('${don.id}')" title="Delete"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (err) {
        console.error('Batch fetch error:', err);
        modal.querySelector('.modal-content').innerHTML = '<div style="padding:2rem;text-align:center;color:#ef4444;">Network error loading batch data.</div>';
    }
};

// ─── EDIT STOCK MODAL (Enhanced with notes/tested) ──────

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
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:4000;display:flex;align-items:center;justify-content:center;padding:2rem;';

    modal.innerHTML = `
        <div class="modal-content" style="background:#fff; width:100%; max-width:500px; padding:2rem; border-radius:24px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1); animation: adminModalIn 0.2s ease-out;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
                <div>
                    <h3 style="font-size:1.25rem; font-weight:800; color:#1e293b; letter-spacing:-0.02em;">Adjust Batch Details</h3>
                    <p style="font-size:0.75rem; color:#94a3b8; font-weight:600; text-transform:uppercase; margin-top:2px;">ID: ${donationId.substring(donationId.length - 8).toUpperCase()}</p>
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

                <div>
                    <label style="display:block; font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; margin-bottom:0.6rem; letter-spacing:0.05em;">Notes</label>
                    <textarea id="edit-notes" rows="2" placeholder="Optional notes..." style="width:100%; padding:0.85rem; border-radius:14px; border:1px solid #e2e8f0; font-weight:600; outline:none; resize:none; font-family:inherit;">${donation.notes || ''}</textarea>
                </div>

                <div style="display:flex; align-items:center; gap:0.75rem;">
                    <input type="checkbox" id="edit-tested" ${donation.tested ? 'checked' : ''} style="width:18px; height:18px; accent-color:#D32F2F;">
                    <label for="edit-tested" style="font-size:0.85rem; font-weight:600; color:#475569;">Tested & Verified</label>
                </div>

                <div style="display:flex; gap:1rem; padding-top:1rem;">
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
            plasmaCount: document.getElementById('edit-plasma').value,
            notes: document.getElementById('edit-notes').value,
            tested: document.getElementById('edit-tested').checked
        };

        try {
            const res = await fetch(`http://localhost:5001/api/admin/stock/${donationId}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                showToast(`Batch ${payload.bloodGroup} updated successfully`, 'success');
                addToActivityFeed(`Successfully refined batch: <strong>${payload.bloodGroup}</strong>`, 'success');
                modal.remove();
                const detailsModal = document.getElementById('detailed-stock-modal');
                if (detailsModal) detailsModal.remove();
                fetchInventory();
            } else {
                showToast(result.message || 'Update failed', 'error');
            }
        } catch (err) { 
            console.error(err);
            showToast('Network error', 'error');
        }
    };
};

// ─── DISPATCH MODAL ─────────────────────────────────────

window.openDispatchModal = async function(batchId, availableUnits, bloodGroup) {
    const token = localStorage.getItem('token');
    if (!token) return;

    const existing = document.getElementById('dispatch-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'dispatch-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:4000;display:flex;align-items:center;justify-content:center;padding:2rem;';

    modal.innerHTML = `
        <div class="modal-content" style="background:#fff; width:100%; max-width:460px; padding:2rem; border-radius:24px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1); animation:adminModalIn 0.2s ease-out;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                <div>
                    <h3 style="font-size:1.2rem; font-weight:800; color:#1e293b;">Dispatch Blood Units</h3>
                    <p style="font-size:0.8rem; color:#64748b; font-weight:600; margin-top:2px;">${bloodGroup} • ${availableUnits} Units Available</p>
                </div>
                <button onclick="document.getElementById('dispatch-modal').remove()" style="color:#94a3b8; background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
            </div>

            <form id="dispatch-form" style="display:flex; flex-direction:column; gap:1.25rem;">
                <div>
                    <label style="display:block; font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; margin-bottom:0.6rem;">Select Hospital</label>
                    <select id="dispatch-hospital" required style="width:100%; padding:0.85rem; border-radius:14px; border:1px solid #e2e8f0; font-weight:600; outline:none; font-family:inherit;">
                        <option value="">Loading hospitals...</option>
                    </select>
                </div>

                <div>
                    <label style="display:block; font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; margin-bottom:0.6rem;">Quantity (Max: ${availableUnits})</label>
                    <input type="number" id="dispatch-quantity" required min="1" max="${availableUnits}" value="1" style="width:100%; padding:0.85rem; border-radius:14px; border:1px solid #e2e8f0; font-weight:700; outline:none;">
                </div>

                <div>
                    <label style="display:block; font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; margin-bottom:0.6rem;">Notes (Optional)</label>
                    <textarea id="dispatch-notes" rows="2" placeholder="e.g., Emergency transfusion" style="width:100%; padding:0.85rem; border-radius:14px; border:1px solid #e2e8f0; font-weight:600; outline:none; resize:none; font-family:inherit;"></textarea>
                </div>

                <div style="display:flex; gap:1rem; padding-top:0.5rem;">
                    <button type="button" onclick="document.getElementById('dispatch-modal').remove()" style="flex:1; padding:0.9rem; border-radius:16px; border:1px solid #e2e8f0; background:#fff; font-weight:700; color:#64748b; cursor:pointer;">Cancel</button>
                    <button type="submit" id="dispatch-submit-btn" style="flex:1; padding:0.9rem; border-radius:16px; border:none; background:linear-gradient(135deg,#6366f1,#4f46e5); font-weight:700; color:#fff; cursor:pointer; box-shadow:0 8px 16px rgba(99,102,241,0.25);">
                        <i class="fas fa-share-square" style="margin-right:0.4rem;"></i>Dispatch
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    // Fetch hospitals
    try {
        const res = await fetch('http://localhost:5001/api/admin/hospitals', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const select = document.getElementById('dispatch-hospital');
        if (data.success && data.data.length > 0) {
            select.innerHTML = '<option value="">— Select Hospital —</option>' +
                data.data.map(h => `<option value="${h.id}">${escapeHtml(h.name)} — ${escapeHtml(h.city)}</option>`).join('');
        } else {
            select.innerHTML = '<option value="">No hospitals available</option>';
        }
    } catch (err) {
        console.error('Hospital fetch error:', err);
    }

    // Handle dispatch submission
    document.getElementById('dispatch-form').onsubmit = async (e) => {
        e.preventDefault();
        const hospitalId = document.getElementById('dispatch-hospital').value;
        const quantity = parseInt(document.getElementById('dispatch-quantity').value);
        const notes = document.getElementById('dispatch-notes').value;

        if (!hospitalId) { showToast('Please select a hospital', 'warning'); return; }
        if (quantity > availableUnits) { showToast('Quantity exceeds available units', 'error'); return; }

        const btn = document.getElementById('dispatch-submit-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Dispatching...';

        try {
            const res = await fetch(`http://localhost:5001/api/admin/stock/${batchId}/dispatch`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ hospitalId, quantity, notes })
            });
            const result = await res.json();
            if (result.success) {
                showToast(result.message, 'success');
                addToActivityFeed(`Dispatched ${quantity} units of <strong>${bloodGroup}</strong> to <strong>${result.data.hospitalName}</strong>`, 'success');
                modal.remove();
                const detailsModal = document.getElementById('detailed-stock-modal');
                if (detailsModal) detailsModal.remove();
                fetchInventory();
            } else {
                showToast(result.message || 'Dispatch failed', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-share-square" style="margin-right:0.4rem;"></i>Dispatch';
            }
        } catch (err) {
            console.error(err);
            showToast('Network error during dispatch', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-share-square" style="margin-right:0.4rem;"></i>Dispatch';
        }
    };
};

// ─── ALERT CONFIGURATION MODAL ──────────────────────────

window.openAlertModal = function(batchId, bloodGroup) {
    const token = localStorage.getItem('token');
    if (!token) return;

    const existing = document.getElementById('alert-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'alert-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:4000;display:flex;align-items:center;justify-content:center;padding:2rem;';

    modal.innerHTML = `
        <div class="modal-content" style="background:#fff; width:100%; max-width:420px; padding:2rem; border-radius:24px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1); animation:adminModalIn 0.2s ease-out;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                <div>
                    <h3 style="font-size:1.2rem; font-weight:800; color:#1e293b;">Configure Alert</h3>
                    <p style="font-size:0.8rem; color:#64748b; font-weight:600; margin-top:2px;">${bloodGroup} Batch</p>
                </div>
                <button onclick="document.getElementById('alert-modal').remove()" style="color:#94a3b8; background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
            </div>

            <form id="alert-form" style="display:flex; flex-direction:column; gap:1.25rem;">
                <div>
                    <label style="display:block; font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; margin-bottom:0.6rem;">Notify before expiry</label>
                    <select id="alert-days" style="width:100%; padding:0.85rem; border-radius:14px; border:1px solid #e2e8f0; font-weight:600; outline:none; font-family:inherit;">
                        <option value="3">3 days before expiry</option>
                        <option value="5">5 days before expiry</option>
                        <option value="7" selected>7 days before expiry</option>
                    </select>
                </div>

                <div style="display:flex; align-items:center; gap:0.75rem;">
                    <input type="checkbox" id="alert-critical" style="width:18px; height:18px; accent-color:#D32F2F;">
                    <label for="alert-critical" style="font-size:0.85rem; font-weight:600; color:#475569;">Alert on critical stock (0-2 units)</label>
                </div>

                <div>
                    <label style="display:block; font-size:0.7rem; font-weight:800; color:#94a3b8; text-transform:uppercase; margin-bottom:0.6rem;">Alert Method</label>
                    <div style="display:flex; gap:0.75rem;">
                        <label style="display:flex; align-items:center; gap:0.4rem; padding:0.7rem 1rem; border:1px solid #e2e8f0; border-radius:12px; cursor:pointer; flex:1; font-size:0.85rem; font-weight:600;">
                            <input type="radio" name="alert-method" value="in_app" checked style="accent-color:#D32F2F;"> In-App
                        </label>
                        <label style="display:flex; align-items:center; gap:0.4rem; padding:0.7rem 1rem; border:1px solid #e2e8f0; border-radius:12px; cursor:pointer; flex:1; font-size:0.85rem; font-weight:600;">
                            <input type="radio" name="alert-method" value="email" style="accent-color:#D32F2F;"> Email
                        </label>
                    </div>
                </div>

                <div style="display:flex; gap:1rem; padding-top:0.5rem;">
                    <button type="button" onclick="document.getElementById('alert-modal').remove()" style="flex:1; padding:0.9rem; border-radius:16px; border:1px solid #e2e8f0; background:#fff; font-weight:700; color:#64748b; cursor:pointer;">Cancel</button>
                    <button type="submit" id="alert-submit-btn" style="flex:1; padding:0.9rem; border-radius:16px; border:none; background:linear-gradient(135deg,#f59e0b,#d97706); font-weight:700; color:#fff; cursor:pointer; box-shadow:0 8px 16px rgba(245,158,11,0.25);">
                        <i class="fas fa-bell" style="margin-right:0.4rem;"></i>Set Alert
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('alert-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('alert-submit-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const method = document.querySelector('input[name="alert-method"]:checked')?.value || 'in_app';

        try {
            const res = await fetch(`http://localhost:5001/api/admin/alerts/batch/${batchId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    daysBeforeExpiry: parseInt(document.getElementById('alert-days').value),
                    notifyOnCritical: document.getElementById('alert-critical').checked,
                    method
                })
            });
            const result = await res.json();
            if (result.success) {
                showToast('Alert configured successfully', 'success');
                modal.remove();
            } else {
                showToast(result.message || 'Failed to set alert', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-bell" style="margin-right:0.4rem;"></i>Set Alert';
            }
        } catch (err) {
            console.error(err);
            showToast('Network error', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-bell" style="margin-right:0.4rem;"></i>Set Alert';
        }
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

        if (days < 7) {
            timer.style.color = '#ef4444';
            timer.style.background = '#fef2f2';
            timer.style.borderColor = '#fecaca';
        } else if (days < 14) {
            timer.style.color = '#f59e0b';
            timer.style.background = '#fffbeb';
            timer.style.borderColor = '#fef3c7';
        } else {
            timer.style.color = '#10b981';
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
        const response = await fetch('http://localhost:5001/api/admin/stock', {
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

            let actionButtons = '';
            if (req.status === 'PENDING') {
                actionButtons = '<div style="display:flex;gap:0.5rem;">' +
                    '<button class="admin-btn-icon approve" onclick="updateReqStatus(\'' + req.id + '\', \'APPROVED\', ' + req.units + ')" title="Approve & Allocate"><i class="fas fa-check"></i></button>' +
                    '<button class="admin-btn-icon reject" onclick="updateReqStatus(\'' + req.id + '\', \'REJECTED\')" title="Reject"><i class="fas fa-times"></i></button>' +
                    '</div>';
            } else if (req.status === 'APPROVED') {
                actionButtons = '<div style="display:flex;gap:0.5rem;">' +
                    '<button class="admin-btn-icon" style="background:rgba(99,102,241,0.1);color:#6366f1;border:none;width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" onclick="updateReqStatus(\'' + req.id + '\', \'DISPATCHED\')" title="Dispatch Blood"><i class="fas fa-truck"></i></button>' +
                    '<button class="admin-btn-icon reject" onclick="updateReqStatus(\'' + req.id + '\', \'REJECTED\')" title="Cancel Request"><i class="fas fa-times"></i></button>' +
                    '</div>';
            } else if (req.status === 'DISPATCHED') {
                actionButtons = '<div style="display:flex;gap:0.5rem;">' +
                    '<button class="admin-btn-icon approve" style="background:rgba(16,185,129,0.1);color:#10b981;" onclick="updateReqStatus(\'' + req.id + '\', \'FULFILLED\')" title="Mark Delivered"><i class="fas fa-house-user"></i></button>' +
                    '</div>';
            } else {
                actionButtons = '<div style="font-size:0.75rem;color:#94a3b8;font-weight:600;">' + req.status + '</div>';
            }

            const div = document.createElement('div');
            div.className = 'admin-request-item';
            div.innerHTML = '<div style="display:flex;align-items:center;gap:0.85rem;">' +
                '<div style="width:40px;height:40px;background:rgba(211,47,47,0.08);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#D32F2F;font-weight:800;font-size:0.8rem;">' + escapeHtml(req.bloodGroup) + '</div>' +
                '<div><div style="font-weight:600;color:#1a1a2e;">' + escapeHtml(req.hospital) + '</div>' +
                '<div style="font-size:0.78rem;color:#84758c;margin-top:2px;"><span class="' + urgencyBadge + '">' + escapeHtml(req.urgency) + '</span> &middot; ' + req.units + ' Units &middot; <strong>' + escapeHtml(req.status) + '</strong></div></div></div>' +
                actionButtons;
            listDiv.appendChild(div);
        });
    } catch (err) {
        console.error(err);
    }
}

async function updateReqStatus(id, newStatus, requestedUnits = null) {
    const token = localStorage.getItem('token');
    try {
        let allocatedUnits = undefined;
        
        // If approving, prompt for partial fulfillment
        if (newStatus === 'APPROVED' && requestedUnits !== null) {
            const input = prompt(`Enter units to allocate for Request #${id.substring(0,6)} (Requested: ${requestedUnits}):`, requestedUnits);
            if (input === null) return; // Admin cancelled the prompt
            
            allocatedUnits = parseInt(input);
            if (isNaN(allocatedUnits) || allocatedUnits <= 0) {
                alert('Invalid number of units.');
                return;
            }
            if (allocatedUnits > requestedUnits) {
                alert('Cannot allocate more units than requested.');
                return;
            }
        }

        const bodyData = { status: newStatus };
        if (allocatedUnits) bodyData.allocatedUnits = allocatedUnits;

        const response = await fetch(`http://localhost:5001/api/admin/requests/${id}/status`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyData)
        });
        const data = await response.json();
        if (response.ok && data.success) {
            let activityMsg = `Request <strong>${id.substring(0,8)}...</strong> was <strong>${newStatus}</strong>`;
            if (allocatedUnits && allocatedUnits < requestedUnits) {
                activityMsg += ` (Partially Fulfilled: ${allocatedUnits} units)`;
            }
            addToActivityFeed(activityMsg, newStatus === 'APPROVED' ? 'success' : 'info');
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
        const response = await fetch('http://localhost:5001/api/admin/donations', {
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
            let actionButtons = '';
            if (don.status === 'SCHEDULED') {
                actionButtons = '<div style="display:flex;gap:0.5rem;">' +
                    '<button class="admin-btn-icon approve" onclick="updateDonationStatus(\'' + don.id + '\', \'DONATED\')" title="Mark as Donated"><i class="fas fa-user-check"></i></button>' +
                    '<button class="admin-btn-icon reject" onclick="updateDonationStatus(\'' + don.id + '\', \'CANCELLED\')" title="Cancel"><i class="fas fa-times"></i></button>' +
                    '</div>';
            } else if (don.status === 'DONATED') {
                actionButtons = '<div style="display:flex;gap:0.5rem;">' +
                    '<button class="admin-btn-icon" style="background:rgba(99,102,241,0.1);color:#6366f1;border:none;width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" onclick="updateDonationStatus(\'' + don.id + '\', \'SCREENED\')" title="Mark as Screened"><i class="fas fa-microscope"></i></button>' +
                    '<button class="admin-btn-icon reject" onclick="updateDonationStatus(\'' + don.id + '\', \'CANCELLED\')" title="Cancel"><i class="fas fa-times"></i></button>' +
                    '</div>';
            } else if (don.status === 'SCREENED') {
                actionButtons = '<div style="display:flex;gap:0.5rem;">' +
                    '<button class="admin-btn-icon approve" style="background:rgba(16,185,129,0.1);color:#10b981;" onclick="updateDonationStatus(\'' + don.id + '\', \'COMPLETED\')" title="Complete & Stock"><i class="fas fa-heartbeat"></i></button>' +
                    '<button class="admin-btn-icon reject" onclick="updateDonationStatus(\'' + don.id + '\', \'CANCELLED\')" title="Cancel"><i class="fas fa-times"></i></button>' +
                    '</div>';
            } else {
                actionButtons = '<div style="font-size:0.75rem;color:#94a3b8;font-weight:600;">' + don.status + '</div>';
            }

            div.innerHTML = '<div style="display:flex;align-items:center;gap:0.85rem;">' +
                '<div style="width:40px;height:40px;background:rgba(211,47,47,0.08);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#D32F2F;font-weight:800;font-size:0.8rem;">' + escapeHtml(don.bloodType) + '</div>' +
                '<div><div style="font-weight:600;color:#1a1a2e;">' + escapeHtml(donorName) + '</div>' +
                '<div style="font-size:0.78rem;color:#84758c;margin-top:2px;"><span class="' + statusBadge + '">' + escapeHtml(don.status) + '</span> &middot; ' + don.units + ' Unit &middot; ' + date + ' &middot; ' + escapeHtml(don.location) + '</div></div></div>' +
                actionButtons;
            listDiv.appendChild(div);
        });
    } catch (err) {
        console.error('Failed to fetch admin donations:', err);
    }
}

async function updateDonationStatus(id, newStatus) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`http://localhost:5001/api/admin/donations/${id}/status`, {
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
        const response = await fetch('http://localhost:5001/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
            const stats = data.data;
            const totalUsersEl = document.getElementById('admin-total-users');
            const pendingEl = document.getElementById('admin-pending-count');
            if (totalUsersEl) totalUsersEl.textContent = stats.totalUsers || 0;
            if (pendingEl) pendingEl.textContent = stats.pendingRequests || 0;

            // Update Chart
            if (stats.requestVolume) {
                updateRequestChart(stats.requestVolume);
            }

            // Update Activity Feed
            if (stats.recentActivity) {
                const feed = document.getElementById('admin-activity-feed');
                const emptyState = document.getElementById('activity-empty-state');
                if (feed) {
                    // Clear existing items but preserve empty state if needed
                    const items = feed.querySelectorAll('.activity-item');
                    items.forEach(el => el.remove());

                    if (stats.recentActivity.length > 0) {
                        if (emptyState) emptyState.style.display = 'none';
                        stats.recentActivity.reverse().forEach(act => {
                            addToActivityFeed(act.text, act.type, act.date);
                        });
                    } else {
                        if (emptyState) emptyState.style.display = 'block';
                    }
                }
            }
        }
    } catch(err) {
        console.error('Failed to fetch admin stats:', err);
    }
}

function updateRequestChart(volume) {
    const barsContainer = document.getElementById('admin-request-volume-bars');
    const labelsContainer = document.getElementById('admin-request-volume-labels');
    if (!barsContainer || !labelsContainer) return;

    const maxCount = Math.max(...volume.map(v => v.count), 5); // Minimum scale of 5
    
    barsContainer.innerHTML = '';
    labelsContainer.innerHTML = '';

    volume.forEach((v, index) => {
        const height = (v.count / maxCount) * 100;
        const date = new Date(v.date);
        const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        const isToday = index === volume.length - 1;

        const bar = document.createElement('div');
        bar.style.flex = '1';
        bar.style.background = isToday ? '#6366f1' : '#f1f5f9';
        bar.style.height = `${Math.max(height, 5)}%`;
        bar.style.borderRadius = '4px';
        bar.style.transition = 'height 1s cubic-bezier(0.4, 0, 0.2, 1)';
        if (isToday) bar.style.boxShadow = '0 10px 15px -3px rgba(99, 102, 241, 0.3)';
        bar.title = `${v.count} requests on ${v.date}`;
        
        barsContainer.appendChild(bar);

        const label = document.createElement('span');
        label.textContent = dayLabel;
        labelsContainer.appendChild(label);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
        try {
            const user = JSON.parse(userStr);
            window.RoleStore.init(user);
            updateNav(user);
            routeUserToDashboard(user);

            // Dynamically sync fresh user roles/profile in the background
            fetch('http://localhost:5001/api/users/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(res => {
                if (res.success && res.data) {
                    const freshUser = res.data;
                    localStorage.setItem('user', JSON.stringify(freshUser));
                    window.RoleStore.init(freshUser);
                }
            })
            .catch(err => console.error('Background profile sync error:', err));
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
window.toggleDropdown = function(event) {
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

async function fetchDonorEligibility() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch('http://localhost:5001/api/donor/eligibility', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
        
        const nextEl = document.getElementById('donor-next-eligible');
        if (!nextEl) return;

        if (result.success && result.data) {
            const { eligible, nextEligibleDate } = result.data;
            if (eligible) {
                nextEl.textContent = '✅ Eligible Now';
                nextEl.style.color = '#16a34a'; // Green
            } else {
                const d = new Date(nextEligibleDate);
                const now = new Date();
                const diffTime = d - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 0) {
                    nextEl.textContent = `⏳ In ${diffDays} Days`;
                    nextEl.style.color = '#eab308'; // Amber
                } else {
                    nextEl.textContent = '✅ Eligible Now';
                    nextEl.style.color = '#16a34a'; // Green
                }
            }
        }
    } catch (err) { console.error('Eligibility fetch error:', err); }
}

function populateDetailedProfile(user, role) {
    const profile = role === 'donor' ? user.donorProfile : user.recipientProfile;
    if (!profile) return;

    const fields = {
        [`${role}-profile-phone`]: profile.phone,
        [`${role}-profile-address`]: profile.address,
    };

    if (role === 'donor') {
        fields['donor-profile-weight'] = profile.weight ? `${profile.weight} kg` : null;
        if (profile.dateOfBirth) {
            const birth = new Date(profile.dateOfBirth);
            const age = new Date().getFullYear() - birth.getFullYear();
            fields['donor-profile-age'] = `${age} Years`;
        }
    }

    Object.entries(fields).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el && val) el.textContent = val;
    });
}

// === eRaktKosh-Style Blood Availability Search ===

let nepalLocations = {};

async function initNepalLocations() {
    try {
        const response = await fetch('http://localhost:5001/api/locations');
        const result = await response.json();
        if (result.success) {
            nepalLocations = result.data;
            
            // Populate search province select
            const searchProvinceSelect = document.getElementById('search-province');
            if (searchProvinceSelect) {
                searchProvinceSelect.innerHTML = '<option value="">Select Province</option>';
                Object.keys(nepalLocations).forEach(prov => {
                    const opt = document.createElement('option');
                    opt.value = prov;
                    opt.textContent = prov;
                    searchProvinceSelect.appendChild(opt);
                });
            }
            
            // Populate registration province select
            const regProvinceSelect = document.getElementById('reg-province');
            if (regProvinceSelect) {
                regProvinceSelect.innerHTML = '<option value="" disabled selected>Select Province</option>';
                Object.keys(nepalLocations).forEach(prov => {
                    const opt = document.createElement('option');
                    opt.value = prov;
                    opt.textContent = prov;
                    regProvinceSelect.appendChild(opt);
                });
            }
            
            // Populate donation-location (Choose a hospital...)
            const donationLocSelect = document.getElementById('donation-location');
            if (donationLocSelect) {
                donationLocSelect.innerHTML = '<option value="" disabled selected>Choose a hospital...</option>';
                // Flatten all hospitals
                Object.values(nepalLocations).forEach(districtsObj => {
                    Object.values(districtsObj).forEach(hospitalsArr => {
                        hospitalsArr.forEach(hosp => {
                            const opt = document.createElement('option');
                            opt.value = hosp;
                            opt.textContent = hosp;
                            donationLocSelect.appendChild(opt);
                        });
                    });
                });
            }
        }
    } catch (error) {
        console.error('Failed to load Nepal locations:', error);
    }
}

function updateDistricts() {
    const provinceSelect = document.getElementById('search-province');
    const districtSelect = document.getElementById('search-district');
    const selectedProvince = provinceSelect.value;

    districtSelect.innerHTML = '<option value="">Select District</option>';

    if (selectedProvince && nepalLocations[selectedProvince]) {
        districtSelect.disabled = false;
        districtSelect.classList.remove('cursor-not-allowed', 'opacity-60');
        districtSelect.classList.add('cursor-pointer');
        
        Object.keys(nepalLocations[selectedProvince]).forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtSelect.appendChild(option);
        });
    } else {
        districtSelect.disabled = true;
        districtSelect.classList.add('cursor-not-allowed', 'opacity-60');
        districtSelect.classList.remove('cursor-pointer');
    }
}

function updateRegDistricts() {
    const provinceSelect = document.getElementById('reg-province');
    const districtSelect = document.getElementById('reg-district');
    const selectedProvince = provinceSelect.value;

    districtSelect.innerHTML = '<option value="" disabled selected>Select District</option>';

    if (selectedProvince && nepalLocations[selectedProvince]) {
        districtSelect.disabled = false;
        districtSelect.classList.remove('cursor-not-allowed', 'opacity-60');
        districtSelect.classList.add('cursor-pointer');
        
        Object.keys(nepalLocations[selectedProvince]).forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtSelect.appendChild(option);
        });
    } else {
        districtSelect.disabled = true;
        districtSelect.classList.add('cursor-not-allowed', 'opacity-60');
        districtSelect.classList.remove('cursor-pointer');
    }
    
    updateRegAddress();
}

function updateRegAddress() {
    const provinceSelect = document.getElementById('reg-province');
    const districtSelect = document.getElementById('reg-district');
    const addressInput = document.getElementById('reg-address');
    
    const province = provinceSelect.value;
    const district = districtSelect.value;
    
    if (province && district) {
        addressInput.value = `${district}, ${province}`;
    } else if (province) {
        addressInput.value = province;
    } else {
        addressInput.value = '';
    }
}

// Bind to window for global access
window.initNepalLocations = initNepalLocations;
window.updateDistricts = updateDistricts;
window.updateRegDistricts = updateRegDistricts;
window.updateRegAddress = updateRegAddress;

window.searchBloodAvailability = async function() {
    const province = document.getElementById('search-province').value;
    const district = document.getElementById('search-district').value;
    const bloodGroup = document.getElementById('search-blood-group').value;
    const component = document.getElementById('search-component').value;
    const tbody = document.getElementById('blood-results-body');

    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="p-8 text-center text-gray-500">
                <i class="fas fa-spinner fa-spin text-3xl mb-3 text-indigo-500"></i>
                <p>Searching for blood availability...</p>
            </td>
        </tr>
    `;

    try {
        const queryParams = new URLSearchParams();
        if (province) queryParams.append('province', province);
        if (district) queryParams.append('district', district);
        if (bloodGroup) queryParams.append('bloodGroup', bloodGroup);
        if (component) queryParams.append('component', component);

        const response = await fetch(`http://localhost:5001/api/search?${queryParams.toString()}`);
        const result = await response.json();

        if (!response.ok) throw new Error(result.message || 'Failed to fetch');

        const stocks = result.data;

        if (stocks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="p-8 text-center text-gray-500">
                        <i class="fas fa-search-minus text-3xl mb-3 text-gray-300"></i>
                        <p>No blood banks found matching your criteria.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = stocks.map(stock => {
            const hospital = stock.hospital;
            const updatedDate = new Date(stock.updatedAt).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            const availabilityBadge = stock.units > 0 
                ? `<span class="px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-xs font-bold font-mono">Available: ${stock.units} Units</span>`
                : `<span class="px-3 py-1 bg-red-50 text-red-700 border border-red-100 rounded-full text-xs font-bold font-mono">Out of Stock</span>`;

            const districtName = hospital.districtRel ? hospital.districtRel.name : (hospital.district || '');
            const provinceName = (hospital.districtRel && hospital.districtRel.province) ? hospital.districtRel.province.name : (hospital.province || '');
            const locationText = districtName && provinceName ? `${districtName}, ${provinceName}` : (districtName || provinceName || '');

            return `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="p-4 border-b border-gray-100">
                        <div class="font-bold text-gray-900">${hospital.name}</div>
                        <div class="text-xs text-gray-500 mt-1"><i class="fas fa-map-marker-alt text-indigo-400 mr-1"></i> ${locationText}</div>
                        ${hospital.phone ? `<div class="text-xs text-gray-500 mt-1"><i class="fas fa-phone-alt text-indigo-400 mr-1"></i> ${hospital.phone}</div>` : ''}
                    </td>
                    <td class="p-4 border-b border-gray-100">
                        <span class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">${hospital.category || 'Hospital'}</span>
                    </td>
                    <td class="p-4 border-b border-gray-100">
                        <div class="flex flex-col gap-1">
                            <span class="text-sm font-bold text-gray-800">${stock.bloodGroup}</span>
                            <span class="text-xs text-gray-500">${stock.component}</span>
                            <div class="mt-1">${availabilityBadge}</div>
                        </div>
                    </td>
                    <td class="p-4 border-b border-gray-100 text-sm text-gray-500">
                        ${updatedDate}
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Search error:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="p-8 text-center text-red-500">
                    <i class="fas fa-exclamation-circle text-3xl mb-3 text-red-400"></i>
                    <p>Failed to load data. Please try again later.</p>
                </td>
            </tr>
        `;
    }
}

// === LifeLink AI Chatbot Implementation ===
function initChatbot() {
    // Inject Chatbot Styles
    const chatbotStyle = document.createElement('style');
    chatbotStyle.textContent = `
        #lifelink-chat-container {
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 10000;
            font-family: 'Inter', sans-serif;
        }
        #lifelink-chat-bubble {
            width: 65px;
            height: 65px;
            background-color: #b11e28;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 28px;
            cursor: pointer;
            box-shadow: 0 6px 20px rgba(177, 30, 40, 0.4);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            border: 3px solid white;
        }
        #lifelink-chat-bubble:hover {
            transform: scale(1.1) rotate(10deg);
            box-shadow: 0 8px 25px rgba(177, 30, 40, 0.5);
        }
        #lifelink-chat-window {
            position: absolute;
            bottom: 85px;
            right: 0;
            width: 350px;
            height: 500px;
            background: white;
            border-radius: 24px;
            box-shadow: 0 15px 40px rgba(0,0,0,0.2);
            display: none;
            flex-direction: column;
            overflow: hidden;
            transform: translateY(30px) scale(0.9);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
            border: 1px solid rgba(0,0,0,0.05);
        }
        #lifelink-chat-window.active {
            display: flex;
            transform: translateY(0) scale(1);
            opacity: 1;
        }
        #lifelink-chat-header {
            background: linear-gradient(135deg, #b11e28, #8a171f);
            color: white;
            padding: 18px 22px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 700;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        #lifelink-chat-header .close-btn {
            cursor: pointer;
            font-size: 24px;
            line-height: 1;
            transition: opacity 0.2s;
        }
        #lifelink-chat-header .close-btn:hover {
            opacity: 0.8;
        }
        #lifelink-chat-messages {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 15px;
            background: #fdfdfd;
            scrollbar-width: thin;
            scrollbar-color: #e2e8f0 transparent;
        }
        #lifelink-chat-messages::-webkit-scrollbar {
            width: 6px;
        }
        #lifelink-chat-messages::-webkit-scrollbar-thumb {
            background: #e2e8f0;
            border-radius: 10px;
        }
        .chat-msg {
            max-width: 85%;
            padding: 12px 16px;
            border-radius: 18px;
            font-size: 14px;
            line-height: 1.5;
            word-wrap: break-word;
            position: relative;
            animation: msgFadeIn 0.3s ease-out forwards;
        }
        @keyframes msgFadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .chat-msg.assistant {
            align-self: flex-start;
            background: #f1f5f9;
            color: #334155;
            border-bottom-left-radius: 4px;
        }
        .chat-msg.user {
            align-self: flex-end;
            background: #b11e28;
            color: white;
            border-bottom-right-radius: 4px;
            box-shadow: 0 4px 10px rgba(177, 30, 40, 0.2);
        }
        #lifelink-chat-input-area {
            padding: 15px 20px;
            border-top: 1px solid #f1f5f9;
            display: flex;
            gap: 12px;
            background: white;
            align-items: center;
        }
        #lifelink-chat-input {
            flex: 1;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 10px 15px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
            font-family: inherit;
        }
        #lifelink-chat-input:focus {
            border-color: #b11e28;
        }
        #lifelink-chat-send {
            background: #b11e28;
            color: white;
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 10px rgba(177, 30, 40, 0.2);
        }
        #lifelink-chat-send:hover {
            transform: scale(1.05);
            background: #8a171f;
        }
        #lifelink-chat-send i {
            font-size: 16px;
        }
        .typing-indicator {
            font-size: 12px;
            color: #94a3b8;
            margin: 5px 20px;
            font-style: italic;
            display: none;
            font-weight: 500;
        }
        .quick-replies {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 5px;
            align-self: flex-start;
        }
        .quick-reply-btn {
            background: white;
            border: 1px solid #b11e28;
            color: #b11e28;
            padding: 8px 16px;
            border-radius: 12px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 600;
            text-align: left;
            width: fit-content;
        }
        .quick-reply-btn:hover {
            background: #fef2f2;
            transform: translateX(5px);
        }
        @media (max-width: 480px) {
            #lifelink-chat-container {
                bottom: 20px;
                right: 20px;
            }
            #lifelink-chat-window {
                width: calc(100vw - 40px);
                height: calc(100vh - 120px);
                bottom: 80px;
                right: 0;
            }
        }
    `;
    document.head.appendChild(chatbotStyle);

    // Inject HTML Structure
    const chatContainer = document.createElement('div');
    chatContainer.id = 'lifelink-chat-container';
    chatContainer.innerHTML = `
        <div id="lifelink-chat-window">
            <div id="lifelink-chat-header">
                <span style="display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-robot"></i> LifeLink Assistant 🩸
                </span>
                <span class="close-btn" id="lifelink-chat-close">&times;</span>
            </div>
            <div id="lifelink-chat-messages"></div>
            <div id="lifelink-typing" class="typing-indicator">LifeLink Assistant is typing...</div>
            <div id="lifelink-chat-input-area">
                <input type="text" id="lifelink-chat-input" placeholder="How can I help you today?">
                <button id="lifelink-chat-send"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
        <div id="lifelink-chat-bubble" title="Need help?">
            <i class="fas fa-tint"></i>
        </div>
    `;
    document.body.appendChild(chatContainer);

    // Chat Logic
    const bubble = document.getElementById('lifelink-chat-bubble');
    const chatWindow = document.getElementById('lifelink-chat-window');
    const closeBtn = document.getElementById('lifelink-chat-close');
    const chatInput = document.getElementById('lifelink-chat-input');
    const sendBtn = document.getElementById('lifelink-chat-send');
    const messagesBox = document.getElementById('lifelink-chat-messages');
    const typingSign = document.getElementById('lifelink-typing');

    let chatOpenedOnce = false;

    bubble.addEventListener('click', () => {
        const isOpen = chatWindow.classList.contains('active');
        if (isOpen) {
            chatWindow.classList.remove('active');
            setTimeout(() => chatWindow.style.display = 'none', 400);
        } else {
            chatWindow.style.display = 'flex';
            setTimeout(() => chatWindow.classList.add('active'), 10);
            if (!chatOpenedOnce) {
                welcomeUser();
                chatOpenedOnce = true;
            }
        }
    });

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        chatWindow.classList.remove('active');
        setTimeout(() => chatWindow.style.display = 'none', 400);
    });

    function welcomeUser() {
        appendMessage("assistant", "Hello! I am the LifeLink Assistant. I can help you with blood donation information, eligibility questions, and how to use this platform. How can I help you today?");
        
        const qrWrapper = document.createElement('div');
        qrWrapper.className = 'quick-replies';
        const replies = ["Am I eligible to donate?", "What blood type do I need?", "How do I register?"];
        
        replies.forEach(text => {
            const btn = document.createElement('button');
            btn.className = 'quick-reply-btn';
            btn.textContent = text;
            btn.onclick = () => {
                appendMessage("user", text);
                qrWrapper.remove();
                processMessage(text);
            };
            qrWrapper.appendChild(btn);
        });
        messagesBox.appendChild(qrWrapper);
        scrollToBottom();
    }

    function appendMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${role}`;
        msgDiv.textContent = text;
        messagesBox.appendChild(msgDiv);
        scrollToBottom();
    }

    function scrollToBottom() {
        messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    async function processMessage(userText) {
        typingSign.style.display = 'block';
        scrollToBottom();

        try {
            const response = await fetch('http://localhost:5001/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userText })
            });

            const result = await response.json();
            typingSign.style.display = 'none';

            if (result.success && result.reply) {
                appendMessage("assistant", result.reply);
            } else {
                throw new Error(result.message || "Failed to get AI response");
            }
        } catch (err) {
            console.error('Chat Error:', err);
            typingSign.style.display = 'none';
            appendMessage("assistant", "Sorry, I am having trouble connecting to the LifeLink Assistant. Please try again in a moment.");
        }
    }

    function handleSend() {
        const text = chatInput.value.trim();
        if (text) {
            appendMessage("user", text);
            chatInput.value = '';
            processMessage(text);
        }
    }

    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
}

// Ensure chatbot initializes
document.addEventListener('DOMContentLoaded', () => {
    initChatbot();
});
// --- Professional Form Validation Feedback ---
document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('.auth-step input, .auth-step select');
    
    inputs.forEach(input => {
        input.addEventListener('blur', () => {
            validateField(input);
        });
        
        input.addEventListener('input', () => {
            if (input.classList.contains('input-invalid')) {
                validateField(input);
            }
        });
    });
});

// === Mobile Menu Controls ===
window.openMobileMenu = function() {
    const drawer = document.getElementById('mobile-nav-drawer');
    const overlay = document.getElementById('mobile-nav-overlay');
    if (drawer && overlay) {
        overlay.classList.remove('hidden');
        setTimeout(() => {
            drawer.classList.add('open');
            overlay.classList.add('open');
        }, 10);
    }
}

window.closeMobileMenu = function() {
    const drawer = document.getElementById('mobile-nav-drawer');
    const overlay = document.getElementById('mobile-nav-overlay');
    if (drawer && overlay) {
        drawer.classList.remove('open');
        overlay.classList.remove('open');
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 300);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('mobile-menu-close-btn');
    const overlay = document.getElementById('mobile-nav-overlay');

    if (menuBtn) menuBtn.addEventListener('click', openMobileMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMobileMenu);
    if (overlay) overlay.addEventListener('click', closeMobileMenu);
});

function validateField(input) {
    let isValid = true;
    const val = input.value.trim();
    
    if (input.required && !val) {
        isValid = false;
    } else if (input.type === 'email' && val) {
        isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    } else if (input.id === 'reg-password' && val) {
        isValid = val.length >= 6;
    } else if (input.id === 'reg-confirm' && val) {
        isValid = val === document.getElementById('reg-password').value;
    } else if (input.id === 'reg-name' && val) {
        isValid = val.length >= 2;
    } else if (input.id === 'reg-phone' && val) {
        isValid = val.length >= 7;
    }
    
    if (isValid && val) {
        input.classList.remove('input-invalid');
        input.classList.add('input-valid');
    } else if (!isValid) {
        input.classList.remove('input-valid');
        input.classList.add('input-invalid');
    } else {
        input.classList.remove('input-valid', 'input-invalid');
    }
}

// === Profile Settings Logic ===
let currentAvatarBase64 = null;

async function showProfileSettings() {
    console.log('Opening profile settings...');
    const token = localStorage.getItem('token');
    if (!token) return navigateTo('login');

    try {
        const res = await fetch('http://localhost:5001/api/users/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            const user = data.data;
            const profile = user.donorProfile || user.recipientProfile || {};

            // Populate Fields
            const joinYear = user.createdAt ? new Date(user.createdAt).getFullYear() : '2026';
            document.getElementById('profile-full-name').textContent = user.name;
            document.getElementById('profile-role-badge').textContent = `${user.role} Member Since ${joinYear}`;
            document.getElementById('edit-profile-name').value = user.name;
            document.getElementById('edit-profile-email').value = user.email;
            document.getElementById('edit-profile-phone').value = profile.phone || '';
            document.getElementById('edit-profile-blood').value = profile.bloodType || 'N/A';
            document.getElementById('edit-profile-address').value = profile.address || '';
            
            // Set Avatar
            const avatar = document.getElementById('profile-avatar-display');
            if (avatar) {
                if (user.avatar) {
                    avatar.src = user.avatar;
                    currentAvatarBase64 = user.avatar;
                } else {
                    avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&size=200`;
                    currentAvatarBase64 = null;
                }
            }

            // Role specific UI adjustments
            const phoneGroup = document.getElementById('profile-phone-group');
            const bloodGroup = document.getElementById('profile-blood-group');
            const addressGroup = document.getElementById('profile-address-group');
            const securityCard = document.getElementById('profile-security-card');
            const emailInput = document.getElementById('edit-profile-email');

            if (user.role === 'ADMIN') {
                if (phoneGroup) phoneGroup.style.display = 'none';
                if (bloodGroup) bloodGroup.style.display = 'none';
                if (addressGroup) addressGroup.style.display = 'none';
                if (securityCard) securityCard.style.display = 'none';
                if (emailInput) {
                    emailInput.disabled = true;
                    emailInput.classList.add('opacity-60', 'cursor-not-allowed');
                }
            } else {
                if (phoneGroup) phoneGroup.style.display = 'block';
                if (bloodGroup) bloodGroup.style.display = 'block';
                if (addressGroup) addressGroup.style.display = 'block';
                if (securityCard) securityCard.style.display = 'block';
                if (emailInput) {
                    emailInput.disabled = false;
                    emailInput.classList.remove('opacity-60', 'cursor-not-allowed');
                }
            }

            navigateTo('profile-settings');
        } else {
            alert(data.message || 'Failed to load profile.');
        }
    } catch (error) {
        console.error('Profile Load Error:', error);
        alert('An error occurred while loading your profile.');
    }
}

async function saveProfileChanges() {
    const token = localStorage.getItem('token');
    const saveBtn = event.target;
    const originalText = saveBtn.innerHTML;

    const name = document.getElementById('edit-profile-name').value;
    const email = document.getElementById('edit-profile-email').value;
    const phone = document.getElementById('edit-profile-phone').value;
    const address = document.getElementById('edit-profile-address').value;
    const bloodType = document.getElementById('edit-profile-blood').value;

    const user = JSON.parse(localStorage.getItem('user')) || {};
    const isAdmin = user.role === 'ADMIN';

    if (isAdmin) {
        if (!name) {
            alert('Please fill in your name.');
            return;
        }
    } else {
        if (!name || !email || !phone || !address || !bloodType) {
            alert('Please fill in all required fields.');
            return;
        }
    }

    try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        // Build payload — only include avatar if it was explicitly changed
        // For admin, exclude email since it's sensitive and not editable, and omit donor/recipient fields
        let payload = {};
        if (isAdmin) {
            payload = { name };
        } else {
            payload = { name, email, phone, address, bloodType };
        }

        if (currentAvatarBase64 !== null) {
            payload.avatar = currentAvatarBase64;
        }

        const res = await fetch('http://localhost:5001/api/users/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
            // Update local storage if needed
            const user = JSON.parse(localStorage.getItem('user'));
            user.name = name;
            user.avatar = data.data.user.avatar;
            localStorage.setItem('user', JSON.stringify(user));
            
            // Update UI
            document.getElementById('profile-full-name').textContent = name;
            updateNav(user);

            // Update Dashboards
            const donorName = document.getElementById('donor-name-display');
            const recipientName = document.getElementById('recipient-name-display');
            if (donorName) donorName.textContent = name;
            if (recipientName) recipientName.textContent = name;

            const donorBlood = document.getElementById('donor-blood-display');
            const recipientBlood = document.getElementById('recipient-blood-display');
            if (donorBlood) donorBlood.textContent = bloodType;
            if (recipientBlood) recipientBlood.textContent = bloodType;
            
            alert('Profile updated successfully!');
        } else {
            alert(data.message || 'Failed to update profile.');
        }
    } catch (error) {
        console.error('Save Profile Error:', error);
        alert('An error occurred while saving profile.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

async function updateUserPassword() {
    const token = localStorage.getItem('token');
    const updateBtn = event.target;
    
    const currentPassword = document.getElementById('edit-profile-current-pass').value;
    const newPassword = document.getElementById('edit-profile-new-pass').value;
    const confirmPassword = document.getElementById('edit-profile-confirm-pass').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('Please fill in all password fields.');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('New passwords do not match.');
        return;
    }

    if (newPassword.length < 6) {
        alert('New password must be at least 6 characters.');
        return;
    }

    try {
        updateBtn.disabled = true;
        const originalText = updateBtn.innerHTML;
        updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

        const res = await fetch('http://localhost:5001/api/users/password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await res.json();
        if (data.success) {
            alert('Password updated successfully!');
            // Clear fields
            document.getElementById('edit-profile-current-pass').value = '';
            document.getElementById('edit-profile-new-pass').value = '';
            document.getElementById('edit-profile-confirm-pass').value = '';
        } else {
            alert(data.message || 'Failed to update password.');
        }
    } catch (error) {
        console.error('Update Password Error:', error);
        alert('An error occurred while updating password.');
    } finally {
        updateBtn.disabled = false;
        updateBtn.innerHTML = 'Update Password';
    }
}

// === Avatar & Photo Management ===
document.addEventListener('change', async (e) => {
    if (e.target && e.target.id === 'avatar-upload') {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert('File size too large. Max 2MB allowed.');
                return;
            }
            const reader = new FileReader();
            reader.onload = async (event) => {
                currentAvatarBase64 = event.target.result;
                const display = document.getElementById('profile-avatar-display');
                if (display) display.src = currentAvatarBase64;
                
                // Automatically save the avatar to the server
                await autoSaveAvatar(currentAvatarBase64);
            };
            reader.readAsDataURL(file);
        }
    }
});

async function autoSaveAvatar(avatarBase64) {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const res = await fetch('http://localhost:5001/api/users/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            // Just update the avatar, the backend will preserve other fields
            body: JSON.stringify({ avatar: avatarBase64 })
        });
        
        const data = await res.json();
        if (data.success) {
            // Update local storage and nav
            const user = JSON.parse(localStorage.getItem('user'));
            user.avatar = data.data.user.avatar;
            localStorage.setItem('user', JSON.stringify(user));
            updateNav(user);
        } else {
            alert('Failed to save avatar dynamically: ' + data.message);
        }
    } catch (error) {
        console.error('Avatar Auto-Save Error:', error);
    }
}

async function removeProfilePhoto() {
    currentAvatarBase64 = ""; // Empty string tells backend to clear it
    const display = document.getElementById('profile-avatar-display');
    const user = JSON.parse(localStorage.getItem('user')) || { name: 'User' };
    if (display) {
        display.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&size=200`;
    }
    
    // Automatically clear the avatar on the server
    await autoSaveAvatar("");
}

async function fetchDonorMatchedRequests() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const listElement = document.getElementById('donor-matched-requests-list');
    if (!listElement) return;

    try {
        const response = await fetch('http://localhost:5001/api/donations/matched-requests', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (!data.success) {
            listElement.innerHTML = '<div style="text-align:center;padding:2rem;color:#94a3b8;">Could not load matched requests.</div>';
            return;
        }

        if (data.data.length === 0) {
            listElement.innerHTML = '<div style="text-align:center;padding:2rem;color:#94a3b8;"><i class="fas fa-check-circle" style="font-size:1.5rem;color:#16a34a;display:block;margin-bottom:0.5rem;"></i>No pending requests for your blood type currently. Thank you!</div>';
            return;
        }

        listElement.innerHTML = '';
        data.data.forEach(request => {
            const date = new Date(request.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            
            const card = document.createElement('div');
            card.className = 'group flex flex-col sm:flex-row sm:items-center justify-between p-4 px-6 rounded-2xl border border-red-100 bg-red-50/10 hover:bg-red-50/30 hover:border-red-200 transition-all duration-300 gap-4';
            
            let urgencyClass = 'bg-gray-100 text-gray-700';
            if (request.urgency === 'Urgent') urgencyClass = 'bg-amber-50 text-amber-700 border border-amber-100';
            else if (request.urgency === 'Critical') urgencyClass = 'bg-red-50 text-red-700 border border-red-100 font-bold';

            card.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-red-500 text-white rounded-full flex flex-col items-center justify-center font-black shadow-sm">
                        <span class="text-xs">${request.bloodGroup}</span>
                        <span class="text-[0.65rem] font-bold mt-[-3px]">${request.units}U</span>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h4 class="font-black text-gray-900 text-[1.05rem]">${escapeHtml(request.hospital)}</h4>
                            <span class="px-2.5 py-0.5 rounded-full text-[0.65rem] uppercase tracking-wider ${urgencyClass}">${request.urgency}</span>
                        </div>
                        <p class="text-gray-500 text-xs font-semibold mt-1">Requested by: ${escapeHtml(request.recipientProfile?.user?.name || 'Anonymous')} | Date: ${date}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <a href="tel:${escapeHtml(request.recipientProfile?.phone || '')}" class="px-4 py-2 bg-white border border-red-200 hover:border-red-500 rounded-xl text-xs font-bold text-[#D32F2F] hover:bg-red-50/50 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer">
                        <i class="fas fa-phone"></i> Contact
                    </a>
                </div>
            `;
            listElement.appendChild(card);
        });
    } catch (error) {
        console.error('Error fetching matched requests:', error);
        listElement.innerHTML = '<div style="text-align:center;padding:2rem;color:#94a3b8;">An error occurred while loading.</div>';
    }
}

async function fetchRecipientMatchedDonors(requestId, requestDetails) {
    const token = localStorage.getItem('token');
    if (!token) return;

    const listElement = document.getElementById('recipient-matches-list');
    const badgeElement = document.getElementById('recipient-matches-badge');
    if (!listElement) return;

    listElement.innerHTML = '<div style="text-align:center;padding:2rem;color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Finding compatible donors...</div>';

    try {
        const response = await fetch(`http://localhost:5001/api/requests/${requestId}/matched-donors`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (!data.success) {
            listElement.innerHTML = '<div style="text-align:center;padding:2rem;color:#94a3b8;">Could not load matched donors.</div>';
            if (badgeElement) badgeElement.classList.add('hidden');
            return;
        }

        const count = data.data.length;
        if (badgeElement) {
            badgeElement.textContent = `${count} Matched`;
            badgeElement.classList.remove('hidden');
        }

        if (count === 0) {
            listElement.innerHTML = `<div style="text-align:center;padding:2rem;color:#94a3b8;"><i class="fas fa-heartbeat" style="font-size:1.5rem;color:#ef4444;display:block;margin-bottom:0.5rem;"></i>No matched donors for compatible blood type found yet. We will notify you once a compatible donor matches!</div>`;
            return;
        }

        listElement.innerHTML = '';
        data.data.forEach(donor => {
            const card = document.createElement('div');
            card.className = 'group flex flex-col sm:flex-row sm:items-center justify-between p-4 px-6 rounded-2xl border border-indigo-100 bg-indigo-50/10 hover:bg-indigo-50/30 hover:border-indigo-200 transition-all duration-300 gap-4';
            
            card.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-indigo-600 text-white rounded-full flex flex-col items-center justify-center font-black shadow-sm">
                        <span class="text-sm">${donor.bloodType}</span>
                    </div>
                    <div>
                        <h4 class="font-black text-gray-900 text-[1.05rem]">${escapeHtml(donor.user?.name || 'Anonymous Donor')}</h4>
                        <p class="text-gray-500 text-xs font-semibold mt-1">Location: ${escapeHtml(donor.address || 'N/A')} | Phone: ${escapeHtml(donor.phone || 'Hidden')}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <a href="tel:${escapeHtml(donor.phone || '')}" class="px-4 py-2 bg-white border border-indigo-200 hover:border-indigo-500 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer">
                        <i class="fas fa-phone"></i> Call Donor
                    </a>
                </div>
            `;
            listElement.appendChild(card);
        });
    } catch (error) {
        console.error('Error fetching matched donors:', error);
        listElement.innerHTML = '<div style="text-align:center;padding:2rem;color:#94a3b8;">An error occurred while loading.</div>';
        if (badgeElement) badgeElement.classList.add('hidden');
    }
}

// ─── CLIENT-SIDE NOTIFICATION ENGINE ────────────────────

let notificationPollInterval = null;
let seenNotificationIds = new Set();
let isFirstNotificationLoad = true;

// Helper: Format relative time
function getNotificationTimeAgo(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const ms = now - past;
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (secs < 60) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

// Helper: Show sleek toast notifications in bottom-right
function showToastNotification(title, message, type = 'info') {
    let container = document.getElementById('notification-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-toast-container';
        container.className = 'notification-toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    let typeClass = 'notif-info';
    let icon = 'fas fa-bell';
    if (type === 'success') { typeClass = 'notif-success'; icon = 'fas fa-check-circle'; }
    else if (type === 'danger') { typeClass = 'notif-danger'; icon = 'fas fa-exclamation-circle'; }
    else if (type === 'warning') { typeClass = 'notif-warning'; icon = 'fas fa-exclamation-triangle'; }
    
    toast.className = 'notification-toast';
    toast.innerHTML = `
        <div class="notification-toast-icon ${typeClass}">
            <i class="${icon}"></i>
        </div>
        <div class="flex-1 min-w-0">
            <h4 class="font-bold text-gray-900 text-sm tracking-tight">${escapeHtml(title)}</h4>
            <p class="text-gray-500 text-[11px] mt-1 font-semibold leading-relaxed">${escapeHtml(message)}</p>
        </div>
        <button class="text-gray-400 hover:text-gray-600 text-xs self-start" onclick="event.stopPropagation(); this.parentElement.classList.add('dismissing'); setTimeout(() => this.parentElement.remove(), 300);">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto dismiss after 6 seconds
    setTimeout(() => {
        if (toast && toast.parentElement) {
            toast.classList.add('dismissing');
            setTimeout(() => toast.remove(), 300);
        }
    }, 6000);
}

// Toggle Dropdown Display
function toggleNotifications(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
        // Auto-close standard profile dropdown if open
        const navDropdown = document.getElementById('nav-dropdown');
        if (navDropdown) navDropdown.classList.add('hidden');
    }
}

// Fetch Notifications from Server
async function fetchNotifications() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('http://localhost:5001/api/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (!data.success) return;

        const notifications = data.data || [];
        const badge = document.getElementById('notification-badge');
        const listElement = document.getElementById('notification-list');
        
        let unreadCount = 0;
        
        // Count unreads and check for new ones to toast
        notifications.forEach(notif => {
            if (!notif.isRead) {
                unreadCount++;
                if (!seenNotificationIds.has(notif.id)) {
                    seenNotificationIds.add(notif.id);
                    // Avoid triggering spam toasts on initial dashboard load
                    if (!isFirstNotificationLoad) {
                        showToastNotification(notif.title, notif.message, notif.type);
                    }
                }
            } else {
                seenNotificationIds.add(notif.id);
            }
        });

        isFirstNotificationLoad = false;

        // Render Badge
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.classList.remove('hidden');
                badge.classList.add('flex');
            } else {
                badge.classList.add('hidden');
                badge.classList.remove('flex');
            }
        }

        // Render Dropdown List
        if (listElement) {
            if (notifications.length === 0) {
                listElement.innerHTML = `
                    <div class="p-8 text-center text-gray-400">
                        <i class="fas fa-bell-slash text-3xl mb-2 block"></i>
                        <span class="text-sm font-semibold">No notifications yet</span>
                    </div>
                `;
                return;
            }

            listElement.innerHTML = '';
            notifications.forEach(notif => {
                const item = document.createElement('div');
                item.className = `notification-item ${notif.isRead ? '' : 'unread'}`;
                
                let iconClass = 'notif-info';
                let icon = 'fas fa-bell';
                if (notif.type === 'success') { iconClass = 'notif-success'; icon = 'fas fa-check-circle'; }
                else if (notif.type === 'danger') { iconClass = 'notif-danger'; icon = 'fas fa-exclamation-circle'; }
                else if (notif.type === 'warning') { iconClass = 'notif-warning'; icon = 'fas fa-exclamation-triangle'; }

                item.innerHTML = `
                    <div class="notification-item-icon ${iconClass}">
                        <i class="${icon}"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start gap-1">
                            <h4 class="font-bold text-gray-900 text-xs tracking-tight">${escapeHtml(notif.title)}</h4>
                            <span class="text-[9px] font-bold text-gray-400 whitespace-nowrap">${getNotificationTimeAgo(notif.createdAt)}</span>
                        </div>
                        <p class="text-gray-500 text-[10px] mt-1 font-semibold leading-relaxed pr-2">${escapeHtml(notif.message)}</p>
                    </div>
                `;

                // Mark read on click
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!notif.isRead) {
                        markNotificationRead(notif.id);
                    }
                });

                listElement.appendChild(item);
            });
        }

    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Mark single notification as read
async function markNotificationRead(id) {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('http://localhost:5001/api/notifications/read', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ notificationIds: [id] })
        });
        const data = await response.json();
        if (data.success) {
            fetchNotifications(); // Refresh list & badge
        }
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
    }
}

// Mark all as read
async function markAllNotificationsRead(event) {
    if (event) event.stopPropagation();
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('http://localhost:5001/api/notifications/read-all', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
            fetchNotifications(); // Refresh
        }
    } catch (error) {
        console.error('Failed to mark all as read:', error);
    }
}

// Start polling
function startNotificationInterval() {
    if (notificationPollInterval) clearInterval(notificationPollInterval);
    
    // Initial load
    isFirstNotificationLoad = true;
    fetchNotifications();

    // Poll every 10 seconds
    notificationPollInterval = setInterval(fetchNotifications, 10000);
}

// Stop polling
function stopNotificationInterval() {
    if (notificationPollInterval) {
        clearInterval(notificationPollInterval);
        notificationPollInterval = null;
    }
    seenNotificationIds.clear();
    isFirstNotificationLoad = true;
}

// Window click helper to dismiss dropdown
window.addEventListener('click', () => {
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
});

