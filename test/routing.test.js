'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { genRoute, currentDisplay, progressPct, isFinished } = require('../chasse/routing');

// Helper : crée une équipe minimale
function makeTeam(teamIndex, currentStep, completedCount, finishedAt = null) {
  const route = genRoute(teamIndex);
  const completedSteps = [];
  for (let i = 0; i < completedCount; i++) completedSteps.push(route[i]);
  return { route, currentStep, completedSteps, finishedAt };
}

describe('genRoute', () => {
  it('équipe 0 → [1,2,3,4,5,6,7,8,9,10]', () => {
    assert.deepEqual(genRoute(0), [1,2,3,4,5,6,7,8,9,10]);
  });
  it('équipe 1 → [2,3,...,10,1]', () => {
    assert.deepEqual(genRoute(1), [2,3,4,5,6,7,8,9,10,1]);
  });
  it('équipe 9 → [10,1,2,...,9]', () => {
    assert.deepEqual(genRoute(9), [10,1,2,3,4,5,6,7,8,9]);
  });
  it('équipe 10 (modulo) → même que équipe 0', () => {
    assert.deepEqual(genRoute(10), genRoute(0));
  });
  it('équipe 19 → même que équipe 9', () => {
    assert.deepEqual(genRoute(19), genRoute(9));
  });
  it('toujours 10 éléments', () => {
    for (let i = 0; i < 20; i++) assert.equal(genRoute(i).length, 10);
  });
});

describe('currentDisplay — anti-off-by-one', () => {
  it('étape 1 → affiche énigme route[0], label "Énigme 1 sur 10"', () => {
    const team = makeTeam(0, 1, 0);
    const d = currentDisplay(team);
    assert.equal(d.stepIndex, 1);
    assert.equal(d.stepLabel, 'Énigme 1 sur 10');
    assert.equal(d.enigmaNum, team.route[0]);
    assert.equal(d.finished, false);
  });
  it('étape 10 → affiche énigme route[9] (dernier)', () => {
    const team = makeTeam(0, 10, 9);
    const d = currentDisplay(team);
    assert.equal(d.stepIndex, 10);
    assert.equal(d.enigmaNum, team.route[9]);
  });
  it('étape 11 → finishedAt requis, sinon progressPct=100 uniquement après finishedAt', () => {
    // si finishedAt est set, currentDisplay retourne finished:true
    const team = makeTeam(0, 11, 10, new Date().toISOString());
    const d = currentDisplay(team);
    assert.equal(d.finished, true);
    assert.equal(d.progressPct, 100);
  });
  it('isImageOnly pour enigmaNum 8, 9, 10', () => {
    // trouver une équipe dont la route passe par 8
    for (let idx = 0; idx < 10; idx++) {
      const route = genRoute(idx);
      const stepFor8 = route.indexOf(8) + 1;
      if (stepFor8 > 0) {
        const team = { route, currentStep: stepFor8, completedSteps: [], finishedAt: null };
        const d = currentDisplay(team);
        assert.equal(d.isImageOnly, true, `équipe ${idx} doit voir isImageOnly pour énigme 8`);
        assert.equal(d.imageRef, 8);
        break;
      }
    }
  });
  it('hasAnswer vrai pour énigme 5', () => {
    for (let idx = 0; idx < 10; idx++) {
      const route = genRoute(idx);
      const stepFor5 = route.indexOf(5) + 1;
      if (stepFor5 > 0) {
        const team = { route, currentStep: stepFor5, completedSteps: [], finishedAt: null };
        const d = currentDisplay(team);
        assert.equal(d.hasAnswer, true);
        assert.ok(!('answer' in d), 'answer ne doit PAS figurer dans display');
        assert.ok(!('qr' in d),     'qr ne doit PAS figurer dans display');
        break;
      }
    }
  });
  it('progressPct = 0 au départ, 50 à mi-chemin, 100 terminé', () => {
    const t0 = makeTeam(0, 1, 0);
    assert.equal(currentDisplay(t0).progressPct, 0);
    const t5 = makeTeam(0, 6, 5);
    assert.equal(currentDisplay(t5).progressPct, 50);
    const tf = makeTeam(0, 11, 10, new Date().toISOString());
    assert.equal(currentDisplay(tf).progressPct, 100);
  });
});

describe('progressPct (pure)', () => {
  it('0/10 → 0', () => assert.equal(progressPct(0, 10), 0));
  it('5/10 → 50', () => assert.equal(progressPct(5, 10), 50));
  it('10/10 → 100', () => assert.equal(progressPct(10, 10), 100));
  it('total 0 → 0', () => assert.equal(progressPct(0, 0), 0));
});

describe('isFinished', () => {
  it('false si pas de finishedAt', () => {
    assert.equal(isFinished({ finishedAt: null }), false);
    assert.equal(isFinished({ finishedAt: undefined }), false);
  });
  it('true si finishedAt défini', () => {
    assert.equal(isFinished({ finishedAt: new Date().toISOString() }), true);
  });
});
