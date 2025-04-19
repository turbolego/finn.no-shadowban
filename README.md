<meta name="google-site-verification" content="hh1bAv1NVzaJdPdgBVOSwoJ62uWGHqqLnHHODHa5zVk" />

Read English readme here: [English README](README-EN.md)

# Finn.no Shadowban Chrome-utvidelse

Denne Chrome-utvidelsen lar deg skjule annonser fra bestemte selgere på finn.no ved å legge dem til i din personlige blokkeringsliste.

## Funksjoner

- Skanner automatisk søkeresultatsider på finn.no
- Sjekker hver annonse for å se om den tilhører en blokkert selger
- Skjuler annonser fra alle blokkerte selgere
- Høyreklikkmeny for enkelt å blokkere nye selgere
- Popup-grensesnitt for å administrere listen over blokkerte selgere
- Fungerer med uendelig rulling og ulike annonsetyper

## Installasjon

For å installere denne utvidelsen i Chrome:

1. Åpne Chrome og gå til `chrome://extensions/`
2. Aktiver "Utviklermodus" ved å bruke bryteren øverst til høyre
3. Klikk "Last upakket" og velg mappen som inneholder denne utvidelsen
4. Utvidelsen skal nå være installert og aktiv

## Hvordan det fungerer

Utvidelsen fungerer ved å:
1. Skanne søkeresultatsider på finn.no
2. For hver annonse, sjekke om den er fra en blokkert selger
3. Skjule annonser som tilhører blokkede selgere
4. Lagrer en liste over blokkerte bruker-IDer i nettleserens lokale lagring
5. Overvåke kontinuerlig for nytt innhold når du ruller

## Legge til selgere i blokkeringslisten

Det finnes to måter å blokkere en selger på:

1. Høyreklikkmetoden:
   - Høyreklikk på en annonse i søkeresultater
   - Velg "Shadowban alle annonser fra denne selgeren" i kontekstmenyen
   - Utvidelsen vil hente selgerens bruker-ID og legge den til blokkeringslisten

2. Manuell legging til:
   - Finn selgerens bruker-ID (fra profilens URL)
   - Legg den til i blokkeringslisten via popup-grensesnittet

## Administrere blokkerte selgere

For å administrere listen over blokkerte selgere:

1. Klikk på utvidelsesikonet i verktøylinjen
2. Se alle gjeldende blokkerte bruker-IDer
3. Fjern en selger fra blokkeringslisten ved å klikke på "Fjern"-knappen ved siden av IDen

## Filer

- `manifest.json` - Konfigurasjonsfil for utvidelsen
- `popup.html` - Brukergrensesnitt for å administrere blokkerte selgere
- `popup.js` - Skript som håndterer popup-funksjonalitet
- `content.js` - Hovedskript som håndterer filtreringslogikk
- `background.js` - Bakgrunnsskript som administrerer kontekstmenyer og meldinger
- `images/` - Katalog som inneholder utvidelsesikoner

## Merk

Denne utvidelsen er kun for personlig bruk og er designet for å forbedre nettleseropplevelsen din på finn.no ved å la deg filtrere bort annonser fra bestemte selgere.
