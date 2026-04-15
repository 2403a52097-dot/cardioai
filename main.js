/**
 * CardioAI — Frontend JavaScript
 * Handles: Voice input, claim submission, result rendering, UI interactions
 */

/* ─── State ───────────────────────────────────────── */
let isListening  = false;
let recognition  = null;          // SpeechRecognition instance
let voiceTimeout = null;

/* ─── DOM References (lazy) ───────────────────────── */
const $ = id => document.getElementById(id);

/* ─── Navbar hamburger ────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = $('hamburger');
  const navLinks  = document.querySelector('.nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  // Character counter for textarea
  const textarea  = $('claimInput');
  const charCount = $('charCount');
  if (textarea && charCount) {
    textarea.addEventListener('input', () => {
      const len = textarea.value.length;
      charCount.textContent = `${len} / 1000`;
      charCount.style.color = len > 900 ? 'var(--red)' :
                              len > 750 ? 'var(--orange)' : '';
    });
  }

  // Enter key submits (Shift+Enter = new line)
  if (textarea) {
    textarea.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitClaim();
      }
    });
  }

  // Animate elements on scroll
  observeAnimations();
});

/* ─── Example chips ───────────────────────────────── */
function fillExample(btn) {
  const textarea = $('claimInput');
  if (!textarea) return;
  textarea.value = btn.dataset.text;
  textarea.focus();
  // Trigger char count update
  textarea.dispatchEvent(new Event('input'));
  // Subtle highlight
  textarea.style.borderColor = 'var(--primary)';
  setTimeout(() => textarea.style.borderColor = '', 1500);
}

/* ─── Clear Input ─────────────────────────────────── */
function clearInput() {
  const textarea = $('claimInput');
  if (textarea) {
    textarea.value = '';
    textarea.dispatchEvent(new Event('input'));
    textarea.focus();
  }
  hideResult();
}

/* ─── Voice Input (Web Speech API) ───────────────── */
function toggleVoice() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showAlert('Voice input is not supported in your browser. Please use Chrome or Edge.', 'warning');
    return;
  }

  if (isListening) {
    stopVoice();
  } else {
    startVoice();
  }
}

function startVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang        = 'en-US';
  recognition.continuous  = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    updateMicUI(true);
    // Auto-stop after 10 seconds
    voiceTimeout = setTimeout(stopVoice, 10000);
  };

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    const textarea = $('claimInput');
    if (textarea) {
      textarea.value = transcript;
      textarea.dispatchEvent(new Event('input'));
    }
    const voiceText = $('voiceText');
    if (voiceText) voiceText.textContent = `Heard: "${transcript}"`;
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    const messages = {
      'no-speech':       'No speech detected. Please try again.',
      'audio-capture':   'Microphone not found. Please check your device.',
      'not-allowed':     'Microphone access denied. Please allow microphone permissions.',
      'network':         'Network error during voice recognition.',
    };
    showAlert(messages[event.error] || 'Voice input error. Please try again.', 'error');
    stopVoice();
  };

  recognition.onend = () => {
    stopVoice();
  };

  recognition.start();
}

function stopVoice() {
  if (recognition) {
    try { recognition.stop(); } catch (_) {}
    recognition = null;
  }
  if (voiceTimeout) {
    clearTimeout(voiceTimeout);
    voiceTimeout = null;
  }
  isListening = false;
  updateMicUI(false);
}

function updateMicUI(active) {
  const micBtn   = $('micBtn');
  const micIcon  = $('micIcon');
  const micLabel = $('micLabel');
  const voiceStatus = $('voiceStatus');

  if (!micBtn) return;

  if (active) {
    micBtn.classList.add('active');
    if (micIcon)  { micIcon.className  = 'fa-solid fa-stop'; }
    if (micLabel) { micLabel.textContent = 'Stop Recording'; }
    if (voiceStatus) voiceStatus.classList.remove('hidden');
  } else {
    micBtn.classList.remove('active');
    if (micIcon)  { micIcon.className  = 'fa-solid fa-microphone'; }
    if (micLabel) { micLabel.textContent = 'Voice Input'; }
    if (voiceStatus) voiceStatus.classList.add('hidden');
  }
}

/* ─── Submit Claim ────────────────────────────────── */
async function submitClaim() {
  const textarea = $('claimInput');
  if (!textarea) return;

  const text = textarea.value.trim();
  if (!text) {
    showAlert('Please enter or speak a cardiovascular health claim first.', 'warning');
    textarea.focus();
    return;
  }
  if (text.length < 5) {
    showAlert('Your claim is too short. Please provide more detail.', 'warning');
    return;
  }

  // Stop any active voice recording
  if (isListening) stopVoice();

  // Show loading state
  setLoading(true);
  hideResult();

  try {
    const response = await fetch('/api/predict', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Prediction failed. Please try again.');
    }

    renderResult(data);

  } catch (err) {
    console.error('Prediction error:', err);
    showAlert(err.message || 'Network error. Please check your connection.', 'error');
  } finally {
    setLoading(false);
  }
}

/* ─── Loading State ───────────────────────────────── */
function setLoading(loading) {
  const submitBtn = $('submitBtn');
  if (!submitBtn) return;
  const btnText   = submitBtn.querySelector('.btn-text');
  const btnLoader = submitBtn.querySelector('.btn-loader');

  submitBtn.disabled = loading;
  if (loading) {
    btnText?.classList.add('hidden');
    btnLoader?.classList.remove('hidden');
  } else {
    btnText?.classList.remove('hidden');
    btnLoader?.classList.add('hidden');
  }
}

/* ─── Render Result ───────────────────────────────── */
function renderResult(data) {
  const { label, confidence, explanation, input } = data;

  // Badge
  const badge = $('resultBadge');
  const icon  = $('resultIcon');
  const labelEl = $('resultLabel');

  if (badge && icon && labelEl) {
    badge.className = 'result-badge';
    const cfg = {
      'True':      { cls: 'true-badge',      ico: 'fa-solid fa-circle-check',    text: 'TRUE'      },
      'False':     { cls: 'false-badge',     ico: 'fa-solid fa-circle-xmark',    text: 'FALSE'     },
      'Uncertain': { cls: 'uncertain-badge', ico: 'fa-solid fa-circle-question', text: 'UNCERTAIN' },
    };
    const c = cfg[label] || cfg['Uncertain'];
    badge.classList.add(c.cls);
    icon.className   = c.ico;
    labelEl.textContent = c.text;
  }

  // Confidence bar
  const pct = Math.round((confidence || 0) * 100);
  const bar = $('confidenceBar');
  const pctEl = $('confidencePct');
  if (bar) {
    bar.style.width = '0%';
    // Animate after render
    setTimeout(() => { bar.style.width = pct + '%'; }, 100);
  }
  if (pctEl) pctEl.textContent = pct + '%';

  // Claim echo
  const claimEl = $('resultClaim');
  if (claimEl) claimEl.textContent = `"${input || ''}"`;

  // Explanation
  const expEl = $('resultExplanation');
  if (expEl) expEl.textContent = explanation || 'No explanation provided.';

  // Show result section
  const section = $('resultSection');
  if (section) {
    section.classList.remove('hidden');
    // Smooth scroll to result
    setTimeout(() => {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
}

/* ─── Hide Result ─────────────────────────────────── */
function hideResult() {
  const section = $('resultSection');
  if (section) section.classList.add('hidden');
}

/* ─── Reset Form ──────────────────────────────────── */
function resetForm() {
  hideResult();
  const textarea = $('claimInput');
  if (textarea) {
    textarea.value = '';
    textarea.dispatchEvent(new Event('input'));
    textarea.focus();
  }
  // Scroll back to input
  const inputSection = document.querySelector('.input-section');
  if (inputSection) inputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ─── Alert Toast ─────────────────────────────────── */
function showAlert(message, type = 'info') {
  // Remove any existing alert
  document.querySelectorAll('.cardioai-alert').forEach(a => a.remove());

  const colors = {
    info:    { bg: 'var(--primary-light)', color: 'var(--primary-dark)', icon: 'fa-circle-info' },
    warning: { bg: 'var(--orange-light)',  color: '#92400e',              icon: 'fa-triangle-exclamation' },
    error:   { bg: 'var(--red-light)',     color: '#991b1b',              icon: 'fa-circle-exclamation' },
    success: { bg: 'var(--green-light)',   color: '#065f46',              icon: 'fa-circle-check' },
  };
  const c = colors[type] || colors.info;

  const alert = document.createElement('div');
  alert.className = 'cardioai-alert';
  alert.style.cssText = `
    position: fixed; top: 80px; right: 24px; z-index: 9999;
    display: flex; align-items: center; gap: 12px;
    background: ${c.bg}; color: ${c.color};
    padding: 14px 20px; border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,.15);
    font-size: .9rem; font-weight: 500; max-width: 380px;
    animation: slideInRight .3s cubic-bezier(.4,0,.2,1);
  `;
  alert.innerHTML = `<i class="fa-solid ${c.icon}" style="flex-shrink:0"></i><span>${message}</span>`;
  document.body.appendChild(alert);

  // Inject keyframe if needed
  if (!document.querySelector('#alertKeyframe')) {
    const style = document.createElement('style');
    style.id = 'alertKeyframe';
    style.textContent = '@keyframes slideInRight { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }';
    document.head.appendChild(style);
  }

  setTimeout(() => {
    alert.style.opacity = '0';
    alert.style.transform = 'translateX(40px)';
    alert.style.transition = 'all .3s ease';
    setTimeout(() => alert.remove(), 350);
  }, 4000);
}

/* ─── Scroll Animations ───────────────────────────── */
function observeAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity  = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  // Animate cards on scroll
  document.querySelectorAll(
    '.feature-card, .training-step, .tech-card, .biobert-card, .feature-big-card, .ft-item'
  ).forEach(el => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity .5s ease, transform .5s ease';
    observer.observe(el);
  });
}
