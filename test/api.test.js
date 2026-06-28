'use strict';

const { describe, it, before, after } = require('node:test');
const assert  = require('node:assert/strict');
const http    = require('http');
const os      = require('os');
const path    = require('path');
const fs      = require('fs');
const express = require('express');

const { mountChasse } = require('../chasse');
const { ENIGMA_QR }   = require('../chasse/data');
const { genRoute }    = require('../chasse/routing');

// Helper fetch JSON
function req(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const buf = body ? Buffer.from(JSON.stringify(body)) : null;
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      ...(url.startsWith('http') ? {} : {}),
    };
    const u = new URL(url);
    const r = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method, headers: { 'Content-Type': 'application/json', 'Content-Length': buf ? buf.length : 0, ...headers } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { reject(new Error('JSON parse: ' + data)); }
      });
    });
    r.on('error', reject);
    if (buf) r.write(buf);
    r.end();
  });
}

const ADMIN = 'test-admin-pass-123';
let server, base, stateFile;

before(async () => {
  // Fichier d'état temporaire isolé
  stateFile = path.join(os.tmpdir(), `chasse-test-${process.pid}.json`);
  process.env.CHASSE_ADMIN_PASS = ADMIN;
  process.env.CHASSE_STATE_FILE = stateFile;

  // Patch state.js pour utiliser le fichier temporaire
  const stMod = require('../chasse/state');
  // On réinitialise l'état pour être sûr
  stMod.reset();

  const app = express();
  mountChasse(app);

  server = http.createServer(app);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  try { fs.unlinkSync(stateFile); } catch(_) {}
  try { fs.unlinkSync(stateFile + '.tmp'); } catch(_) {}
  try { fs.unlinkSync(stateFile.replace('.json', '.bak.json')); } catch(_) {}
});

describe('Admin auth', () => {
  it('GET /teams sans header → 403', async () => {
    const r = await req('GET', `${base}/api/chasse/teams`);
    assert.equal(r.status, 403);
  });
  it('GET /teams avec mauvais mot de passe → 403', async () => {
    const r = await req('GET', `${base}/api/chasse/teams`, null, { 'x-admin-pass': 'wrong' });
    assert.equal(r.status, 403);
  });
  it('GET /teams avec bon mot de passe → 200', async () => {
    const r = await req('GET', `${base}/api/chasse/teams`, null, { 'x-admin-pass': ADMIN });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.teams));
  });
});

describe('Création équipe', () => {
  it('couleur invalide → 400', async () => {
    const r = await req('POST', `${base}/api/chasse/teams`, { colorId: 'inexistant' }, { 'x-admin-pass': ADMIN });
    assert.equal(r.status, 400);
  });
  it('crée équipe rouge', async () => {
    const r = await req('POST', `${base}/api/chasse/teams`, { colorId: 'rouge', name: 'Équipe Test Rouge' }, { 'x-admin-pass': ADMIN });
    assert.equal(r.status, 200);
    assert.equal(r.body.ok, true);
    assert.equal(r.body.team.id, 'rouge');
  });
  it('couleur déjà utilisée → 400', async () => {
    const r = await req('POST', `${base}/api/chasse/teams`, { colorId: 'rouge' }, { 'x-admin-pass': ADMIN });
    assert.equal(r.status, 400);
  });
});

describe('Parcours complet (10 étapes) — test anti-off-by-one', () => {
  let teamId;

  before(async () => {
    // Créer une 2ème équipe pour ce test
    const r = await req('POST', `${base}/api/chasse/teams`, { colorId: 'bleu-ciel', name: 'Test Bleu' }, { 'x-admin-pass': ADMIN });
    assert.equal(r.body.ok, true);
    teamId = 'bleu-ciel';
    // Rejoindre
    await req('POST', `${base}/api/chasse/join`, { teamId, captainName: 'Alice', captainPhone: '0600000000', members: [] });
  });

  it('session initiale → display stepIndex=1', async () => {
    const r = await req('GET', `${base}/api/chasse/session/${teamId}`);
    assert.equal(r.status, 200);
    assert.equal(r.body.currentStep, 1);
    assert.equal(r.body.display.stepIndex, 1);
    assert.equal(r.body.display.finished, false);
    assert.ok(!('qr' in r.body.display),     'display ne doit pas contenir qr');
    assert.ok(!('answer' in r.body.display), 'display ne doit pas contenir answer');
  });

  it('mauvais QR → ok:false, étape inchangée', async () => {
    const r = await req('POST', `${base}/api/chasse/validate`, { teamId, qrCode: 'XXXX-XXXX' });
    assert.equal(r.body.ok, false);
    // Vérifier l'étape est toujours 1
    const s = await req('GET', `${base}/api/chasse/session/${teamId}`);
    assert.equal(s.body.currentStep, 1);
  });

  it('run 10 étapes avec les bons QR → terminé', async () => {
    // Récupérer la route de l'équipe
    const s0 = await req('GET', `${base}/api/chasse/session/${teamId}`);
    // La route n'est plus exposée dans session, donc on la calcule
    // L'équipe 'bleu' est la 2ème créée (index=1)
    const route = genRoute(1);

    for (let step = 1; step <= 10; step++) {
      const enigmaNum = route[step - 1];
      const qr = ENIGMA_QR[enigmaNum - 1];
      const r = await req('POST', `${base}/api/chasse/validate`, { teamId, qrCode: qr });
      assert.equal(r.body.ok, true, `Étape ${step} devrait réussir avec QR ${qr}`);
      if (step < 10) {
        assert.equal(r.body.finished, false);
        assert.equal(r.body.display.stepIndex, step + 1, `Après étape ${step}, display doit afficher étape ${step+1}`);
        assert.ok(!('qr' in r.body.display));
      } else {
        assert.equal(r.body.finished, true);
        assert.equal(r.body.display.finished, true);
        assert.equal(r.body.display.progressPct, 100);
      }
    }
  });

  it('valider après terminé → ok:false', async () => {
    const r = await req('POST', `${base}/api/chasse/validate`, { teamId, qrCode: ENIGMA_QR[0] });
    assert.equal(r.body.ok, false);
    assert.match(r.body.message, /terminée/i);
  });
});


describe('Renommer équipe', () => {
  it('admin peut renommer', async () => {
    const r = await req('POST', `${base}/api/chasse/teams/rouge/rename`, { name: 'Rouge Reborn' }, { 'x-admin-pass': ADMIN });
    assert.equal(r.body.ok, true);
    assert.equal(r.body.name, 'Rouge Reborn');
  });
  it('sans auth → 403', async () => {
    const r = await req('POST', `${base}/api/chasse/teams/rouge/rename`, { name: 'Hack' });
    assert.equal(r.status, 403);
  });
});

describe('Supprimer équipe', () => {
  it('admin peut supprimer', async () => {
    await req('POST', `${base}/api/chasse/teams`, { colorId: 'jaune-fluo' }, { 'x-admin-pass': ADMIN });
    const r = await req('DELETE', `${base}/api/chasse/teams/jaune-fluo`, null, { 'x-admin-pass': ADMIN });
    assert.equal(r.body.ok, true);
  });
});

describe('Aide', () => {
  it('POST /help accepté', async () => {
    const r = await req('POST', `${base}/api/chasse/help`, { teamId: 'rouge', message: 'Je suis bloqué' });
    assert.equal(r.body.ok, true);
  });
});

describe('Admin advance (secours)', () => {
  before(async () => {
    await req('POST', `${base}/api/chasse/teams`, { colorId: 'orange-raye' }, { 'x-admin-pass': ADMIN });
    await req('POST', `${base}/api/chasse/join`, { teamId: 'orange-raye', captainName: 'Carol', captainPhone: '0600000002', members: [] });
  });

  it('avancer une équipe d\'une étape', async () => {
    const before = await req('GET', `${base}/api/chasse/session/orange-raye`);
    assert.equal(before.body.currentStep, 1);
    const r = await req('POST', `${base}/api/chasse/admin/advance`, { teamId: 'orange-raye' }, { 'x-admin-pass': ADMIN });
    assert.equal(r.body.ok, true);
    assert.equal(r.body.currentStep, 2);
  });
});

describe('Reset', () => {
  it('DELETE /state réinitialise tout', async () => {
    const r = await req('DELETE', `${base}/api/chasse/state`, null, { 'x-admin-pass': ADMIN });
    assert.equal(r.body.ok, true);
    const teams = await req('GET', `${base}/api/chasse/teams`, null, { 'x-admin-pass': ADMIN });
    assert.equal(teams.body.teams.length, 0);
  });
});
