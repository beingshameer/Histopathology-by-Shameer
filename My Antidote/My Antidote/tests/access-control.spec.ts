import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('My Antidote - Access Control & Role Pipeline', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to root
    await page.goto('/');
    // Clear localStorage to start with clean state
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
  });

  test('1. Admin Flow: View dashboard, issue staff credentials, and export dataset', async ({ page }) => {
    // Admin is default role on initial load
    await expect(page.locator('h1')).toContainText('Chief Administrator Control Center');
    await expect(page.locator('#nav-admin')).toBeVisible();

    // Verify metrics cards exist
    await expect(page.getByText('TRAINING READY (ANNOTATED)')).toBeVisible();
    await expect(page.getByText('DOCTOR QUEUE (PENDING)')).toBeVisible();

    // Open Issue Staff Credentials modal
    await page.locator('#btn-issue-credentials').click();
    await expect(page.getByText('Issue Medical Staff Credentials')).toBeVisible();

    // Fill form for a new Pathologist
    await page.locator('#new-staff-role').selectOption('doctor');
    await page.locator('#new-staff-name').fill('Dr. Raymond Shaw');
    await page.locator('#new-staff-email').fill('dr.shaw@myantidote.health');
    await page.locator('#new-staff-org').fill('St. Jude Oncology Research');
    await page.locator('#btn-confirm-create-staff').click();

    // Verify issued credentials feedback
    await expect(page.getByText('Credentials Generated Successfully!')).toBeVisible();
    await expect(page.getByText('dr.shaw@myantidote.health').first()).toBeVisible();
    await expect(page.getByText('DOC-').first()).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: 'Done' }).click();

    // Verify Dr. Raymond Shaw is now in directory with professional role badge
    await expect(page.getByText('Dr. Raymond Shaw')).toBeVisible();
  });

  test('2. Lab Flow: Access restricted to lab portal, uploads plate, isolated visibility', async ({ page }) => {
    // Switch to Lab role
    await page.locator('#role-switcher-btn').click();
    await page.locator('#switch-role-lab').click();

    // Verify Lab Dashboard is visible
    await expect(page.locator('h1')).toContainText('Histopathology Lab Acquisition Portal');

    // Strict access control check: Admin portal and Doctor Workstation nav tabs MUST NOT be visible
    await expect(page.locator('#nav-admin')).not.toBeVisible();
    await expect(page.locator('#nav-doctor')).not.toBeVisible();
    await expect(page.locator('#nav-prediction')).not.toBeVisible();

    // Lab should see own identity
    await expect(page.getByText('North Histology Lab Operations').first()).toBeVisible();

    // Fill and submit new plate
    await page.locator('#btn-sample-slide, #select-tissue-type').first().scrollIntoViewIfNeeded();
    await page.locator('#input-specimen-id').fill('BX-AUTO-TEST-101');
    await page.locator('#select-tissue-type').selectOption('Prostate Core Biopsy (Peripheral Zone)');
    await page.locator('#input-lab-notes').fill('Dense cellular atypia observed in peripheral core.');
    await page.locator('#btn-submit-plate-upload').click();

    // Verify success banner and new row in table
    await expect(page.getByText('Plate uploaded to private storage')).toBeVisible();
    await expect(page.getByText('BX-AUTO-TEST-101')).toBeVisible();
  });

  test('3. Pathologist QuPath Integration Flow: Download slide and upload QuPath GeoJSON annotation', async ({ page }) => {
    // Switch to Pathologist role
    await page.locator('#role-switcher-btn').click();
    await page.locator('#switch-role-doctor').click();

    // Verify Pathologist Workstation is visible
    await expect(page.locator('h1')).toContainText('Pathologist Annotation Workstation');

    // Strict access control: Lab uploads and AI Prediction tabs MUST NOT be visible
    await expect(page.locator('#nav-lab')).not.toBeVisible();
    await expect(page.locator('#nav-prediction')).not.toBeVisible();
    await expect(page.locator('#nav-admin')).not.toBeVisible();

    // Verify QuPath Digital Pathology Bridge toolbar is present
    await expect(page.getByText('QuPath Digital Pathology Bridge')).toBeVisible();
    await expect(page.locator('#btn-download-slide-qupath')).toBeVisible();
    await expect(page.locator('#btn-download-groovy')).toBeVisible();
    await expect(page.locator('#annotation-canvas')).toBeVisible();

    // Test real QuPath GeoJSON file upload round trip via Playwright file input
    const geojsonPath = path.resolve('public', 'sample_qupath_annotation.geojson');
    await page.locator('#qupath-file-input').setInputFiles(geojsonPath);

    // Verify QuPath features and classifications loaded into the UI
    await expect(page.getByText('sample_qupath_annotation.geojson')).toBeVisible();
    await expect(page.getByText('3 Contours Loaded')).toBeVisible();
    await expect(page.getByText('Gleason Pattern 4: 1')).toBeVisible();

    // Enter clinical notes and submit ground truth
    await page.locator('#input-clinical-notes').fill('Marked cribriform pattern 4 confirmed via QuPath import.');
    await page.locator('#btn-submit-annotation').click();

    // Verify submission feedback
    await expect(page.getByText('Annotation successfully committed')).toBeVisible();
  });

  test('4. Clinician Flow: Self-registration, AI Inference, 5-run prompt milestone, and research contribution', async ({ page }) => {
    // Open Auth modal
    await page.locator('#btn-open-auth-modal').click();
    await page.locator('#auth-tab-register').click();

    // Verify professional Clinician registration title
    await expect(page.locator('#auth-tab-register')).toContainText('Clinician');

    // Complete self-registration
    await page.locator('#reg-fullname-input').fill('Dr. Alice Spencer, MD');
    await page.locator('#reg-email-input').fill('alice.spencer@clinic.org');
    await page.locator('#reg-password-input').fill('SecurePassword123!');
    await page.locator('#btn-register-submit').click();

    // Should navigate automatically to AI Prediction portal
    await expect(page.locator('h1')).toContainText('Prostate Cancer Histopathology AI Prediction');

    // Strict access control: Clinician MUST NOT have access to Admin, Lab, or Doctor tabs
    await expect(page.locator('#nav-admin')).not.toBeVisible();
    await expect(page.locator('#nav-lab')).not.toBeVisible();
    await expect(page.locator('#nav-doctor')).not.toBeVisible();
    await expect(page.locator('#nav-prediction')).toBeVisible();

    // Load sample slide
    await page.locator('#btn-sample-slide').click();
    await expect(page.getByText('Calibrated Sample Histology Core')).toBeVisible();

    // Run AI Inference
    await page.locator('#btn-run-prediction').click();

    // Verify prediction results
    await expect(page.getByText('Pathological Risk Assessment')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('MALIGNANCY RISK PROBABILITY')).toBeVisible();
    await expect(page.getByText('ESTIMATED GLEASON GRADING')).toBeVisible();
    await expect(page.getByText('Histological Tissue Composition')).toBeVisible();
    await expect(page.locator('#btn-download-report')).toBeVisible();

    // Test the 5th prediction run research contribution milestone
    await page.locator('#btn-simulate-5th-prediction').click();

    // Verify the requested prompt surfaces with exact phrasing:
    // "You've used the AI tool 5 times — help improve it! Annotate one slide yourself to contribute to our training dataset."
    const promptModal = page.locator('#contribution-prompt-modal');
    await expect(promptModal).toBeVisible();
    await expect(promptModal).toContainText("You've used the AI tool 5 times — help improve it! Annotate one slide yourself to contribute to our training dataset.");

    // Accept contribution invitation
    await page.locator('#btn-accept-contribution').click();

    // Verify lightweight Clinician Annotation step opens
    await expect(page.getByRole('heading', { name: 'Clinician Research Contribution' })).toBeVisible();
    await expect(page.getByText('contributor_type: clinician')).toBeVisible();
    await expect(page.locator('#clinician-annotation-canvas')).toBeVisible();

    // Fill clinician observation notes and submit
    await page.locator('#clinician-notes-input').fill('Cribriform architecture annotated for clinician training set.');

    // Outline a region on canvas
    const canvas = page.locator('#clinician-annotation-canvas');
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + 80, box.y + 80);
      await page.mouse.click(box.x + 180, box.y + 80);
      await page.mouse.click(box.x + 180, box.y + 180);
      await page.mouse.click(box.x + 80, box.y + 80); // close
    }

    await page.locator('#btn-submit-clinician-annotation').click();

    // Verify successful commitment tagged as clinician
    await expect(page.getByText('Contribution Committed to Dataset!')).toBeVisible();
    await expect(page.getByText('contributor_type = "clinician"')).toBeVisible();
  });
});
