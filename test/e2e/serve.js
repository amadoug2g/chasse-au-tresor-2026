'use strict';
/**
 * Serveur de test E2E : monte l'API chasse + sert les-pilotes-v2.html
 * Lancé par playwright.config.js webServer.command
 */
const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const express = require('express');
const { mountChasse } = require('../../chasse');

const PORT       = parseInt(process.env.E2E_PORT || '3456', 10);
const ROOT       = path.resolve(__dirname, '../..');
const HTML_FILE  = path.join(ROOT, 'les-pilotes-v2.html');

process.env.CHASSE_ADMIN_PASS  = process.env.CHASSE_ADMIN_PASS  || 'e2e-admin-pass';
process.env.CHASSE_STATE_FILE  = process.env.CHASSE_STATE_FILE  || '/tmp/chasse-e2e-state.json';

// Démarrer propre
try { fs.unlinkSync(process.env.CHASSE_STATE_FILE); } catch(_) {}

const app = express();
mountChasse(app);

// Sert l'HTML buildé à la racine et à /chasse
app.get(['/', '/chasse'], (_req, res) => {
  if (!fs.existsSync(HTML_FILE)) {
    return res.status(503).send('Build not ready — run npm run build first');
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(fs.readFileSync(HTML_FILE));
});

const server = http.createServer(app);
server.listen(PORT, '127.0.0.1', () => {
  console.log(`E2E server ready on http://127.0.0.1:${PORT}`);
});
