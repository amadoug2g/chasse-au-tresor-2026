/* ===== AIDE ===== */

function showHelpPanel() {
  document.getElementById('helpMessage').value = '';
  document.getElementById('helpCharCount').textContent = '0';
  openModal('helpModal');
}

document.addEventListener('input', e => {
  if (e.target.id === 'helpMessage') {
    document.getElementById('helpCharCount').textContent = e.target.value.length;
  }
});

async function submitHelpRequest() {
  const msg = document.getElementById('helpMessage').value.trim();
  if (!msg) { toast('Écris un message avant d\'envoyer.'); return; }
  try {
    await api('/help', { method: 'POST', body: { teamId: state.teamId, message: msg } });
    closeModal();
    toast('Message envoyé aux organisateurs ✅', 'success');
  } catch(e) { toast(e.message); }
}
