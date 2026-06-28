'use strict';

// Source unique : équipes, énigmes, QR codes, réponses.
// Ne jamais exposer ce fichier au client.

const TEAM_COLORS = [
  { id: 'rouge',       name: 'Rouge',             hex: '#ef4444',                   pattern: 'solid'  },
  { id: 'orange',      name: 'Orange',            hex: '#f97316',                   pattern: 'solid'  },
  { id: 'orange-raye', name: 'Orange rayé',       hex: '#f97316', hex2: '#fde047',  pattern: 'stripe' },
  { id: 'jaune-fluo',  name: 'Jaune fluo',        hex: '#d4f000',                   pattern: 'solid'  },
  { id: 'vert-raye',   name: 'Vert rayé',         hex: '#22c55e', hex2: '#a3e635',  pattern: 'stripe' },
  { id: 'bleu-ciel',   name: 'Bleu ciel',         hex: '#38bdf8',                   pattern: 'solid'  },
  { id: 'bleu-marine', name: 'Bleu marine rayé',  hex: '#1e40af', hex2: '#ffffff',  pattern: 'stripe' },
  { id: 'bleu-rose',   name: 'Bleu & rose rayé',  hex: '#1e40af', hex2: '#f43f5e',  pattern: 'stripe' },
  { id: 'rose-raye',   name: 'Rose rayé',         hex: '#f43f5e', hex2: '#ffffff',  pattern: 'stripe' },
  { id: 'marron',      name: 'Marron',            hex: '#292524',                   pattern: 'solid'  },
];

const ENIGMAS = [
  {
    n: 1,
    title: 'Le point de départ',
    text: 'Je suis caché sous les branches. Je ressemble à un arbre, mais je ne pousse pas. Je suis dur comme la pierre ou le métal. Les visiteurs s\'arrêtent pour me regarder.',
    hint: 'Bonne chance !',
    qr: 'PILOTES-ENIGME-1',
  },
  {
    n: 2,
    title: 'Reflets',
    text: 'J\'étais très grand. J\'avais beaucoup de feuilles. On m\'a coupé, mais je suis encore vivant. De petites branches repoussent sur moi.',
    hint: 'Bonne chance !',
    qr: 'PILOTES-ENIGME-2',
  },
  {
    n: 3,
    title: 'Le géant de bois',
    text: 'Je peux être calme ou agitée. Je reflète les arbres et les nuages. On peut y voir des poissons ou des canards. Si tu me touches, tu es mouillée.',
    hint: 'Bonne chance !',
    qr: 'PILOTES-ENIGME-3',
  },
  {
    n: 4,
    title: 'Le ninja caché',
    text: 'J\'ai caché un ninja dans un endroit où :\n• il pleut parfois alors qu\'il est à l\'abri,\n• les murs valent plus cher que certains tableaux,\n• et Google Maps pleure pour trouver l\'adresse.',
    hint: 'Bonne chance !',
    qr: 'PILOTES-ENIGME-4',
  },
  {
    n: 5,
    title: 'Le poteau mystère',
    text: 'Je suis le numéro du poteau. Mon chiffre des dizaines est 6 et mon chiffre des unités est 0. Qui suis-je ?',
    hint: 'Cherche le poteau numéroté 60.',
    qr: 'PILOTES-ENIGME-5',
  },
  {
    n: 6,
    title: 'Les géants de pierre',
    text: 'Le poteau n°56 veut passer entre deux gros géants de pierre. Réussit-il ?',
    hint: 'Retrouve-moi !',
    qr: 'PILOTES-ENIGME-6',
  },
  {
    n: 7,
    title: 'La jungle',
    text: 'Le poteau n°54 est perdu dans la jungle. Quels sont les petits fleurs blancs qui l\'entourent ?',
    hint: 'Retrouve-moi !',
    qr: 'PILOTES-ENIGME-7',
  },
  {
    n: 8,
    title: '',
    text: '',
    hint: '',
    isImageOnly: true,
    imageRef: 8,
    qr: 'PILOTES-ENIGME-8',
  },
  {
    n: 9,
    title: '',
    text: '',
    hint: '',
    isImageOnly: true,
    imageRef: 9,
    qr: 'PILOTES-ENIGME-9',
  },
  {
    n: 10,
    title: '',
    text: '',
    hint: '',
    isImageOnly: true,
    imageRef: 10,
    qr: 'PILOTES-ENIGME-10',
  },
];

// Tableau des QR attendus dans l'ordre des énigmes (index = n-1)
const ENIGMA_QR = ENIGMAS.map(e => e.qr);

module.exports = { TEAM_COLORS, ENIGMAS, ENIGMA_QR };
