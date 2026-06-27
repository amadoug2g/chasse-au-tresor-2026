#!/usr/bin/env node
'use strict';

/**
 * Build zéro-dépendance.
 * Concatène CSS + JS + données d'affichage + images dans un seul HTML autonome.
 * Émet : les-pilotes-v2.html (servi par server.js) et index.html (miroir défensif).
 */

const fs   = require('fs');
const path = require('path');
const cp   = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC  = path.join(ROOT, 'src');

function read(p)  { return fs.readFileSync(p, 'utf8'); }
function write(p, content) { fs.writeFileSync(p, content, 'utf8'); }
function exists(p) { try { fs.accessSync(p); return true; } catch(_) { return false; } }

// Version info
const { version } = JSON.parse(read(path.join(ROOT, 'package.json')));
let commit = 'unknown';
try { commit = cp.execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch(_) {}
const builtAt = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
const versionLabel = `v${version} · ${commit} · ${builtAt}`;

// Écrire chasse/build-info.json pour l'endpoint /api/chasse/version
write(path.join(ROOT, 'chasse', 'build-info.json'), JSON.stringify({ version, commit, builtAt }, null, 2) + '\n');
console.log(`[build] version ${versionLabel}`);

// 1. Template
let html = read(path.join(SRC, 'index.html'));

// 2. CSS
const css = read(path.join(SRC, 'styles', 'app.css'));
html = html.replace('<!--INJECT:CSS-->', css);

// 3. jsQR (self-hosted ou CDN fallback)
const jsqrPath = path.join(SRC, 'assets', 'vendor', 'jsQR.min.js');
if (exists(jsqrPath)) {
  const jsqr = read(jsqrPath);
  html = html.replace('<!--INJECT:VENDOR_JSQR-->', `<script>${jsqr}</script>`);
  console.log('[build] jsQR self-hosted ✓');
} else {
  html = html.replace(
    '<!--INJECT:VENDOR_JSQR-->',
    '<script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"></script>',
  );
  console.warn('[build] ⚠ jsQR non self-hosted — CDN utilisé (hors-ligne indisponible)');
}

// 4. Polices (Google Fonts pour Phase A — Phase B : self-host base64)
html = html.replace('<!--INJECT:FONTS-->', [
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link href="https://fonts.googleapis.com/css2?family=Anybody:ital,wght@0,400;0,700;0,800;0,900;1,800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">',
].join('\n'));

// 5. Images énigmes (lues depuis src/assets/img/enigma-N.b64)
const IMG_DIR  = path.join(SRC, 'assets', 'img');
let imagesHtml = '';
[8, 9, 10].forEach(n => {
  const b64Path = path.join(IMG_DIR, `enigma-${n}.b64`);
  if (exists(b64Path)) {
    const src = read(b64Path).trim();
    imagesHtml += `<img id="enigma-img-${n}" src="${src}" style="display:none" alt="">\n`;
    console.log(`[build] Image énigme ${n} ✓`);
  } else {
    console.warn(`[build] ⚠ Image énigme ${n} non trouvée (${b64Path})`);
  }
});
html = html.replace('<!--INJECT:ENIGMA_IMAGES-->', imagesHtml);

// 6. Données d'affichage (sans qr ni answer)
const { ENIGMAS } = require('../chasse/data');
const displayEnigmas = ENIGMAS.map(({ n, title, text, hint, isImageOnly, imageRef, hasAnswer }) => {
  const obj = { n, title: title || '', text: text || '', hint: hint || '' };
  if (isImageOnly) obj.isImageOnly = true;
  if (imageRef)    obj.imageRef    = imageRef;
  if (hasAnswer)   obj.hasAnswer   = true;
  return obj;
});
const displayJs = `/* GÉNÉRÉ — ne pas modifier. Relancer : npm run build */\nconst ENIGMAS_DISPLAY = ${JSON.stringify(displayEnigmas, null, 2)};`;

fs.mkdirSync(path.join(SRC, 'data'), { recursive: true });
write(path.join(SRC, 'data', 'enigmas.display.js'), displayJs);

html = html.replace('/*INJECT:DATA*/', displayJs);

// 7. JS applicatif (concaténation des modules client)
const jsOrder = ['core.js', 'join.js', 'play.js', 'scanner.js', 'help.js', 'team-edit.js', 'admin.js'];
const appJs   = jsOrder.map(f => read(path.join(SRC, 'js', f))).join('\n\n');
html = html.replace('/*INJECT:APP*/', appJs);

// 8. Version dans le HTML
html = html.replace('<!--INJECT:VERSION-->', versionLabel);
// Commentaire lisible en view-source
html = `<!-- chasse-au-tresor ${versionLabel} -->\n` + html;

// 9. Écriture
const outPath = path.join(ROOT, 'les-pilotes-v2.html');
write(outPath, html);
const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(`[build] ✓ ${outPath} (${sizeKb} KB)`);

// Miroir défensif
fs.copyFileSync(outPath, path.join(ROOT, 'index.html'));
console.log('[build] ✓ index.html (miroir)');
