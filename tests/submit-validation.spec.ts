import { expect, test } from '@playwright/test';

test('Submit form shows inline validation messages by fields and no legacy checklist', async ({ page }) => {
  await page.goto('/submit');

  const submitButton = page.getByRole('button', { name: /submit your work/i });
  await expect(submitButton).toBeVisible();

  // User attempts to submit without filling fields.
  // The form currently disables the button while invalid, so we also dispatch submit to validate inline errors.
  await submitButton.click({ force: true });
  await page.locator('form').evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
  });

  const artistNameField = page.getByLabel(/artist name/i);
  await expect(artistNameField).toBeVisible();
  await expect(artistNameField.locator('..').getByText('Tell me what name you go by as an artist.')).toBeVisible();

  const emailField = page.getByLabel(/email/i);
  await expect(emailField).toBeVisible();
  await expect(emailField.locator('..').getByText(/Drop your email so I can reach you/i)).toBeVisible();

  const bestSongLinkField = page.getByLabel(/best song link/i);
  await expect(bestSongLinkField).toBeVisible();
  await expect(bestSongLinkField.locator('..').getByText(/Link your best song/i)).toBeVisible();

  const locationField = page.getByLabel(/location/i);
  await expect(locationField).toBeVisible();
  await expect(locationField.locator('..').getByText(/Please include your location\./i)).toBeVisible();

  const yearsField = page.getByLabel(/how many years you been at this\?/i);
  await expect(yearsField).toBeVisible();
  await expect(yearsField.locator('..').getByText(/Let me know how long you.?ve been at this\./i)).toBeVisible();

  const spotifyField = page.getByLabel(/spotify \(or soundcloud\)/i);
  await expect(spotifyField).toBeVisible();
  await expect(spotifyField.locator('..').getByText(/Please include a Spotify or SoundCloud link\./i)).toBeVisible();

  const instagramField = page.getByLabel(/instagram \(or tiktok\)/i);
  await expect(instagramField).toBeVisible();
  await expect(instagramField.locator('..').getByText(/I need at least one social handle/i)).toBeVisible();

  const bioField = page.getByLabel(/bio \(or why discovery radio\)/i);
  await expect(bioField).toBeVisible();
  await expect(bioField.locator('..').getByText(/Tell me who you are or why Discovery Radio matters to you\./i)).toBeVisible();

  // Legacy checklist was an old <ul>/<li> block at the bottom of the form; it should no longer exist.
  await expect(page.locator('form ul li')).toHaveCount(0);
});
