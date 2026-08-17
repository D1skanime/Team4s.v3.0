const { chromium } = require('/app/node_modules/playwright')
const fs = require('fs')

const outputRoot = '/tmp/rps-evidence'
const sizes = [[390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]]

async function audit(page) {
  return page.evaluate(() => {
    const root = document.documentElement
    const selectors = ['main', '[class*=heroPanel]', '[class*=sectionPair]', '[class*=familyCard]', '[class*=carouselShell]', '[aria-roledescription="Karussell"]']
    const rects = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)).map((element) => {
      const rect = element.getBoundingClientRect()
      return { selector, text: (element.textContent || '').trim().slice(0, 80), left: rect.left, right: rect.right, width: rect.width, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }
    }))
    return { url: location.href, clientWidth: root.clientWidth, scrollWidth: root.scrollWidth, offenders: rects.filter((rect) => rect.left < -0.5 || rect.right > root.clientWidth + 0.5 || rect.scrollWidth > rect.clientWidth + 1), rects }
  })
}

;(async () => {
  const mode = process.argv[2] || 'baseline'
  const browser = await chromium.launch({ headless: true })
  const selected = mode === 'baseline' ? [[768, 1024]] : sizes
  for (const [width, height] of selected) {
    const page = await browser.newPage({ viewport: { width, height } })
    await page.route('**/*', (route) => ['image', 'media', 'font'].includes(route.request().resourceType()) ? route.abort() : route.continue())
    await page.goto('http://172.17.0.1:3000/members/sheppert', { waitUntil: 'commit', timeout: 15000 })
    await page.waitForTimeout(3000)
    const metrics = await audit(page)
    console.log(width, height, metrics.clientWidth, metrics.scrollWidth, await page.evaluate(() => document.documentElement.scrollHeight))
    fs.writeFileSync(`${outputRoot}/${mode === 'baseline' ? 'diagnosis' : 'uat'}/${width}x${height}.json`, JSON.stringify(metrics, null, 2))
    if (mode !== 'audit') {
      const session = await page.context().newCDPSession(page)
      const shot = await session.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true })
      fs.writeFileSync(`${outputRoot}/${mode === 'baseline' ? 'diagnosis' : 'uat'}/${width}x${height}.png`, Buffer.from(shot.data, 'base64'))
      await session.detach()
    }
    fs.writeFileSync(`${outputRoot}/${mode === 'baseline' ? 'diagnosis' : 'uat'}/${width}x${height}.json`, JSON.stringify(await audit(page), null, 2))
  }
  process.exit(0)
})().catch((error) => { console.error(error); process.exit(1) })
