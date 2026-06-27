'use strict';
const { execSync } = require('child_process');
const path = require('path');

module.exports = async function() {
  const root = path.resolve(__dirname, '../..');
  console.log('[e2e] Building les-pilotes-v2.html…');
  execSync('node build/build.js', { cwd: root, stdio: 'inherit' });
  console.log('[e2e] Build done.');
};
