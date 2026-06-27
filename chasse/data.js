'use strict';

// Source unique : équipes, énigmes, QR codes, réponses.
// Ne jamais exposer ce fichier au client.

const TEAM_COLORS = [
  // 10 couleurs originales
  { id: 'rouge',     name: 'Rouge',      hex: '#dc2626' },
  { id: 'bleu',      name: 'Bleu',       hex: '#2563eb' },
  { id: 'vert',      name: 'Vert',       hex: '#16a34a' },
  { id: 'jaune',     name: 'Jaune',      hex: '#ca8a04' },
  { id: 'violet',    name: 'Violet',     hex: '#7c3aed' },
  { id: 'orange',    name: 'Orange',     hex: '#ea580c' },
  { id: 'rose',      name: 'Rose',       hex: '#db2777' },
  { id: 'noir',      name: 'Noir',       hex: '#374151' },
  { id: 'cyan',      name: 'Cyan',       hex: '#0891b2' },
  { id: 'marron',    name: 'Marron',     hex: '#92400e' },
  // 10 nouvelles (⚠️ ajuster selon les bracelets achetés)
  { id: 'blanc',     name: 'Blanc',      hex: '#d1d5db' },
  { id: 'gris',      name: 'Gris',       hex: '#6b7280' },
  { id: 'turquoise', name: 'Turquoise',  hex: '#0d9488' },
  { id: 'indigo',    name: 'Indigo',     hex: '#4338ca' },
  { id: 'lime',      name: 'Lime',       hex: '#65a30d' },
  { id: 'emeraude',  name: 'Émeraude',   hex: '#059669' },
  { id: 'ambre',     name: 'Ambre',      hex: '#d97706' },
  { id: 'lilas',     name: 'Lilas',      hex: '#9333ea' },
  { id: 'bleu-ciel', name: 'Bleu ciel',  hex: '#0284c7' },
  { id: 'or',        name: 'Or',         hex: '#b45309' },
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
    hasAnswer: true,
    answer: '60',
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
