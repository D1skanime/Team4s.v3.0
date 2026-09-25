# Quick Task Context

## Ziel

Die Gruppenbedienung in der Mapping-Zeile soll auf die tatsächlich benötigten Aktionen reduziert werden.

## Entscheidungen

- Der Button „Leeren“ wird entfernt; einzelne Chips können weiterhin direkt über das `x` am Chip entfernt werden.
- Der Button „Episode“ wird entfernt; „Ab hier“ und „Ab hier entfernen“ bleiben als Bereichsaktionen bestehen.
- Die zugrunde liegenden Callback-Props bleiben optional als Kompatibilität für direkte Komponentenverbraucher erhalten, werden aber nicht mehr gerendert.
