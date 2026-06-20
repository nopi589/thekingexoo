// settings.js

let currentUser = null;

// ============================
// Auth guard
// ============================
(async function init() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = 'signin.html';
    return;
  }
  currentUser = data.session.user;

  document.getElementById('email').value = currentUser.email || '';
  document.getElementById('name').value = currentUser.user_metadata?.full_name || '';
})();

// ============================
// Helpers
// ============================
function showMsg(errorEl, successEl, message, isError) {
  if (isError) {
    successEl.classList.remove('show');
    errorEl.textContent = message;
    errorEl.classList.add('show');
  } else {
    errorEl.classList.remove('show');
    successEl.textContent = message;
    successEl.classList.add('show');
  }
}

// ============================
// Update profile (display name)
// ============================
const profileForm = document.getElementById('profileForm');
const profileBtn = document.getElementById('profileBtn');
const profileError = document.getElementById('profileError');
const profileSuccess = document.getElementById('profileSuccess');

profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();

  profileBtn.disabled = true;
  profileBtn.textContent = 'Saving…';

  try {
    const { error } = await supabaseClient.auth.updateUser({
      data: { full_name: name }
    });
    if (error) throw error;

    showMsg(profileError, profileSuccess, 'Profile updated.', false);
  } catch (err) {
    showMsg(profileError, profileSuccess, err.message || 'Could not update profile.', true);
  } finally {
    profileBtn.disabled = false;
    profileBtn.textContent = 'Save changes';
  }
});

// ============================
// Update password
// ============================
const passwordForm = document.getElementById('passwordForm');
const passwordBtn = document.getElementById('passwordBtn');
const passwordError = document.getElementById('passwordError');
const passwordSuccess = document.getElementById('passwordSuccess');

passwordForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {
    showMsg(passwordError, passwordSuccess, "Passwords don't match.", true);
    return;
  }

  passwordBtn.disabled = true;
  passwordBtn.textContent = 'Updating…';

  try {
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    if (error) throw error;

    showMsg(passwordError, passwordSuccess, 'Password updated.', false);
    passwordForm.reset();
  } catch (err) {
    showMsg(passwordError, passwordSuccess, err.message || 'Could not update password.', true);
  } finally {
    passwordBtn.disabled = false;
    passwordBtn.textContent = 'Update password';
  }
});
