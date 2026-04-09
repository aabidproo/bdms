/**
 * forgot-password.js
 * LifeLink Password Reset Functionality
 */

document.addEventListener('DOMContentLoaded', () => {
    const forgotForm = document.getElementById('forgot-password-form');
    const submitBtn = document.getElementById('submit-btn');
    const messageArea = document.getElementById('message-area');

    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Reset UI state
            messageArea.classList.add('hidden');
            messageArea.classList.remove('bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700');
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;

            const email = document.getElementById('email').value;

            try {
                // Prepare API request
                const response = await fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email }),
                });

                const data = await response.json();

                if (response.ok) {
                    // Success handling
                    messageArea.textContent = data.message || 'Email sent successfully! Please check your inbox for reset instructions.';
                    messageArea.classList.add('bg-green-100', 'text-green-700');
                    messageArea.classList.remove('hidden');
                    forgotForm.reset();
                } else {
                    // Error from backend
                    messageArea.textContent = data.message || 'An error occurred. Please try again.';
                    messageArea.classList.add('bg-red-100', 'text-red-700');
                    messageArea.classList.remove('hidden');
                }
            } catch (error) {
                // Network or other critical error
                console.error('Forgot password error:', error);
                messageArea.textContent = 'Unable to connect to service. Please check your connection.';
                messageArea.classList.add('bg-red-100', 'text-red-700');
                messageArea.classList.remove('hidden');
            } finally {
                // Restoration UI state
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        });
    }
});
