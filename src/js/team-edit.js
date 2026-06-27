/* ===== MODIFICATION D'ÉQUIPE (pendant le jeu) ===== */

function openEditTeamModal() {
  // Pré-remplir le nom actuel
  const nameInput = document.getElementById('playTeamNameInput');
  if (nameInput) nameInput.value = state.teamName || '';
  renderPlayChips();
  openModal('editTeamModal');
}

function renderPlayChips() {
  const el = document.getElementById('playMemberChips');
  el.innerHTML = '';
  state.members.forEach((m, i) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = escHTML(m) + ' <span class="remove" onclick="removePlayMember(' + i + ')">×</span>';
    el.appendChild(chip);
  });
}

function addPlayMember() {
  const inp = document.getElementById('playMemberInput');
  const v   = inp.value.trim();
  if (!v) return;
  state.members.push(v);
  inp.value = '';
  renderPlayChips();
}

function removePlayMember(i) { state.members.splice(i, 1); renderPlayChips(); }

async function saveTeamMembers() {
  const nameInput = document.getElementById('playTeamNameInput');
  const newName   = nameInput ? nameInput.value.trim() : '';

  try {
    // Mettre à jour membres
    await api('/join', {
      method: 'POST',
      body: { teamId: state.teamId, captainName: state.captainName, captainPhone: state.captainPhone, members: state.members },
    });

    // Renommer si nécessaire
    if (newName && newName !== state.teamName) {
      const r = await fetch('/api/chasse/teams/' + encodeURIComponent(state.teamId) + '/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-team-id': state.teamId },
        body: JSON.stringify({ name: newName }),
      });
      if (r.ok) {
        const d = await r.json();
        state.teamName = d.name;
        document.getElementById('playTeamName').textContent = state.teamName;
      }
    }

    saveSession();
    closeAllModals();
    toast('Équipe mise à jour !', 'success');
  } catch(e) { toast(e.message); }
}
