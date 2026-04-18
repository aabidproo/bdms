/**
 * LifeLink - Single Page Application Router & Registration Logic
 */

// === Admin Dashboard Enhancements ===
function toggleAdminSidebar() {
  const sidebar = document.getElementById("admin-sidebar");
  if (sidebar) {
    sidebar.classList.toggle("sidebar-collapsed");
    // Change icon based on state
    const icon = document.querySelector("header button i");
    if (icon) {
      icon.className = sidebar.classList.contains("sidebar-collapsed")
        ? "fas fa-arrow-right"
        : "fas fa-bars";
    }
  }
}

function addToActivityFeed(eventText, type = "info") {
  const feed = document.getElementById("admin-activity-feed");
  if (!feed) return;

  const item = document.createElement("div");
  item.className = "activity-item";

  let iconClass = "info-circle";
  let bgColor = "rgba(99,102,241,0.1)";
  let color = "#6366f1";

  if (type === "success") {
    iconClass = "plus";
    bgColor = "rgba(22,163,74,0.1)";
    color = "#16a34a";
  } else if (type === "alert") {
    iconClass = "heartbeat";
    bgColor = "rgba(211,47,47,0.1)";
    color = "#D32F2F";
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
const navLinks = document.querySelectorAll(".nav-link, .nav-login, .logo");
const pageSections = document.querySelectorAll(".page-section");

// === Navigation & SPA Routing ===
const DASHBOARD_ROUTES = [
  "donor-dashboard",
  "recipient-dashboard",
  "admin-dashboard",
];

function navigateTo(targetId) {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");

  if (
    token &&
    userStr &&
    !DASHBOARD_ROUTES.includes(targetId) &&
    targetId !== "login"
  ) {
    try {
      const user = JSON.parse(userStr);
      if (user.role === "DONOR") targetId = "donor-dashboard";
      else if (user.role === "RECIPIENT") targetId = "recipient-dashboard";
      else if (user.role === "ADMIN") targetId = "admin-dashboard";
    } catch (e) {
      logout();
      return;
    }
  }

  if (DASHBOARD_ROUTES.includes(targetId)) {
    if (!token || !userStr) {
      targetId = "login";
    } else {
      try {
        const user = JSON.parse(userStr);
        let expectedDash = "";
        if (user.role === "DONOR") expectedDash = "donor-dashboard";
        else if (user.role === "RECIPIENT")
          expectedDash = "recipient-dashboard";
        else if (user.role === "ADMIN") expectedDash = "admin-dashboard";

        if (targetId !== expectedDash && expectedDash !== "")
          targetId = expectedDash;
      } catch (e) {
        logout();
        return;
      }
    }
  }

  if (targetId === "admin-dashboard" && token) {
    navigateAdmin("admin-view-dashboard");
    fetchAdminSummary(); // Fetch counts
    fetchAdminUsers();
    fetchInventory();
    fetchAdminRequests();
  } else if (targetId === "donor-dashboard" && token) {
    fetchDonorProfile();
  } else if (targetId === "recipient-dashboard" && token) {
    fetchRecipientProfile();
  }

  // Handle "Coming Soon" sections
  if (["find-blood", "about-us", "donors-list"].includes(targetId)) {
    alert("This feature is Coming Soon!");
    return; // Stop navigation
  }

  // Explicitly hide all sections and show only the target
  pageSections.forEach((section) => {
    section.classList.remove("active");
    section.style.display = "none"; // HARD HIDE
  });

  const targetSection = document.getElementById(targetId);
  if (targetSection) {
    targetSection.classList.add("active");
    // Admin dashboard needs flex, others block
    if (targetId === "admin-dashboard") {
      targetSection.style.display = "flex";
    } else {
      targetSection.style.display = "block";
    }
  }
}

navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    const target = link.getAttribute("data-target");
    e.preventDefault();
    if (target) {
      navigateTo(target);
      if (target === "login") {
        // reset slider if returning to login naturally
        document.getElementById("login").classList.remove("sign-up-active");
        resetAuthWizard();
      }
    }
  });
});

// === Auth Panel Logic (Sliding & Validation) ===
let authStep = 1;
let authRole = null;

function toggleAuthMode() {
  const authSection = document.getElementById("login");
  if (authSection) {
    authSection.classList.toggle("sign-up-active");
    if (!authSection.classList.contains("sign-up-active")) {
      // Reset when going back to sign-in view
      resetAuthWizard();
    }
  }
}

function selectAuthRole(role) {
  authRole = role;
  const cards = document.querySelectorAll(".auth-role-card");
  cards.forEach((card) => {
    card.classList.remove(
      "border-indigo-500",
      "bg-indigo-50",
      "ring-2",
      "ring-indigo-300",
    );
    card.classList.add("border-gray-100");
  });

  const selectedCard = document.querySelector(
    `.auth-role-card[data-role="${role}"]`,
  );
  if (selectedCard) {
    selectedCard.classList.remove("border-gray-100");
    selectedCard.classList.add(
      "border-indigo-500",
      "bg-indigo-50",
      "ring-2",
      "ring-indigo-300",
    );
  }
}

function showError(msg) {
  const errorBox = document.getElementById("auth-error-box");
  const errorText = document.getElementById("auth-error-text");
  errorText.textContent = msg;
  errorBox.classList.remove("hidden");
}

function hideError() {
  document.getElementById("auth-error-box").classList.add("hidden");
}

function nextAuthStep() {
  hideError();
  if (authStep === 1) {
    const email = document.getElementById("reg-email").value;
    const pass = document.getElementById("reg-password").value;
    const conf = document.getElementById("reg-confirm").value;

    if (!email || !pass) {
      return showError("Please provide an email and password.");
    }
    if (pass.length < 6) {
      return showError("Password must be at least 6 characters.");
    }
    if (pass !== conf) {
      return showError("Passwords do not match.");
    }
    if (!authRole) {
      return showError(
        "Please select whether you are joining as a Donor or Recipient.",
      );
    }

    document.getElementById("auth-step-1").classList.add("hidden");
    document.getElementById("auth-step-1").classList.remove("block");
    document.getElementById("auth-step-2").classList.remove("hidden");
    document.getElementById("auth-step-2").classList.add("block");

    const isRecipient = authRole === "recipient";
    document.getElementById("auth-total-steps").textContent = isRecipient
      ? "2"
      : "3";
    document.getElementById("auth-current-step").textContent = "2";

    // Setup Step 2 next button based on role
    const step2Btn = document.getElementById("step-2-next-btn");
    if (isRecipient) {
      step2Btn.innerHTML = 'Register <i class="fas fa-check ml-2"></i>';
      step2Btn.onclick = completeRegistration;
      step2Btn.classList.remove(
        "opacity-50",
        "cursor-not-allowed",
        "bg-indigo-600",
      );
      step2Btn.classList.add("bg-green-600", "hover:bg-green-700");
    } else {
      step2Btn.innerHTML = 'Continue <i class="fas fa-arrow-right ml-2"></i>';
      step2Btn.onclick = nextAuthStep;
      step2Btn.classList.remove("bg-green-600", "hover:bg-green-700");
      step2Btn.classList.add("bg-indigo-600");
    }

    authStep = 2;
  } else if (authStep === 2) {
    const name = document.getElementById("reg-name").value;
    const phone = document.getElementById("reg-phone").value;
    const address = document.getElementById("reg-address").value;
    const blood = document.getElementById("reg-blood").value;

    if (!name || name.length < 2)
      return showError("Name must be at least 2 characters.");
    if (!phone || phone.length < 7)
      return showError("Phone number must be at least 7 characters.");
    if (!address) return showError("Address is required.");
    if (!blood) return showError("Please select a blood type.");

    if (authRole === "donor") {
      document.getElementById("auth-step-2").classList.add("hidden");
      document.getElementById("auth-step-2").classList.remove("block");
      document.getElementById("auth-step-3").classList.remove("hidden");
      document.getElementById("auth-step-3").classList.add("block");
      document.getElementById("auth-current-step").textContent = "3";
      authStep = 3;
      checkEligibility();
    }
  }
}

function prevAuthStep() {
  hideError();
  if (authStep === 2) {
    document.getElementById("auth-step-2").classList.add("hidden");
    document.getElementById("auth-step-2").classList.remove("block");
    document.getElementById("auth-step-1").classList.remove("hidden");
    document.getElementById("auth-step-1").classList.add("block");
    document.getElementById("auth-current-step").textContent = "1";
    document.getElementById("auth-total-steps").textContent = "3";
    authStep = 1;
  } else if (authStep === 3) {
    document.getElementById("auth-step-3").classList.add("hidden");
    document.getElementById("auth-step-3").classList.remove("block");
    document.getElementById("auth-step-2").classList.remove("hidden");
    document.getElementById("auth-step-2").classList.add("block");
    document.getElementById("auth-current-step").textContent = "2";
    authStep = 2;
  }
}

function checkEligibility() {
  const checks = document.querySelectorAll(".eligibility-check");
  let allChecked = true;
  checks.forEach((check) => {
    if (!check.checked) allChecked = false;
  });

  const regBtn = document.getElementById("final-register-btn");
  if (allChecked) {
    regBtn.removeAttribute("disabled");
    regBtn.classList.remove(
      "opacity-50",
      "cursor-not-allowed",
      "bg-indigo-600",
    );
    regBtn.classList.add(
      "hover:bg-green-700",
      "hover:shadow-lg",
      "active:scale-95",
      "bg-green-600",
    );
  } else {
    regBtn.setAttribute("disabled", "true");
    regBtn.classList.add("opacity-50", "cursor-not-allowed", "bg-indigo-600");
    regBtn.classList.remove(
      "hover:bg-green-700",
      "hover:shadow-lg",
      "active:scale-95",
      "bg-green-600",
    );
  }
}

async function completeRegistration() {
  hideError();
  let btn;
  if (authRole === "recipient") {
    const name = document.getElementById("reg-name").value;
    const phone = document.getElementById("reg-phone").value;
    const address = document.getElementById("reg-address").value;
    const blood = document.getElementById("reg-blood").value;

    if (!name || name.length < 2)
      return showError("Name must be at least 2 characters.");
    if (!phone || phone.length < 7)
      return showError("Phone number must be at least 7 characters.");
    if (!address) return showError("Address is required.");
    if (!blood) return showError("Please select a blood type.");

    btn = document.getElementById("step-2-next-btn");
  } else {
    const dob = document.getElementById("reg-dob").value;
    const gender = document.getElementById("reg-gender").value;
    const weight = document.getElementById("reg-weight").value;

    if (!dob) return showError("Date of Birth is required.");
    if (!gender) return showError("Gender is required.");
    if (!weight || parseFloat(weight) < 50)
      return showError("Weight must be at least 50kg.");

    btn = document.getElementById("final-register-btn");
  }

  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';

  try {
    const payload = {
      email: document.getElementById("reg-email").value,
      password: document.getElementById("reg-password").value,
      confirmPassword: document.getElementById("reg-confirm").value,
      name: document.getElementById("reg-name").value,
      role: authRole.toUpperCase(),
      phone: document.getElementById("reg-phone").value,
      address: document.getElementById("reg-address").value,
      bloodType: document.getElementById("reg-blood").value,
      medicalCondition: document.getElementById("reg-medical").value || null,
    };

    if (authRole === "donor") {
      payload.dateOfBirth = new Date(
        document.getElementById("reg-dob").value,
      ).toISOString();
      payload.gender = document.getElementById("reg-gender").value;
      payload.weight = parseFloat(document.getElementById("reg-weight").value);
      const lastDonation = document.getElementById("reg-last-donation").value;
      if (lastDonation) {
        payload.lastDonationDate = new Date(lastDonation).toISOString();
      }
    }

    const response = await fetch("http://localhost:5000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      let errorMsg = data.message || "Registration failed";
      if (data.error && Array.isArray(data.error.issues)) {
        errorMsg = data.error.issues[0].message;
      } else if (data.error && typeof data.error === "string") {
        errorMsg = data.error;
      }
      throw new Error(errorMsg);
    }

    // Hide Step 2/3 & Footer, show Success screen
    document
      .getElementById(`auth-step-${authRole === "donor" ? 3 : 2}`)
      .classList.add("hidden");
    document
      .getElementById(`auth-step-${authRole === "donor" ? 3 : 2}`)
      .classList.remove("block");
    document.getElementById("auth-footer-toggle").classList.add("hidden");
    document.getElementById("auth-footer-toggle").classList.remove("block");

    document.getElementById("auth-success").classList.remove("hidden");
    document
      .getElementById("auth-current-step")
      .parentElement.classList.add("hidden");
    document.getElementById("auth-error-box").classList.add("hidden");
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
  document.getElementById("auth-step-1").classList.remove("hidden");
  document.getElementById("auth-step-1").classList.add("block");
  document.getElementById("auth-step-2").classList.add("hidden");
  document.getElementById("auth-step-2").classList.remove("block");
  document.getElementById("auth-step-3").classList.add("hidden");
  document.getElementById("auth-step-3").classList.remove("block");

  const successScreen = document.getElementById("auth-success");
  if (successScreen) successScreen.classList.add("hidden");

  document.getElementById("auth-footer-toggle").classList.remove("hidden");
  document.getElementById("auth-footer-toggle").classList.add("block");
  document
    .getElementById("auth-current-step")
    .parentElement.classList.remove("hidden");
  document.getElementById("auth-current-step").textContent = "1";
  document.getElementById("auth-total-steps").textContent = "3";

  // Reset Forms
  document
    .querySelectorAll("#auth-step-1 input")
    .forEach((input) => (input.value = ""));
  document
    .querySelectorAll("#auth-step-2 input")
    .forEach((input) => (input.value = ""));
  document
    .querySelectorAll('#auth-step-3 input:not([type="checkbox"])')
    .forEach((input) => (input.value = ""));
  document
    .querySelectorAll("#auth-step-2 select, #auth-step-3 select")
    .forEach((select) => (select.selectedIndex = 0));
  document
    .querySelectorAll(".eligibility-check")
    .forEach((input) => (input.checked = false));

  // Reset Step 2 button
  const step2Btn = document.getElementById("step-2-next-btn");
  if (step2Btn) {
    step2Btn.innerHTML = 'Continue <i class="fas fa-arrow-right ml-2"></i>';
    step2Btn.onclick = nextAuthStep;
    step2Btn.classList.remove("bg-green-600", "hover:bg-green-700");
    step2Btn.classList.add("bg-indigo-600");
  }

  // Reset Cards
  const cards = document.querySelectorAll(".auth-role-card");
  cards.forEach((card) => {
    card.classList.remove(
      "border-indigo-500",
      "bg-indigo-50",
      "ring-2",
      "ring-indigo-300",
    );
    card.classList.add("border-gray-100");
  });

  checkEligibility();
}

// === Session & Login Logic ===
function showLoginError(msg) {
  const errorBox = document.getElementById("login-error-box");
  const errorText = document.getElementById("login-error-text");
  if (errorText && errorBox) {
    errorText.textContent = msg;
    errorBox.classList.remove("hidden");
  }
}

function hideLoginError() {
  const errorBox = document.getElementById("login-error-box");
  if (errorBox) errorBox.classList.add("hidden");
}

async function handleLogin(e) {
  e.preventDefault();
  hideLoginError();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  const btn = document.getElementById("login-btn");

  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';

  try {
    const response = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Login failed. Please check your credentials.",
      );
    }

    // Save to LocalStorage
    localStorage.setItem("token", data.data.token);
    localStorage.setItem("user", JSON.stringify(data.data.user));

    // Hide auth slide panel side effect if it's there
    const loginSec = document.getElementById("login");
    if (loginSec) loginSec.classList.remove("sign-up-active");

    // Route to Dashboard
    routeUserToDashboard(data.data.user);

    // Reset Login Form
    document.getElementById("login-form-inner").reset();
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

  const bloodTypeStr =
    user.donorProfile?.bloodType ||
    user.recipientProfile?.bloodType ||
    "Unknown";

  if (user.role === "DONOR") {
    const nameDisplay = document.getElementById("donor-name-display");
    const bloodDisplay = document.getElementById("donor-blood-display");
    if (nameDisplay) nameDisplay.textContent = user.name;
    if (bloodDisplay) bloodDisplay.textContent = bloodTypeStr;
    navigateTo("donor-dashboard");
    fetchDonorEligibility(); // Fetch real eligibility
  } else if (user.role === "RECIPIENT") {
    const nameDisplay = document.getElementById("recipient-name-display");
    const bloodDisplay = document.getElementById("recipient-blood-display");
    if (nameDisplay) nameDisplay.textContent = user.name;
    if (bloodDisplay) bloodDisplay.textContent = bloodTypeStr;
    navigateTo("recipient-dashboard");
    fetchRecipientRequests(); // Fetch real requests
  } else if (user.role === "ADMIN") {
    const sidebarName = document.getElementById("admin-sidebar-name");
    if (sidebarName) sidebarName.textContent = user.name;
    navigateTo("admin-dashboard");
    fetchAdminSummary(); // Fetch summary stats
  }
}

// === NEW: Profile Fetching Logic ===
async function fetchDonorProfile() {
  const token = localStorage.getItem("token");
  try {
    const response = await fetch("http://localhost:5000/api/donor/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await handleApiResponse(response);
    if (data && data.success) {
      const u = data.data;
      const profile = u.donorProfile || {};
      
      if (document.getElementById("donor-name-display")) document.getElementById("donor-name-display").textContent = u.name;
      if (document.getElementById("donor-blood-display")) document.getElementById("donor-blood-display").textContent = profile.bloodType || "N/A";
      
      // Update info cards if they exist
      const phoneEl = document.querySelector("#donor-dashboard [data-info='phone']");
      const addressEl = document.querySelector("#donor-dashboard [data-info='address']");
      if (phoneEl) phoneEl.textContent = profile.phone || "Not set";
      if (addressEl) addressEl.textContent = profile.address || "Not set";
      
      console.log("Donor profile loaded");
      
      // Update donation history with placeholder
      const historyList = document.querySelector("#donor-dashboard .space-y-4");
      if (historyList) {
        historyList.innerHTML = '<div style="text-align:center;padding:2rem;color:#94a3b8;font-weight:500;border:2px dashed #f1f5f9;border-radius:1.5rem;">No donation history yet.</div>';
      }
      
      // Disable the schedule form with "Coming Soon" overlay or message
      const scheduleForm = document.getElementById("donor-schedule-form");
      if (scheduleForm) {
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.7);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;z-index:20;border-radius:2rem;";
        overlay.innerHTML = '<div style="background:white;padding:1rem 2rem;border-radius:1rem;box-shadow:0 10px 25px rgba(0,0,0,0.05);font-weight:800;color:#D32F2F;border:1px solid #fee2e2;">SCHEDULE: COMING SOON</div>';
        scheduleForm.style.position = "relative";
        scheduleForm.appendChild(overlay);
      }
    }
  } catch (err) {
    console.error("Donor profile fetch failed", err);
  }
}

async function fetchRecipientProfile() {
  const token = localStorage.getItem("token");
  try {
    const response = await fetch("http://localhost:5000/api/recipient/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await handleApiResponse(response);
    if (data && data.success) {
      const u = data.data;
      const profile = u.recipientProfile || {};
      
      if (document.getElementById("recipient-name-display")) document.getElementById("recipient-name-display").textContent = u.name;
      if (document.getElementById("recipient-blood-display")) document.getElementById("recipient-blood-display").textContent = profile.bloodType || "N/A";
      
      console.log("Recipient profile loaded");
      
      // Handle the request form with Coming Soon
      const requestForm = document.getElementById("recipient-request-form");
      if (requestForm) {
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.7);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;z-index:20;border-radius:2rem;";
        overlay.innerHTML = '<div style="background:white;padding:1rem 2rem;border-radius:1rem;box-shadow:0 10px 25px rgba(0,0,0,0.05);font-weight:800;color:#4f46e5;border:1px solid #e0e7ff;">REQUESTS: COMING SOON</div>';
        requestForm.style.position = "relative";
        requestForm.appendChild(overlay);
      }
      
      // Handle tracker visibility
      const tracker = document.querySelector("#recipient-dashboard .bg-white\\/80.backdrop-blur-xl.p-8.rounded-\\[2rem\\]");
      if (tracker) {
        tracker.innerHTML = '<div style="text-align:center;padding:1rem;color:#94a3b8;font-weight:600;">No active requests yet. Tracking will appear here once you request blood.</div>';
      }
    }
  } catch (err) {
    console.error("Recipient profile fetch failed", err);
  }
}

async function fetchAdminSummary() {
  const token = localStorage.getItem("token");
  try {
    const response = await fetch("http://localhost:5000/api/admin/summary", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await handleApiResponse(response);
    if (data && data.success) {
      const stats = data.data;
      if (document.getElementById("admin-total-users")) document.getElementById("admin-total-users").textContent = stats.totalUsers;
      // Pending and Units are 0 for now as tables don't exist
      if (document.getElementById("admin-pending-count")) document.getElementById("admin-pending-count").textContent = "0";
      if (document.getElementById("admin-total-units")) document.getElementById("admin-total-units").textContent = "0";
    }
  } catch (err) {}
}

async function handleApiResponse(response) {
  if (response.status === 401) {
    logout();
    showLoginError("Session expired. Please login again.");
    throw new Error("Unauthorized");
  }
  return response.json();
}

// Global "Coming Soon" for unimplemented buttons
function showComingSoon() {
  alert("Feature Coming Soon: This functionality requires additional backend tables.");
}

function updateNav(user) {
  const navUserContainer = document.getElementById("nav-user-container");
  const navLoginBtn = document.getElementById("nav-login-btn");
  const navUserName = document.getElementById("nav-user-name");

  if (user && navUserContainer && navLoginBtn && navUserName) {
    navUserName.textContent = user.name;
    navUserName.style.cursor = "pointer";
    navUserName.style.textDecoration = "underline";
    navUserName.style.textDecorationStyle = "dotted";
    navUserName.style.textUnderlineOffset = "4px";
    navUserName.onclick = goToDashboard;
    navLoginBtn.classList.add("hidden");
    navUserContainer.classList.remove("hidden");
    navUserContainer.classList.add("flex");
    // Hide public nav links when logged in
    document.querySelectorAll(".nav-link[data-target]").forEach((link) => {
      link.style.display = "none";
    });
  } else if (navUserContainer && navLoginBtn) {
    navLoginBtn.classList.remove("hidden");
    navUserContainer.classList.add("hidden");
    navUserContainer.classList.remove("flex");
    // Show public nav links when logged out
    document.querySelectorAll(".nav-link[data-target]").forEach((link) => {
      link.style.display = "";
    });
  }
}

function goToDashboard() {
  const userStr = localStorage.getItem("user");
  if (!userStr) {
    navigateTo("login");
    return;
  }
  try {
    const user = JSON.parse(userStr);
    
    // Update "My Dashboard" links specifically if they exist in a dynamic way
    // But since the nav is mostly static, navigateTo will handle the routing logic anyway.
    
    if (user.role === "ADMIN") navigateTo("admin-dashboard");
    else if (user.role === "RECIPIENT") navigateTo("recipient-dashboard");
    else navigateTo("donor-dashboard");
  } catch (e) {
    navigateTo("login");
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  updateNav(null);
  navigateTo("login");
  const loginSec = document.getElementById("login");
  if (loginSec) loginSec.classList.remove("sign-up-active");
}

function checkAuthOnLoad() {
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get("token");
  if (resetToken) {
    navigateTo("login");
    showResetBlock();
    return;
  }

  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");

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
document.addEventListener("DOMContentLoaded", () => {
  checkAuthOnLoad();
});

async function fetchAdminUsers() {
  const token = localStorage.getItem("token");
  if (!token) return;

  // Update sidebar name
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      const sidebarName = document.getElementById("admin-sidebar-name");
      if (sidebarName) sidebarName.textContent = u.name;
    } catch (e) {}
  }

  try {
    const response = await fetch("http://localhost:5000/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      logout();
      showLoginError("Session expired. Please login again.");
      return;
    }

    const data = await response.json();
    const tbody = document.getElementById("admin-users-tbody");
    const counter = document.getElementById("admin-total-users");

    if (data.success && tbody) {
      const users = data.data;
      if (counter) counter.textContent = users.length;

      tbody.innerHTML = "";
      if (users.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="3" style="text-align:center;padding:3rem;color:#84758c;">No users found.</td></tr>';
        return;
      }

      users.forEach((u) => {
        const initial = (u.name || "?").charAt(0).toUpperCase();
        const roleBadge =
          u.role === "ADMIN"
            ? "admin-badge-danger"
            : u.role === "DONOR"
              ? "admin-badge-success"
              : "admin-badge-primary";
        const tr = document.createElement("tr");
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
    console.error("Failed to fetch users:", e);
  }
}

function filterUserTable(query) {
  const rows = document.querySelectorAll("#admin-users-tbody tr");
  const q = query.toLowerCase();
  rows.forEach((row) => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(q) ? "" : "none";
  });
}

function escapeHtml(unsafe) {
  return (unsafe || "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// === Forgot & Reset Password Logic ===
function showForgotBlock(e) {
  if (e) e.preventDefault();
  document.getElementById("auth-signin-card").classList.add("hidden");
  document.getElementById("auth-signup-card").classList.add("hidden");
  document.getElementById("auth-reset-card").classList.add("hidden");
  document.getElementById("auth-forgot-card").classList.remove("hidden");
  hideForgotError();
  hideForgotSuccess();
}

function showSignInBlock() {
  document.getElementById("auth-signin-card").classList.remove("hidden");
  document.getElementById("auth-signup-card").classList.remove("hidden");
  document.getElementById("auth-forgot-card").classList.add("hidden");
  document.getElementById("auth-reset-card").classList.add("hidden");
  document.getElementById("login").classList.remove("sign-up-active");
}

function showResetBlock() {
  document.getElementById("auth-signin-card").classList.add("hidden");
  document.getElementById("auth-signup-card").classList.add("hidden");
  document.getElementById("auth-forgot-card").classList.add("hidden");
  document.getElementById("auth-reset-card").classList.remove("hidden");
  hideResetError();
  hideResetSuccess();
}

function showForgotError(msg) {
  const errorBox = document.getElementById("forgot-error-box");
  const errorText = document.getElementById("forgot-error-text");
  errorText.textContent = msg;
  errorBox.classList.remove("hidden");
  document.getElementById("forgot-success-box").classList.add("hidden");
}

function hideForgotError() {
  document.getElementById("forgot-error-box").classList.add("hidden");
}

function showForgotSuccess(msg) {
  const successBox = document.getElementById("forgot-success-box");
  const successText = document.getElementById("forgot-success-text");
  successText.textContent = msg;
  successBox.classList.remove("hidden");
  document.getElementById("forgot-error-box").classList.add("hidden");
}

function hideForgotSuccess() {
  document.getElementById("forgot-success-box").classList.add("hidden");
}

async function handleForgotPassword(e) {
  e.preventDefault();
  hideForgotError();
  hideForgotSuccess();

  const email = document.getElementById("forgot-email").value;
  const btn = document.getElementById("forgot-btn");
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

  try {
    const response = await fetch(
      "http://localhost:5000/api/auth/forgot-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      },
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "An error occurred.");

    showForgotSuccess(data.message);
    document.getElementById("forgot-form").reset();
  } catch (error) {
    showForgotError(error.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

function showResetError(msg) {
  const errorBox = document.getElementById("reset-error-box");
  const errorText = document.getElementById("reset-error-text");
  errorText.textContent = msg;
  errorBox.classList.remove("hidden");
  document.getElementById("reset-success-box").classList.add("hidden");
}

function hideResetError() {
  document.getElementById("reset-error-box").classList.add("hidden");
}

function showResetSuccess(msg) {
  const successBox = document.getElementById("reset-success-box");
  const successText = document.getElementById("reset-success-text");
  successText.textContent = msg;
  successBox.classList.remove("hidden");
  document.getElementById("reset-error-box").classList.add("hidden");
}

function hideResetSuccess() {
  document.getElementById("reset-success-box").classList.add("hidden");
}

async function handleResetPassword(e) {
  e.preventDefault();
  hideResetError();
  hideResetSuccess();

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  if (!token) return showResetError("No reset token found in URL.");

  const newPassword = document.getElementById("reset-password").value;
  const confirmPassword = document.getElementById("reset-confirm").value;

  if (newPassword !== confirmPassword) {
    return showResetError("Passwords do not match.");
  }

  const btn = document.getElementById("reset-btn");
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

  try {
    const response = await fetch(
      "http://localhost:5000/api/auth/reset-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      },
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "An error occurred.");

    showResetSuccess(data.message);
    document.getElementById("reset-form").reset();

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

let currentStockData = []; // Store for edit lookups

function initAdminModals() {
  const stockForm = document.getElementById("admin-add-stock-form");
  if (!stockForm) return;

  // Check if fields already injected
  if (document.getElementById("add-stock-date")) return;

  // Add hidden ID field for Editing
  const idInput = document.createElement("input");
  idInput.type = "hidden";
  idInput.id = "add-stock-id";
  stockForm.appendChild(idInput);

  // Inject Donation Date
  const dateDiv = document.createElement("div");
  dateDiv.innerHTML = `
    <label style="font-size:0.8rem; font-weight:600; color:#475569; margin-bottom:0.35rem; display:block;">Donation Date</label>
    <input type="date" id="add-stock-date" required style="width:100%; padding:0.7rem 1rem; border:1px solid #e6e0d6; border-radius:0.5rem; font-size:0.95rem; outline:none; font-family:inherit;">
  `;
  
  // Inject Donor Identifier (Email)
  const donorDiv = document.createElement("div");
  donorDiv.innerHTML = `
    <label style="font-size:0.8rem; font-weight:600; color:#475569; margin-bottom:0.35rem; display:block;">Donor Email (Optional - for linking)</label>
    <input type="email" id="add-stock-donor-email" placeholder="donor@example.com" style="width:100%; padding:0.7rem 1rem; border:1px solid #e6e0d6; border-radius:0.5rem; font-size:0.95rem; outline:none; font-family:inherit;">
  `;

  // NEW: RBC and Plasma components
  const componentsDiv = document.createElement("div");
  componentsDiv.style.display = "grid";
  componentsDiv.style.gridTemplateColumns = "1fr 1fr";
  componentsDiv.style.gap = "0.75rem";
  componentsDiv.innerHTML = `
    <div>
      <label style="font-size:0.8rem; font-weight:600; color:#475569; margin-bottom:0.35rem; display:block;">RBC Count (M/µL)</label>
      <input type="number" step="0.1" id="add-stock-rbc" placeholder="e.g. 5.1" style="width:100%; padding:0.7rem 1rem; border:1px solid #e6e0d6; border-radius:0.5rem; font-size:0.95rem; outline:none; font-family:inherit;">
    </div>
    <div>
      <label style="font-size:0.8rem; font-weight:600; color:#475569; margin-bottom:0.35rem; display:block;">Plasma (mL)</label>
      <input type="number" id="add-stock-plasma" placeholder="e.g. 450" style="width:100%; padding:0.7rem 1rem; border:1px solid #e6e0d6; border-radius:0.5rem; font-size:0.95rem; outline:none; font-family:inherit;">
    </div>
  `;

  // Insert before the buttons grid
  const buttonsDiv = stockForm.querySelector("div[style*='display:flex; gap:0.75rem']");
  stockForm.insertBefore(dateDiv, buttonsDiv);
  stockForm.insertBefore(donorDiv, buttonsDiv);
  stockForm.insertBefore(componentsDiv, buttonsDiv);

  // Set default date to today
  document.getElementById("add-stock-date").valueAsDate = new Date();

  // Reset modal state on close button click (if found) or manually through class list
}

function resetStockModal() {
  document.getElementById("admin-add-stock-form").reset();
  document.getElementById("add-stock-id").value = "";
  document.getElementById("add-stock-date").valueAsDate = new Date();
  
  const modal = document.getElementById("add-stock-modal");
  const title = modal.querySelector("h3");
  const btn = modal.querySelector("button[type='submit']");
  if (title) title.textContent = "Register New Stock";
  if (btn) btn.innerHTML = '<i class="fas fa-save"></i> Save Inventory';
}

async function fetchInventory() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const searchStr = document.getElementById("admin-inventory-search")?.value || "";
  const sortVal = document.getElementById("admin-inventory-sort")?.value || "latest";

  try {
    const response = await fetch(
      `http://localhost:5000/api/admin/stock?search=${encodeURIComponent(searchStr)}&sort=${sortVal}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const { data } = await handleApiResponse(response);
    currentStockData = data; // Store globally for editing

    const tbody = document.getElementById("admin-inventory-tbody");
    const thead = document.querySelector("#admin-view-inventory thead");
    if (!tbody) return;

    // Update Table Headers dynamically
    if (thead) {
      thead.innerHTML = `<tr>
        <th class="admin-th">Donor / Group</th>
        <th class="admin-th">Units / Health</th>
        <th class="admin-th">Components</th>
        <th class="admin-th">Expiration</th>
        <th class="admin-th" style="text-align:right;">Actions</th>
      </tr>`;
    }

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:3rem;color:#94a3b8;">No inventory records found.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(item => {
      const healthColor = item.healthIndicator === 'Excellent' ? '#16a34a' :
                        item.healthIndicator === 'Good' ? '#2563eb' :
                        item.healthIndicator === 'Fair' ? '#d97706' : '#be123c';
      
      const healthBg = item.healthIndicator === 'Excellent' ? '#f0fdf4' :
                     item.healthIndicator === 'Good' ? '#eff6ff' :
                     item.healthIndicator === 'Fair' ? '#fffbeb' : '#fff1f2';

      return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <div style="width:36px; height:36px; background:rgba(211,47,47,0.1); color:#D32F2F; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.85rem;">${item.bloodGroup}</div>
            <div>
              <div style="font-weight:600; color:#1a1a2e;">${item.bloodGroup} Group</div>
              <div style="font-size:0.75rem; color:#94a3b8;">Ref: ${item.donorName || 'System Batch'}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight:700; color:#1a1a2e; margin-bottom:0.25rem;">${item.units} Units</div>
          <span class="admin-badge-success" style="background:${healthBg}; color:${healthColor}; border:1px solid ${healthColor}20;">
            <i class="fas fa-heartbeat" style="font-size:0.7rem; margin-right:0.2rem;"></i> ${item.healthIndicator}
          </span>
        </td>
        <td>
          <div style="font-size:0.85rem; font-weight:600;">RBC: ${item.rbcCount || '--'} <span style="font-size:0.7rem; color:#94a3b8;">M/µL</span></div>
          <div style="font-size:0.85rem; font-weight:600;">Plasma: ${item.plasmaCount || '--'} <span style="font-size:0.7rem; color:#94a3b8;">mL</span></div>
        </td>
        <td>
          <div style="font-weight:500; font-size:0.85rem; color:${item.status === 'Critical' ? '#be123c' : '#1a1a2e'};">Exp: ${new Date(item.expiryDate).toLocaleDateString()}</div>
          <div style="font-size:0.7rem; color:#94a3b8;">Added: ${new Date(item.donationDate).toLocaleDateString()}</div>
        </td>
        <td style="text-align:right;">
          <div style="display:flex; justify-content:flex-end; gap:0.4rem;">
            <button onclick="openEditStockModal('${item.id}')" class="admin-btn-icon approve" title="Edit record"><i class="fas fa-edit"></i></button>
            <button onclick="deleteStock('${item.id}')" class="admin-btn-icon delete" title="Delete record"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>
    `}).join('');
  } catch (error) {
    console.error("Failed to fetch inventory", error);
  }
}

function openEditStockModal(id) {
  const item = currentStockData.find(s => s.id === id);
  if (!item) return;

  const modal = document.getElementById("add-stock-modal");
  const title = modal.querySelector("h3");
  const btn = modal.querySelector("button[type='submit']");
  
  if (title) title.textContent = "Edit Stock Quality & Levels";
  if (btn) btn.innerHTML = '<i class="fas fa-sync-alt"></i> Update Record';

  // Populate fields
  document.getElementById("add-stock-id").value = item.id;
  document.getElementById("add-stock-group").value = item.bloodGroup;
  document.getElementById("add-stock-units").value = item.units;
  document.getElementById("add-stock-date").value = new Date(item.donationDate).toISOString().split('T')[0];
  document.getElementById("add-stock-donor-email").value = item.donorName && item.donorName.includes('@') ? item.donorName : "";
  document.getElementById("add-stock-rbc").value = item.rbcCount || "";
  document.getElementById("add-stock-plasma").value = item.plasmaCount || "";

  modal.classList.remove("hidden");
}

async function submitAddStock(e) {
  if (e) e.preventDefault();
  const token = localStorage.getItem("token");
  
  const id = document.getElementById("add-stock-id").value;
  const bloodGroup = document.getElementById("add-stock-group").value;
  const units = document.getElementById("add-stock-units").value;
  const donationDate = document.getElementById("add-stock-date").value;
  const donorEmail = document.getElementById("add-stock-donor-email").value;
  const rbcCount = document.getElementById("add-stock-rbc").value;
  const plasmaCount = document.getElementById("add-stock-plasma").value;

  const method = id ? "PUT" : "POST";
  const url = id ? `http://localhost:5000/api/admin/stock/${id}` : "http://localhost:5000/api/admin/stock";

  try {
    const response = await fetch(url, {
      method: method,
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ bloodGroup, units, donationDate, donorEmail, rbcCount, plasmaCount }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Operation failed");

    resetStockModal();
    document.getElementById("add-stock-modal").classList.add("hidden");
    fetchInventory();
    fetchAdminSummary();
    
    // Smooth alert
    const msg = id ? "Medical records updated successfully." : "New stock registered successfully.";
    alert(msg);
  } catch (error) {
    alert(error.message);
  }
}

async function deleteStock(id) {
  if (!confirm("Are you sure you want to delete this medical record?")) return;
  const token = localStorage.getItem("token");

  try {
    const response = await fetch(`http://localhost:5000/api/admin/stock/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Failed to delete record");
    fetchInventory();
    fetchAdminSummary();
  } catch (error) {
    alert(error.message);
  }
}

// ─── ADMIN REQUESTS MANAGEMENT ───────────────────────────

async function fetchAdminRequests() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const response = await fetch("http://localhost:5000/api/admin/requests", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { data } = await handleApiResponse(response);
    const listDiv = document.getElementById("admin-requests-list");
    if (!listDiv) return;

    if (data.length === 0) {
      listDiv.innerHTML = '<div style="text-align:center;padding:3rem;color:#94a3b8;">No requests currently active.</div>';
      return;
    }

    listDiv.innerHTML = data.map(req => `
      <div class="admin-request-item">
        <div style="display:flex; align-items:center; gap:1rem;">
          <div style="width:42px; height:42px; background:rgba(211,47,47,0.1); color:#D32F2F; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1rem;">${req.bloodGroup}</div>
          <div>
            <div style="font-weight:700; color:#1a1a2e;">${req.units} Units Needed</div>
            <div style="font-size:0.8rem; color:#64748b;">For: ${req.user.name} • ${req.hospital}</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:1.5rem;">
          <div style="text-align:right;">
            <span class="admin-badge-primary" style="background:${req.urgency === 'Critical' ? '#fee2e2' : req.urgency === 'High' ? '#fef3c7' : '#f1f5f9'}; color:${req.urgency === 'Critical' ? '#be123c' : req.urgency === 'High' ? '#d97706' : '#64748b'};">
              ${req.urgency}
            </span>
            <div style="font-size:0.7rem; color:#94a3b8; font-weight:600; margin-top:0.25rem;">Status: ${req.status}</div>
          </div>
          <div style="display:flex; gap:0.4rem;">
            ${req.status === 'PENDING' ? `
              <button onclick="updateReqStatus('${req.id}', 'APPROVED')" class="admin-btn-icon approve" title="Approve Request"><i class="fas fa-check"></i></button>
              <button onclick="updateReqStatus('${req.id}', 'REJECTED')" class="admin-btn-icon reject" title="Reject Request"><i class="fas fa-times"></i></button>
            ` : req.status === 'APPROVED' ? `
              <button onclick="updateReqStatus('${req.id}', 'FULFILLED')" class="admin-btn-icon approve" title="Mark as Fulfilled"><i class="fas fa-check-double"></i></button>
            ` : `<i class="fas fa-check-circle" style="color:#16a34a;"></i>`}
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function updateReqStatus(id, status) {
  const token = localStorage.getItem("token");
  try {
    const response = await fetch(`http://localhost:5000/api/admin/requests/${id}/status`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ status })
    });
    if (!response.ok) throw new Error("Update failed");
    fetchAdminRequests();
    fetchAdminSummary();
  } catch (error) {
    alert(error.message);
  }
}

// ─── RECIPIENT REQUEST LOGIC ─────────────────────────────

async function fetchRecipientRequests() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const response = await fetch("http://localhost:5000/api/recipient/requests", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const { data } = await handleApiResponse(response);
    
    // Update active tracker if we have a pending/active request
    const activeReq = data.find(r => r.status === 'PENDING' || r.status === 'APPROVED');
    // (Logic to update the visual tracker UI could go here)

    // Update history table? No table in index.html for recipient history, just a container
    // If you add it to index.html later, use this data.
  } catch (error) {
    console.error(error);
  }
}

async function submitRecipientRequest(e) {
  if (e) e.preventDefault();
  const token = localStorage.getItem("token");
  
  const form = e.target;
  const bloodGroup = form.querySelector("select[required]").value;
  const units = form.querySelector("input[type='number']").value;
  const urgency = form.querySelectorAll("select[required]")[1].value;
  const hospital = form.querySelector("input[type='text']").value;

  try {
    const response = await fetch("http://localhost:5000/api/recipient/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ bloodGroup, units, urgency, hospital })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to submit request");

    document.getElementById("recipient-request-success").classList.remove("hidden");
    form.reset();
    setTimeout(() => {
      document.getElementById("recipient-request-success").classList.add("hidden");
    }, 3000);
    fetchRecipientRequests();
  } catch (error) {
    alert(error.message);
  }
}

// ─── DONOR ELIGIBILITY LOGIC ─────────────────────────────

async function fetchDonorEligibility() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const response = await fetch("http://localhost:5000/api/donor/eligibility", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const { data } = await handleApiResponse(response);
    
    const eligibleH3 = document.querySelector("#donor-dashboard h3.text-3xl");
    if (eligibleH3) {
      if (data.eligible) {
        eligibleH3.textContent = "Eligible Now";
        eligibleH3.style.color = "#16a34a";
      } else {
        const nextDate = new Date(data.nextEligibleDate);
        eligibleH3.textContent = nextDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        eligibleH3.style.color = "#D32F2F";
      }
    }
  } catch (error) {
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");
  
  initAdminModals();

  // Attach Recipient Request Listener
  const recipientForm = document.querySelector("#recipient-request-form form");
  if (recipientForm) {
    recipientForm.onsubmit = submitRecipientRequest;
  }

  // Hook into Close/Add button to reset modal state
  const addStockBtn = document.querySelector("#admin-view-inventory button.admin-btn-primary");
  if (addStockBtn) {
    addStockBtn.addEventListener("click", resetStockModal);
  }

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      updateNav(user);
      routeUserToDashboard(user);
    } catch (e) {
      logout();
    }
  } else {
    navigateTo("home");
    updateNav(null);
  }
});

/**
 * ═══════════════════════════════════════════════
 * ADMIN SUB-NAVIGATION LOGIC
 * ═══════════════════════════════════════════════
 */
function navigateAdmin(viewId) {
  console.log("Navigating Admin to:", viewId);

  // 1. Hide all views
  document.querySelectorAll(".admin-view").forEach((view) => {
    view.classList.remove("active");
    view.style.display = "none";
  });

  // 2. Show target view
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.add("active");
    targetView.style.display = "block";
    if (viewId === "admin-view-dashboard") {
      targetView.style.display = "block";
    }
  }

  // 3. Update Sidebar Links
  document.querySelectorAll(".admin-sidebar-link").forEach((link) => {
    link.classList.remove("active");
  });
  const activeLink = document.getElementById("link-" + viewId);
  if (activeLink) {
    activeLink.classList.add("active");
  }

  // 4. Update Header Title
  const titleMap = {
    "admin-view-dashboard": "Dashboard Overview",
    "admin-view-inventory": "Inventory Management",
    "admin-view-requests": "Blood Request Triage",
    "admin-view-users": "User Directory",
  };
  const titleElem = document.getElementById("admin-page-title");
  if (titleElem) {
    titleElem.textContent = titleMap[viewId] || "Admin Panel";
  }

  // 5. Trigger Data Refreshes if needed
  if (viewId === "admin-view-dashboard") fetchAdminSummary();
  if (viewId === "admin-view-inventory") fetchInventory();
  if (viewId === "admin-view-requests") fetchAdminRequests();
  if (viewId === "admin-view-users") fetchAdminUsers();
}
