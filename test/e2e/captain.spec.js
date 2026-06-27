'use strict';

const { test, expect } = require('@playwright/test');
const { genRoute }   = require('../../chasse/routing');
const { ENIGMA_QR }  = require('../../chasse/data');

const ADMIN_PASS = 'e2e-admin-pass';

// Réinitialise l'état et crée une équipe avant chaque test
test.beforeEach(async ({ request }) => {
  await request.delete('/api/chasse/state',
    { headers: { 'x-admin-pass': ADMIN_PASS } });
  await request.post('/api/chasse/teams',
    { data: { colorId: 'rouge', name: 'Équipe E2E' },
      headers: { 'x-admin-pass': ADMIN_PASS } });
});

async function joinAndStartGame(page, captainName = 'Alice E2E') {
  await page.goto('/');
  await page.click('button:has-text("Rejoindre")');
  await expect(page.locator('#teamList .team-btn')).toBeVisible({ timeout: 5000 });
  await page.locator('#teamList .team-btn').first().click();
  await expect(page.locator('#joinForm')).toBeVisible();
  await page.fill('#captainName', captainName);
  await page.fill('#captainPhone', '0600000000');
  await page.click('#joinNext');
  await expect(page.locator('#onboarding')).toHaveClass(/active/);
  await page.click('#startBtn');
  await expect(page.locator('#play')).toHaveClass(/active/, { timeout: 8000 });
}

test('écran d\'accueil visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.home-title')).toBeVisible();
  await expect(page.locator('button:has-text("Rejoindre")')).toBeVisible();
});

test('rejoindre une équipe → vue play étape 1', async ({ page }) => {
  await joinAndStartGame(page);
  await expect(page.locator('#playStep')).toHaveText('Énigme 1 sur 10', { timeout: 6000 });
  // Vérifier que le label de l'équipe est visible
  await expect(page.locator('#playTeamName')).toHaveText('Équipe E2E');
});

test('mauvais QR → étape inchangée', async ({ page }) => {
  await joinAndStartGame(page, 'Bob E2E');
  await expect(page.locator('#playStep')).toHaveText('Énigme 1 sur 10', { timeout: 6000 });

  await page.evaluate(() => window.__injectQR('XXXX-XXXX'));
  await page.waitForTimeout(600);
  // Toast d'erreur + étape toujours à 1
  await expect(page.locator('#playStep')).toHaveText('Énigme 1 sur 10');
});

test('parcours 10 étapes — anti-off-by-one', { timeout: 90000 }, async ({ page }) => {
  await joinAndStartGame(page, 'Carol E2E');
  await expect(page.locator('#playStep')).toHaveText('Énigme 1 sur 10', { timeout: 6000 });

  // Équipe rouge = première créée = index 0
  const route = genRoute(0);

  for (let step = 1; step <= 10; step++) {
    const enigmaNum = route[step - 1];
    const qr        = ENIGMA_QR[enigmaNum - 1];

    await page.evaluate((code) => window.__injectQR(code), qr);

    if (step < 10) {
      // Le success overlay dure 1800ms, ensuite l'étape suivante est rendue
      await expect(page.locator('#playStep'))
        .toHaveText(`Énigme ${step + 1} sur 10`, { timeout: 5000 });
    } else {
      // Étape 10 → finish
      await expect(page.locator('#finish'))
        .toHaveClass(/active/, { timeout: 5000 });
      await expect(page.locator('.congrats')).toBeVisible();
    }
  }
});
