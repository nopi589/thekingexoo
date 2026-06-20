// ============================
// Mobile nav toggle
// ============================
const navToggle = document.getElementById('navToggle');
const nav = document.getElementById('nav');

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('menu-open');
    navToggle.setAttribute('aria-expanded', isOpen);
  });

  document.querySelectorAll('.nav-mobile a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('menu-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// ============================
// Pricing billing toggle
// ============================
const billingToggle = document.getElementById('billingToggle');
const labelMonthly = document.getElementById('labelMonthly');
const labelYearly = document.getElementById('labelYearly');
const amounts = document.querySelectorAll('.amt');

if (billingToggle && labelMonthly && labelYearly) {
  billingToggle.addEventListener('click', () => {
    const isYearly = billingToggle.getAttribute('aria-checked') === 'true';
    const next = !isYearly;
    billingToggle.setAttribute('aria-checked', next);
    labelMonthly.classList.toggle('active', !next);
    labelYearly.classList.toggle('active', next);

    amounts.forEach(el => {
      const val = next ? el.dataset.yearly : el.dataset.monthly;
      el.textContent = `$${val}`;
    });
  });
}

// ============================
// Live "ask" demo in hero (home page only)
// ============================
const askQ = document.getElementById('askQ');
const askTimer = document.getElementById('askTimer');
const askAnswer = document.getElementById('askAnswer');

if (askQ && askTimer && askAnswer) {
  const demoSet = [
    {
      q: "What's the fastest way to learn a new language?",
      a: "Daily, short, active practice beats occasional long sessions — consistency compounds faster than intensity."
    },
    {
      q: "Why is the sky blue?",
      a: "Sunlight scatters off air molecules, and blue light scatters more than other colors, so it reaches your eyes from every direction."
    },
    {
      q: "How do I make my standups shorter?",
      a: "Cap each person to 60 seconds, save discussion for after, and post blockers in writing before the call starts."
    }
  ];

  let demoIndex = 0;
  let typingTimeout;

  function typeText(el, text, speed, onDone) {
    el.textContent = '';
    let i = 0;
    function step() {
      if (i <= text.length) {
        el.innerHTML = text.slice(0, i) + '<span class="cursor"></span>';
        i++;
        typingTimeout = setTimeout(step, speed);
      } else {
        el.innerHTML = text;
        if (onDone) onDone();
      }
    }
    step();
  }

  function runDemoCycle() {
    const { q, a } = demoSet[demoIndex];
    askAnswer.classList.remove('show');
    askTimer.classList.remove('live');
    askTimer.textContent = '0ms';

    typeText(askQ, q, 28, () => {
      let ms = 0;
      askTimer.classList.add('live');
      const tick = setInterval(() => {
        ms += 13;
        askTimer.textContent = `${ms}ms`;
        if (ms >= 180) {
          clearInterval(tick);
          askAnswer.textContent = a;
          askAnswer.classList.add('show');
          setTimeout(() => {
            demoIndex = (demoIndex + 1) % demoSet.length;
            runDemoCycle();
          }, 3200);
        }
      }, 16);
    });
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReducedMotion) {
    runDemoCycle();
  } else {
    askQ.textContent = demoSet[0].q;
    askTimer.textContent = '180ms';
    askAnswer.textContent = demoSet[0].a;
    askAnswer.classList.add('show');
  }
}

// ============================
// Scroll reveal (runs on every page)
// ============================
const revealTargets = document.querySelectorAll(
  '.feature-card, .how-step, .price-card, .testimonial-card, .faq-item, .section-head'
);
revealTargets.forEach(el => el.classList.add('reveal'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

revealTargets.forEach(el => observer.observe(el));
