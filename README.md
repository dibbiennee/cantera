# CANTERA 🏆

Web-app gioco privato per 3 amici (Edoardo · Luca · Nico). Due modalità:

- **Draft Cantera** — sfida 1v1 stile FUT: scegli un modulo, peschi 5+5 a turni (snake) tra 2 carte, poi finale a **rigori 2D**. Funziona sia **pass & play** (stesso telefono) sia **online realtime** (ognuno dal proprio telefono).
- **Fantacantera** — stagione: **asta dal vivo** a crediti, rose, **classifica live**, voti settimanali e bonus/malus configurabili.

I "giocatori" sono 10 personaggi femminili con **avatar SVG parametrici** e statistiche a stelle.

**Live:** https://cantera-noi3.vercel.app · mobile-first (440px), estetica sticker/neo-brutalist.

---

## Stack
- **Vite + React 19 + TypeScript**
- **Firebase Realtime Database** (lega condivisa live + stanze draft 1v1 realtime)
- Deploy su **Vercel**

Questa è la versione di produzione ricostruita dal design handoff (`design_handoff_cantera`): la UI/logica del prototipo HTML è stata riportata fedelmente in React/TS e il data-layer locale (`localStorage`) sostituito con Firebase.

## Mappa design → codice
| Schermata (handoff) | Dove sta nel codice |
|---|---|
| Login / Registrati / Recupero | `src/App.tsx` (blocco `!loggedIn`) |
| Home, Draft mode, Lobby, Wait | `src/App.tsx` (`screen === ...`) |
| Formation, Draft, Shootout, Result | `src/App.tsx` + componente `Shootout` |
| Fanta home, Admin, Asta | `src/App.tsx` (`fanta`/`admin`/`auction`) |
| Studio personaggio, Stats | `src/App.tsx` (`studio`/`stats`) |
| Avatar SVG parametrici | `src/Avatar.tsx` (port di `avatar()`/`acc()`) |
| Token colore/tipografia, keyframes | `src/index.css` + helper `src/style.ts` |
| Audio (tap + chiptune WebAudio) | `src/audio.ts` |
| Dati dominio (ragazze, moduli, eventi) | `src/constants.ts` |
| Formule (overall, rigori, pick) | `src/game.ts` |

## Architettura dati (Firebase RTDB)
- `src/firebase.ts` — init (config web pubblica)
- `src/useLeague.ts` — nodo **`league`** condiviso live: `giornata, budgets, owners, prices, log, events, girls(override stats/avatar), aucNom, aucPhase, aucLot, aucBid, aucLeader`
- `src/useRoom.ts` — stanze **`rooms/{code}`** per il draft 1v1 online realtime; **host autoritativo** per RNG (pesca carte) e timer (rigori)
- Auth: 3 utenti fissi con password + parola di recupero in `users/{edoardo|luca|nico}`; sessione in `localStorage`

## Sviluppo
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
```

## Note per la review del design
- Tutti gli stili sono **inline** e riusano le stringhe CSS del prototipo via `css()` (`src/style.ts`) per massima fedeltà ai token.
- Il flusso online 1v1 è stato testato end-to-end con due client simultanei (lobby → draft snake → rigori → vincitore).
- La config Firebase in `src/firebase.ts` è una chiave **web pubblica** (non un segreto); le regole RTDB sono volutamente aperte (app privata "nel chill").
