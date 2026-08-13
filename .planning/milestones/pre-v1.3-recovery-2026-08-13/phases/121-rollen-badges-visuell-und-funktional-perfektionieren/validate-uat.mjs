import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
const require = createRequire('/app/package.json')
const sharp = require('sharp')
const root='/workspace/.planning/phases/121-rollen-badges-visuell-und-funktional-perfektionieren'
const report=await readFile(root+'/121-UAT.md','utf8')
const headings=['## 1. Zusammenfassung','## 2. Vorherige Rollenstruktur','## 3. Neue Rollenstruktur','## 4. Rank-Track','## 5. Hero-Artwork','## 6. Fortschritt','## 7. Desktop-Verhalten','## 8. Mobile-Verhalten','## 9. Geänderte Dateien','## 10. Tests','## 11. Live-UAT','## 12. Shared Regression','## 13. Offene Punkte','## 14. Fazit']
if(JSON.stringify(report.match(/^## \d+\. .+$/gm)??[])!==JSON.stringify(headings))throw Error('Kapitel ungültig')
for(const id of ['Q-01','Q-02','Q-03','Q-04','Q-05'])if(!new RegExp('^### '+id+' – .+\\nAntwort: \\S.+$','m').test(report))throw Error('Antwort fehlt: '+id)
const shots=[['roles-390.png',390,844],['roles-768.png',768,1024],['roles-1024.png',1024,768],['roles-1440.png',1440,900]]
const sig=Buffer.from([137,80,78,71,13,10,26,10])
for(const [name,width,height] of shots){const rel='.planning/phases/121-rollen-badges-visuell-und-funktional-perfektionieren/uat/'+name;if(!report.includes(rel))throw Error('Pfad fehlt: '+rel);const b=await readFile(root+'/uat/'+name);if(!b.subarray(0,8).equals(sig))throw Error('Signatur: '+name);const m=await sharp(b).metadata();if(m.format!=='png'||m.width!==width||m.height!==height)throw Error('Maß: '+name)}
console.log('121-UAT valide')
