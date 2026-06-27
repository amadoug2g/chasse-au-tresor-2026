'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sortTeams } = require('../chasse/leaderboard');

function team(id, opts = {}) {
  return {
    id,
    completedSteps: opts.completedSteps || [],
    currentStep:    opts.currentStep    || 1,
    startedAt:      opts.startedAt      || null,
    finishedAt:     opts.finishedAt     || null,
  };
}

describe('sortTeams', () => {
  it('équipe terminée avant équipe en cours', () => {
    const teams = [
      team('b', { startedAt: '2026-01-01T10:00:00Z', currentStep: 5, completedSteps: [1,2,3,4] }),
      team('a', { startedAt: '2026-01-01T10:00:00Z', finishedAt: '2026-01-01T11:00:00Z' }),
    ];
    const sorted = sortTeams(teams);
    assert.equal(sorted[0].id, 'a');
  });

  it('deux équipes terminées — celle qui finit en premier gagne', () => {
    const teams = [
      team('b', { finishedAt: '2026-01-01T12:00:00Z', startedAt: '2026-01-01T10:00:00Z' }),
      team('a', { finishedAt: '2026-01-01T11:00:00Z', startedAt: '2026-01-01T10:00:00Z' }),
    ];
    const sorted = sortTeams(teams);
    assert.equal(sorted[0].id, 'a');
    assert.equal(sorted[1].id, 'b');
  });

  it('parmi les en-cours, plus d\'étapes complétées = mieux classé', () => {
    const teams = [
      team('b', { startedAt: '2026-01-01T10:00:00Z', completedSteps: [1,2], currentStep: 3 }),
      team('a', { startedAt: '2026-01-01T10:00:00Z', completedSteps: [1,2,3,4], currentStep: 5 }),
    ];
    const sorted = sortTeams(teams);
    assert.equal(sorted[0].id, 'a');
  });

  it('n\'altère pas le tableau original', () => {
    const teams = [team('a'), team('b')];
    const original = [...teams];
    sortTeams(teams);
    assert.deepEqual(teams, original);
  });
});
