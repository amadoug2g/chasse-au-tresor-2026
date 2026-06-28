/* ===== ADMIN ===== */

// Login : le mot de passe est validé par le serveur (plus de vérification client)
async function adminLogin() {
  const pass = document.getElementById('adminPass').value;
  if (!pass) { toast('Entre le mot de passe'); return; }
  adminPass = pass;
  try {
    await api('/teams', { admin: true });
    showView('dashboard');
  } catch(_) {
    adminPass = '';
    toast('Mot de passe incorrect');
  }
}

function adminLogout() {
  adminPass = '';
  stopAdminPoll();
  showView('home');
}

function startAdminPoll()  { stopAdminPoll(); pollAdmin(); adminPollTimer = setInterval(pollAdmin, 10000); }
function stopAdminPoll()   { if (adminPollTimer) { clearInterval(adminPollTimer); adminPollTimer = null; } }

async function pollAdmin() {
  try {
    const [teamData, notifData] = await Promise.all([
      api('/teams', { admin: true }),
      api('/notifications', { admin: true }),
    ]);
    window._adminTeams  = teamData.teams  || [];
    window._adminNotifs = notifData.notifications || [];
    renderActiveTab();
    updateAlertBadge();
    updateSessionBtn();
  } catch(e) { console.error('Admin poll error', e); }
}

/* Session control (cosmétique) */
function toggleSession() {
  const active = localStorage.getItem('chasse_session_active') === 'true';
  localStorage.setItem('chasse_session_active', active ? 'false' : 'true');
  updateSessionBtn();
}
function updateSessionBtn() {
  const btn = document.getElementById('sessionBtn');
  if (!btn) return;
  const active = localStorage.getItem('chasse_session_active') === 'true';
  btn.className = active ? 'ah-btn ah-btn-stop' : 'ah-btn ah-btn-start';
  btn.innerHTML = active ? '● SESSION ACTIVE' : '▶ DEMARRER';
}

/* Onglets */
function switchAdminTab(el) {
  stopAdminScan();
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  activeAdminTab = el.getAttribute('data-tab');
  renderActiveTab();
}
function renderActiveTab() {
  const body   = document.getElementById('adminBody');
  if (!body) return;
  const teams  = window._adminTeams  || [];
  const notifs = window._adminNotifs || [];
  switch (activeAdminTab) {
    case 'tab-dashboard':  renderTabDashboard(body, teams, notifs); break;
    case 'tab-equipes':    renderTabEquipes(body, teams);            break;
    case 'tab-enigmes':    renderTabEnigmes(body);                   break;
    case 'tab-alertes':    renderTabAlertes(body, notifs);           break;
    case 'tab-classement': renderTabClassement(body, teams);         break;
  }
}
function updateAlertBadge() {
  const notifs = window._adminNotifs || [];
  const unread = notifs.filter(n => !n.read).length;
  const badge  = document.getElementById('alertTabBadge');
  if (badge) {
    if (unread > 0) { badge.style.display = 'inline'; badge.textContent = unread; }
    else badge.style.display = 'none';
  }
}

/* ---- Tableau de bord ---- */
function renderTabDashboard(body, teams, notifs) {
  const running  = teams.filter(t => t.startedAt && !t.finishedAt);
  const finished = teams.filter(t => t.finishedAt);
  const unread   = notifs.filter(n => !n.read).length;
  let avgTime = '-';
  if (finished.length) {
    const totalMs = finished.reduce((s, t) => s + (new Date(t.finishedAt) - new Date(t.startedAt)), 0);
    avgTime = formatDuration(totalMs / finished.length);
  }
  let html = '<div class="kpi-row">';
  html += '<div class="kpi-card"><div class="kpi-value">' + running.length + '</div><div class="kpi-label">En course</div></div>';
  html += '<div class="kpi-card"><div class="kpi-value">' + finished.length + '</div><div class="kpi-label">Terminées</div></div>';
  html += '<div class="kpi-card"><div class="kpi-value">' + avgTime + '</div><div class="kpi-label">Temps moyen</div></div>';
  html += '<div class="kpi-card' + (unread > 0 ? ' alert' : '') + '"><div class="kpi-value">' + unread + '</div><div class="kpi-label">Alertes 🔔</div></div>';
  html += '</div><div class="admin-cards">';
  if (!teams.length) { html += '<p style="text-align:center;color:var(--text-muted);margin-top:20px">Aucune équipe</p>'; }
  teams.forEach(t => { html += _teamCard(t); });
  html += '</div>';
  body.innerHTML = html;
}

function _teamCard(t) {
  const step    = t.currentStep || 0;
  const pct     = step / 10 * 100;
  const color   = t.color || '#999';
  const captain = typeof t.captain === 'object' ? (t.captain && t.captain.name || 'N/A') : (t.captain || '—');
  const phone   = (typeof t.captain === 'object' && t.captain && t.captain.phone) || '';
  let badge = '', status = '';
  if (t.finishedAt) {
    badge  = '<span class="ac-badge done">TERMINÉ</span>';
    status = 'Terminé en ' + formatDuration(new Date(t.finishedAt) - new Date(t.startedAt));
  } else if (t.startedAt) {
    badge  = '<span class="ac-badge running">EN COURSE</span>';
    status = 'Énigme ' + step + '/10 en cours';
  } else {
    badge  = '<span class="ac-badge waiting">EN ATTENTE</span>';
    status = 'En attente';
  }
  let elapsed = '';
  if (t.startedAt && !t.finishedAt) elapsed = formatDuration(Date.now() - new Date(t.startedAt));
  else if (t.finishedAt && t.startedAt) elapsed = formatDuration(new Date(t.finishedAt) - new Date(t.startedAt));

  let html = '<div class="admin-card"><div class="admin-card-body">';
  html += '<div class="ac-name"><span class="ac-dot" style="background:' + escHTML(colorBg(color, t.color2, t.pattern)) + '"></span>' + escHTML(t.name || 'Sans nom') + '</div>';
  html += '<div class="ac-captain">' + escHTML(captain);
  if (phone) html += ' &middot; <a href="tel:' + escHTML(phone) + '">📞 ' + escHTML(phone) + '</a>';
  html += '</div><div style="margin:8px 0">' + badge + '</div>';
  html += '<div class="ac-status">' + status + '</div>';
  html += '<div class="progress-track" style="margin-top:8px"><div class="progress-fill" style="transform:scaleX(' + (pct / 100) + ');background:' + escHTML(color) + '"></div></div>';
  if (elapsed) html += '<div class="ac-elapsed">⏱ ' + elapsed + '</div>';
  html += '<div class="ac-footer">';
  html += '<button class="ac-detail-btn" onclick="showTeamMembers(\'' + escHTML(t.id || '') + '\')">Détails</button>';
  html += '<div style="display:flex;gap:8px;align-items:center">';
  if (!t.finishedAt && t.startedAt) {
    html += '<button class="btn btn-secondary" style="min-height:32px;font-size:12px;padding:0 10px;width:auto" onclick="adminAdvanceTeam(\'' + escHTML(t.id || '') + '\')">🔓 +1</button>';
  }
  html += '<button class="ac-delete" onclick="deleteTeam(\'' + escHTML(t.id || '') + '\')">🗑️</button>';
  html += '</div></div></div></div>';
  return html;
}

/* ---- Équipes ---- */
function renderTabEquipes(body, teams) {
  let html = '<button class="btn btn-primary" onclick="openModal(\'addTeamModal\')" style="margin-bottom:16px;width:100%">+ Ajouter une équipe</button>';
  if (!teams.length) { html += '<p style="text-align:center;color:var(--text-muted)">Aucune équipe</p>'; }
  teams.forEach(t => {
    const color   = t.color || '#999';
    const captain = typeof t.captain === 'object' ? (t.captain && t.captain.name || 'N/A') : (t.captain || '—');
    html += '<div class="team-list-item">';
    html += '<div class="team-list-name"><span class="ac-dot" style="background:' + escHTML(colorBg(color, t.color2, t.pattern)) + '"></span>' + escHTML(t.name || 'Sans nom') + '</div>';
    html += '<div style="display:flex;gap:6px">';
    html += '<button class="btn btn-secondary" style="min-height:32px;font-size:12px;padding:0 10px;width:auto" onclick="promptRenameTeam(\'' + escHTML(t.id) + '\',\'' + escHTML(t.name) + '\')">Renommer</button>';
    html += '<button class="ac-delete" onclick="deleteTeam(\'' + escHTML(t.id || '') + '\')">🗑️</button>';
    html += '</div>';
    html += '<div class="team-list-meta">Capitaine : ' + escHTML(captain) + '</div>';
    const members = t.members || [];
    if (members.length) {
      html += '<div class="team-list-members">';
      members.forEach(m => { html += '<span class="member-chip">' + escHTML(m) + '</span>'; });
      html += '</div>';
    }
    // Route : séquence des énigmes avec étape courante mise en valeur
    if (t.route && t.route.length) {
      const completed = new Set(t.completedSteps || []);
      html += '<div class="team-route">';
      t.route.forEach((enigmaNum, idx) => {
        const stepNum = idx + 1;
        const isCurrent = !t.finishedAt && stepNum === t.currentStep;
        const isDone    = completed.has(stepNum) || t.finishedAt;
        const cls = isCurrent ? 'route-step current' : isDone ? 'route-step done' : 'route-step';
        const dotStyle = isCurrent ? 'background:' + escHTML(t.color || '#999') + ';color:#fff' : '';
        html += '<span class="' + cls + '"' + (dotStyle ? ' style="' + dotStyle + '"' : '') + '>' + enigmaNum + '</span>';
      });
      html += '</div>';
    }
    html += '</div>';
  });
  body.innerHTML = html;
}

/* ---- Énigmes ---- */
let _adminEnigmasData = null; // cache {n,title,text,hint,qr,isImageOnly,imageRef,modified}
let _adminScanStream = null;
let _adminScanLoop = null;
let _enigmaEditOpen = false;

async function _fetchAdminEnigmas(force) {
  if (_adminEnigmasData && !force) return _adminEnigmasData;
  try {
    const data = await api('/admin/enigmas', { admin: true });
    _adminEnigmasData = data.enigmas || [];
    return _adminEnigmasData;
  } catch(_) { return []; }
}

function renderTabEnigmes(body) {
  if (_adminScanStream) return;   // Ne pas interrompre un scan en cours
  if (_enigmaEditOpen) return;    // Ne pas interrompre une édition en cours
  if (typeof ENIGMAS_DISPLAY === 'undefined') { body.innerHTML = '<p>Données indisponibles</p>'; return; }
  let html = '<div class="enigma-scan-tester">';
  html += '<div style="font-weight:700;font-size:14px;margin-bottom:10px">🔍 Vérifier un QR code</div>';
  html += '<div style="display:flex;gap:8px;margin-bottom:8px">';
  html += '<button class="btn btn-secondary" id="adminScanBtn" style="min-height:42px;width:auto;padding:0 14px;flex-shrink:0" onclick="startAdminScan()">📷 Scanner</button>';
  html += '<input id="adminQrInput" class="enigma-test-input" type="text" placeholder="…ou colle le code ici" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" onkeydown="if(event.key===\'Enter\')verifyAdminQr()">';
  html += '<button class="btn btn-primary" style="min-height:42px;width:auto;padding:0 14px;flex-shrink:0" onclick="verifyAdminQr()">OK</button>';
  html += '</div>';
  html += '<div id="adminScanArea" style="display:none;margin-bottom:8px;position:relative">';
  html += '<video id="adminScanVideo" playsinline autoplay muted style="width:100%;border-radius:8px;display:block"></video>';
  html += '<button onclick="stopAdminScan()" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:20px;padding:6px 12px;font-size:13px;cursor:pointer">✕ Arrêter</button>';
  html += '</div>';
  html += '<div id="adminQrResult" class="enigma-test-result"></div>';
  html += '</div>';
  ENIGMAS_DISPLAY.forEach(e => {
    html += '<div class="enigma-preview-card" id="enigma-card-' + e.n + '">';
    html += '<div class="enigma-preview-header">';
    html += '<span class="enigma-preview-num">' + e.n + '</span>';
    html += '<span id="enigma-title-display-' + e.n + '">' + escHTML(e.title || '(image)') + '</span>';
    html += '<button class="enigma-edit-btn" onclick="openEnigmaEdit(' + e.n + ')">✏️</button>';
    html += '</div>';
    if (e.isImageOnly && e.imageRef) {
      const img = document.getElementById('enigma-img-' + e.imageRef);
      if (img) html += '<img src="' + img.src + '" style="width:100%;border-radius:6px;margin-top:8px" alt="Énigme ' + e.n + '">';
      else html += '<p style="color:var(--text-muted);font-size:13px">Image non trouvée</p>';
    } else {
      html += '<div id="enigma-text-display-' + e.n + '" class="enigma-preview-text">' + escHTML(e.text || '') + '</div>';
    }
    if (e.hint) html += '<div id="enigma-hint-display-' + e.n + '" class="enigma-preview-hint">💡 ' + escHTML(e.hint) + '</div>';
    // Formulaire d'édition (caché par défaut)
    html += '<div id="enigma-edit-' + e.n + '" class="enigma-edit-form" style="display:none">';
    html += '<label class="enigma-edit-label">Titre</label>';
    html += '<input id="enigma-f-title-' + e.n + '" class="input-field" type="text" style="margin-bottom:10px;font-size:14px">';
    if (!e.isImageOnly) {
      html += '<label class="enigma-edit-label">Texte</label>';
      html += '<textarea id="enigma-f-text-' + e.n + '" class="enigma-edit-textarea"></textarea>';
    }
    html += '<label class="enigma-edit-label">Indice</label>';
    html += '<input id="enigma-f-hint-' + e.n + '" class="input-field" type="text" style="margin-bottom:12px;font-size:14px">';
    html += '<div style="display:flex;gap:8px">';
    html += '<button class="btn btn-primary" style="flex:1" onclick="saveEnigmaEdit(' + e.n + ')">💾 Sauvegarder</button>';
    html += '<button class="btn btn-secondary" style="flex:1" onclick="closeEnigmaEdit(' + e.n + ')">Annuler</button>';
    html += '</div><div id="enigma-edit-status-' + e.n + '" style="font-size:13px;margin-top:8px"></div>';
    html += '</div>';
    html += '</div>';
  });
  body.innerHTML = html;
  _fetchAdminEnigmas().then(_applyEnigmaOverlays);
}

function _applyEnigmaOverlays(list) {
  (list || []).forEach(e => {
    const titleEl = document.getElementById('enigma-title-display-' + e.n);
    const textEl  = document.getElementById('enigma-text-display-'  + e.n);
    const hintEl  = document.getElementById('enigma-hint-display-'  + e.n);
    if (titleEl) titleEl.textContent = e.title || '(image)';
    if (textEl)  textEl.textContent  = e.text  || '';
    if (hintEl) {
      if (e.hint) { hintEl.textContent = '💡 ' + e.hint; hintEl.style.display = ''; }
      else hintEl.style.display = 'none';
    }
  });
}

async function verifyAdminQr() {
  const input  = document.getElementById('adminQrInput');
  const result = document.getElementById('adminQrResult');
  if (!input || !result) return;
  const code = (input.value || '').trim();
  if (!code) { result.textContent = ''; result.className = 'enigma-test-result'; return; }
  result.textContent = '⏳…';
  result.className = 'enigma-test-result';
  const qrList = await _fetchAdminEnigmas();
  if (!qrList.length) { result.textContent = '❌ Données inaccessibles'; result.className = 'enigma-test-result error'; return; }
  const found = qrList.find(q => q.qr.toUpperCase() === code.toUpperCase());
  if (found) {
    const title = found.title ? ' — ' + escHTML(found.title) : '';
    result.innerHTML = '✅ Énigme ' + found.n + title;
    result.className = 'enigma-test-result success';
  } else {
    result.textContent = '❌ Code non reconnu';
    result.className = 'enigma-test-result error';
  }
}

async function openEnigmaEdit(n) {
  const form = document.getElementById('enigma-edit-' + n);
  if (!form) return;
  _enigmaEditOpen = true;
  // Charge les valeurs actuelles (avec overrides éventuels)
  const list = await _fetchAdminEnigmas();
  const data = list.find(e => e.n === n) || {};
  const titleIn = document.getElementById('enigma-f-title-' + n);
  const textIn  = document.getElementById('enigma-f-text-'  + n);
  const hintIn  = document.getElementById('enigma-f-hint-'  + n);
  if (titleIn) titleIn.value = data.title || '';
  if (textIn)  textIn.value  = data.text  || '';
  if (hintIn)  hintIn.value  = data.hint  || '';
  form.style.display = 'block';
  if (titleIn) titleIn.focus();
}

function closeEnigmaEdit(n) {
  const form = document.getElementById('enigma-edit-' + n);
  if (form) form.style.display = 'none';
  _enigmaEditOpen = false;
}

async function saveEnigmaEdit(n) {
  const titleIn = document.getElementById('enigma-f-title-' + n);
  const textIn  = document.getElementById('enigma-f-text-'  + n);
  const hintIn  = document.getElementById('enigma-f-hint-'  + n);
  const status  = document.getElementById('enigma-edit-status-' + n);
  const body = {};
  if (titleIn) body.title = titleIn.value;
  if (textIn)  body.text  = textIn.value;
  if (hintIn)  body.hint  = hintIn.value;
  if (status) { status.textContent = '⏳ Sauvegarde…'; status.style.color = 'var(--text-muted)'; }
  try {
    await api('/admin/enigmas/' + n, { method: 'POST', admin: true, body });
    _adminEnigmasData = null; // invalide le cache
    if (status) { status.textContent = '✅ Sauvegardé !'; status.style.color = '#16a34a'; }
    _fetchAdminEnigmas(true).then(_applyEnigmaOverlays); // affiche les nouvelles valeurs
    setTimeout(() => closeEnigmaEdit(n), 800);
  } catch(e) {
    if (status) { status.textContent = '❌ ' + e.message; status.style.color = 'var(--danger)'; }
  }
}

async function startAdminScan() {
  const area  = document.getElementById('adminScanArea');
  const video = document.getElementById('adminScanVideo');
  if (!area || !video) return;
  try {
    _adminScanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    video.srcObject = _adminScanStream;
    area.style.display = 'block';
    const btn = document.getElementById('adminScanBtn');
    if (btn) btn.style.display = 'none';
    _fetchAdminEnigmas(); // précharge pendant que la caméra démarre
    _adminScanLoop = requestAnimationFrame(_scanAdminFrame);
  } catch(e) {
    const msg = e.name === 'NotAllowedError' ? 'Permission caméra refusée' : 'Caméra indisponible : ' + e.message;
    toast(msg);
  }
}

function _scanAdminFrame() {
  const video = document.getElementById('adminScanVideo');
  if (!video || !_adminScanStream) return;
  if (video.readyState >= 2) {
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = typeof jsQR === 'function'
        ? jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
        : null;
      if (code && code.data) {
        stopAdminScan();
        const input = document.getElementById('adminQrInput');
        if (input) { input.value = code.data; verifyAdminQr(); }
        return;
      }
    } catch(_) {}
  }
  _adminScanLoop = requestAnimationFrame(_scanAdminFrame);
}

function stopAdminScan() {
  if (_adminScanLoop) { cancelAnimationFrame(_adminScanLoop); _adminScanLoop = null; }
  if (_adminScanStream) { _adminScanStream.getTracks().forEach(t => t.stop()); _adminScanStream = null; }
  const area = document.getElementById('adminScanArea');
  if (area) area.style.display = 'none';
  const btn = document.getElementById('adminScanBtn');
  if (btn) btn.style.display = '';
}

/* ---- Alertes ---- */
function renderTabAlertes(body, notifs) {
  let html = '<button class="btn btn-secondary" onclick="markAllRead()" style="margin-bottom:16px;width:100%">Tout marquer lu</button>';
  if (!notifs.length) { html += '<p style="text-align:center;color:var(--text-muted);padding:20px">Aucune notification</p>'; body.innerHTML = html; return; }
  const teams = window._adminTeams || [];
  notifs.forEach(n => {
    const isUnread = !n.read;
    let icon = '📣';
    if (n.type === 'help')      icon = '🆘';
    else if (n.type === 'finish')    icon = '🏆';
    else if (n.type === 'milestone') icon = '📍';
    else if (n.type === 'join')      icon = '👋';
    else if (n.type === 'advance')   icon = '🔓';
    let borderColor = 'var(--border)';
    if (n.teamId) { const team = teams.find(t => t.id === n.teamId); if (team && team.color) borderColor = team.color; }
    html += '<div class="notif-feed-item' + (isUnread ? ' unread' : '') + '" style="border-left-color:' + borderColor + '">';
    html += '<div class="notif-feed-icon">' + icon + '</div>';
    html += '<div class="notif-feed-msg">' + escHTML(n.message || '') + '</div>';
    html += '<div class="notif-feed-time">' + timeAgo(n.ts) + '</div></div>';
  });
  body.innerHTML = html;
}

/* ---- Classement ---- */
function renderTabClassement(body, teams) {
  const sorted = teams.slice().sort((a, b) => {
    if (a.finishedAt && !b.finishedAt) return -1;
    if (!a.finishedAt && b.finishedAt) return 1;
    if (a.finishedAt && b.finishedAt)  return new Date(a.finishedAt) - new Date(b.finishedAt);
    const sa = (a.completedSteps || []).length || (a.currentStep || 0);
    const sb = (b.completedSteps || []).length || (b.currentStep || 0);
    return sb - sa;
  });
  if (!sorted.length) { body.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px">Aucune équipe</p>'; return; }
  let html = '';
  sorted.forEach((t, i) => {
    const rank   = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '' + (i + 1);
    const color  = t.color || '#999';
    const step   = t.currentStep || 0;
    const pct    = step / 10 * 100;
    const cap    = typeof t.captain === 'object' ? (t.captain && t.captain.name || 'N/A') : (t.captain || '—');
    let detail   = '';
    if (t.finishedAt && t.startedAt) detail = 'Terminé en ' + formatDuration(new Date(t.finishedAt) - new Date(t.startedAt));
    else if (t.startedAt) detail = 'Énigme ' + step + '/10';
    else detail = 'Pas commencé';
    html += '<div class="lb-full-item">';
    html += '<div class="lb-full-rank">' + rank + '</div>';
    html += '<div class="lb-full-info">';
    html += '<div class="lb-full-name" style="color:' + escHTML(color) + '">' + escHTML(t.name || 'Sans nom') + '</div>';
    html += '<div class="lb-full-detail">' + escHTML(cap) + ' • ' + detail + '</div>';
    html += '<div class="lb-full-bar"><div class="lb-full-fill" style="width:' + pct + '%;background:' + escHTML(color) + '"></div></div>';
    html += '</div></div>';
  });
  body.innerHTML = html;
}

/* Helpers admin */
function formatDuration(ms) {
  if (!ms || ms < 0) return '-';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return h + 'h' + String(m).padStart(2, '0') + 'm' + String(s).padStart(2, '0') + 's';
  return m + 'min' + String(s).padStart(2, '0') + 's';
}
function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60)    return diff + 's';
  if (diff < 3600)  return Math.floor(diff / 60) + 'min';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  return Math.floor(diff / 86400) + 'j';
}
function showTeamMembers(teamId) {
  const t = (window._adminTeams || []).find(x => x.id === teamId);
  if (!t) { toast('Équipe introuvable'); return; }
  const members = t.members || [];
  toast(t.name + ': ' + (members.length ? members.join(', ') : 'Aucun membre'), 'success');
}

// deleteTeam — câble sur DELETE /api/chasse/teams/:id
async function deleteTeam(teamId) {
  if (!confirm('Supprimer cette équipe ?')) return;
  try {
    await api('/teams/' + encodeURIComponent(teamId), { method: 'DELETE', admin: true });
    pollAdmin();
    toast('Équipe supprimée', 'success');
  } catch(e) { toast(e.message); }
}

// Avancement secours orga (+1 étape)
async function adminAdvanceTeam(teamId) {
  if (!confirm('Avancer l\'équipe d\'une étape ?')) return;
  try {
    await api('/admin/advance', { method: 'POST', admin: true, body: { teamId } });
    pollAdmin();
    toast('Équipe avancée !', 'success');
  } catch(e) { toast(e.message); }
}

// Renommer depuis l'onglet Équipes
async function promptRenameTeam(teamId, currentName) {
  const newName = prompt('Nouveau nom pour ' + currentName + ' :', currentName);
  if (!newName || newName.trim() === currentName) return;
  try {
    await api('/teams/' + encodeURIComponent(teamId) + '/rename', {
      method: 'POST', admin: true, body: { name: newName.trim() },
    });
    pollAdmin();
    toast('Équipe renommée !', 'success');
  } catch(e) { toast(e.message); }
}

/* Modales admin */
function renderNotifs() {
  const notifs = window._adminNotifs || [];
  const el     = document.getElementById('notifList');
  if (!notifs.length) { el.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">Aucune notification</p>'; return; }
  el.innerHTML = '';
  notifs.forEach(n => {
    const item = document.createElement('div');
    item.className = 'notif-item';
    item.innerHTML = `<div class="notif-dot" style="background:${n.read ? 'var(--border)' : 'var(--brand)'}"></div><div class="notif-msg">${escHTML(n.message)}</div><div class="notif-time">${timeAgo(n.ts)}</div>`;
    el.appendChild(item);
  });
}
function renderLeaderboard() {
  const teams = (window._adminTeams || []).slice().sort((a, b) => {
    if (a.finishedAt && !b.finishedAt) return -1;
    if (!a.finishedAt && b.finishedAt) return 1;
    if (a.finishedAt && b.finishedAt) return new Date(a.finishedAt) - new Date(b.finishedAt);
    return (b.currentStep || 0) - (a.currentStep || 0);
  });
  const el = document.getElementById('leaderboard');
  el.innerHTML = '';
  teams.forEach((t, i) => {
    const item = document.createElement('div');
    item.className = 'lb-item';
    const rank   = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '' + (i + 1);
    const detail = t.finishedAt ? 'Terminé' : 'Énigme ' + (t.currentStep || 0) + '/10';
    item.innerHTML = `<div class="lb-rank">${rank}</div><div class="lb-info"><div class="lb-name" style="color:${escHTML(t.color)}">${escHTML(t.name)}</div><div class="lb-detail">${detail}</div></div>`;
    el.appendChild(item);
  });
}
async function renderColorGrid() {
  const el = document.getElementById('colorGrid');
  el.innerHTML = '<div class="spinner"></div>';
  selectedColorId = null;
  try {
    const data       = await api('/config');
    const usedColors = (data.teams || []).map(t => t.color);
    el.innerHTML = '';
    (data.colors || []).forEach(c => {
      const circle = document.createElement('div');
      circle.className = 'color-circle';
      if (usedColors.includes(c.hex)) circle.classList.add('used');
      circle.style.background = colorBg(c.hex, c.hex2, c.pattern);
      circle.onclick = () => {
        document.querySelectorAll('.color-circle').forEach(x => x.classList.remove('selected'));
        circle.classList.add('selected');
        selectedColorId = c.id;
      };
      el.appendChild(circle);
    });
  } catch(e) { el.innerHTML = '<p style="color:var(--danger)">Erreur</p>'; }
}
async function createTeam() {
  if (!selectedColorId) { toast('Choisis une couleur'); return; }
  try {
    await api('/teams', {
      method: 'POST', admin: true,
      body: { colorId: selectedColorId, name: document.getElementById('newTeamName').value.trim() || undefined },
    });
    closeAllModals();
    document.getElementById('newTeamName').value = '';
    pollAdmin();
    toast('Équipe créée !', 'success');
  } catch(e) { toast(e.message); }
}
async function markAllRead() {
  try { await api('/notifications/read', { method: 'POST', admin: true }); pollAdmin(); renderNotifs(); }
  catch(e) { toast(e.message); }
}

// Compat stubs
function renderAdminCards() {}
function renderNotifBadge() { updateAlertBadge(); }
