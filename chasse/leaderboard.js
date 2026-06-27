'use strict';

// Tri pur — terminées d'abord (par ordre d'arrivée), puis par étapes complétées.
function sortTeams(teams) {
  return teams.slice().sort((a, b) => {
    if (a.finishedAt && !b.finishedAt) return -1;
    if (!a.finishedAt && b.finishedAt) return 1;
    if (a.finishedAt && b.finishedAt) {
      return new Date(a.finishedAt) - new Date(b.finishedAt);
    }
    const sa = (a.completedSteps || []).length;
    const sb = (b.completedSteps || []).length;
    if (sa !== sb) return sb - sa;
    return 0;
  });
}

module.exports = { sortTeams };
