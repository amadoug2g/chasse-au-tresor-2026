/* ===== SESSION & PLAY ===== */

async function loadSession() {
  try {
    const data = await api('/session/' + state.teamId);
    state.teamName    = data.name;
    state.teamColor   = data.color;
    state.currentStep = data.currentStep;
    state.totalSteps  = data.totalSteps;
    state.finished    = !!data.finished;
    state.members     = data.members || state.members;
    state.captainName = (typeof data.captain === 'object' ? (data.captain && data.captain.name || '') : data.captain) || state.captainName;
    saveSession();
    if (state.finished || (data.display && data.display.finished)) {
      showFinish();
    } else {
      showPlay(data.display);
    }
  } catch(_) {
    clearSession();
    showView('home');
  }
}

function showPlay(display) {
  showView('play');
  renderDisplay(display);
}

// Autorité unique d'affichage : reçoit l'objet display du serveur.
function renderDisplay(display) {
  if (!display) return;
  window._currentDisplay = display;

  document.getElementById('playDot').style.background    = state.teamColor;
  document.getElementById('playTeamName').textContent    = state.teamName;
  document.getElementById('playStep').textContent        = display.stepLabel;
  document.getElementById('playProgress').style.transform = 'scaleX(' + (display.progressPct / 100) + ')';

  const card    = document.getElementById('enigmaCard');
  const scanBtn = document.getElementById('scanBtn');

  if (display.isImageOnly) {
    const imgEl  = document.getElementById('enigma-img-' + display.imageRef);
    const imgSrc = imgEl ? imgEl.src : '';
    card.innerHTML = '<div class="enigma-title">' + escHTML(display.stepLabel) + '</div>' +
      (imgSrc ? '<img class="enigma-img" src="' + imgSrc + '" alt="Énigme">' : '');
    scanBtn.style.display = 'flex';
  } else {
    let html = '<div class="enigma-title">' + escHTML(display.title || display.stepLabel) + '</div>';
    html += '<div class="enigma-text">' + escHTML(display.text || '') + '</div>';
    html += '<div style="margin-top:16px"><button class="btn btn-secondary" style="min-height:40px;font-size:14px" onclick="showHelpPanel()">Besoin d\'aide ?</button></div>';
    if (display.hasAnswer) {
      html += '<div class="answer-section"><input class="input-field" id="answerInput" placeholder="Ta réponse"><button class="btn btn-secondary" style="margin-top:10px" onclick="checkAnswer()">Vérifier</button></div>';
      scanBtn.style.display = 'none';
    } else {
      scanBtn.style.display = 'flex';
    }
    card.innerHTML = html;
  }
}

// Réponse texte (énigme 5) — validation 100% serveur
async function checkAnswer() {
  const val = document.getElementById('answerInput') ? document.getElementById('answerInput').value.trim() : '';
  if (!val) { toast('Entre ta réponse'); return; }
  await _doValidate({ teamId: state.teamId, answer: val });
}

// Validation QR code
async function validateQR(qrCode) {
  await _doValidate({ teamId: state.teamId, qrCode: normQR(qrCode) });
}

async function _doValidate(body) {
  try {
    const data = await api('/validate', { method: 'POST', body });
    if (data.ok) {
      state.currentStep = data.display.stepIndex;
      saveSession();
      if (data.finished) {
        showSuccess('Félicitations !', () => showFinish());
      } else {
        showSuccess('Bonne réponse !', () => renderDisplay(data.display));
      }
    } else {
      toast(data.message || 'Code incorrect');
    }
  } catch(e) { toast(e.message); }
}

function showSuccess(msg, cb) {
  const ov = document.getElementById('successOverlay');
  document.getElementById('successMsg').textContent = msg;
  ov.classList.add('active');
  setTimeout(() => { ov.classList.remove('active'); if (cb) cb(); }, 1800);
}

/* ===== FINISH ===== */

function showFinish() {
  showView('finish');
  document.getElementById('finishTeam').textContent = state.teamName;
  const allMembers = [state.captainName, ...state.members].filter(Boolean);
  document.getElementById('finishMembers').textContent = allMembers.join(' · ');
  launchConfetti();
}

function launchConfetti() {
  const container = document.getElementById('finishConfetti');
  if (!container) return;
  const confDiv   = document.createElement('div');
  confDiv.className = 'confetti-container';
  container.parentElement.appendChild(confDiv);
  const colors = ['#f97316', '#34d399', '#f87171', '#60a5fa', '#fbbf24', '#a78bfa', '#fb7185'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `left:${Math.random() * 100}%;background:${colors[Math.floor(Math.random() * colors.length)]};animation-delay:${Math.random() * 2}s;width:${6 + Math.random() * 8}px;height:${6 + Math.random() * 8}px;border-radius:${Math.random() > 0.5 ? '50%' : '2px'}`;
    confDiv.appendChild(piece);
  }
  setTimeout(() => confDiv.remove(), 5000);
}
