/**
 * server.js — Les Grandes Conversations / CB21
 * Read-only consultation app — proxies WeezEvent API server-side.
 * Credentials never exposed to the client. Auto-refreshes access token on expiry.
 */

require('dotenv').config();
const express  = require('express');
const https    = require('https');
const http     = require('http');
const fs       = require('fs');
const path     = require('path');
const qs       = require('querystring');

const app  = express();
const PORT = process.env.PORT || 3000;

const WZ_API_KEY  = process.env.WZ_API_KEY;
const WZ_EVENT_ID = process.env.WZ_EVENT_ID;
const WZ_USERNAME = process.env.WZ_USERNAME;
const WZ_PASSWORD = process.env.WZ_PASSWORD;
const SYNC_SECRET = process.env.SYNC_SECRET;
const REFRESH_MS  = parseInt(process.env.REFRESH_INTERVAL || '300000', 10); // 5 minutes

let WZ_TOKEN = process.env.WZ_TOKEN;

// ── In-memory cache ───────────────────────────────────────────────────────────
let cache = {
  participants: [],
  lastSync: null,
  error: null,
};

// ── HTTP helper ───────────────────────────────────────────────────────────────
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error('JSON parse error: ' + e.message)); }
      });
    }).on('error', reject);
  });
}

function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const postData = qs.stringify(body);
    const opts = Object.assign(require('url').parse(url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        'Content-Length': Buffer.byteLength(postData),
      },
    });
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error('JSON parse error: ' + e.message)); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// ── Token refresh ─────────────────────────────────────────────────────────────
async function refreshToken() {
  if (!WZ_USERNAME || !WZ_PASSWORD) throw new Error('No credentials for token refresh');
  console.log('[auth] Refreshing WeezEvent access token…');
  const res = await httpsPost('https://api.weezevent.com/auth/access_token', {
    username: WZ_USERNAME,
    password: WZ_PASSWORD,
    api_key:  WZ_API_KEY,
  });
  if (!res.body.accessToken) throw new Error('Token refresh failed: ' + JSON.stringify(res.body));
  WZ_TOKEN = res.body.accessToken;
  console.log('[auth] Token refreshed OK');
}

// ── WeezEvent fetch ───────────────────────────────────────────────────────────
async function fetchParticipants(token) {
  const url = `https://api.weezevent.com/participant/list` +
    `?api_key=${encodeURIComponent(WZ_API_KEY)}` +
    `&access_token=${encodeURIComponent(token)}` +
    `&id_event[]=${encodeURIComponent(WZ_EVENT_ID)}` +
    `&full=1`;
  return httpsGet(url);
}

async function syncParticipants() {
  if (!WZ_API_KEY || !WZ_TOKEN || !WZ_EVENT_ID) {
    cache.error = 'Configuration manquante — contacter l\'administrateur';
    console.warn('[sync] Missing env vars');
    return;
  }
  try {
    let res = await fetchParticipants(WZ_TOKEN);

    // If token expired (401 or API error), refresh and retry once
    if (res.status === 401 || res.body?.error) {
      await refreshToken();
      res = await fetchParticipants(WZ_TOKEN);
    }

    const raw = res.body.participants || res.body.data || res.body;
    cache.participants = Array.isArray(raw) ? raw : [];
    cache.lastSync = new Date().toISOString();
    cache.error = null;
    console.log(`[sync] OK — ${cache.participants.length} participants @ ${cache.lastSync}`);
  } catch (err) {
    cache.error = 'Erreur de synchronisation — réessai dans quelques minutes';
    console.error('[sync] Error:', err.message);
  }
}

// ── Routes (read-only) ────────────────────────────────────────────────────────

// Serve Let's Encrypt webroot challenge files (for cert renewal)
app.use('/.well-known', express.static(path.join(__dirname, 'webroot/.well-known')));

// Favicon + static assets
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'favicon.ico')));
app.get('/apple-touch-icon.png', (req, res) => res.sendFile(path.join(__dirname, 'apple-touch-icon.png')));

const CHASSE_HOST = 'chasse.les-pilotes.fr';

app.get('/', (req, res) => {
  const host = (req.hostname || '').toLowerCase();
  if (host === CHASSE_HOST) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    return res.sendFile(path.join(__dirname, 'les-pilotes-v2.html'));
  }
  res.sendFile(path.join(__dirname, 'analyse-cb21.html'));
});

app.get('/chasse', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.sendFile(path.join(__dirname, 'les-pilotes-v2.html'));
});

app.get('/api/participants', (req, res) => {
  res.json({
    participants: cache.participants,
    lastSync:     cache.lastSync,
    error:        cache.error,
    count:        cache.participants.length,
  });
});

// ── Chasse au trésor API ──────────────────────────────────────────────────────

app.use(express.json());

const CHASSE_STATE_FILE = path.join(__dirname, 'chasse-state.json');
const ADMIN_PASS = 'pilotes2026';

const TEAM_COLORS = [
  { id:'rouge',   name:'Rouge',   hex:'#dc2626' },
  { id:'bleu',    name:'Bleu',    hex:'#2563eb' },
  { id:'vert',    name:'Vert',    hex:'#16a34a' },
  { id:'jaune',   name:'Jaune',   hex:'#ca8a04' },
  { id:'violet',  name:'Violet',  hex:'#7c3aed' },
  { id:'orange',  name:'Orange',  hex:'#ea580c' },
  { id:'rose',    name:'Rose',    hex:'#db2777' },
  { id:'noir',    name:'Noir',    hex:'#374151' },
  { id:'cyan',    name:'Cyan',    hex:'#0891b2' },
  { id:'marron',  name:'Marron',  hex:'#92400e' },
];

const ENIGMA_QR = [
  'M4R7-NX2K','B9T3-WQ7L','K2P8-FJ5R','D6H1-YV4M','R3X5-LG8N',
  'W7J2-CT9P','Q1Z6-HB3K','P1M9-ZR6W','V8G3-KX7J','F4N2-DH5T',
];

let chasseState = { teams:{}, notifications:[] };

function loadChasseState() {
  try {
    chasseState = JSON.parse(fs.readFileSync(CHASSE_STATE_FILE,'utf8'));
    console.log(`[chasse] State loaded: ${Object.keys(chasseState.teams).length} teams`);
  } catch(e) { chasseState = { teams:{}, notifications:[] }; }
}

function saveChasseState() {
  try { fs.writeFileSync(CHASSE_STATE_FILE, JSON.stringify(chasseState,null,2)); }
  catch(e) { console.error('[chasse] Save error:', e.message); }
}

function genRoute(teamIndex) {
  const route = [];
  for (let j = 0; j < 10; j++) route.push(((teamIndex + j) % 10) + 1);
  return route;
}

function pushNotif(type, teamId, message) {
  chasseState.notifications.unshift({ id: Date.now().toString(36)+Math.random().toString(36).slice(2,5), type, teamId, message, ts: new Date().toISOString(), read: false });
  chasseState.notifications = chasseState.notifications.slice(0, 50);
}

function chasseAdminAuth(req, res, next) {
  const pass = req.headers['x-admin-pass'] || req.query.adminPass;
  if (pass !== ADMIN_PASS) return res.status(403).json({ error:'Forbidden' });
  next();
}

loadChasseState();

// Public: config (team list for join screen)
app.get('/api/chasse/config', (req, res) => {
  const teams = Object.values(chasseState.teams).map(t => ({
    id: t.id, name: t.name, color: t.color, colorName: t.colorName,
    taken: !!(t.captain && t.captain.name),
  }));
  res.json({ teams, colors: TEAM_COLORS });
});

// Public: get team session (reconnection)
app.get('/api/chasse/session/:teamId', (req, res) => {
  const t = chasseState.teams[req.params.teamId];
  if (!t) return res.status(404).json({ error:'Équipe introuvable' });
  res.json({ id:t.id, name:t.name, color:t.color, colorName:t.colorName,
    captain:t.captain, members:t.members, currentStep:t.currentStep,
    totalSteps:t.route.length, route:t.route, finished:!!t.finishedAt });
});

// Public: captain joins
app.post('/api/chasse/join', (req, res) => {
  const { teamId, captainName, captainPhone, members } = req.body || {};
  const t = chasseState.teams[teamId];
  if (!t) return res.status(404).json({ error:'Équipe introuvable' });
  t.captain = { name: String(captainName||'').slice(0,60), phone: String(captainPhone||'').slice(0,20) };
  t.members = (members||[]).map(m=>String(m).slice(0,60)).filter(Boolean);
  t.startedAt = t.startedAt || new Date().toISOString();
  pushNotif('join', teamId, `${t.name} a rejoint la chasse (capitaine : ${t.captain.name})`);
  saveChasseState();
  res.json({ ok:true });
});

// Public: validate QR code
app.post('/api/chasse/validate', (req, res) => {
  const { teamId, qrCode } = req.body || {};
  const t = chasseState.teams[teamId];
  if (!t) return res.status(404).json({ error:'Équipe introuvable' });
  if (t.finishedAt) return res.json({ ok:false, message:'Chasse déjà terminée !' });
  const step = t.currentStep;
  if (step < 1 || step > 10) return res.json({ ok:false, message:'Étape invalide' });
  const enigmaNum = t.route[step - 1];
  const expected = ENIGMA_QR[enigmaNum - 1];
  if ((qrCode||'').trim().toUpperCase() !== expected.toUpperCase()) {
    return res.json({ ok:false, message:'Code incorrect — ce n\'est pas le bon endroit !' });
  }
  t.completedSteps.push(enigmaNum);
  t.currentStep++;
  const pct = Math.round((t.completedSteps.length / 10) * 100);
  if (t.currentStep > 10) {
    t.finishedAt = new Date().toISOString();
    pushNotif('finish', teamId, `🏆 ${t.name} a terminé la chasse !`);
  } else if ([25, 50, 75].includes(pct)) {
    pushNotif('milestone', teamId, `${t.name} à ${pct}% — étape ${t.completedSteps.length}/10`);
  }
  saveChasseState();
  const nextEnigmaNum = t.currentStep <= 10 ? t.route[t.currentStep - 1] : null;
  res.json({ ok:true, finished:!!t.finishedAt, nextStep:t.currentStep, nextEnigmaNum });
});

// Admin: list teams (full)
app.get('/api/chasse/teams', chasseAdminAuth, (req, res) => {
  res.json({ teams: Object.values(chasseState.teams) });
});

// Admin: create team
app.post('/api/chasse/teams', chasseAdminAuth, (req, res) => {
  const { colorId, name } = req.body || {};
  const color = TEAM_COLORS.find(c => c.id === colorId);
  if (!color) return res.status(400).json({ error:'Couleur invalide' });
  if (chasseState.teams[colorId]) return res.status(400).json({ error:'Couleur déjà utilisée' });
  const idx = Object.keys(chasseState.teams).length;
  const team = { id:colorId, name: name||`Équipe ${color.name}`, color:color.hex, colorName:color.name,
    captain:null, members:[], currentStep:1, completedSteps:[], route:genRoute(idx),
    startedAt:null, finishedAt:null, createdAt:new Date().toISOString() };
  chasseState.teams[colorId] = team;
  saveChasseState();
  res.json({ ok:true, team });
});

// Admin: delete team
app.delete('/api/chasse/teams/:id', chasseAdminAuth, (req, res) => {
  if (!chasseState.teams[req.params.id]) return res.status(404).json({ error:'Introuvable' });
  delete chasseState.teams[req.params.id];
  saveChasseState();
  res.json({ ok:true });
});

// Admin: notifications
app.get('/api/chasse/notifications', chasseAdminAuth, (req, res) => {
  res.json({ notifications: chasseState.notifications });
});

app.post('/api/chasse/notifications/read', chasseAdminAuth, (req, res) => {
  chasseState.notifications.forEach(n => n.read = true);
  saveChasseState();
  res.json({ ok:true });
});

// Admin: reset state
app.delete('/api/chasse/state', chasseAdminAuth, (req, res) => {
  chasseState = { teams:{}, notifications:[] };
  saveChasseState();
  res.json({ ok:true });
});

// Public: participant sends help request → creates admin notification
app.post('/api/chasse/help', (req, res) => {
  const { teamId, message } = req.body || {};
  const t = chasseState.teams[teamId];
  const teamName = t ? t.name : (teamId || 'Équipe inconnue');
  const captainName = t && t.captain ? t.captain.name : '';
  const safeMsg = String(message || '').slice(0, 200);
  pushNotif('help', teamId || '', `🆘 ${teamName}${captainName ? ` (${captainName})` : ''} demande de l'aide : "${safeMsg}"`);
  saveChasseState();
  res.json({ ok: true });
});

// ── WeezEvent sync ────────────────────────────────────────────────────────────

// Manual sync — protected by secret token
app.post('/api/sync', (req, res) => {
  const token = req.headers['x-sync-token'] || req.query.token;
  if (!SYNC_SECRET || token !== SYNC_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  syncParticipants().then(() => {
    res.json({ ok: true, lastSync: cache.lastSync, error: cache.error });
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const SSL_PORT = process.env.SSL_PORT || 3443;
const CERT_DIR = path.join(__dirname, 'certs');

// HTTP server (port 80 → 3000 via iptables)
const BIND_HOST_HTTP = process.env.BIND_HOST || '0.0.0.0';
http.createServer(app).listen(PORT, BIND_HOST_HTTP, () => {
  console.log(`[server] HTTP on port ${PORT}`);
  console.log(`[server] Polling WeezEvent every ${REFRESH_MS / 1000}s`);
  syncParticipants();
  setInterval(syncParticipants, REFRESH_MS);
});

// HTTPS server (port 443 → 3443 via iptables) — SNI for multiple domains
try {
  const tls = require('tls');
  const CHASSE_CERT_DIR = path.join(process.env.HOME || '/home/claudeuser', 'letsencrypt/config/live/chasse.les-pilotes.fr');

  const cb21Ctx = tls.createSecureContext({
    cert: fs.readFileSync(path.join(CERT_DIR, 'fullchain.pem')),
    key:  fs.readFileSync(path.join(CERT_DIR, 'privkey.pem')),
  });

  let chasseCtx = null;
  try {
    chasseCtx = tls.createSecureContext({
      cert: fs.readFileSync(path.join(CHASSE_CERT_DIR, 'fullchain.pem')),
      key:  fs.readFileSync(path.join(CHASSE_CERT_DIR, 'privkey.pem')),
    });
    console.log('[ssl] chasse.les-pilotes.fr cert loaded');
  } catch (e) {
    console.warn('[ssl] chasse cert not found, falling back to cb21 cert:', e.message);
  }

  const sslOptions = {
    cert: fs.readFileSync(path.join(CERT_DIR, 'fullchain.pem')),
    key:  fs.readFileSync(path.join(CERT_DIR, 'privkey.pem')),
    SNICallback: (servername, cb) => {
      if (chasseCtx && servername === 'chasse.les-pilotes.fr') {
        cb(null, chasseCtx);
      } else {
        cb(null, cb21Ctx);
      }
    },
  };

  const BIND_HOST = process.env.BIND_HOST || '0.0.0.0';
  https.createServer(sslOptions, app).listen(SSL_PORT, BIND_HOST, () => {
    console.log(`[server] HTTPS on port ${SSL_PORT}`);
  });
} catch (e) {
  console.warn('[ssl] Could not start HTTPS:', e.message);
}
