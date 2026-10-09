import { describe, expect, it } from 'vitest'

import {
  ZOOM_LEVEL_MAX,
  ZOOM_LEVEL_MIN,
  ZOOM_STEPS,
  clampPanOffset,
  clampZoomLevel,
  computeContainedSize,
  computeDragPanOffset,
  computeWheelZoomLevel,
  computeZoomAroundPointOffset,
  cycleZoomLevel,
  distanceBetweenPoints,
  isZoomed,
  midpointBetweenPoints,
  resetZoomLevel,
  resolvePinchZoomLevel,
  resolveStageSwipeAction,
  resolveStageWheelAction,
} from './mediaViewerZoom'

describe('ZOOM_STEPS / ZOOM_LEVEL_MIN / ZOOM_LEVEL_MAX', () => {
  it('definiert die drei festen Zyklus-Stufen eingepasst/2x/4x und ihre Grenzen', () => {
    expect(ZOOM_STEPS).toEqual([1, 2, 4])
    expect(ZOOM_LEVEL_MIN).toBe(1)
    expect(ZOOM_LEVEL_MAX).toBe(4)
  })
})

describe('clampZoomLevel', () => {
  it('hebt einen zu kleinen Wert auf die eingepasste Mindeststufe an', () => {
    expect(clampZoomLevel(0.3)).toBe(1)
  })

  it('senkt einen zu großen Wert auf die oberste Zyklusstufe ab', () => {
    expect(clampZoomLevel(7)).toBe(4)
  })

  it('lässt einen bereits gültigen Wert unverändert durch', () => {
    expect(clampZoomLevel(2.5)).toBe(2.5)
  })
})

describe('isZoomed', () => {
  it('erkennt die exakte eingepasste Stufe nicht als gezoomt', () => {
    expect(isZoomed(1)).toBe(false)
  })

  it('toleriert eine minimale Abweichung von der eingepassten Stufe als weiterhin nicht gezoomt', () => {
    expect(isZoomed(1.005)).toBe(false)
  })

  it('erkennt eine Stufe oberhalb der Toleranzgrenze als gezoomt', () => {
    expect(isZoomed(1.02)).toBe(true)
  })

  it('erkennt die oberste Zyklusstufe als gezoomt', () => {
    expect(isZoomed(4)).toBe(true)
  })
})

describe('cycleZoomLevel', () => {
  it('zoomt relativ zur eingepassten Größe von eingepasst auf 2x', () => {
    expect(cycleZoomLevel(1)).toBe(2)
  })

  it('zoomt von 2x auf 4x weiter', () => {
    expect(cycleZoomLevel(2)).toBe(4)
  })

  it('springt von der obersten Stufe zurück auf eingepasst', () => {
    expect(cycleZoomLevel(4)).toBe(1)
  })

  it('setzt einen kontinuierlichen Zwischenwert knapp unter 4x auf die nächste feste Stufe fort', () => {
    expect(cycleZoomLevel(2.7)).toBe(4)
  })

  it('behandelt einen Wert knapp unter der obersten Stufe als bereits dort angekommen und springt zurück', () => {
    expect(cycleZoomLevel(3.97)).toBe(1)
  })
})

describe('resetZoomLevel', () => {
  it('setzt die Zoomstufe beim Bildwechsel bedingungslos auf eingepasst zurück', () => {
    expect(resetZoomLevel()).toBe(1)
  })
})

describe('computeContainedSize', () => {
  it('berechnet eine höhenbegrenzte Einpassung, wenn das Bildseitenverhältnis kleiner als das Bühnenverhältnis ist', () => {
    expect(
      computeContainedSize({
        containerWidth: 1000,
        containerHeight: 600,
        naturalWidth: 1200,
        naturalHeight: 800,
      }),
    ).toEqual({ width: 900, height: 600 })
  })

  it('berechnet eine breitenbegrenzte Einpassung, wenn das Bildseitenverhältnis größer als das Bühnenverhältnis ist', () => {
    expect(
      computeContainedSize({
        containerWidth: 1000,
        containerHeight: 600,
        naturalWidth: 2000,
        naturalHeight: 500,
      }),
    ).toEqual({ width: 1000, height: 250 })
  })
})

describe('clampPanOffset', () => {
  it('lässt bei fehlendem Überlauf auf der X-Achse keinerlei Verschiebung zu', () => {
    const result = clampPanOffset({
      containerWidth: 1000,
      containerHeight: 600,
      contentWidth: 800,
      contentHeight: 600,
      offsetX: 500,
      offsetY: 0,
    })
    expect(result.x).toBe(0)
  })

  it('lässt keinen leeren Rand in den sichtbaren Bereich -- der verlangte Wert wird auf den exakten Grenzwert gekappt, nicht auf den angeforderten Wert', () => {
    const result = clampPanOffset({
      containerWidth: 1000,
      containerHeight: 600,
      contentWidth: 1600,
      contentHeight: 600,
      offsetX: 500,
      offsetY: 0,
    })
    expect(result.x).toBe(300)
  })

  it('kappt eine negative Anforderung ebenso symmetrisch auf den negativen Grenzwert', () => {
    const result = clampPanOffset({
      containerWidth: 1000,
      containerHeight: 600,
      contentWidth: 1600,
      contentHeight: 600,
      offsetX: -500,
      offsetY: 0,
    })
    expect(result.x).toBe(-300)
  })

  it('lässt eine Anforderung innerhalb der Grenzen unverändert durch', () => {
    const result = clampPanOffset({
      containerWidth: 1000,
      containerHeight: 600,
      contentWidth: 1600,
      contentHeight: 600,
      offsetX: 150,
      offsetY: 0,
    })
    expect(result.x).toBe(150)
  })

  it('wendet dieselbe Grenzwert-Kappung auch auf der Y-Achse an', () => {
    const result = clampPanOffset({
      containerWidth: 1000,
      containerHeight: 600,
      contentWidth: 1000,
      contentHeight: 1200,
      offsetX: 0,
      offsetY: 500,
    })
    expect(result.y).toBe(300)
  })
})

describe('computeZoomAroundPointOffset', () => {
  it('pannt beim Zoomen exakt in der Bildmitte niemals', () => {
    expect(
      computeZoomAroundPointOffset({
        pointerOffsetFromCenter: 0,
        previousOffset: 0,
        previousLevel: 1,
        nextLevel: 2,
      }),
    ).toBe(0)
  })

  it('verschiebt den Ausschnitt beim Zoomen um einen abseits der Mitte liegenden Zeigerpunkt', () => {
    expect(
      computeZoomAroundPointOffset({
        pointerOffsetFromCenter: 100,
        previousOffset: 0,
        previousLevel: 1,
        nextLevel: 2,
      }),
    ).toBe(-100)
  })

  it('kehrt beim Zurückzoomen auf eingepasst wieder zur zentrierten Position zurück', () => {
    expect(
      computeZoomAroundPointOffset({
        pointerOffsetFromCenter: 100,
        previousOffset: -100,
        previousLevel: 2,
        nextLevel: 1,
      }),
    ).toBe(0)
  })

  it('berechnet den neuen Versatz korrekt bei einem Stufenwechsel zwischen zwei gezoomten Stufen', () => {
    expect(
      computeZoomAroundPointOffset({
        pointerOffsetFromCenter: 50,
        previousOffset: 20,
        previousLevel: 2,
        nextLevel: 4,
      }),
    ).toBe(-10)
  })
})

describe('computeWheelZoomLevel', () => {
  it('zoomt beim Hoch-Scrollen (negatives deltaY) hinein', () => {
    expect(computeWheelZoomLevel(1, -100, 0.01)).toBe(2)
  })

  it('zoomt beim Runter-Scrollen (positives deltaY) heraus', () => {
    expect(computeWheelZoomLevel(2, 100, 0.01)).toBe(1)
  })

  it('kappt das Herauszoomen an der eingepassten Mindeststufe', () => {
    expect(computeWheelZoomLevel(1, 100, 0.01)).toBe(1)
  })

  it('kappt das Hineinzoomen an der obersten Zyklusstufe', () => {
    expect(computeWheelZoomLevel(4, -1000, 0.01)).toBe(4)
  })
})

describe('resolvePinchZoomLevel', () => {
  it('verdoppelt die Zoomstufe, wenn sich der Fingerabstand verdoppelt', () => {
    expect(resolvePinchZoomLevel(1, 100, 200)).toBe(2)
  })

  it('halbiert die Zoomstufe, wenn sich der Fingerabstand halbiert', () => {
    expect(resolvePinchZoomLevel(2, 100, 50)).toBe(1)
  })

  it('kappt eine extreme Spreizgeste an der obersten Zyklusstufe', () => {
    expect(resolvePinchZoomLevel(1, 100, 1000)).toBe(4)
  })

  it('kappt eine extreme Kneifgeste an der eingepassten Mindeststufe', () => {
    expect(resolvePinchZoomLevel(2, 100, 10)).toBe(1)
  })

  it('verhindert eine Division durch Null, solange der Startabstand noch nicht positiv ist', () => {
    expect(resolvePinchZoomLevel(1, 0, 50)).toBe(1)
  })
})

describe('distanceBetweenPoints', () => {
  it('berechnet den euklidischen Abstand zweier Berührungspunkte', () => {
    expect(distanceBetweenPoints({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })
})

describe('midpointBetweenPoints', () => {
  it('berechnet den Mittelpunkt zweier Berührungspunkte', () => {
    expect(midpointBetweenPoints({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 })
  })
})

describe('resolveStageWheelAction', () => {
  it('blättert im eingepassten Zustand weiter zum nächsten Bild', () => {
    expect(resolveStageWheelAction(false)).toBe('navigate')
  })

  it('zoomt im gezoomten Zustand, statt zu blättern', () => {
    expect(resolveStageWheelAction(true)).toBe('zoom')
  })
})

describe('resolveStageSwipeAction', () => {
  it('navigiert im eingepassten Zustand bei einer Wischgeste zum nächsten/vorherigen Bild', () => {
    expect(resolveStageSwipeAction(false)).toBe('navigate')
  })

  it('pannt im gezoomten Zustand den sichtbaren Ausschnitt, statt zu navigieren', () => {
    expect(resolveStageSwipeAction(true)).toBe('pan')
  })
})

describe('computeDragPanOffset', () => {
  it('addiert das Ziehen-Delta auf den vorherigen Pan-Versatz', () => {
    expect(
      computeDragPanOffset({ previousOffsetX: 10, previousOffsetY: -5, dragDeltaX: 20, dragDeltaY: 15 }),
    ).toEqual({ x: 30, y: 10 })
  })
})
