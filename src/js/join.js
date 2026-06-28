/* ===== JOIN ===== */

async function loadTeams() {
  const el = document.getElementById('teamList');
  el.innerHTML = '<div class="spinner"></div>';
  document.getElementById('joinForm').style.display = 'none';
  selectedTeamId = null;
  try {
    const data = await api('/config');
    el.innerHTML = '';
    data.teams.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'team-btn' + (t.taken ? ' is-taken' : '');
      btn.innerHTML = `<div class="dot" style="background:${escHTML(t.color)}"></div><div class="tname">${escHTML(t.name)}</div>${t.taken ? '<span class="taken-badge">Prise</span>' : ''}`;
      if (!t.taken) btn.onclick = () => selectTeam(t, btn);
      el.appendChild(btn);
    });
  } catch(e) {
    el.innerHTML = '<p style="color:var(--danger)">' + escHTML(e.message) + '</p>';
  }
}

function selectTeam(t, btn) {
  document.querySelectorAll('.team-btn').forEach(b => {
    b.classList.remove('selected');
    b.style.removeProperty('--team-select-color');
  });
  btn.classList.add('selected');
  btn.style.setProperty('--team-select-color', t.color);
  selectedTeamId  = t.id;
  state.teamColor = t.color;
  state.teamName  = t.name;
  document.getElementById('joinForm').style.display = 'block';
  document.getElementById('joinForm').scrollIntoView({ behavior: 'smooth' });
}

function goToOnboarding() {
  const name  = document.getElementById('captainName').value.trim();
  const phone = document.getElementById('captainPhone').value.trim();
  if (!name)           { toast('Entre ton prénom'); return; }
  if (!phone)          { toast('Entre ton numéro'); return; }
  if (!selectedTeamId) { toast('Choisis une équipe'); return; }
  state.captainName  = name;
  state.captainPhone = phone;
  state.teamId       = selectedTeamId;
  showView('onboarding');
}

/* ===== ONBOARDING ===== */

function renderChips() {
  const el = document.getElementById('memberChips');
  el.innerHTML = '';
  state.members.forEach((m, i) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = escHTML(m) + ' <span class="remove" onclick="removeMember(' + i + ')">×</span>';
    el.appendChild(chip);
  });
}

function addMember() {
  const inp = document.getElementById('memberInput');
  const v   = inp.value.trim();
  if (!v) return;
  state.members.push(v);
  inp.value = '';
  renderChips();
}

function removeMember(i) { state.members.splice(i, 1); renderChips(); }

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.activeElement && document.activeElement.id === 'memberInput') addMember();
});

async function startGame() {
  const btn = document.getElementById('startBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div>';
  try {
    await api('/join', {
      method: 'POST',
      body: { teamId: state.teamId, captainName: state.captainName, captainPhone: state.captainPhone, members: state.members },
    });
    saveSession();
    await loadSession();
  } catch(e) {
    toast(e.message);
    btn.disabled  = false;
    btn.textContent = "C'est parti !";
  }
}
