// auth.js
// Shared logic for signin.html and signup.html.
// Detects which form is present on the page and wires it up.

const authError = document.getElementById('authError');
const authSuccess = document.getElementById('authSuccess');

function showError(message) {
  if (authSuccess) authSuccess.classList.remove('show');
  authError.textContent = message;
  authError.classList.add('show');
}

function showSuccess(message) {
  authError.classList.remove('show');
  if (authSuccess) {
    authSuccess.textContent = message;
    authSuccess.classList.add('show');
  }
}

// ============================
// Sign up
// ============================
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  const signupBtn = document.getElementById('signupBtn');

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.classList.remove('show');

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    signupBtn.disabled = true;
    signupBtn.textContent = 'Creating account…';

    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name }
        }
      });

      if (error) throw error;

      // If email confirmation is enabled in your Supabase project, there's
      // no active session yet — tell the user to check their inbox.
      if (data.session) {
        window.location.href = 'chat.html';
      } else {
        showSuccess("Account created. Check your email to confirm, then sign in.");
        signupForm.reset();
        signupBtn.disabled = false;
        signupBtn.textContent = 'Create account';
      }

    } catch (err) {
      showError(err.message || 'Something went wrong creating your account.');
      signupBtn.disabled = false;
      signupBtn.textContent = 'Create account';
    }
  });
}

// ============================
// Sign in
// ============================
const signinForm = document.getElementById('signinForm');
if (signinForm) {
  const signinBtn = document.getElementById('signinBtn');

  signinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authError.classList.remove('show');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    signinBtn.disabled = true;
    signinBtn.textContent = 'Signing in…';

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;

      window.location.href = 'chat.html';

    } catch (err) {
      showError(err.message || 'Couldn\'t sign in. Check your email and password.');
      signinBtn.disabled = false;
      signinBtn.textContent = 'Sign in';
    }
  });
}
