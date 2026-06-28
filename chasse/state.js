'use strict';

const fs   = require('fs');
const path = require('path');

function getStateFile() {
  return process.env.CHASSE_STATE_FILE || path.join(__dirname, '..', 'chasse-state.json');
}

let _state = { teams: {}, notifications: [], enigmaOverrides: {} };

function load() {
  try {
    _state = JSON.parse(fs.readFileSync(getStateFile(), 'utf8'));
    if (!_state.enigmaOverrides) _state.enigmaOverrides = {};
    console.log(`[chasse] State loaded: ${Object.keys(_state.teams).length} teams`);
  } catch (_) {
    _state = { teams: {}, notifications: [], enigmaOverrides: {} };
  }
}

// Écriture atomique : tmp → backup → rename
function save() {
  const stateFile = getStateFile();
  const bakFile   = stateFile.replace('.json', '.bak.json');
  const tmpFile   = stateFile + '.tmp';
  try {
    const json = JSON.stringify(_state, null, 2);
    fs.writeFileSync(tmpFile, json, 'utf8');
    try { fs.copyFileSync(stateFile, bakFile); } catch (_) {}
    fs.renameSync(tmpFile, stateFile);
  } catch (e) {
    console.error('[chasse] Save error:', e.message);
  }
}

function get() { return _state; }

function reset() { _state = { teams: {}, notifications: [], enigmaOverrides: {} }; }

module.exports = { load, save, get, reset };
