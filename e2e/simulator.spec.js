import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://www.googletagmanager.com/**', route => route.abort());
  await page.goto('/');
  await expect(page.locator('#final-id')).not.toHaveValue('');
});

test.describe('layout', () => {
  test('shows the generated ID before the bit visualization', async ({ page }) => {
    const resultBox = await page.locator('.result-panel').boundingBox();
    const vizBox = await page.locator('.visualization').boundingBox();

    expect(resultBox.y).toBeLessThan(vizBox.y);
  });

  test('does not overflow horizontally', async ({ page }) => {
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('fits the largest 19-digit ID inside the result field', async ({ page }) => {
    await page.locator('#final-id').fill('9999999999999999999');

    const fits = await page.locator('#final-id').evaluate(el => el.scrollWidth <= el.clientWidth);
    expect(fits).toBe(true);
  });
});

test.describe('ID decoding', () => {
  test('decodes a pasted ID into timestamp and sequence', async ({ page }) => {
    await page.locator('#final-id').fill('1');

    await expect(page.locator('#timestamp')).toHaveValue('0');
    await expect(page.locator('#sequence')).toHaveValue('1');
    await expect(page.locator('#sequence-value')).toHaveText('1');
  });
});

test.describe('invalid bit layout', () => {
  test('explains why the ID is disabled and clears when fixed', async ({ page }) => {
    await page.locator('#config-toggle').click();
    await page.locator('#bits-seq').fill('11');

    const status = page.locator('#result-status');
    await expect(status).toBeVisible();
    await expect(status).toHaveText('Bits add up to 63 of 64. Adjust the layout to generate an ID.');
    await expect(page.locator('#final-id')).toBeDisabled();

    await page.locator('#bits-seq').fill('12');

    await expect(status).toBeEmpty();
    await expect(page.locator('#final-id')).toBeEnabled();
  });
});

test.describe('accessibility', () => {
  test('theme switcher exposes a radio group', async ({ page }) => {
    const group = page.getByRole('radiogroup', { name: 'Theme selection' });
    await expect(group.getByRole('radio')).toHaveCount(3);

    await page.getByRole('radio', { name: 'Dark mode' }).click();

    await expect(page.getByRole('radio', { name: 'Dark mode' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('epoch presets expose their pressed state', async ({ page }) => {
    const unix = page.getByRole('button', { name: 'Unix' });
    await unix.click();

    await expect(unix).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Twitter' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('copy confirmation is announced politely', async ({ page }) => {
    await expect(page.locator('#copy-text')).toHaveAttribute('aria-live', 'polite');

    await page.locator('#btn-copy').click();

    await expect(page.locator('#copy-text')).toHaveText('Copied!');
  });

  test('theme radios move with arrow keys and show focus', async ({ page }) => {
    await page.getByRole('radio', { name: 'Light mode' }).focus();
    await page.keyboard.press('ArrowRight');

    const dark = page.getByRole('radio', { name: 'Dark mode' });
    await expect(dark).toBeFocused();
    await expect(dark).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await dark.evaluate(el => el.matches(':focus-visible'))).toBe(true);
  });

  test('disables transitions when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();

    const transition = await page.locator('.theme-btn').first().evaluate(
      el => getComputedStyle(el).transitionProperty
    );
    expect(transition).toBe('none');
  });
});

test.describe('sliders', () => {
  test('track shows the filled portion of the value', async ({ page }) => {
    const slider = page.locator('#sequence');
    await slider.fill('2048');

    const fill = await slider.evaluate(el => parseFloat(el.style.getPropertyValue('--fill')));
    expect(fill).toBeCloseTo(50, 0);
  });
});

test.describe('worker segments', () => {
  test('keep their colors when another segment is removed', async ({ page }) => {
    await page.locator('#config-toggle').click();
    await page.locator('#btn-add-segment').click();

    const rows = page.locator('.worker-segment-row');
    await expect(rows).toHaveCount(2);

    const colorOf = row => row.locator('.segment-color-dot').evaluate(el => el.style.backgroundColor);
    const secondColor = await colorOf(rows.nth(1));

    await rows.nth(0).locator('.btn-remove-segment').click();

    await expect(rows).toHaveCount(1);
    expect(await colorOf(rows.nth(0))).toBe(secondColor);
  });
});
