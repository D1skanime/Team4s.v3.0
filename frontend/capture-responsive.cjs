const { chromium } = require('playwright')
const fs = require('fs')

const sizes = [
  ['390', 390, 844],
  ['768', 768, 1024],
  ['1024', 1024, 768],
  ['1440', 1440, 900],
  ['1920', 1920, 1080],
]

;(async () => {
  const browser = await chromium.launch({ headless: true })
  for (const [label, width, height] of sizes) {
    const page = await browser.newPage({ viewport: { width, height } })
    await page.goto('http://172.17.0.1:3000/members/sheppert', { waitUntil: 'commit', timeout: 15000 })
    await page.waitForTimeout(2500)
    for (const [heading, key] of [['Beiträge', 'contributions'], ['Mitgliedschaft', 'membership']]) {
      const target = page.locator('h2,h3').filter({ hasText: new RegExp(`^${heading}$`) }).first()
      await target.scrollIntoViewIfNeeded()
      await page.waitForTimeout(200)
      await page.screenshot({ path: `/tmp/sheppert-locked-${key}-${label}.png`, fullPage: false })
    }
    const audit = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }))
    console.log(label, JSON.stringify(audit))
    await page.close()
  }
  await browser.close()
})().catch(error => { console.error(error); process.exit(1) })
