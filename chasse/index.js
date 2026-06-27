'use strict';

const express = require('express');
const { TEAM_COLORS, ENIGMAS, ENIGMA_QR } = require('./data');
const { genRoute, currentDisplay }         = require('./routing');
const st                                   = require('./state');

function getAdminPass() {
  return process.env.CHASSE_ADMIN_PASS || 'pilotes2026';
}

function pushNotif(type, teamId, message) {
  const state = st.get();
  state.notifications.unshift({
    id:      Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    type, teamId, message,
    ts:      new Date().toISOString(),
    read:    false,
  });
  state.notifications = state.notifications.slice(0, 50);
}

function chasseAdminAuth(req, res, next) {
  const pass = req.headers['x-admin-pass'] || req.query.adminPass;
  if (pass !== getAdminPass()) return res.status(403).json({ error: 'Forbidden' });
  next();
}

function mountChasse(app) {
  app.use(express.json());
  st.load();

  // Public: version déployée
  app.get('/api/chasse/version', (req, res) => {
    try {
      const info = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'build-info.json'), 'utf8'));
      res.json(info);
    } catch(_) {
      const { version } = require('../package.json');
      res.json({ version, commit: 'unknown', builtAt: 'unknown' });
    }
  });

  // Public: config (couleurs + équipes pour l'écran de sélection)
  app.get('/api/chasse/config', (req, res) => {
    const state = st.get();
    const teams = Object.values(state.teams).map(t => ({
      id: t.id, name: t.name, color: t.color, colorName: t.colorName,
      taken: !!(t.captain && t.captain.name),
    }));
    res.json({ teams, colors: TEAM_COLORS });
  });

  // Public: session (reconnexion)
  app.get('/api/chasse/session/:teamId', (req, res) => {
    const state = st.get();
    const t = state.teams[req.params.teamId];
    if (!t) return res.status(404).json({ error: 'Équipe introuvable' });
    const display = currentDisplay(t);
    res.json({
      id: t.id, name: t.name, color: t.color, colorName: t.colorName,
      captain: t.captain, members: t.members,
      currentStep: t.currentStep, totalSteps: t.route.length,
      finished: !!t.finishedAt,
      display,
    });
  });

  // Public: rejoindre / mettre à jour l'équipe
  app.post('/api/chasse/join', (req, res) => {
    const state = st.get();
    const { teamId, captainName, captainPhone, members } = req.body || {};
    const t = state.teams[teamId];
    if (!t) return res.status(404).json({ error: 'Équipe introuvable' });
    t.captain  = { name: String(captainName || '').slice(0, 60), phone: String(captainPhone || '').slice(0, 20) };
    t.members  = (members || []).map(m => String(m).slice(0, 60)).filter(Boolean);
    t.startedAt = t.startedAt || new Date().toISOString();
    pushNotif('join', teamId, `${t.name} a rejoint la chasse (capitaine : ${t.captain.name})`);
    st.save();
    res.json({ ok: true });
  });

  // Public: valider QR ou réponse texte
  app.post('/api/chasse/validate', (req, res) => {
    const state = st.get();
    const { teamId, qrCode, answer } = req.body || {};
    const t = state.teams[teamId];
    if (!t) return res.status(404).json({ error: 'Équipe introuvable' });
    if (t.finishedAt) return res.json({ ok: false, message: 'Chasse déjà terminée !' });

    const step = t.currentStep;
    if (step < 1 || step > t.route.length) return res.json({ ok: false, message: 'Étape invalide' });

    const enigmaNum = t.route[step - 1];
    const enigma    = ENIGMAS.find(e => e.n === enigmaNum);

    if (answer !== undefined) {
      // Validation par réponse texte (ex. énigme 5)
      if (!enigma || !enigma.hasAnswer) {
        return res.json({ ok: false, message: 'Cette énigme ne nécessite pas de réponse' });
      }
      if (String(answer).trim().toLowerCase() !== String(enigma.answer).toLowerCase()) {
        return res.json({ ok: false, message: 'Mauvaise réponse, essaie encore !' });
      }
    } else {
      // Validation par QR code
      const expected = ENIGMA_QR[enigmaNum - 1];
      if ((qrCode || '').trim().toUpperCase() !== expected.toUpperCase()) {
        return res.json({ ok: false, message: "Code incorrect — ce n'est pas le bon endroit !" });
      }
    }

    // Avancer l'étape
    t.completedSteps.push(enigmaNum);
    t.currentStep++;
    const pct = Math.round((t.completedSteps.length / t.route.length) * 100);
    if (t.currentStep > t.route.length) {
      t.finishedAt = new Date().toISOString();
      pushNotif('finish', teamId, `🏆 ${t.name} a terminé la chasse !`);
    } else if ([25, 50, 75].includes(pct)) {
      pushNotif('milestone', teamId, `${t.name} à ${pct}% — étape ${t.completedSteps.length}/${t.route.length}`);
    }
    st.save();

    const display = currentDisplay(t);
    res.json({ ok: true, finished: !!t.finishedAt, display });
  });

  // Admin: liste complète des équipes
  app.get('/api/chasse/teams', chasseAdminAuth, (req, res) => {
    const state = st.get();
    res.json({ teams: Object.values(state.teams) });
  });

  // Admin: créer une équipe
  app.post('/api/chasse/teams', chasseAdminAuth, (req, res) => {
    const state = st.get();
    const { colorId, name } = req.body || {};
    const color = TEAM_COLORS.find(c => c.id === colorId);
    if (!color) return res.status(400).json({ error: 'Couleur invalide' });
    if (state.teams[colorId]) return res.status(400).json({ error: 'Couleur déjà utilisée' });
    const idx  = Object.keys(state.teams).length;
    const team = {
      id: colorId, name: name || `Équipe ${color.name}`,
      color: color.hex, colorName: color.name,
      captain: null, members: [],
      currentStep: 1, completedSteps: [],
      route: genRoute(idx),
      startedAt: null, finishedAt: null,
      createdAt: new Date().toISOString(),
    };
    state.teams[colorId] = team;
    st.save();
    res.json({ ok: true, team });
  });

  // Admin: supprimer une équipe
  app.delete('/api/chasse/teams/:id', chasseAdminAuth, (req, res) => {
    const state = st.get();
    if (!state.teams[req.params.id]) return res.status(404).json({ error: 'Introuvable' });
    delete state.teams[req.params.id];
    st.save();
    res.json({ ok: true });
  });

  // Renommer une équipe (admin ou capitaine via x-team-id)
  app.post('/api/chasse/teams/:id/rename', (req, res) => {
    const state   = st.get();
    const isAdmin = (req.headers['x-admin-pass'] || req.query.adminPass) === getAdminPass();
    const teamIdH = req.headers['x-team-id'];
    if (!isAdmin && teamIdH !== req.params.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const t = state.teams[req.params.id];
    if (!t) return res.status(404).json({ error: 'Introuvable' });
    const name = String(req.body.name || '').trim().slice(0, 40);
    if (!name) return res.status(400).json({ error: 'Nom invalide' });
    t.name = name;
    st.save();
    res.json({ ok: true, name });
  });

  // Admin: notifications
  app.get('/api/chasse/notifications', chasseAdminAuth, (req, res) => {
    const state = st.get();
    res.json({ notifications: state.notifications });
  });

  app.post('/api/chasse/notifications/read', chasseAdminAuth, (req, res) => {
    const state = st.get();
    state.notifications.forEach(n => n.read = true);
    st.save();
    res.json({ ok: true });
  });

  // Admin: reset total
  app.delete('/api/chasse/state', chasseAdminAuth, (req, res) => {
    st.reset();
    st.save();
    res.json({ ok: true });
  });

  // Public: demande d'aide
  app.post('/api/chasse/help', (req, res) => {
    const state = st.get();
    const { teamId, message } = req.body || {};
    const t           = state.teams[teamId];
    const teamName    = t ? t.name : (teamId || 'Équipe inconnue');
    const captainName = t && t.captain ? t.captain.name : '';
    const safeMsg     = String(message || '').slice(0, 200);
    pushNotif('help', teamId || '', `🆘 ${teamName}${captainName ? ` (${captainName})` : ''} demande de l'aide : "${safeMsg}"`);
    st.save();
    res.json({ ok: true });
  });

  // Admin: déblocage secours (+1 étape si QR illisible)
  app.post('/api/chasse/admin/advance', chasseAdminAuth, (req, res) => {
    const state = st.get();
    const { teamId } = req.body || {};
    const t = state.teams[teamId];
    if (!t) return res.status(404).json({ error: 'Équipe introuvable' });
    if (t.finishedAt) return res.json({ ok: false, message: 'Chasse déjà terminée' });
    const enigmaNum = t.route[t.currentStep - 1];
    t.completedSteps.push(enigmaNum);
    t.currentStep++;
    if (t.currentStep > t.route.length) {
      t.finishedAt = new Date().toISOString();
      pushNotif('finish', teamId, `🏆 ${t.name} a terminé (avancée par admin)`);
    } else {
      pushNotif('advance', teamId, `🔓 ${t.name} avancée à l'étape ${t.currentStep} (admin)`);
    }
    st.save();
    const display = currentDisplay(t);
    res.json({ ok: true, currentStep: t.currentStep, finished: !!t.finishedAt, display });
  });

  console.log('[chasse] Routes mounted');
}

module.exports = { mountChasse };
