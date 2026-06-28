/* ===== CORE — helpers partagés ===== */

let state = {
  teamId: null, captainName: '', captainPhone: '', members: [],
  currentStep: 0, totalSteps: 10,
  teamName: '', teamColor: '', teamColor2: null, teamPattern: 'solid', finished: false,
};
let selectedTeamId  = null;
let adminPass       = '';
let adminPollTimer  = null;
let selectedColorId = null;
let activeAdminTab  = 'tab-dashboard';

function escHTML(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normQR(c) { return (c || '').trim().toUpperCase(); }

// Retourne la valeur CSS background pour un bracelet (uni ou rayé)
function colorBg(hex, hex2, pattern) {
  if (pattern === 'stripe' && hex2) {
    return 'repeating-linear-gradient(45deg,' + hex + ' 0,' + hex + ' 6px,' + hex2 + ' 6px,' + hex2 + ' 12px)';
  }
  return hex;
}

function toast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type === 'success' ? ' success' : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (opts.admin) headers['x-admin-pass'] = adminPass;
  const res = await fetch('/api/chasse' + path, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: 'Erreur' }));
    throw new Error(e.error || 'Erreur');
  }
  return res.json();
}

function saveSession() {
  localStorage.setItem('chasse_session', JSON.stringify({
    teamId: state.teamId,
    captainName: state.captainName,
    captainPhone: state.captainPhone,
    members: state.members,
  }));
}

function clearSession() {
  localStorage.removeItem('chasse_session');
  state = {
    teamId: null, captainName: '', captainPhone: '', members: [],
    currentStep: 0, totalSteps: 10,
    teamName: '', teamColor: '', teamColor2: null, teamPattern: 'solid', finished: false,
  };
}

/* ===== VUES ===== */

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById(id);
  el.classList.add('active', 'view-transition-enter');
  setTimeout(() => el.classList.remove('view-transition-enter'), 300);
  history.pushState({ view: id }, null, '#' + id);
  if (id === 'join') loadTeams();
  if (id === 'dashboard') { startAdminPoll(); updateSessionBtn(); }
  else stopAdminPoll();
}

window.addEventListener('popstate', (e) => {
  if (e.state && e.state.view) {
    const id = e.state.view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (id === 'join') loadTeams();
    if (id === 'dashboard') { startAdminPoll(); updateSessionBtn(); }
    else stopAdminPoll();
  }
});

/* ===== MODALES ===== */

function openModal(id) {
  document.getElementById('modalBackdrop').classList.add('active');
  document.getElementById(id).classList.add('active');
  if (id === 'notifModal') renderNotifs();
  if (id === 'trophyModal') renderLeaderboard();
  if (id === 'addTeamModal') renderColorGrid();
}

function closeAllModals() {
  document.getElementById('modalBackdrop').classList.remove('active');
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

// Alias utilisé dans certains boutons "Annuler"
function closeModal() { closeAllModals(); }

/* ===== INIT ===== */

async function init() {
  const saved = localStorage.getItem('chasse_session');
  if (saved) {
    try {
      const s = JSON.parse(saved);
      if (s.teamId) {
        state.teamId       = s.teamId;
        state.captainName  = s.captainName  || '';
        state.captainPhone = s.captainPhone || '';
        state.members      = s.members      || [];
        await loadSession();
        return;
      }
    } catch (_) { clearSession(); }
  }
  const hash = location.hash.replace('#', '');
  if (hash === 'org' || hash === 'dashboard') showView('org');
  else showView('home');
}

init();
