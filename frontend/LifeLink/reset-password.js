/**
 * reset-password.js
 * LifeLink Password Token Validation and Update
 */

document.addEventListener('DOMContentLoaded', () => {
    const resetForm = document.getElementById('reset-password-form');
    const submitBtn = document.getElementById('submit-btn');
    const messageArea = document.getElementById('message-area');
    const missingTokenMsg = document.getElementById('missing-token-msg');

    // Extract token from URL ?token=...
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    // Validation for token presence
    if (!token) {
        if (resetForm) resetForm.classList.add('hidden');
        if (missingTokenMsg) missingTokenMsg.classList.remove('hidden');
        return;
    }

    if (resetForm) {
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const password = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            // Reset UI state
            messageArea.classList.add('hidden');
            messageArea.classList.remove('bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700');
            
            // Client-side password match validation
            if (password !== confirmPassword) {
                messageArea.textContent = 'Passwords do not match.';
                messageArea.classList.add('bg-red-100', 'text-red-700');
                messageArea.classList.remove('hidden');
                return;
            }

            if (password.length < 8) {
                messageArea.textContent = 'Password must be at least 8 characters.';
                messageArea.classList.add('bg-red-100', 'text-red-700');
                messageArea.classList.remove('hidden');
                return;
            }

            submitBtn.classList.add('loading');
            submitBtn.disabled = true;

            try {
                // API request to reset password
                const response = await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    messageArea.textContent = data.message || 'Password reset successfully! Redirecting to login...';
                    messageArea.classList.add('bg-green-100', 'text-green-700');
                    messageArea.classList.remove('hidden');
                    resetForm.reset();

                    // Redirect to login (index.html) after a short delay
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 3000);
                } else {
                    messageArea.textContent = data.message || 'An error occurred. Link may have expired.';
                    messageArea.classList.add('bg-red-100', 'text-red-700');
                    messageArea.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Reset password error:', error);
                messageArea.textContent = 'Unable to connect to service. Please try again.';
                messageArea.classList.add('bg-red-100', 'text-red-700');
                messageArea.classList.remove('hidden');
            } finally {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        });
    }
});
