/**
 * LifeLink - Single Page Application Router & Registration Logic
 */

// === DOM Element Queries ===
const navLinks = document.querySelectorAll('.nav-link, .nav-login, .logo');
const pageSections = document.querySelectorAll('.page-section');

// === Navigation & SPA Routing ===
function navigateTo(targetId) {
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

function nextAuthStep() {
    if (authStep === 1) {
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-password').value;
        const conf = document.getElementById('reg-confirm').value;
        
        if (!email || !pass) {
            alert('Please enter your email and password.');
            return;
        }
        if (pass !== conf) {
            alert('Passwords do not match.');
            return;
        }
        if (!authRole) {
            alert('Please select whether you are joining as a Donor or Recipient.');
            return;
        }

        document.getElementById('auth-step-1').classList.add('hidden');
        document.getElementById('auth-step-1').classList.remove('block');
        document.getElementById('auth-step-2').classList.remove('hidden');
        document.getElementById('auth-step-2').classList.add('block');
        document.getElementById('auth-current-step').textContent = '2';
        authStep = 2;
        checkEligibility(); // Re-check button state
    }
}

function prevAuthStep() {
    if (authStep === 2) {
        document.getElementById('auth-step-2').classList.add('hidden');
        document.getElementById('auth-step-2').classList.remove('block');
        document.getElementById('auth-step-1').classList.remove('hidden');
        document.getElementById('auth-step-1').classList.add('block');
        document.getElementById('auth-current-step').textContent = '1';
        authStep = 1;
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
        regBtn.classList.add('hover:bg-indigo-700', 'hover:shadow-lg', 'active:scale-95');
    } else {
        regBtn.setAttribute('disabled', 'true');
        regBtn.classList.add('opacity-50', 'cursor-not-allowed');
        regBtn.classList.remove('hover:bg-indigo-700', 'hover:shadow-lg', 'active:scale-95');
    }
}

function completeRegistration() {
    // Hide Step 2 & Footer, show Success screen
    document.getElementById('auth-step-2').classList.add('hidden');
    document.getElementById('auth-step-2').classList.remove('block');
    document.getElementById('auth-footer-toggle').classList.add('hidden');
    document.getElementById('auth-footer-toggle').classList.remove('block');
    
    document.getElementById('auth-success').classList.remove('hidden');
    document.getElementById('auth-current-step').parentElement.classList.add('hidden');
}

function resetAuthWizard() {
    authStep = 1;
    authRole = null;
    
    // Reset view visibility
    document.getElementById('auth-step-1').classList.remove('hidden');
    document.getElementById('auth-step-1').classList.add('block');
    document.getElementById('auth-step-2').classList.add('hidden');
    document.getElementById('auth-step-2').classList.remove('block');
    
    const successScreen = document.getElementById('auth-success');
    if(successScreen) successScreen.classList.add('hidden');
    
    document.getElementById('auth-footer-toggle').classList.remove('hidden');
    document.getElementById('auth-footer-toggle').classList.add('block');
    document.getElementById('auth-current-step').parentElement.classList.remove('hidden');
    document.getElementById('auth-current-step').textContent = '1';

    // Reset Forms
    document.querySelectorAll('#auth-step-1 input').forEach(input => input.value = '');
    document.querySelectorAll('.eligibility-check').forEach(input => input.checked = false);
    document.querySelectorAll('input[type="file"]').forEach(input => input.value = '');
    
    // Reset Cards
    const cards = document.querySelectorAll('.auth-role-card');
    cards.forEach(card => {
        card.classList.remove('border-indigo-500', 'bg-indigo-50', 'ring-2', 'ring-indigo-300');
        card.classList.add('border-gray-100');
    });

    checkEligibility();
}
