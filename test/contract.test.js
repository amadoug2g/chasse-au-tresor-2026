'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { TEAM_COLORS, ENIGMAS, ENIGMA_QR } = require('../chasse/data');

describe('Contrat données (anti-divergence)', () => {
  it('ENIGMAS contient exactement 10 entrées', () => {
    assert.equal(ENIGMAS.length, 10);
  });
  it('ENIGMA_QR contient exactement 10 QR codes', () => {
    assert.equal(ENIGMA_QR.length, 10);
  });
  it('ENIGMA_QR est dérivé de ENIGMAS (index = n-1)', () => {
    ENIGMAS.forEach((e, i) => {
      assert.equal(ENIGMA_QR[i], e.qr, `ENIGMA_QR[${i}] doit être ${e.qr}`);
    });
  });
  it('QR codes uniques', () => {
    const unique = new Set(ENIGMA_QR);
    assert.equal(unique.size, ENIGMA_QR.length, 'Des QR codes sont en double !');
  });
  it('Numéros d\'énigmes de 1 à 10 consécutifs', () => {
    const nums = ENIGMAS.map(e => e.n).sort((a,b) => a-b);
    assert.deepEqual(nums, [1,2,3,4,5,6,7,8,9,10]);
  });
  it('Aucune énigme n\'a hasAnswer (scan QR uniquement)', () => {
    ENIGMAS.forEach(e => {
      assert.ok(!e.hasAnswer, `énigme ${e.n} ne doit pas avoir hasAnswer`);
      assert.ok(!e.answer,    `énigme ${e.n} ne doit pas avoir answer`);
    });
  });
  it('Énigmes 8,9,10 sont isImageOnly avec imageRef', () => {
    [8, 9, 10].forEach(n => {
      const e = ENIGMAS.find(x => x.n === n);
      assert.ok(e.isImageOnly, `énigme ${n} doit être isImageOnly`);
      assert.equal(e.imageRef, n);
    });
  });
  it('TEAM_COLORS a exactement 10 couleurs', () => {
    assert.equal(TEAM_COLORS.length, 10);
  });
  it('IDs de couleur uniques', () => {
    const ids = TEAM_COLORS.map(c => c.id);
    assert.equal(new Set(ids).size, ids.length, 'Des IDs de couleur sont en double !');
  });
  it('Hex de couleur valides', () => {
    const hexRe = /^#[0-9a-f]{6}$/i;
    TEAM_COLORS.forEach(c => {
      assert.ok(hexRe.test(c.hex), `Couleur invalide : ${c.id} → "${c.hex}"`);
    });
  });
  it('Aucun champ qr/answer dans un objet display généré', () => {
    // Simuler ce que le build génère
    const displayEnigmas = ENIGMAS.map(({ n, title, text, hint, isImageOnly, imageRef, hasAnswer }) => {
      const obj = { n, title: title || '', text: text || '', hint: hint || '' };
      if (isImageOnly) obj.isImageOnly = true;
      if (imageRef)    obj.imageRef    = imageRef;
      if (hasAnswer)   obj.hasAnswer   = true;
      return obj;
    });
    displayEnigmas.forEach(e => {
      assert.ok(!('qr' in e),     `énigme ${e.n} : "qr" ne doit pas figurer dans display`);
      assert.ok(!('answer' in e), `énigme ${e.n} : "answer" ne doit pas figurer dans display`);
    });
  });
});
