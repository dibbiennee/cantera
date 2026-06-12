# Handoff per la review del design — CANTERA

> Documento per **Claude (lato design)**. Obiettivo: verificare che l'implementazione di produzione sia fedele al design e segnalare discrepanze.

## Contesto
**CANTERA** è una web-app gioco privata per 3 amici (Edoardo · Luca · Nico), mobile-first, estetica **sticker / neo-brutalist gen-z** (fondo scuro, contorni neri spessi, ombre dure offset-0, colori acidi, carte stile FIFA).

Questa repo è la **versione di produzione** ricostruita a partire dal design handoff originale (`design_handoff_cantera`: un Design Component HTML + `support.js`). La UI/logica del prototipo è stata riportata in **React + TypeScript** e il data-layer locale sostituito con **Firebase Realtime Database**.

- **Live:** https://cantera-noi3.vercel.app (aprire da mobile, larghezza di design 440px)
- **Repo:** https://github.com/dibbiennee/cantera

## Cosa ti chiedo di verificare
1. **Fedeltà ai design token** (vedi sotto): colori, tipografia, border-radius, bordi, ombre "sticker".
2. **Le 12 schermate** sono tutte presenti e fedeli: Login/Registrati/Recupero · Home · Draft mode · Lobby/Wait · Formation · Draft (carte FUT con flip 3D) · Shootout (rigori 2D) · Fanta home (classifica/rose) · Admin (+punti) · Asta dal vivo · Studio personaggio · Stats.
3. **Avatar SVG parametrici** (faccia, capelli per stile, occhiali, accessori: fiocco/cappello/beanie/corona/fiore/orecchie/cerchietto) resi correttamente.
4. **Animazioni & interazioni**: shine sulle card modalità, flip 3D delle carte draft (stagger ~420ms), animazione rigori (palla + portiere che si tuffa), coriandoli, pulse/slidein/bob.
5. **Coerenza mobile**: colonna max 440px, safe-area iPhone, target ≥44px, input 16px (no zoom iOS).
6. **Mappatura ruoli/colori** giocatori e ruoli campo (POR/DIF/CEN/ATT).

## Mappa design → codice
| Schermata / elemento | File |
|---|---|
| Login / Registrati / Recupero | `src/App.tsx` (blocco `!loggedIn`) |
| Home · Draft mode · Lobby · Wait | `src/App.tsx` (`screen === …`) |
| Formation · Draft · Shootout | `src/App.tsx` + componente `Shootout` |
| Fanta home · Admin · Asta | `src/App.tsx` (`fanta`/`admin`/`auction`) |
| Studio personaggio · Stats | `src/App.tsx` (`studio`/`stats`) |
| Avatar SVG (`avatar()`/`acc()`) | `src/Avatar.tsx` |
| Token + keyframes + helper stile | `src/index.css`, `src/style.ts` |
| Audio WebAudio (tap + chiptune) | `src/audio.ts` |
| Dati dominio (10 ragazze, 6 moduli, eventi) | `src/constants.ts` |
| Formule (overall, rigori, pesca) | `src/game.ts` |

> Nota: gli stili sono **inline** e riusano quasi alla lettera le stringhe CSS del prototipo tramite l'helper `css()` in `src/style.ts`, proprio per massimizzare la fedeltà ai token.

## Design token di riferimento (dal handoff originale)
**Colori**
- Fondo `#0b0910` (radiale `#1a1226` in alto) · pannelli `#17131f` · bordi `#2a2436` · contorno sticker `#15131a`
- Testo `#f4f1ea` · muted `#9a90ab`/`#8a8198`/`#6a6478`/`#b9b0c8`
- Giocatori: **Edoardo `#c6ff3d`** (lime) · **Luca `#ff4d9d`** (pink) · **Nico `#9b6bff`** (violet)
- Accenti: cyan `#36e0e0` · gold `#ffd23f` · arancio `#ff6b3d`/`#ff9a2e` · rosso `#ff6b6b`/`#ff5a5a`
- Ruoli: POR `#ffd23f` · DIF `#36e0e0` · CEN `#c6ff3d` · ATT `#ff4d9d`
- Stelle: piena `#ffd23f` · speciale/platino `#9fe8ff` (6ª) · vuota `#3a3350`

**Tipografia** (Google Fonts)
- Display/titoli: **Syne** 700/800 (`letter-spacing:-.5px`)
- Testo/UI: **Space Grotesk** 400/500/700
- Numeri/mono: **Space Mono** 700

**Forma**
- Radius 11–24px (card 18–24, bottoni 14–16, chip 11–13) · bordi 2–3px solid · ombre offset `4–7px 4–7px 0 #15131a` (blur 0)

## Modello di gioco (per capire i numeri in UI)
- 5 stat a stelle (🍑 Pesca · 🍒 Ciliegie · 😄 Simpatia · ✨ Abilità · ⚡ Energia), 1 stella = 4 punti, **Overall = somma stelle ×4** (max 100). 6ª stella "platino" solo per fuoriclasse (es. Chiara abil 6 → OVR 88).
- Draft: snake `[0,1,1,0,0,1,1,0,0,1]`, 10 pesche scegliendo tra 2 carte (l'ultima offre 1 sola carta perché ne resta una).
- Asta: budget 300, rilanci +1/+5, nomina a rotazione.

## Cosa è stato aggiunto rispetto al prototipo
Il prototipo **simulava** soltanto l'online 1v1. Qui è **realtime vero** via Firebase (`rooms/{code}`, host autoritativo). Testato end-to-end con due client simultanei (lobby → draft → rigori → vincitore).

## Come darmi feedback
Apri una **issue** su GitHub con: schermata, cosa non torna, screenshot/riferimento al token atteso. Oppure commenta i file direttamente. Io applico le correzioni al codice e ri-deploio.
