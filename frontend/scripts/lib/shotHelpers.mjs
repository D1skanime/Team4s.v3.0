// Helpers extracted from shot-projectmember.mjs (Plan 157-13, GAP-02 V3/V4 closure).
//
// shot-projectmember.mjs sat at 449/450 production lines after plan 157-11 -- the 450-line cap
// left no room for the new dot/line-color diagnostics this plan adds. Per this plan's own
// acceptance criteria ("if the file would exceed 450 lines, extract ... into
// frontend/scripts/lib/shotHelpers.mjs"), the SHOT_VERIFY_HERO-gated hero-verification block is
// moved here verbatim (straight cut-paste, no behavior change) to make room. The new
// lineColor/dotSizes/dotOverflow diagnostics themselves stay inline in shot-projectmember.mjs, in
// the same style as the pre-existing noteAccentColorSamples/noteBorderUniformity checks.

// Runs the SHOT_VERIFY_HERO=1 hero-layout/accessibility/container-query/zoom-reflow verification
// pass. Unchanged from its prior inline location in shot-projectmember.mjs (Workstream A/157-06) --
// this is a pure relocation, not a rewrite.
export async function runHeroVerification({ page, facts, name, width, require, consoleErrors, OUT, LABEL }) {
  if (process.env.SHOT_VERIFY_HERO === '1') {
    if (facts.horizontalOverflow || !facts.heroActionsInBounds || facts.statBarEntryCount !== 0 || facts.summaryBandText !== null) {
      throw new Error(`Hero layout regression at ${name}: ${JSON.stringify(facts)}`)
    }
    if (facts.contentTop > (width < 600 ? 530 : 440)) {
      throw new Error(`Contribution content starts too late at ${name}: ${facts.contentTop}px`)
    }
  }
  if (process.env.SHOT_VERIFY_HERO === '1' && name === 'desktop') {
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
    const accessibility = await page.evaluate(async () => {
      const result = await window.axe.run(document.querySelector('section[aria-label="Projekt-Mitwirkung"]'), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      })
      return result.violations.map(({ id, description }) => ({ id, description }))
    })
    if (accessibility.length) throw new Error(JSON.stringify(accessibility))
    facts.heroAccessibilityViolations = accessibility
    const normalErrorCount = consoleErrors.length
    await page.route('**/_next/image*', (route) => route.abort())
    await page.reload({ waitUntil: 'networkidle' })
    await page.locator('section[aria-label="Projekt-Mitwirkung"] [class*="artwork"] img').waitFor({ state: 'detached' })
    facts.failedArtworkFallsBackToNeutral = await page.locator('section[aria-label="Projekt-Mitwirkung"] a').count() === 2
    if (!facts.failedArtworkFallsBackToNeutral) throw new Error('Artwork failure removed hero actions')
    await page.screenshot({ path: `${OUT}/${LABEL}-neutral.png`, fullPage: false })
    facts.expectedImageFailureErrors = consoleErrors.splice(normalErrorCount)
    facts.containerChecks = []
    for (const containerWidth of [320, 767, 768, 769]) {
      const geometry = await page.evaluate((targetWidth) => {
        const hero = document.querySelector('section[aria-label="Projekt-Mitwirkung"]')
        hero.style.width = `${targetWidth}px`
        hero.querySelector('h1').textContent = 'SehrLangerZusammenhängenderMembernameFürLayoutprüfung'
        hero.querySelector('p').textContent = 'Ein besonders langer Projektname mit mehreren Wörtern · Eine unabhängige Fansub-Gruppe'
        hero.querySelector('[data-role-code]').textContent = 'Qualitätsprüfung und technische Nachkontrolle'
        if (hero.querySelectorAll('[data-role-code]').length === 1) {
          const extraRole = hero.querySelector('[data-role-code]').cloneNode(true)
          extraRole.textContent = 'Übersetzung'
          hero.querySelector('[data-role-code]').parentElement.append(extraRole)
        }
        for (const [index, dd] of Array.from(hero.querySelectorAll('dd')).entries()) {
          dd.textContent = ['12.345 Folgen', '123.456 Beiträge', '1.234 Medien'][index]
        }
        const bounds = hero.getBoundingClientRect()
        const outside = Array.from(hero.querySelectorAll('a,h1,p,dd,[data-role-code]')).filter((node) => {
          const rect = node.getBoundingClientRect()
          return rect.left < bounds.left || rect.right > bounds.right || node.scrollWidth > node.clientWidth + 1
        }).map((node) => node.textContent)
        return {
          containerWidth: bounds.width,
          viewportWidth: innerWidth,
          detailsColumn: getComputedStyle(hero.querySelector('[class*="details"]')).gridColumnStart,
          overflow: document.documentElement.scrollWidth > innerWidth,
          outside,
        }
      }, containerWidth)
      if (geometry.outside.length || geometry.overflow) throw new Error(JSON.stringify(geometry))
      if (geometry.detailsColumn !== (containerWidth < 768 ? '1' : '2')) throw new Error(`Container query inactive: ${JSON.stringify(geometry)}`)
      facts.containerChecks.push(geometry)
    }
    await page.screenshot({ path: `${OUT}/${LABEL}-embedded-long-labels.png`, fullPage: false })
    // 1440px at 200% browser zoom has the same 720 CSS-pixel reflow width.
    await page.setViewportSize({ width: 720, height: 450 })
    await page.evaluate(() => {
      document.querySelector('section[aria-label="Projekt-Mitwirkung"]').style.width = ''
    })
    facts.zoomReflowOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    if (facts.zoomReflowOverflow) throw new Error('200% equivalent reflow overflow')
  }
}
