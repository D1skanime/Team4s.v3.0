import { chromium } from 'playwright'

const FRONTEND_URL = 'http://localhost:3002/admin/anime/25/edit'
const COVER_FILE = 'C:/Users/D1sk/Documents/Entwicklung/Opencloud/Team4s.v3.0/media/anime/25/poster/4bbaf934-ca8e-43d3-9d74-761984a5d6be/original.jpg'
const OUT_DIR = 'C:/Users/D1sk/Documents/Entwicklung/Opencloud/Team4s.v3.0/frontend/tmp-playwright-phase4'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function waitForText(locator, expected, timeout = 30000) {
  await locator.waitFor({ state: 'visible', timeout })
  await locator.page().waitForFunction(
    ({ selector, expectedText }) => {
      const node = document.querySelector(selector)
      return node && node.textContent && node.textContent.includes(expectedText)
    },
    { selector: await locator.evaluate((node) => {
      if (!node.id) {
        node.id = `pw-${Math.random().toString(36).slice(2)}`
      }
      return `#${node.id}`
    }), expectedText: expected },
    { timeout },
  )
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 2200 } })

try {
  await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 120000 })
  await page.getByText('Jellyfin Provenance').waitFor({ state: 'visible', timeout: 120000 })

  const coverCard = page.locator('[class*="assetCard"]').filter({ has: page.getByText('Aktives Cover', { exact: true }) }).first()
  const coverRemoveButton = coverCard.getByRole('button', { name: 'Cover entfernen' })
  const coverUploadButton = coverCard.getByRole('button', { name: 'Cover hochladen' })
  const previewButton = page.getByRole('button', { name: 'Metadaten preview laden' })
  const firstFileInput = page.locator('input[type="file"]').nth(0)

  await coverCard.scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${OUT_DIR}/cover-ui-before.png`, fullPage: true })

  assert(await coverCard.getByText('Persistierter Slot aktiv', { exact: true }).isVisible(), 'Expected persisted cover before delete')
  assert(await coverCard.getByText('Manuell', { exact: true }).isVisible(), 'Expected manual badge before delete')

  await coverRemoveButton.click()
  await coverCard.getByText('Kein persistierter Cover-Slot', { exact: true }).waitFor({ state: 'visible', timeout: 30000 })
  await page.screenshot({ path: `${OUT_DIR}/cover-ui-after-delete.png`, fullPage: true })

  await coverUploadButton.waitFor({ state: 'visible', timeout: 30000 })
  await firstFileInput.setInputFiles(COVER_FILE)
  await coverCard.getByText('Persistierter Slot aktiv', { exact: true }).waitFor({ state: 'visible', timeout: 60000 })
  await coverCard.getByText('Manuell', { exact: true }).waitFor({ state: 'visible', timeout: 30000 })
  await page.screenshot({ path: `${OUT_DIR}/cover-ui-after-upload.png`, fullPage: true })

  await previewButton.click()
  await page.getByText('Preview-Entscheidung').waitFor({ state: 'visible', timeout: 30000 })
  await page.getByText('Manuelles Cover bleibt geschuetzt, bis es explizit ersetzt wird').waitFor({ state: 'visible', timeout: 30000 })
  await page.screenshot({ path: `${OUT_DIR}/cover-ui-after-preview.png`, fullPage: true })

  console.log(JSON.stringify({
    ok: true,
    checks: [
      'initial manual cover visible',
      'cover delete cleared persisted slot',
      'cover upload restored manual persisted slot',
      'preview shows manual cover protection text',
    ],
    screenshots: [
      `${OUT_DIR}/cover-ui-before.png`,
      `${OUT_DIR}/cover-ui-after-delete.png`,
      `${OUT_DIR}/cover-ui-after-upload.png`,
      `${OUT_DIR}/cover-ui-after-preview.png`,
    ],
  }, null, 2))
} finally {
  await browser.close()
}
