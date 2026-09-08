import { test, expect } from '@playwright/test';

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

    // Fill form for a new Doctor
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

    // Verify Dr. Raymond Shaw is now in directory
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

    // Lab should see only own uploaded plates
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

  test('3. Doctor Flow: Annotate pending histopathology slide in canvas studio', async ({ page }) => {
    // Switch to Doctor role
    await page.locator('#role-switcher-btn').click();
    await page.locator('#switch-role-doctor').click();

    // Verify Doctor Workstation is visible
    await expect(page.locator('h1')).toContainText('Pathologist Annotation Workstation');

    // Strict access control: Lab uploads and AI Prediction tabs MUST NOT be visible
    await expect(page.locator('#nav-lab')).not.toBeVisible();
    await expect(page.locator('#nav-prediction')).not.toBeVisible();
    await expect(page.locator('#nav-admin')).not.toBeVisible();

    // Verify queue exists
    await expect(page.locator('#annotation-canvas')).toBeVisible();

    // Select Gleason Pattern 4 label
    await page.locator('#label-select-gleason_4').click();

    // Draw on canvas (simulate polygon clicks)
    const canvas = page.locator('#annotation-canvas');
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + 100, box.y + 100);
      await page.mouse.click(box.x + 200, box.y + 100);
      await page.mouse.click(box.x + 200, box.y + 200);
      await page.mouse.click(box.x + 100, box.y + 100); // close polygon
    }

    // Set clinical notes
    await page.locator('#input-clinical-notes').fill('Marked cribriform pattern 4 confirmed.');
    await page.locator('#btn-submit-annotation').click();

    // Verify submission feedback
    await expect(page.getByText('Annotation successfully committed')).toBeVisible();
  });

  test('4. End User Flow: Self-registration and AI Biopsy Prediction inference', async ({ page }) => {
    // Open Auth modal
    await page.locator('#btn-open-auth-modal').click();
    await page.locator('#auth-tab-register').click();

    // Complete self-registration
    await page.locator('#reg-fullname-input').fill('Alice Patient');
    await page.locator('#reg-email-input').fill('alice.patient@example.com');
    await page.locator('#reg-password-input').fill('SecurePassword123!');
    await page.locator('#btn-register-submit').click();

    // Should navigate automatically to AI Prediction portal
    await expect(page.locator('h1')).toContainText('Prostate Cancer Histopathology AI Prediction');

    // Strict access control: End user MUST NOT have access to Admin, Lab, or Doctor tabs
    await expect(page.locator('#nav-admin')).not.toBeVisible();
    await expect(page.locator('#nav-lab')).not.toBeVisible();
    await expect(page.locator('#nav-doctor')).not.toBeVisible();
    await expect(page.locator('#nav-prediction')).toBeVisible();

    // Load sample slide
    await page.locator('#btn-sample-slide').click();
    await expect(page.getByText('Calibrated Sample Histology Core')).toBeVisible();

    // Run AI Inference
    await page.locator('#btn-run-prediction').click();

    // Verify results
    await expect(page.getByText('Pathological Risk Assessment')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('MALIGNANCY RISK PROBABILITY')).toBeVisible();
    await expect(page.getByText('ESTIMATED GLEASON GRADING')).toBeVisible();
    await expect(page.getByText('Histological Tissue Composition')).toBeVisible();
    await expect(page.locator('#btn-download-report')).toBeVisible();
  });
});
