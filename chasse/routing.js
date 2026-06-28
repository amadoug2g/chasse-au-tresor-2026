'use strict';

const { ENIGMAS, ENIGMA_QR } = require('./data');

// Génère la route (ordre des énigmes) pour une équipe.
// teamIndex 0-based ; résultat : tableau de 10 numéros d'énigmes (1-10).
function genRoute(teamIndex) {
  const route = [];
  for (let j = 0; j < 10; j++) route.push(((teamIndex + j) % 10) + 1);
  return route;
}

// Retourne le QR attendu pour l'étape courante de l'équipe.
function expectedQrForStep(team) {
  const enigmaNum = team.route[team.currentStep - 1];
  return ENIGMA_QR[enigmaNum - 1];
}

// Autorité unique d'affichage : calcule l'objet display à envoyer au client.
// Ne contient jamais de qr ni answer.
// enigmaOverrides : objet keyed par n → {title,text,hint} partiel (depuis state)
function currentDisplay(team, enigmaOverrides) {
  if (team.finishedAt) {
    return {
      finished: true,
      stepLabel: 'Terminé !',
      stepIndex: team.route.length + 1,
      totalSteps: team.route.length,
      progressPct: 100,
    };
  }
  const step = team.currentStep;           // 1-based
  const enigmaNum = team.route[step - 1];  // 0-based index dans route
  const base = ENIGMAS.find(e => e.n === enigmaNum);
  if (!base) throw new Error(`Enigme ${enigmaNum} introuvable (step=${step})`);
  const ov = (enigmaOverrides || {})[enigmaNum] || {};

  return {
    finished: false,
    stepLabel: `Énigme ${step} sur ${team.route.length}`,
    stepIndex: step,
    totalSteps: team.route.length,
    enigmaNum,
    title:      ov.title !== undefined ? ov.title : (base.title || ''),
    text:       ov.text  !== undefined ? ov.text  : (base.text  || ''),
    hint:       ov.hint  !== undefined ? ov.hint  : (base.hint  || ''),
    isImageOnly: !!base.isImageOnly,
    imageRef: base.imageRef || null,
    hasAnswer: !!base.hasAnswer,
    progressPct: Math.round(team.completedSteps.length / team.route.length * 100),
  };
}

function progressPct(completedCount, total) {
  if (!total) return 0;
  return Math.round(completedCount / total * 100);
}

function isFinished(team) {
  return !!team.finishedAt;
}

module.exports = { genRoute, expectedQrForStep, currentDisplay, progressPct, isFinished };
