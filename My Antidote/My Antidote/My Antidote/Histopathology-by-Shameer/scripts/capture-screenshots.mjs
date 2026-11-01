import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Lenovo L14 A&I/.gemini/antigravity-ide/brain/bb021e6a-b73d-413f-9264-559aad1885f7';

async function capture() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1380, height: 860 } });
  const page = await context.newPage();

  // 1. Admin Dashboard
  await page.goto('http://localhost:5173/');
  await page.waitForSelector('h1');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'admin_dashboard.png'), fullPage: false });
  console.log('Saved admin_dashboard.png');

  // 2. Lab Dashboard
  await page.locator('#role-switcher-btn').click();
  await page.locator('#switch-role-lab').click();
  await page.waitForSelector('#btn-submit-plate-upload');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'lab_dashboard.png'), fullPage: false });
  console.log('Saved lab_dashboard.png');

  // 3. Doctor Workstation
  await page.locator('#role-switcher-btn').click();
  await page.locator('#switch-role-doctor').click();
  await page.waitForSelector('#annotation-canvas');
  await page.waitForTimeout(600); // allow canvas to render slide
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'doctor_workstation.png'), fullPage: false });
  console.log('Saved doctor_workstation.png');

  // 4. End User Prediction
  await page.locator('#role-switcher-btn').click();
  await page.locator('#switch-role-enduser').click();
  await page.waitForSelector('#btn-run-prediction');
  // Load sample and run inference
  await page.locator('#btn-sample-slide').click();
  await page.locator('#btn-run-prediction').click();
  await page.waitForSelector('#btn-download-report', { timeout: 10000 });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'prediction_portal.png'), fullPage: false });
  console.log('Saved prediction_portal.png');

  await browser.close();
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
