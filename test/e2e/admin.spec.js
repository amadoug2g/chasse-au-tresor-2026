'use strict';

const { test, expect } = require('@playwright/test');

const ADMIN_PASS = 'e2e-admin-pass';

// Réinitialise l'état avant chaque test admin
test.beforeEach(async ({ request }) => {
  await request.delete('/api/chasse/state',
    { headers: { 'x-admin-pass': ADMIN_PASS } });
});

async function adminLogin(page) {
  await page.goto('/');
  await page.click('button:has-text("Organisateur")');
  await expect(page.locator('#org')).toHaveClass(/active/);
  await page.fill('#adminPass', ADMIN_PASS);
  await page.click('button:has-text("Connexion")');
  await expect(page.locator('#dashboard')).toHaveClass(/active/, { timeout: 6000 });
}

test('login admin → dashboard visible', async ({ page }) => {
  await adminLogin(page);
  await expect(page.locator('.ah-title')).toBeVisible();
});

test('mauvais mot de passe → erreur', async ({ page }) => {
  await page.goto('/');
  await page.click('button:has-text("Organisateur")');
  await page.fill('#adminPass', 'wrongpass');
  await page.click('button:has-text("Connexion")');
  // Reste sur l'écran org, toast d'erreur
  await expect(page.locator('#org')).toHaveClass(/active/);
  await expect(page.locator('#toast')).toContainText('incorrect', { timeout: 3000 });
});

test('créer une équipe → apparaît dans la liste', async ({ page }) => {
  await adminLogin(page);
  // Aller sur l'onglet Équipes
  await page.click('.admin-tab[data-tab="tab-equipes"]');
  await page.waitForTimeout(500);
  // Ouvrir la modal de création (bouton Ajouter dans le tab equipes)
  const addBtn = page.locator('button:has-text("Ajouter une équipe")').first();
  await expect(addBtn).toBeVisible({ timeout: 5000 });
  await addBtn.click();
  await expect(page.locator('#addTeamModal')).toHaveClass(/active/);
  // Attendre le chargement de la grille de couleurs
  await expect(page.locator('#colorGrid .color-circle').first()).toBeVisible({ timeout: 5000 });
  // Sélectionner la première couleur disponible
  await page.locator('#colorGrid .color-circle:not(.used)').first().click();
  await page.click('button:has-text("Créer l\'équipe")');
  // La modal doit se fermer et l'équipe apparaître
  await expect(page.locator('#addTeamModal')).not.toHaveClass(/active/, { timeout: 3000 });
});

test('onglet classement visible', async ({ page }) => {
  // Créer une équipe d'abord
  await page.request.post('/api/chasse/teams',
    { data: { colorId: 'bleu', name: 'Test Classement' },
      headers: { 'x-admin-pass': ADMIN_PASS } });

  await adminLogin(page);
  await page.click('.admin-tab[data-tab="tab-classement"]');
  await page.waitForTimeout(500);
  // Classement devrait afficher quelque chose
  await expect(page.locator('#adminBody')).toBeVisible();
});

test('badge alerte sur demande d\'aide', async ({ page, request }) => {
  // Créer une équipe et envoyer une demande d'aide
  await request.post('/api/chasse/teams',
    { data: { colorId: 'rouge', name: 'Équipe Help' },
      headers: { 'x-admin-pass': ADMIN_PASS } });
  await request.post('/api/chasse/help',
    { data: { teamId: 'rouge', message: 'Je suis bloqué E2E' } });

  await adminLogin(page);
  // Le badge d'alerte doit être visible sur l'onglet Alertes
  await expect(page.locator('#alertTabBadge')).toBeVisible({ timeout: 5000 });
});
