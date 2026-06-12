import { useEffect, useRef, useState } from 'react';
import { css } from './style';
import { Avatar } from './Avatar';
import { playTap, startChip, stopChip } from './audio';
import { ov, pick2 } from './game';
import { useLeague } from './useLeague';
import { useRoom } from './useRoom';
import {
  ORDER, PCOL, PNAME, UKEY, MODULES, ROLECOL, CATS,
} from './constants';
import type { Girl, ShootOutcome, StatKey } from './types';

type Screen =
  | 'home' | 'draft_mode' | 'lobby' | 'wait' | 'draft_setup' | 'formation'
  | 'draft' | 'shootout' | 'result' | 'fanta' | 'admin' | 'auction' | 'rosa';

interface LocalMatch {
  slots: number[];
  forms: number[];
  teams: { 0: string[]; 1: string[] };
  turn: number;
  options: string[];
  optAt: number;
  shA: ShootOutcome[];
  shB: ShootOutcome[];
  shTurn: number;
  shBusy: boolean;
  shBallX: number;
  shBallY: number;
  shKeepX: number;
  shMsg: string;
  shOver: boolean;
  shWin: number;
  shShooterId: string | null;
}

const FRESH_MATCH: LocalMatch = {
  slots: [0, 1], forms: [0, 0], teams: { 0: [], 1: [] }, turn: 0, options: [], optAt: 0,
  shA: [], shB: [], shTurn: 0, shBusy: false, shBallX: 50, shBallY: 82, shKeepX: 50,
  shMsg: '', shOver: false, shWin: 0, shShooterId: null,
};

const COLS = ['#c6ff3d', '#ff4d9d', '#9b6bff', '#36e0e0', '#ffd23f'];

export default function App() {
  const L = useLeague();
  const girls = L.girls;
  const girl = (id: string): Girl => girls.find((g) => g.id === id) || girls[0];

  // sessione
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('cantera_session');
      if (raw) {
        const s = JSON.parse(raw);
        if (s.loggedIn) { setLoggedIn(true); setCurrentUser(s.currentUser || 0); }
      }
    } catch { /* no-op */ }
  }, []);
  const persistSession = (li: boolean, cu: number) => {
    try { localStorage.setItem('cantera_session', JSON.stringify({ loggedIn: li, currentUser: cu })); } catch { /* no-op */ }
  };

  // auth form
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [authName, setAuthName] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authPass2, setAuthPass2] = useState('');
  const [authWord, setAuthWord] = useState('');
  const [authErr, setAuthErr] = useState('');

  const [screen, setScreen] = useState<Screen>('home');
  const [musicOn, setMusicOn] = useState(false);
  const [matchMode, setMatchMode] = useState<'local' | 'online'>('local');

  // PWA: guida "Aggiungi alla Home", mostrata una sola volta e mai in standalone.
  const [showGuide, setShowGuide] = useState(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as unknown as { standalone?: boolean }).standalone === true;
    let seen = false;
    try { seen = !!localStorage.getItem('cantera_guide_seen'); } catch { /* no-op */ }
    return !standalone && !seen;
  });
  const dismissGuide = () => {
    try { localStorage.setItem('cantera_guide_seen', '1'); } catch { /* no-op */ }
    setShowGuide(false);
  };

  const [lm, setLm] = useState<LocalMatch>(FRESH_MATCH);
  const lmRef = useRef(lm);
  lmRef.current = lm;
  const patchLm = (patch: Partial<LocalMatch>) => setLm((p) => ({ ...p, ...patch }));

  const [votoVal, setVotoVal] = useState(6);
  const [newEvLabel, setNewEvLabel] = useState('');
  const [newEvPts, setNewEvPts] = useState(3);
  const [adminGirl, setAdminGirl] = useState('aurora');
  const [rosaGirl, setRosaGirl] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');

  const R = useRoom(currentUser, girls);

  // flip carte: forza re-render per ~1200ms dopo che cambiano le opzioni
  const [, tick] = useState(0);
  const online = matchMode === 'online' && R.room != null;
  const optAt = online ? R.room!.optAt || 0 : lm.optAt;
  useEffect(() => {
    if (!optAt) return;
    const t0 = Date.now();
    const id = setInterval(() => { tick((x) => x + 1); if (Date.now() - t0 > 1200) clearInterval(id); }, 16);
    return () => clearInterval(id);
  }, [optAt]);

  // routing online: lo schermo segue lo stato della stanza
  useEffect(() => {
    if (matchMode !== 'online') return;
    if (!R.room) { setMatchMode('local'); setScreen('home'); return; }
    const map: Record<string, Screen> = { waiting: 'wait', forming: 'formation', drafting: 'draft', shootout: 'shootout', done: 'shootout' };
    setScreen(map[R.room.status]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [R.room?.status, R.room == null, matchMode]);

  // ===== helpers dominio =====
  const tap = () => playTap();
  const go = (s: Screen) => { tap(); setScreen(s); };
  const totalPts = (p: number) => L.league.log.filter((l) => l.p === p).reduce((a, l) => a + l.pts, 0);
  const ownersOf = L.league.owners || {};
  const pricesOf = L.league.prices || {};
  const budgets = L.league.budgets || [300, 300, 300];
  const events = L.league.events || [];

  // ===== auth =====
  const authIdx = () => UKEY.indexOf((authName || '').trim().toLowerCase());
  const setMode = (m: 'login' | 'register' | 'forgot') => { tap(); setAuthMode(m); setAuthErr(''); setAuthPass(''); setAuthPass2(''); setAuthWord(''); };
  const doLogin = () => {
    tap();
    const i = authIdx();
    if (i < 0) { setAuthErr('Scegli chi sei'); return; }
    const rec = L.users[UKEY[i]];
    if (!rec) { setAuthErr('Non sei registrato. Tocca REGISTRATI.'); return; }
    if (rec.pass !== authPass) { setAuthErr('Password errata'); return; }
    setLoggedIn(true); setCurrentUser(i); persistSession(true, i);
    setAuthErr(''); setAuthPass(''); setAuthPass2(''); setAuthWord(''); setScreen('home');
  };
  const doRegister = () => {
    tap();
    const i = authIdx();
    if (i < 0) { setAuthErr('Scegli chi sei'); return; }
    if (L.users[UKEY[i]]) { setAuthErr('Già registrato. Tocca ACCEDI.'); return; }
    if ((authPass || '').length < 3) { setAuthErr('Password troppo corta (min 3)'); return; }
    if (authPass !== authPass2) { setAuthErr('Le password non coincidono'); return; }
    if (!(authWord || '').trim()) { setAuthErr('Imposta una parola di recupero'); return; }
    L.setUser(UKEY[i], { pass: authPass, word: authWord.trim() });
    setLoggedIn(true); setCurrentUser(i); persistSession(true, i);
    setAuthErr(''); setAuthPass(''); setAuthPass2(''); setAuthWord(''); setScreen('home');
  };
  const doForgot = () => {
    tap();
    const i = authIdx();
    if (i < 0) { setAuthErr('Scegli chi sei'); return; }
    const rec = L.users[UKEY[i]];
    if (!rec) { setAuthErr('Questo utente non è registrato'); return; }
    if ((rec.word || '').toLowerCase() !== (authWord || '').trim().toLowerCase()) { setAuthErr('Parola di recupero errata'); return; }
    if ((authPass || '').length < 3) { setAuthErr('Nuova password troppo corta'); return; }
    L.setUser(UKEY[i], { ...rec, pass: authPass });
    setAuthMode('login'); setAuthErr(''); setAuthPass(''); setAuthWord('');
  };
  const logout = () => { tap(); setLoggedIn(false); persistSession(false, currentUser); setAuthMode('login'); setScreen('home'); };

  const toggleMusic = () => { tap(); if (musicOn) stopChip(); else startChip(); setMusicOn(!musicOn); };
  const goHome = () => { if (online) R.leave(); tap(); setMatchMode('local'); setScreen('home'); };

  // ===== match unificato (locale o online) =====
  const room = R.room;
  const M: LocalMatch = online && room ? {
    slots: [room.host, room.guest ?? 0], forms: room.forms || [0, 0], teams: { 0: room.teams?.[0] || [], 1: room.teams?.[1] || [] },
    turn: room.turn, options: room.options || [], optAt: room.optAt || 0,
    shA: room.shA || [], shB: room.shB || [], shTurn: room.shTurn, shBusy: room.shBusy,
    shBallX: room.shBallX, shBallY: room.shBallY, shKeepX: room.shKeepX, shMsg: room.shMsg,
    shOver: room.shOver, shWin: room.shWin, shShooterId: room.shShooterId,
  } : lm;

  const freshOptions = (opts: string[], extra: Partial<LocalMatch>) => setLm((p) => ({ ...p, options: opts, optAt: Date.now(), ...extra }));

  const startMatchLocal = (a: number, b: number) => { tap(); setMatchMode('local'); setLm({ ...FRESH_MATCH, slots: [a, b] }); setScreen('formation'); };
  const startDraftLocal = () => { tap(); freshOptions(pick2(girls, []), { teams: { 0: [], 1: [] }, turn: 0 }); setScreen('draft'); };
  const setFormLocal = (slot: number, idx: number) => { tap(); setLm((p) => { const forms = [...p.forms]; forms[slot] = idx; return { ...p, forms }; }); };

  const pickLocal = (id: string) => {
    const slot = ORDER[lmRef.current.turn];
    const teams = { 0: [...lmRef.current.teams[0]], 1: [...lmRef.current.teams[1]] };
    teams[slot as 0 | 1].push(id);
    const turn = lmRef.current.turn + 1;
    tap();
    if (turn >= 10) {
      patchLm({
        teams, turn, shA: [], shB: [], shTurn: 0, shBusy: false, shBallX: 50, shBallY: 82, shKeepX: 50,
        shMsg: '', shOver: false, shWin: 0, shShooterId: teams[0][Math.floor(Math.random() * teams[0].length)],
      });
      setScreen('shootout');
    } else {
      freshOptions(pick2(girls, [...teams[0], ...teams[1]]), { teams, turn });
    }
  };

  const shootLocal = () => {
    const st = lmRef.current;
    if (st.shBusy || st.shOver || !st.shShooterId) return;
    tap();
    const slot = st.shTurn;
    const shooter = girl(st.shShooterId);
    const keeper = girl(st.teams[(1 - slot) as 0 | 1][0]);
    const zones = [20, 35, 50, 65, 80];
    const power = ov(shooter.stats), def = ov(keeper.stats);
    const zi = Math.floor(Math.random() * 5);
    const guessRight = Math.random() < Math.min(0.42, 0.16 + (def - 70) / 220);
    const ki = guessRight ? zi : Math.floor(Math.random() * 5);
    const miss = Math.random() < Math.max(0.04, 0.12 - (power - 78) / 240);
    const outcome: ShootOutcome = miss ? 'miss' : ki === zi ? 'save' : 'goal';
    const bx = miss ? zones[zi] + (zi < 2 ? -14 : 14) : zones[zi];
    const by = miss ? 12 : 24;
    patchLm({ shBusy: true, shMsg: '', shBallX: bx, shBallY: by, shKeepX: zones[ki] });
    setTimeout(() => {
      const msg = outcome === 'goal' ? 'GOOOL!' : outcome === 'save' ? 'PARATO!' : 'FUORI!';
      setLm((p) => {
        const shA = slot === 0 ? [...p.shA, outcome] : p.shA;
        const shB = slot === 1 ? [...p.shB, outcome] : p.shB;
        const ga = shA.filter((x) => x === 'goal').length, gb = shB.filter((x) => x === 'goal').length;
        const a = shA.length, b = shB.length;
        const decided = a >= 5 && b >= 5 && a === b && ga !== gb;
        return { ...p, shA, shB, shMsg: msg, shOver: decided, shWin: ga > gb ? 0 : 1 };
      });
      setTimeout(() => {
        setLm((p) => {
          if (p.shOver) return { ...p, shBusy: false };
          const ns = 1 - slot, nt = p.teams[ns as 0 | 1];
          return { ...p, shBallX: 50, shBallY: 82, shKeepX: 50, shMsg: '', shTurn: ns, shBusy: false, shShooterId: nt[Math.floor(Math.random() * nt.length)] };
        });
      }, 1500);
    }, 850);
  };

  const rematchLocal = () => { tap(); patchLm({ teams: { 0: [], 1: [] }, turn: 0, options: [], optAt: 0, shA: [], shB: [], shTurn: 0, shBusy: false, shBallX: 50, shBallY: 82, shKeepX: 50, shMsg: '', shOver: false, shWin: 0, shShooterId: null }); setScreen('formation'); };

  const doPick = (id: string) => { if (online) R.pickGirl(id); else pickLocal(id); };
  const doShoot = () => { if (online) R.shoot(); else shootLocal(); };
  const doRematch = () => { if (online) R.rematch(); else rematchLocal(); };

  // ===== fanta / admin / asta =====
  const addEvent = (label: string, pts: number) => {
    const owner = ownersOf[adminGirl];
    if (owner == null) return;
    tap();
    L.addLog({ p: owner, g: adminGirl, label, pts });
  };
  const confirmVoto = () => addEvent('Voto G' + L.league.giornata, votoVal);
  const setStat = (k: StatKey, v: number) => { tap(); const g = girl(adminGirl); L.setGirl(g.id, { stats: { ...g.stats, [k]: Math.max(1, Math.min(6, v)) } }); };
  const addEv = () => { const l = (newEvLabel || '').trim(); if (!l) return; tap(); L.setEvents([...events, { label: l, pts: newEvPts }]); setNewEvLabel(''); };
  const removeEv = (i: number) => { tap(); L.setEvents(events.filter((_, k) => k !== i)); };

  const aucNew = () => { tap(); L.patchLeague({ owners: {}, prices: {}, budgets: [300, 300, 300], aucPhase: 'nominate', aucNom: 0, aucLot: null, aucBid: 0, aucLeader: null }); };
  const aucNominate = (id: string) => { tap(); L.patchLeague({ aucLot: id, aucBid: 0, aucLeader: null, aucPhase: 'bid' }); };
  const aucRaise = (p: number, amt: number) => { const nb = L.league.aucLeader === null ? amt : L.league.aucBid + amt; if (budgets[p] < nb) return; tap(); L.patchLeague({ aucBid: nb, aucLeader: p }); };
  const aucAward = () => {
    const lg = L.league; if (lg.aucLeader == null || lg.aucLot == null) return; tap();
    const owners = { ...ownersOf, [lg.aucLot]: lg.aucLeader };
    const prices = { ...pricesOf, [lg.aucLot]: lg.aucBid };
    const nb = [...budgets]; nb[lg.aucLeader] = Math.max(0, nb[lg.aucLeader] - lg.aucBid);
    L.patchLeague({ owners, prices, budgets: nb, aucPhase: 'nominate', aucNom: (lg.aucNom + 1) % 3, aucLot: null, aucBid: 0, aucLeader: null });
  };
  const aucPass = () => { tap(); L.patchLeague({ aucPhase: 'nominate', aucNom: (L.league.aucNom + 1) % 3, aucLot: null, aucBid: 0, aucLeader: null }); };

  // ===== avatar helper =====
  const av = (g: Girl, size: number) => <Avatar g={g} size={size} />;

  // ===== render: LOGIN =====
  if (!loggedIn) {
    const authNameL = (authName || '').toLowerCase();
    const ml = authMode === 'login', mr = authMode === 'register', mf = authMode === 'forgot';
    return (
      <Shell>
        {showGuide && <GuideOverlay onClose={dismissGuide} mascot={av(girl('aurora'), 72)} />}
        <div style={css('position:relative;z-index:2;min-height:100dvh;display:flex;flex-direction:column;justify-content:center;animation:slidein .4s ease both;padding:24px 0')}>
          <div style={css('text-align:center;margin-bottom:6px')}><div style={css('display:inline-block;animation:bob 3s ease-in-out infinite')}>{av(girl('aurora'), 96)}</div></div>
          <div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:44px;letter-spacing:-1px;text-align:center;line-height:.9")}>CAN<span style={{ color: '#c6ff3d' }}>TERA</span></div>
          <div style={css("text-align:center;font-family:'Space Mono',monospace;font-size:11px;letter-spacing:3px;color:#8a8198;margin:8px 0 20px")}>ACCESSO PRIVATO · NOI 3</div>

          <div style={css('display:flex;gap:6px;background:#17131f;border:2px solid #2a2436;border-radius:16px;padding:5px;margin-bottom:16px')}>
            <button onClick={() => setMode('login')} style={{ ...css("flex:1;padding:11px;border-radius:11px;font-family:'Syne',sans-serif;font-weight:800;font-size:13px"), background: ml ? '#c6ff3d' : 'transparent', color: ml ? '#15131a' : '#9a90ab' }}>ACCEDI</button>
            <button onClick={() => setMode('register')} style={{ ...css("flex:1;padding:11px;border-radius:11px;font-family:'Syne',sans-serif;font-weight:800;font-size:13px"), background: mr ? '#c6ff3d' : 'transparent', color: mr ? '#15131a' : '#9a90ab' }}>REGISTRATI</button>
          </div>

          <div style={css("font-size:11px;font-family:'Space Mono',monospace;color:#8a8198;margin:0 2px 8px")}>CHI SEI</div>
          <div style={css('display:flex;gap:8px;margin-bottom:14px')}>
            {UKEY.map((u, i) => {
              const on = authNameL === u;
              return <button key={u} onClick={() => { tap(); setAuthName(PNAME[i]); setAuthErr(''); }} style={{ ...css('flex:1;padding:13px 6px;border-radius:14px;font-weight:700;font-size:13px'), background: on ? PCOL[i] : '#17131f', border: `2px solid ${on ? PCOL[i] : '#2a2436'}`, color: on ? '#15131a' : '#b9b0c8' }}>{PNAME[i]}</button>;
            })}
          </div>

          {ml && <>
            <input value={authPass} onChange={(e) => setAuthPass(e.target.value)} type="password" placeholder="password" style={css('width:100%;padding:15px;border-radius:14px;background:#17131f;border:2px solid #2a2436;color:#f4f1ea;font-size:16px;margin-bottom:6px;outline:none')} />
            <div style={css('min-height:18px;font-size:12px;color:#ff6b6b;margin:2px 2px 8px')}>{authErr}</div>
            <button onClick={doLogin} style={css("width:100%;padding:16px;border-radius:16px;background:#c6ff3d;color:#15131a;border:3px solid #15131a;box-shadow:5px 5px 0 #15131a;font-family:'Syne',sans-serif;font-weight:800;font-size:16px")}>ENTRA ⚡</button>
            <button onClick={() => setMode('forgot')} style={css('width:100%;text-align:center;font-size:12px;color:#9a90ab;margin-top:14px')}>Password dimenticata?</button>
          </>}

          {mr && <>
            <input value={authPass} onChange={(e) => setAuthPass(e.target.value)} type="password" placeholder="scegli una password" style={css('width:100%;padding:15px;border-radius:14px;background:#17131f;border:2px solid #2a2436;color:#f4f1ea;font-size:16px;margin-bottom:10px;outline:none')} />
            <input value={authPass2} onChange={(e) => setAuthPass2(e.target.value)} type="password" placeholder="ripeti la password" style={css('width:100%;padding:15px;border-radius:14px;background:#17131f;border:2px solid #2a2436;color:#f4f1ea;font-size:16px;margin-bottom:10px;outline:none')} />
            <input value={authWord} onChange={(e) => setAuthWord(e.target.value)} placeholder="parola di recupero" autoCapitalize="off" style={css('width:100%;padding:15px;border-radius:14px;background:#17131f;border:2px solid #2a2436;color:#f4f1ea;font-size:16px;margin-bottom:6px;outline:none')} />
            <div style={css('min-height:18px;font-size:12px;color:#ff6b6b;margin:2px 2px 8px')}>{authErr}</div>
            <button onClick={doRegister} style={css("width:100%;padding:16px;border-radius:16px;background:#c6ff3d;color:#15131a;border:3px solid #15131a;box-shadow:5px 5px 0 #15131a;font-family:'Syne',sans-serif;font-weight:800;font-size:16px")}>CREA ACCOUNT ⚡</button>
            <div style={css('text-align:center;font-size:11px;color:#6a6478;margin-top:12px')}>La parola di recupero ti servirà per reimpostare la password.</div>
          </>}

          {mf && <>
            <div style={css('font-size:13px;font-weight:700;margin:0 2px 10px;color:#f4f1ea')}>Reimposta la password</div>
            <input value={authWord} onChange={(e) => setAuthWord(e.target.value)} placeholder="parola di recupero" autoCapitalize="off" style={css('width:100%;padding:15px;border-radius:14px;background:#17131f;border:2px solid #2a2436;color:#f4f1ea;font-size:16px;margin-bottom:10px;outline:none')} />
            <input value={authPass} onChange={(e) => setAuthPass(e.target.value)} type="password" placeholder="nuova password" style={css('width:100%;padding:15px;border-radius:14px;background:#17131f;border:2px solid #2a2436;color:#f4f1ea;font-size:16px;margin-bottom:6px;outline:none')} />
            <div style={css('min-height:18px;font-size:12px;color:#ff6b6b;margin:2px 2px 8px')}>{authErr}</div>
            <button onClick={doForgot} style={css("width:100%;padding:16px;border-radius:16px;background:#36e0e0;color:#15131a;border:3px solid #15131a;box-shadow:5px 5px 0 #15131a;font-family:'Syne',sans-serif;font-weight:800;font-size:16px")}>REIMPOSTA</button>
            <button onClick={() => setMode('login')} style={css('width:100%;text-align:center;font-size:12px;color:#9a90ab;margin-top:14px')}>‹ torna all'accesso</button>
          </>}
        </div>
      </Shell>
    );
  }

  // ===== derived per app =====
  const meName = PNAME[currentUser], meColor = PCOL[currentUser];
  const pickerSlot = ORDER[Math.min(M.turn, 9)];
  const pickerP = M.slots[pickerSlot];
  const pickerRole = MODULES[M.forms[pickerSlot]].roles[Math.min(M.teams[pickerSlot as 0 | 1].length, 4)];
  const myTurn = !online || (pickerSlot === 0 ? room!.host : room!.guest) === currentUser;

  const standings = [0, 1, 2].map((i) => ({ i, pts: totalPts(i) })).sort((x, y) => y.pts - x.pts);
  const tray = (slot: number) => {
    const mod = MODULES[M.forms[slot]];
    const arr: { av: React.ReactNode; bg: string; bd: string; role: string; roleCol: string }[] = [];
    for (let i = 0; i < 5; i++) {
      const id = M.teams[slot as 0 | 1][i];
      const g = id ? girl(id) : null;
      const r = mod.roles[i];
      arr.push({ av: g ? av(g, 28) : '', bg: g ? 'rgba(255,255,255,.08)' : '#100d18', bd: g ? g.c1 : '#2a2436', role: r, roleCol: ROLECOL[r] });
    }
    return arr;
  };

  const musicBtnStyle = { ...css("display:flex;align-items:center;gap:7px;padding:8px 13px;border-radius:13px;font-size:11px;font-family:'Space Mono',monospace"), background: musicOn ? '#c6ff3d' : '#17131f', border: `2px solid ${musicOn ? '#c6ff3d' : '#2a2436'}`, color: musicOn ? '#15131a' : '#f4f1ea' };

  return (
    <Shell>
      {showGuide && <GuideOverlay onClose={dismissGuide} mascot={av(girl('aurora'), 72)} />}
      <div style={css('position:relative;z-index:2')}>
        <div style={css('display:flex;align-items:center;justify-content:space-between;padding:18px 2px 14px')}>
          <div style={css('display:flex;align-items:center;gap:10px')}>
            {screen !== 'home' && <button onClick={goHome} style={css('width:40px;height:40px;border-radius:13px;background:#17131f;border:2px solid #2a2436;font-size:20px')}>‹</button>}
            <div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:20px;letter-spacing:-.5px")}>CAN<span style={{ color: '#c6ff3d' }}>TERA</span></div>
          </div>
          <button onClick={toggleMusic} style={musicBtnStyle}><span style={{ fontSize: 14 }}>♪</span>{musicOn ? 'ON' : 'OFF'}</button>
        </div>

        {/* HOME */}
        {screen === 'home' && (
          <div style={css('animation:slidein .4s ease both')}>
            <div style={css('display:flex;align-items:center;justify-content:space-between;background:#17131f;border:2px solid #2a2436;border-radius:20px;padding:14px;margin-bottom:18px')}>
              <div style={css('display:flex;align-items:center;gap:12px')}>
                <div style={{ ...css('width:52px;height:52px;border-radius:16px;border:2px solid #15131a;display:flex;align-items:center;justify-content:center;overflow:hidden'), background: meColor }}>{av(girl('aurora'), 44)}</div>
                <div><div style={css('font-size:12px;color:#9a90ab')}>bentornato</div><div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:20px;line-height:1")}>{meName}</div></div>
              </div>
              <div style={css('text-align:right')}>
                <div style={{ ...css("font-family:'Space Mono',monospace;font-weight:700;font-size:22px"), color: meColor }}>{totalPts(currentUser)}<span style={css('font-size:11px;color:#9a90ab')}> pt</span></div>
                <button onClick={logout} style={css("font-size:10px;color:#9a90ab;font-family:'Space Mono',monospace;margin-top:2px")}>ESCI ⏏</button>
              </div>
            </div>

            <button onClick={() => go('draft_mode')} style={css("position:relative;width:100%;text-align:left;padding:22px;border-radius:24px;background:linear-gradient(135deg,#c6ff3d,#7bd11a);border:3px solid #15131a;box-shadow:7px 7px 0 #15131a;margin-bottom:18px;overflow:hidden;color:#15131a;transform:rotate(-1deg)")}>
              <div style={css('position:absolute;top:0;left:0;width:60px;height:200%;background:rgba(255,255,255,.45);animation:shine 4.5s ease-in-out infinite')}></div>
              <div style={css("font-family:'Space Mono',monospace;font-size:11px;letter-spacing:1px;opacity:.7")}>MODALITÀ · SESSIONE 1v1</div>
              <div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:33px;line-height:.95;margin:4px 0 6px")}>DRAFT<br />CANTERA</div>
              <div style={css('font-size:12.5px;font-weight:500;max-width:240px;opacity:.85')}>Pesca 5 vs 5 e sfida l'avversario testa a testa. In locale o online.</div>
              <div style={css("display:inline-block;margin-top:12px;font-family:'Syne',sans-serif;font-weight:800;font-size:13px;background:#15131a;color:#c6ff3d;padding:7px 14px;border-radius:11px")}>GIOCA ⚡</div>
            </button>

            <button onClick={() => go('fanta')} style={css("position:relative;width:100%;text-align:left;padding:22px;border-radius:24px;background:linear-gradient(135deg,#ff4d9d,#c01e6a);border:3px solid #15131a;box-shadow:7px 7px 0 #15131a;margin-bottom:18px;overflow:hidden;transform:rotate(1deg)")}>
              <div style={css('position:absolute;top:0;left:0;width:60px;height:200%;background:rgba(255,255,255,.30);animation:shine 5.2s ease-in-out infinite')}></div>
              <div style={css("font-family:'Space Mono',monospace;font-size:11px;letter-spacing:1px;opacity:.85")}>MODALITÀ · STAGIONE 3 MESI</div>
              <div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:33px;line-height:.95;margin:4px 0 6px")}>FANTA<br />CANTERA</div>
              <div style={css('font-size:12.5px;font-weight:500;max-width:250px;opacity:.92')}>Asta, rose e classifica live. Voti, bonus e malus su eventi reali.</div>
              <div style={css("display:inline-block;margin-top:12px;font-family:'Syne',sans-serif;font-weight:800;font-size:13px;background:#15131a;color:#ff4d9d;padding:7px 14px;border-radius:11px")}>CLASSIFICA 🏆</div>
            </button>

            <button onClick={() => { setRosaGirl(null); go('rosa'); }} style={css('width:100%;padding:15px;border-radius:18px;background:#17131f;border:2px dashed #3a3350;font-weight:700;font-size:13px;color:#b9b0c8')}>👥  Rosa — giugno 2026</button>
          </div>
        )}

        {/* DRAFT MODE */}
        {screen === 'draft_mode' && (
          <div style={css('animation:slidein .35s ease both')}>
            <div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:30px;line-height:1;margin:4px 2px 18px")}>Come<br />giocate?</div>
            <button onClick={() => go('draft_setup')} style={css("width:100%;text-align:left;padding:20px;border-radius:22px;background:#17131f;border:3px solid #c6ff3d;box-shadow:5px 5px 0 #15131a;margin-bottom:14px")}>
              <div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:22px;color:#c6ff3d")}>PASS & PLAY</div>
              <div style={css('font-size:12.5px;color:#b9b0c8;margin-top:3px')}>Stesso telefono, vi passate il turno. Funziona subito.</div>
            </button>
            <button onClick={() => go('lobby')} style={css("width:100%;text-align:left;padding:20px;border-radius:22px;background:#17131f;border:3px solid #36e0e0;box-shadow:5px 5px 0 #15131a")}>
              <div style={css('display:flex;align-items:center;gap:8px')}><div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:22px;color:#36e0e0")}>ONLINE 1v1</div><span style={css("font-family:'Space Mono',monospace;font-size:9px;background:#36e0e0;color:#15131a;padding:3px 6px;border-radius:6px")}>LIVE</span></div>
              <div style={css('font-size:12.5px;color:#b9b0c8;margin-top:3px')}>A distanza, ognuno dal suo telefono. Realtime via server.</div>
            </button>
          </div>
        )}

        {/* LOBBY */}
        {screen === 'lobby' && (
          <div style={css('animation:slidein .35s ease both')}>
            <div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:28px;line-height:1;margin:4px 2px 4px")}>Lobby online</div>
            <div style={css('font-size:12px;color:#9a90ab;margin:0 2px 20px')}>Crea una stanza o entra con un codice</div>
            <button onClick={async () => { tap(); setMatchMode('online'); await R.create(); }} style={css("width:100%;padding:18px;border-radius:18px;background:#36e0e0;color:#15131a;border:3px solid #15131a;box-shadow:5px 5px 0 #15131a;font-family:'Syne',sans-serif;font-weight:800;font-size:17px;margin-bottom:18px")}>CREA PARTITA</button>
            <div style={css("text-align:center;font-family:'Space Mono',monospace;font-size:11px;color:#6a6478;margin-bottom:14px")}>— oppure —</div>
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="CODICE STANZA" autoCapitalize="characters" style={css("width:100%;padding:15px;border-radius:14px;background:#17131f;border:2px solid #2a2436;color:#f4f1ea;font-size:16px;text-align:center;font-family:'Space Mono',monospace;letter-spacing:3px;margin-bottom:10px;outline:none")} />
            <button onClick={async () => { tap(); setMatchMode('online'); const ok = await R.join(joinCode); if (!ok) { setMatchMode('local'); setAuthErr(''); } }} style={css("width:100%;padding:15px;border-radius:14px;background:#17131f;border:2px solid #3a3350;font-family:'Syne',sans-serif;font-weight:800;color:#f4f1ea")}>ENTRA NELLA STANZA</button>
          </div>
        )}

        {/* WAIT */}
        {screen === 'wait' && (
          <div style={css('text-align:center;animation:slidein .35s ease both;padding-top:10px')}>
            <div style={css("font-family:'Space Mono',monospace;font-size:11px;letter-spacing:2px;color:#9a90ab")}>CODICE STANZA</div>
            <div style={css("font-family:'Space Mono',monospace;font-weight:700;font-size:44px;letter-spacing:6px;color:#36e0e0;margin:6px 0 18px")}>{R.code}</div>
            <div style={css('width:70px;height:70px;border-radius:50%;border:5px solid #2a2436;border-top-color:#36e0e0;margin:0 auto 16px;animation:spin 1s linear infinite')}></div>
            <div style={css('font-weight:700;font-size:15px;margin-bottom:4px')}>In attesa di un avversario…</div>
            <div style={css('font-size:11.5px;color:#6a6478;max-width:280px;margin:0 auto 22px')}>Condividi il codice <b style={{ color: '#36e0e0' }}>{R.code}</b> con l'avversario: appena entra, partite insieme.</div>
            <button onClick={goHome} style={css('margin-top:6px;font-size:12px;color:#9a90ab')}>Annulla</button>
          </div>
        )}

        {/* DRAFT SETUP (pass & play) */}
        {screen === 'draft_setup' && (
          <div style={css('animation:slidein .35s ease both')}>
            <div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:30px;line-height:1;margin:4px 2px 6px")}>Scegli la<br />sfida 1v1</div>
            <div style={css('font-size:13px;color:#9a90ab;margin:0 2px 22px')}>Snake draft · 5 vs 5 · pesca a turni</div>
            <div style={css('display:flex;flex-direction:column;gap:14px')}>
              {[[0, 1], [0, 2], [1, 2]].map(([a, b]) => (
                <button key={`${a}-${b}`} onClick={() => startMatchLocal(a, b)} style={css("display:flex;align-items:center;justify-content:space-between;padding:18px;border-radius:20px;background:#17131f;border:3px solid #2a2436;box-shadow:5px 5px 0 #15131a")}>
                  <div style={css('display:flex;align-items:center;gap:11px')}><div style={{ ...css("width:38px;height:38px;border-radius:50%;border:2px solid #15131a;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;color:#15131a"), background: PCOL[a] }}>{PNAME[a][0]}</div><span style={css('font-weight:700')}>{PNAME[a]}</span></div>
                  <div style={css("font-family:'Syne',sans-serif;font-weight:800;color:#c6ff3d;font-size:15px")}>VS</div>
                  <div style={css('display:flex;align-items:center;gap:11px')}><span style={css('font-weight:700')}>{PNAME[b]}</span><div style={{ ...css("width:38px;height:38px;border-radius:50%;border:2px solid #15131a;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;color:#15131a"), background: PCOL[b] }}>{PNAME[b][0]}</div></div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* FORMATION */}
        {screen === 'formation' && (
          <div style={css('animation:slidein .35s ease both')}>
            <div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:28px;line-height:1;margin:4px 2px 4px")}>Scegli il modulo</div>
            <div style={css('font-size:12px;color:#9a90ab;margin:0 2px 12px')}>5 in campo · ogni pescata riempie un ruolo</div>
            <div style={css("display:flex;gap:12px;margin:0 2px 16px;font-family:'Space Mono',monospace;font-size:10px;color:#b9b0c8")}>
              {(['POR', 'DIF', 'CEN', 'ATT'] as const).map((r) => <span key={r} style={css('display:flex;align-items:center;gap:4px')}><span style={{ ...css('width:8px;height:8px;border-radius:50%'), background: ROLECOL[r] }}></span>{r}</span>)}
            </div>
            {[0, 1].filter((slot) => !online || R.mySlot === slot).map((slot) => (
              <div key={slot} style={css('background:#17131f;border:2px solid #2a2436;border-radius:18px;padding:13px;margin-bottom:14px')}>
                <div style={css('display:flex;align-items:center;gap:8px;margin-bottom:10px')}><div style={{ ...css('width:14px;height:14px;border-radius:50%'), background: PCOL[M.slots[slot]] }}></div><span style={css('font-weight:700;font-size:14px')}>{PNAME[M.slots[slot]]}</span><span style={{ ...css("font-family:'Space Mono',monospace;font-size:12px;margin-left:auto"), color: PCOL[M.slots[slot]] }}>{MODULES[M.forms[slot]].name}</span></div>
                <div style={css('display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px')}>
                  {MODULES.map((m, idx) => {
                    const onSel = M.forms[slot] === idx;
                    return (
                      <button key={m.name} onClick={() => (online ? R.setForm(idx) : setFormLocal(slot, idx))} style={{ ...css('padding:11px 6px;border-radius:13px;display:flex;flex-direction:column;align-items:center;gap:7px'), background: onSel ? '#1d2233' : '#17131f', border: `2px solid ${onSel ? PCOL[M.slots[slot]] : '#2a2436'}` }}>
                        <div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:14px")}>{m.name}</div>
                        <div style={css('display:flex;gap:3px')}>{m.roles.map((r, di) => <div key={di} style={{ ...css('width:7px;height:7px;border-radius:50%'), background: ROLECOL[r] }}></div>)}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {(!online || R.isHost) ? (
              <button onClick={() => (online ? R.startDraft() : startDraftLocal())} style={css("width:100%;padding:16px;border-radius:16px;background:#c6ff3d;color:#15131a;border:3px solid #15131a;box-shadow:5px 5px 0 #15131a;font-family:'Syne',sans-serif;font-weight:800;font-size:16px")}>INIZIA DRAFT ⚡</button>
            ) : (
              <div style={css('text-align:center;font-size:12px;color:#9a90ab;padding:14px')}>In attesa che l'host avvii il draft…</div>
            )}
          </div>
        )}

        {/* DRAFT */}
        {screen === 'draft' && (
          <div>
            <div style={css('display:flex;gap:10px;margin-bottom:14px')}>
              {[0, 1].map((slot) => (
                <div key={slot} style={{ ...css('flex:1;padding:11px;border-radius:16px;background:#17131f'), border: `3px solid ${pickerSlot === slot ? PCOL[M.slots[slot]] : '#2a2436'}` }}>
                  <div style={css('display:flex;align-items:center;gap:7px;margin-bottom:8px')}><div style={{ ...css('width:20px;height:20px;border-radius:50%'), background: PCOL[M.slots[slot]] }}></div><span style={css('font-weight:700;font-size:13px')}>{PNAME[M.slots[slot]]}</span></div>
                  <div style={css('display:flex;gap:5px')}>
                    {tray(slot).map((s, i) => <div key={i} style={css('flex:1;display:flex;flex-direction:column;align-items:center;gap:2px')}><div style={{ ...css('width:100%;aspect-ratio:1;border-radius:9px;display:flex;align-items:center;justify-content:center;overflow:hidden'), background: s.bg, border: `2px solid ${s.bd}` }}>{s.av}</div><div style={{ ...css("font-size:7px;font-family:'Space Mono',monospace;line-height:1"), color: s.roleCol }}>{s.role}</div></div>)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ ...css("text-align:center;padding:10px;border-radius:14px;color:#15131a;margin-bottom:14px;font-family:'Syne',sans-serif;font-weight:800;animation:pulse 1.6s ease-in-out infinite"), background: PCOL[pickerP] }}>PICK {Math.min(M.turn + 1, 10)}/10 · {PNAME[pickerP]} · {pickerRole}</div>
            <div style={css("text-align:center;font-family:'Space Mono',monospace;font-size:11px;letter-spacing:2px;color:#9a90ab;margin-bottom:10px")}>{myTurn ? 'PESCA · SCEGLI 1 CARTA' : `IN ATTESA DI ${PNAME[pickerP].toUpperCase()}…`}</div>
            <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
              {M.options.map((id, i) => {
                const g = girl(id);
                const el = Date.now() - M.optAt - (150 + i * 420);
                const ang = el <= 0 ? 180 : el >= 420 ? 0 : 180 * (1 - (1 - Math.pow(1 - el / 420, 3)));
                return (
                  <div key={id + i} style={css('perspective:1000px;animation:cardin .4s ease both')}>
                    <button onClick={() => doPick(id)} disabled={!myTurn} style={{ ...css('position:relative;display:block;width:100%;padding:0;border:none;background:none'), transformStyle: 'preserve-3d', transform: `rotateY(${ang.toFixed(1)}deg)`, opacity: myTurn ? 1 : 0.85 }}>
                      <div style={{ ...css("position:relative;text-align:center;padding:12px 10px;border-radius:20px;border:3px solid #15131a;box-shadow:5px 5px 0 #15131a;overflow:hidden"), backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', background: `linear-gradient(160deg,${g.c1},${g.c2})` }}>
                        <div style={css('display:flex;justify-content:space-between;align-items:flex-start')}><div style={css("font-family:'Space Mono',monospace;font-weight:700;font-size:26px;line-height:1;color:#15131a")}>{ov(g.stats)}</div><div style={{ ...css("font-family:'Space Mono',monospace;font-size:8px;background:#15131a;padding:3px 6px;border-radius:7px"), color: g.c1 }}>{g.role}</div></div>
                        <div style={css('width:80px;height:80px;margin:6px auto 4px;border-radius:50%;background:rgba(255,255,255,.35);border:2px solid #15131a;display:flex;align-items:center;justify-content:center;overflow:hidden')}>{av(g, 72)}</div>
                        <div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:15px;color:#15131a;text-transform:uppercase;margin-bottom:6px")}>{g.name}</div>
                        <div style={css('display:flex;flex-direction:column;gap:3px;background:rgba(0,0,0,.12);border-radius:10px;padding:7px 9px')}>
                          {CATS.map(([k, , emoji]) => <div key={k} style={css('display:flex;justify-content:space-between;align-items:center;color:#15131a')}><span style={css('font-size:13px')}>{emoji}</span><span style={css('font-weight:700;letter-spacing:1px;font-size:11px')}>{'★'.repeat(Math.min(g.stats[k], 5)) + (g.stats[k] >= 6 ? '✦' : '') + '☆'.repeat(Math.max(0, 5 - g.stats[k]))}</span></div>)}
                        </div>
                        <div style={css('position:absolute;top:-20%;left:-12%;width:55%;height:140%;background:linear-gradient(105deg,transparent 42%,rgba(255,255,255,.4) 50%,transparent 58%);pointer-events:none')}></div>
                      </div>
                      <div style={{ ...css("position:absolute;inset:0;border-radius:20px;background:linear-gradient(150deg,#2a2138,#15131a 70%);border:3px solid #15131a;box-shadow:5px 5px 0 #15131a;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;overflow:hidden"), backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                        <div style={css("width:46px;height:46px;border-radius:13px;background:#c6ff3d;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;font-size:26px;color:#15131a")}>C</div>
                        <div style={css("font-family:'Space Mono',monospace;font-size:9px;letter-spacing:3px;color:#6a6478")}>CANTERA</div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
            <div style={css('text-align:center;font-size:11px;color:#6a6478;margin-top:12px')}>{myTurn ? 'Tocca la carta che vuoi nella tua rosa' : 'Tocca al tuo avversario'}</div>
          </div>
        )}

        {/* SHOOTOUT */}
        {screen === 'shootout' && <Shootout M={M} online={online} room={room} currentUser={currentUser} girl={girl} av={av} doShoot={doShoot} doRematch={doRematch} goHome={goHome} />}

        {/* FANTA HOME */}
        {screen === 'fanta' && (
          <div style={css('animation:slidein .35s ease both')}>
            <div style={css('display:flex;align-items:flex-end;justify-content:space-between;margin:2px 2px 14px')}>
              <div><div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:28px;line-height:1")}>Classifica</div><div style={css("font-family:'Space Mono',monospace;font-size:11px;color:#9a90ab")}>GIORNATA {L.league.giornata} · LIVE</div></div>
              <div style={css("display:flex;align-items:center;gap:6px;font-family:'Space Mono',monospace;font-size:10px;color:#c6ff3d")}><span style={css('width:8px;height:8px;border-radius:50%;background:#c6ff3d;animation:pulse 1.2s infinite')}></span>LIVE</div>
            </div>
            <div style={css('display:flex;flex-direction:column;gap:10px;margin-bottom:18px')}>
              {standings.map((r, idx) => {
                const i = r.i; const squad = Object.values(ownersOf).filter((o) => o === i).length;
                const first = idx === 0;
                return (
                  <div key={i} style={{ ...css('display:flex;align-items:center;gap:12px;padding:14px;border-radius:18px'), background: first ? '#1d1726' : '#17131f', border: `3px solid ${first ? '#ffd23f' : '#2a2436'}`, boxShadow: first ? '5px 5px 0 #15131a' : 'none' }}>
                    <div style={{ ...css("font-family:'Syne',sans-serif;font-weight:800;font-size:24px;width:26px"), color: first ? '#ffd23f' : PCOL[i] }}>{idx + 1}</div>
                    <div style={{ ...css("width:42px;height:42px;border-radius:50%;border:2px solid #15131a;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;color:#15131a"), background: PCOL[i] }}>{PNAME[i][0]}</div>
                    <div style={css('flex:1')}><div style={css('font-weight:700;font-size:15px')}>{PNAME[i]}</div><div style={css("font-family:'Space Mono',monospace;font-size:10px;color:#9a90ab")}>{squad} ragazze · {budgets[i]} cr</div></div>
                    <div style={css('text-align:right')}><div style={{ ...css("font-family:'Space Mono',monospace;font-weight:700;font-size:22px"), color: first ? '#ffd23f' : PCOL[i] }}>{r.pts}</div><div style={css("font-family:'Space Mono',monospace;font-size:9px;color:#9a90ab")}>PUNTI</div></div>
                  </div>
                );
              })}
            </div>
            <div style={css('display:flex;gap:10px;margin-bottom:18px')}>
              <button onClick={() => go('admin')} style={css("flex:1;padding:14px;border-radius:16px;background:#9b6bff;color:#15131a;border:3px solid #15131a;box-shadow:4px 4px 0 #15131a;font-family:'Syne',sans-serif;font-weight:800;font-size:13px")}>+ PUNTI</button>
              <button onClick={() => go('auction')} style={css("flex:1;padding:14px;border-radius:16px;background:#36e0e0;color:#15131a;border:3px solid #15131a;box-shadow:4px 4px 0 #15131a;font-family:'Syne',sans-serif;font-weight:800;font-size:13px")}>ASTA / ROSE</button>
            </div>
            <div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:13px;letter-spacing:1px;color:#8a8198;margin:0 2px 10px")}>LE ROSE</div>
            <div style={css('display:flex;flex-direction:column;gap:12px')}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={css('padding:13px;border-radius:18px;background:#17131f;border:2px solid #2a2436')}>
                  <div style={css('display:flex;align-items:center;gap:8px;margin-bottom:10px')}><div style={{ ...css('width:14px;height:14px;border-radius:50%'), background: PCOL[i] }}></div><span style={css('font-weight:700;font-size:13px')}>{PNAME[i]}</span></div>
                  <div style={css('display:flex;gap:8px;flex-wrap:wrap')}>
                    {girls.filter((g) => ownersOf[g.id] === i).map((g) => (
                      <div key={g.id} style={css('display:flex;flex-direction:column;align-items:center;gap:3px;width:54px')}><div style={{ ...css('width:46px;height:46px;border-radius:14px;border:2px solid #15131a;display:flex;align-items:center;justify-content:center;overflow:hidden'), background: `linear-gradient(160deg,${g.c1},${g.c2})` }}>{av(g, 40)}</div><div style={css('font-size:9px;font-weight:700;text-align:center;line-height:1')}>{g.name}</div></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADMIN */}
        {screen === 'admin' && (() => {
          const selG = girl(adminGirl); const selName = selG ? selG.name : '—';
          return (
            <div style={css('animation:slidein .35s ease both')}>
              <div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:26px;line-height:1;margin:2px 2px 4px")}>Assegna punti</div>
              <div style={css("font-family:'Space Mono',monospace;font-size:11px;color:#9a90ab;margin:0 2px 16px")}>GIORNATA {L.league.giornata} · ADMIN</div>
              <div style={css('font-size:12px;color:#8a8198;margin:0 2px 8px')}>1 · scegli la ragazza</div>
              <div style={css('display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:16px')}>
                {girls.filter((g) => ownersOf[g.id] != null).map((g) => (
                  <button key={g.id} onClick={() => { tap(); setAdminGirl(g.id); }} style={{ ...css('flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px;border-radius:14px;background:#17131f;min-width:64px'), border: `3px solid ${adminGirl === g.id ? '#c6ff3d' : '#2a2436'}` }}><div style={{ ...css('width:42px;height:42px;border-radius:12px;border:2px solid #15131a;display:flex;align-items:center;justify-content:center;overflow:hidden'), background: `linear-gradient(160deg,${g.c1},${g.c2})` }}>{av(g, 40)}</div><div style={css('font-size:9.5px;font-weight:700')}>{g.name}</div><div style={{ ...css('width:10px;height:10px;border-radius:50%'), background: PCOL[ownersOf[g.id]] }}></div></button>
                ))}
              </div>
              <div style={css('padding:16px;border-radius:18px;background:#17131f;border:2px solid #2a2436;margin-bottom:14px')}>
                <div style={css('font-size:12px;color:#8a8198;margin-bottom:12px')}>2 · voto settimanale di <b style={{ color: '#f4f1ea' }}>{selName}</b></div>
                <div style={css('display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:12px')}><button onClick={() => { tap(); setVotoVal((v) => Math.max(1, v - 1)); }} style={css('width:42px;height:42px;border-radius:13px;background:#2a2436;font-size:22px')}>−</button><div style={css("font-family:'Space Mono',monospace;font-weight:700;font-size:38px;width:60px;text-align:center;color:#c6ff3d")}>{votoVal}</div><button onClick={() => { tap(); setVotoVal((v) => Math.min(10, v + 1)); }} style={css('width:42px;height:42px;border-radius:13px;background:#2a2436;font-size:22px')}>+</button></div>
                <button onClick={confirmVoto} style={css("width:100%;padding:12px;border-radius:14px;background:#c6ff3d;color:#15131a;border:2px solid #15131a;font-family:'Syne',sans-serif;font-weight:800")}>CONFERMA VOTO</button>
              </div>
              <div style={css('font-size:12px;color:#8a8198;margin:0 2px 8px')}>3 · bonus / malus</div>
              <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px')}>
                {events.map((e, i) => <button key={i} onClick={() => addEvent(e.label, e.pts)} style={{ ...css('display:flex;align-items:center;justify-content:space-between;padding:12px;border-radius:13px;background:#17131f;font-size:11.5px;font-weight:700;text-align:left'), border: `2px solid ${e.pts > 0 ? '#34421a' : '#42221f'}` }}><span>{e.label}</span><span style={{ ...css("font-family:'Space Mono',monospace"), color: e.pts > 0 ? '#c6ff3d' : '#ff6b6b' }}>{(e.pts > 0 ? '+' : '') + e.pts}</span></button>)}
              </div>
              <details style={css('margin-bottom:14px')}>
                <summary style={css('font-size:12px;color:#8a8198;padding:6px 2px;cursor:pointer')}>⚙ modifica eventi ▾</summary>
                <div style={css('padding:14px;border-radius:16px;background:#17131f;border:2px solid #2a2436;margin-top:8px')}>
                  <div style={css('display:flex;flex-direction:column;gap:7px;margin-bottom:12px')}>
                    {events.map((e, i) => <div key={i} style={css('display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:#221c30')}><span style={css('flex:1;font-size:12px')}>{e.label}</span><span style={{ ...css("font-family:'Space Mono',monospace;font-size:12px;font-weight:700"), color: e.pts > 0 ? '#c6ff3d' : '#ff6b6b' }}>{(e.pts > 0 ? '+' : '') + e.pts}</span><button onClick={() => removeEv(i)} style={css('width:24px;height:24px;border-radius:7px;background:#42221f;color:#ff6b6b;font-size:12px')}>✕</button></div>)}
                  </div>
                  <div style={css('display:flex;gap:8px;align-items:center')}>
                    <input value={newEvLabel} onChange={(e) => setNewEvLabel(e.target.value)} placeholder="nuovo evento" style={css('flex:1;min-width:0;padding:11px;border-radius:11px;background:#221c30;border:2px solid #2a2436;color:#f4f1ea;font-size:16px;outline:none')} />
                    <button onClick={() => { tap(); setNewEvPts((p) => p - 1); }} style={css('width:34px;height:34px;border-radius:10px;background:#2a2436;font-size:18px')}>−</button>
                    <div style={css("width:30px;text-align:center;font-family:'Space Mono',monospace;font-weight:700;color:#c6ff3d")}>{newEvPts}</div>
                    <button onClick={() => { tap(); setNewEvPts((p) => p + 1); }} style={css('width:34px;height:34px;border-radius:10px;background:#2a2436;font-size:18px')}>+</button>
                  </div>
                  <button onClick={addEv} style={css("width:100%;margin-top:10px;padding:11px;border-radius:11px;background:#c6ff3d;color:#15131a;border:2px solid #15131a;font-family:'Syne',sans-serif;font-weight:800;font-size:13px")}>+ AGGIUNGI EVENTO</button>
                </div>
              </details>
              <details style={css('margin-bottom:16px')}>
                <summary style={css('font-size:12px;color:#8a8198;padding:6px 2px;cursor:pointer')}>✎ modifica STATS di {selName} ▾</summary>
                <div style={css('padding:14px;border-radius:16px;background:#17131f;border:2px solid #2a2436;margin-top:8px;display:flex;flex-direction:column;gap:9px')}>
                  {CATS.map(([k, label, emoji]) => (
                    <div key={k} style={css('display:flex;align-items:center;justify-content:space-between;gap:10px')}><span style={css('flex:1;font-size:13px;font-weight:700')}>{emoji + ' ' + label}</span><div style={css('display:flex;gap:3px')}>{[1, 2, 3, 4, 5, 6].map((n) => <button key={n} onClick={() => setStat(k, n)} style={{ ...css('font-size:19px;line-height:1;background:none;padding:0'), color: (selG && n <= selG.stats[k]) ? (n === 6 ? '#9fe8ff' : '#ffd23f') : '#3a3350' }}>{n === 6 ? '✦' : '★'}</button>)}</div></div>
                  ))}
                </div>
              </details>
              <div style={css('font-size:12px;color:#8a8198;margin:0 2px 8px')}>ultimi movimenti</div>
              <div style={css('display:flex;flex-direction:column;gap:6px')}>
                {[...L.league.log].slice(-6).reverse().map((l, i) => <div key={i} style={css('display:flex;align-items:center;justify-content:space-between;padding:10px 13px;border-radius:12px;background:#17131f;border:1px solid #2a2436;font-size:12px')}><span><b style={{ color: PCOL[l.p] }}>{PNAME[l.p]}</b> · {l.label + ' · ' + (girls.find((g) => g.id === l.g)?.name || '')}</span><span style={{ ...css("font-family:'Space Mono',monospace;font-weight:700"), color: l.pts > 0 ? '#c6ff3d' : '#ff6b6b' }}>{(l.pts > 0 ? '+' : '') + l.pts}</span></div>)}
              </div>
            </div>
          );
        })()}

        {/* AUCTION */}
        {screen === 'auction' && (() => {
          const lg = L.league;
          const freeGirls = girls.filter((g) => ownersOf[g.id] == null);
          const aucDone = freeGirls.length === 0;
          const lotG = lg.aucLot ? girl(lg.aucLot) : null;
          const isBid = lg.aucPhase === 'bid';
          return (
            <div style={css('animation:slidein .35s ease both')}>
              <div style={css('display:flex;align-items:center;justify-content:space-between;margin:2px 2px 12px')}>
                <div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:26px;line-height:1")}>Asta dal vivo</div>
                <button onClick={aucNew} style={css("font-size:10px;font-family:'Space Mono',monospace;color:#9a90ab;border:1px solid #2a2436;border-radius:9px;padding:7px 9px")}>NUOVA ASTA</button>
              </div>
              <div style={css('display:flex;gap:8px;margin-bottom:16px')}>
                {[0, 1, 2].map((i) => <div key={i} style={{ ...css('flex:1;text-align:center;padding:10px 4px;border-radius:14px'), background: lg.aucLeader === i ? PCOL[i] + '22' : '#17131f', border: `2px solid ${lg.aucNom === i ? PCOL[i] : '#2a2436'}` }}><div style={css('font-weight:700;font-size:12px')}>{PNAME[i]}</div><div style={{ ...css("font-family:'Space Mono',monospace;font-weight:700;font-size:18px"), color: PCOL[i] }}>{budgets[i]}</div><div style={css("font-family:'Space Mono',monospace;font-size:8px;color:#9a90ab")}>crediti</div></div>)}
              </div>
              {!isBid && (aucDone ? (
                <div style={css('text-align:center;padding:30px 14px;border-radius:18px;background:#17131f;border:2px solid #2a2436')}><div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:22px;color:#c6ff3d")}>Asta completata!</div><div style={css('font-size:12px;color:#9a90ab;margin-top:6px')}>Tutte assegnate. Le rose sono nella classifica. Tocca NUOVA ASTA per ricominciare.</div></div>
              ) : (
                <>
                  <div style={css('display:flex;align-items:center;gap:7px;margin:0 2px 12px;flex-wrap:wrap')}><span style={css('font-size:12px;color:#8a8198')}>bandisce</span><span style={{ ...css("font-family:'Syne',sans-serif;font-weight:800"), color: PCOL[lg.aucNom] }}>{PNAME[lg.aucNom]}</span><span style={css('font-size:11px;color:#6a6478')}>· scegli chi mettere all'asta</span></div>
                  <div style={css('display:grid;grid-template-columns:1fr 1fr;gap:10px')}>
                    {freeGirls.map((g) => <button key={g.id} onClick={() => aucNominate(g.id)} style={{ ...css('display:flex;align-items:center;gap:9px;padding:9px;border-radius:14px;border:3px solid #15131a;box-shadow:3px 3px 0 #15131a'), background: `linear-gradient(160deg,${g.c1},${g.c2})` }}><div style={css('width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.3);border:2px solid #15131a;display:flex;align-items:center;justify-content:center;overflow:hidden')}>{av(g, 40)}</div><span style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:13px;color:#15131a;text-transform:uppercase")}>{g.name}</span></button>)}
                  </div>
                </>
              ))}
              {isBid && lotG && (
                <>
                  <div style={{ ...css("text-align:center;padding:16px;border-radius:20px;border:3px solid #15131a;box-shadow:5px 5px 0 #15131a;margin-bottom:14px"), background: `linear-gradient(160deg,${lotG.c1},${lotG.c2})` }}>
                    <div style={css('width:90px;height:90px;margin:0 auto 6px;border-radius:50%;background:rgba(255,255,255,.3);border:3px solid #15131a;display:flex;align-items:center;justify-content:center;overflow:hidden')}>{av(lotG, 90)}</div>
                    <div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:20px;color:#15131a;text-transform:uppercase")}>{lotG.name}</div>
                    <div style={css("font-family:'Space Mono',monospace;font-size:10px;color:#15131a;opacity:.7")}>OVR {ov(lotG.stats)} · {lotG.role}</div>
                  </div>
                  <div style={css('text-align:center;margin-bottom:14px')}><div style={css("font-family:'Space Mono',monospace;font-weight:700;font-size:34px;color:#36e0e0")}>{lg.aucLeader === null ? 'BASE' : String(lg.aucBid)}<span style={css('font-size:14px;color:#9a90ab')}> cr</span></div><div style={{ ...css("font-family:'Space Mono',monospace;font-size:11px"), color: lg.aucLeader === null ? '#9a90ab' : PCOL[lg.aucLeader] }}>{lg.aucLeader === null ? 'nessuna offerta' : 'offerta di ' + PNAME[lg.aucLeader]}</div></div>
                  <div style={css('display:flex;flex-direction:column;gap:8px;margin-bottom:14px')}>
                    {[0, 1, 2].map((p) => {
                      const min1 = lg.aucLeader === null ? 1 : lg.aucBid + 1, min5 = lg.aucLeader === null ? 5 : lg.aucBid + 5;
                      return <div key={p} style={{ ...css('display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:13px'), background: lg.aucLeader === p ? PCOL[p] + '22' : '#17131f', border: `2px solid ${lg.aucLeader === p ? PCOL[p] : '#2a2436'}` }}><span style={css('flex:1;font-weight:700;font-size:13px')}>{PNAME[p]}</span><span style={css("font-family:'Space Mono',monospace;font-size:10px;color:#9a90ab")}>{budgets[p]}cr</span><button onClick={() => aucRaise(p, 1)} style={{ ...css("padding:9px 13px;border-radius:10px;color:#15131a;font-family:'Space Mono',monospace;font-weight:700;font-size:12px"), background: budgets[p] >= min1 ? PCOL[p] : '#3a3350' }}>+1</button><button onClick={() => aucRaise(p, 5)} style={{ ...css("padding:9px 13px;border-radius:10px;color:#15131a;font-family:'Space Mono',monospace;font-weight:700;font-size:12px"), background: budgets[p] >= min5 ? PCOL[p] : '#3a3350' }}>+5</button></div>;
                    })}
                  </div>
                  <div style={css('display:flex;gap:10px')}>
                    <button onClick={aucPass} style={css("flex:0 0 36%;padding:14px;border-radius:14px;background:#17131f;border:2px solid #2a2436;font-family:'Syne',sans-serif;font-weight:800;font-size:13px;color:#9a90ab")}>PASSA</button>
                    <button onClick={aucAward} style={{ ...css("flex:1;padding:14px;border-radius:14px;color:#15131a;border:3px solid #15131a;box-shadow:4px 4px 0 #15131a;font-family:'Syne',sans-serif;font-weight:800;font-size:13px"), background: lg.aucLeader === null ? '#3a3350' : '#c6ff3d' }}>{lg.aucLeader === null ? 'NESSUNA OFFERTA' : 'AGGIUDICA · ' + lg.aucBid + 'cr'}</button>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* ROSA — giugno 2026 */}
        {screen === 'rosa' && (() => {
          // Formazione: ATT(3) · CEN(3) · DIF(3) · POR(1), mappata su girls[0..9].
          const SLOTS = [
            { top: '19%', left: '26%' }, { top: '15%', left: '50%' }, { top: '19%', left: '74%' },
            { top: '42%', left: '20%' }, { top: '40%', left: '50%' }, { top: '42%', left: '80%' },
            { top: '65%', left: '26%' }, { top: '63%', left: '50%' }, { top: '65%', left: '74%' },
            { top: '86%', left: '50%' },
          ];
          const sel = rosaGirl ? girl(rosaGirl) : null;
          return (
            <div style={css('animation:slidein .35s ease both')}>
              <div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:28px;line-height:1;margin:2px 2px 2px")}>Rosa</div>
              <div style={css("font-family:'Space Mono',monospace;font-size:11px;color:#9a90ab;margin:0 2px 14px")}>GIUGNO 2026 · LA SQUADRA</div>
              <div style={css('position:relative;width:100%;height:540px;border-radius:22px;overflow:hidden;background:linear-gradient(#3f973f,#2c722c);border:3px solid #15131a;box-shadow:6px 6px 0 #15131a')}>
                <div style={css('position:absolute;top:50%;left:6%;right:6%;height:2px;background:rgba(255,255,255,.35)')}></div>
                <div style={css('position:absolute;top:50%;left:50%;width:96px;height:96px;border:2px solid rgba(255,255,255,.35);border-radius:50%;transform:translate(-50%,-50%)')}></div>
                <div style={css('position:absolute;top:0;left:28%;right:28%;height:52px;border:2px solid rgba(255,255,255,.3);border-top:none;border-radius:0 0 8px 8px')}></div>
                <div style={css('position:absolute;bottom:0;left:28%;right:28%;height:52px;border:2px solid rgba(255,255,255,.3);border-bottom:none;border-radius:8px 8px 0 0')}></div>
                {girls.map((g, i) => {
                  const s = SLOTS[i] || SLOTS[9];
                  const avg = CATS.reduce((t, [k]) => t + g.stats[k], 0) / CATS.length;
                  return (
                    <button key={g.id} onClick={() => { tap(); setRosaGirl(g.id); }} style={{ ...css('position:absolute;display:flex;flex-direction:column;align-items:center;gap:3px;background:none;transform:translate(-50%,-50%)'), top: s.top, left: s.left }}>
                      <div style={{ ...css('position:relative;width:56px;padding:6px 4px 5px;border-radius:11px;border:2px solid #15131a;box-shadow:2px 2px 0 #15131a;display:flex;flex-direction:column;align-items:center'), background: `linear-gradient(160deg,${g.c1},${g.c2})` }}>
                        <div style={css("position:absolute;top:3px;left:5px;font-family:'Space Mono',monospace;font-weight:700;font-size:13px;line-height:1;color:#15131a")}>{ov(g.stats)}</div>
                        <div style={css('width:38px;height:38px;margin-top:6px;border-radius:50%;background:rgba(255,255,255,.32);border:1px solid #15131a;display:flex;align-items:center;justify-content:center;overflow:hidden')}>{av(g, 34)}</div>
                      </div>
                      <div style={css("font-size:10px;font-weight:700;color:#fff;text-shadow:1px 1px 0 #15131a;font-family:'Space Mono',monospace")}>★ {avg.toFixed(1)}</div>
                    </button>
                  );
                })}
              </div>
              <div style={css('text-align:center;font-size:11px;color:#6a6478;margin-top:10px')}>Tocca una giocatrice per vedere la sua card</div>

              {sel && (
                <div onClick={() => setRosaGirl(null)} style={css('position:fixed;inset:0;z-index:900;background:rgba(11,9,16,.86);display:flex;align-items:center;justify-content:center;padding:24px')}>
                  <div onClick={(e) => e.stopPropagation()} style={{ ...css("position:relative;width:100%;max-width:280px;text-align:center;padding:16px 14px;border-radius:24px;border:3px solid #15131a;box-shadow:7px 7px 0 #15131a;overflow:hidden;animation:pop .3s ease both"), background: `linear-gradient(160deg,${sel.c1},${sel.c2})` }}>
                    <div style={css('display:flex;justify-content:space-between;align-items:flex-start')}><div style={css("font-family:'Space Mono',monospace;font-weight:700;font-size:30px;line-height:1;color:#15131a")}>{ov(sel.stats)}</div><div style={{ ...css("font-family:'Space Mono',monospace;font-size:9px;background:#15131a;padding:3px 7px;border-radius:7px"), color: sel.c1 }}>{sel.role}</div></div>
                    <div style={css('width:112px;height:112px;margin:6px auto;border-radius:50%;background:rgba(255,255,255,.35);border:2px solid #15131a;display:flex;align-items:center;justify-content:center;overflow:hidden')}>{av(sel, 100)}</div>
                    <div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:20px;color:#15131a;text-transform:uppercase;margin-bottom:8px")}>{sel.name}</div>
                    <div style={css('display:flex;flex-direction:column;gap:4px;background:rgba(0,0,0,.12);border-radius:12px;padding:9px 11px;margin-bottom:12px')}>
                      {CATS.map(([k, label, emoji]) => <div key={k} style={css('display:flex;justify-content:space-between;align-items:center;color:#15131a')}><span style={css('font-size:13px')}>{emoji} {label}</span><span style={css('font-weight:700;letter-spacing:1px;font-size:12px')}>{'★'.repeat(Math.min(sel.stats[k], 5)) + (sel.stats[k] >= 6 ? '✦' : '') + '☆'.repeat(Math.max(0, 5 - sel.stats[k]))}</span></div>)}
                    </div>
                    <button onClick={() => setRosaGirl(null)} style={css("width:100%;padding:12px;border-radius:14px;background:#15131a;color:#f4f1ea;font-family:'Syne',sans-serif;font-weight:800;font-size:14px")}>CHIUDI</button>
                    <div style={css('position:absolute;top:-20%;left:-12%;width:55%;height:140%;background:linear-gradient(105deg,transparent 42%,rgba(255,255,255,.4) 50%,transparent 58%);pointer-events:none')}></div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </Shell>
  );
}

// Cornice mobile-first con sfondo radiale e blob.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={css("min-height:100dvh;width:100%;background:radial-gradient(120% 60% at 50% -10%,#1a1226 0%,#0b0910 60%);display:flex;justify-content:center;font-family:'Space Grotesk',system-ui,sans-serif;color:#f4f1ea;overflow-x:hidden")}>
      <div style={css('width:100%;max-width:440px;position:relative;padding:env(safe-area-inset-top) 16px calc(40px + env(safe-area-inset-bottom));overflow:hidden')}>
        <div style={css('position:absolute;top:80px;left:-60px;width:200px;height:200px;border-radius:50%;background:#9b6bff;filter:blur(80px);opacity:.30;pointer-events:none')}></div>
        <div style={css('position:absolute;top:280px;right:-70px;width:220px;height:220px;border-radius:50%;background:#ff4d9d;filter:blur(90px);opacity:.26;pointer-events:none')}></div>
        <div style={css('position:absolute;top:560px;left:-40px;width:200px;height:200px;border-radius:50%;background:#c6ff3d;filter:blur(90px);opacity:.14;pointer-events:none')}></div>
        {children}
      </div>
    </div>
  );
}

// Popup guida "Aggiungi alla Home" (mostrato una sola volta, sopra ogni schermata).
function GuideOverlay({ onClose, mascot }: { onClose: () => void; mascot: React.ReactNode }) {
  const steps: { n: number; c: string; t: React.ReactNode }[] = [
    { n: 1, c: '#c6ff3d', t: <>Su Safari tocca <b>Condividi</b> (quadrato con freccia ↑)</> },
    { n: 2, c: '#ff4d9d', t: <>Scegli <b>"Aggiungi a Home"</b></> },
    { n: 3, c: '#9b6bff', t: <>Apri <b>CANTERA</b> dalla nuova icona ⚡</> },
  ];
  return (
    <div style={css('position:fixed;inset:0;z-index:1000;background:rgba(11,9,16,.86);display:flex;align-items:center;justify-content:center;padding:20px')}>
      <div style={css("width:100%;max-width:360px;background:#17131f;border:3px solid #15131a;box-shadow:7px 7px 0 #15131a;border-radius:24px;padding:24px;animation:slidein .35s ease both")}>
        <div style={css('text-align:center;margin-bottom:6px')}><div style={css('display:inline-block;animation:bob 3s ease-in-out infinite')}>{mascot}</div></div>
        <div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:22px;line-height:1.05;text-align:center;margin-bottom:18px")}>Aggiungi CANTERA alla Home 📲</div>
        <div style={css('display:flex;flex-direction:column;gap:12px;margin-bottom:14px')}>
          {steps.map((s) => (
            <div key={s.n} style={css('display:flex;align-items:center;gap:12px')}>
              <div style={{ ...css("flex:0 0 auto;width:30px;height:30px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:'Space Mono',monospace;font-weight:700;color:#15131a"), background: s.c }}>{s.n}</div>
              <div style={css('font-size:13.5px;color:#f4f1ea;line-height:1.25')}>{s.t}</div>
            </div>
          ))}
        </div>
        <div style={css("font-size:11.5px;color:#9a90ab;text-align:center;margin-bottom:16px;font-family:'Space Mono',monospace")}>Android: menu ⋮ → Installa app</div>
        <button onClick={onClose} style={css("width:100%;padding:15px;border-radius:16px;background:#c6ff3d;color:#15131a;border:3px solid #15131a;box-shadow:5px 5px 0 #15131a;font-family:'Syne',sans-serif;font-weight:800;font-size:16px")}>HO CAPITO ⚡</button>
      </div>
    </div>
  );
}

// Schermata rigori 2D (locale o online).
function Shootout({ M, online, room, currentUser, girl, av, doShoot, doRematch, goHome }: {
  M: LocalMatch; online: boolean; room: import('./types').Room | null; currentUser: number;
  girl: (id: string) => Girl; av: (g: Girl, s: number) => React.ReactNode;
  doShoot: () => void; doRematch: () => void; goHome: () => void;
}) {
  const shScoreA = M.shA.filter((x) => x === 'goal').length;
  const shScoreB = M.shB.filter((x) => x === 'goal').length;
  const dotCol = (o: ShootOutcome | undefined) => (o === 'goal' ? '#c6ff3d' : o == null ? '#2a2436' : '#ff5a5a');
  const nDots = Math.max(5, M.shA.length, M.shB.length);
  const shooterG = M.shShooterId ? girl(M.shShooterId) : null;
  const keeperId = (M.teams[(1 - M.shTurn) as 0 | 1] || [])[0];
  const keeperG = keeperId ? girl(keeperId) : null;
  const aColor = PCOL[M.slots[0]], bColor = PCOL[M.slots[1]];
  const shooterTeamColor = PCOL[M.slots[M.shTurn]], keeperTeamColor = PCOL[M.slots[1 - M.shTurn]];
  const myShot = !online || (M.shTurn === 0 ? room?.host : room?.guest) === currentUser;
  const shReady = !!shooterG && !M.shBusy && myShot;

  return (
    <div style={css('animation:slidein .35s ease both')}>
      {M.shOver && <Confetti z={6} />}
      <div style={css("text-align:center;font-family:'Space Mono',monospace;font-size:11px;letter-spacing:2px;color:#9a90ab;margin-bottom:8px")}>RIGORI · LIVE</div>
      <div style={css('display:flex;align-items:center;justify-content:space-between;margin-bottom:10px')}>
        <div style={css('display:flex;align-items:center;gap:8px')}><div style={{ ...css('width:28px;height:28px;border-radius:50%;border:2px solid #15131a'), background: aColor }}></div><span style={css('font-weight:700;font-size:13px')}>{PNAME[M.slots[0]]}</span></div>
        <div style={css("font-family:'Space Mono',monospace;font-weight:700;font-size:30px")}>{shScoreA}<span style={{ color: '#5a5268' }}>·</span>{shScoreB}</div>
        <div style={css('display:flex;align-items:center;gap:8px')}><span style={css('font-weight:700;font-size:13px')}>{PNAME[M.slots[1]]}</span><div style={{ ...css('width:28px;height:28px;border-radius:50%;border:2px solid #15131a'), background: bColor }}></div></div>
      </div>
      <div style={css('display:flex;justify-content:space-between;margin-bottom:12px')}>
        <div style={css('display:flex;gap:4px')}>{Array.from({ length: nDots }).map((_, i) => <div key={i} style={{ ...css('width:11px;height:11px;border-radius:50%'), background: dotCol(M.shA[i]) }}></div>)}</div>
        <div style={css('display:flex;gap:4px')}>{Array.from({ length: nDots }).map((_, i) => <div key={i} style={{ ...css('width:11px;height:11px;border-radius:50%'), background: dotCol(M.shB[i]) }}></div>)}</div>
      </div>
      <div style={css('position:relative;height:230px;border-radius:18px;overflow:hidden;background:linear-gradient(#3f973f,#2c722c);border:3px solid #15131a;margin-bottom:16px')}>
        <div style={css('position:absolute;top:14px;left:11%;right:11%;height:72px;border:5px solid #f4f1ea;border-bottom:none;border-radius:6px 6px 0 0')}></div>
        <div style={{ ...css('position:absolute;top:38px;width:44px;height:44px;border-radius:50%;border:2px solid #fff;transform:translateX(-50%);z-index:2;display:flex;align-items:center;justify-content:center;overflow:hidden'), left: M.shKeepX + '%', background: keeperTeamColor, transition: 'left .34s ease .18s' }}>{keeperG ? av(keeperG, 34) : ''}</div>
        <div style={{ ...css('position:absolute;width:20px;height:20px;border-radius:50%;background:#fff;border:2px solid #15131a;transform:translate(-50%,-50%);z-index:3'), top: M.shBallY + '%', left: M.shBallX + '%', transition: 'top .8s cubic-bezier(.45,0,.3,1),left .8s cubic-bezier(.45,0,.3,1)' }}></div>
        <div style={css('position:absolute;bottom:16px;left:50%;width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.7);transform:translateX(-50%)')}></div>
        <div style={{ ...css('position:absolute;bottom:6px;left:32%;width:46px;height:46px;border-radius:50%;border:2px solid #fff;transform:translateX(-50%);display:flex;align-items:center;justify-content:center;overflow:hidden;z-index:2'), background: shooterTeamColor }}>{shooterG ? av(shooterG, 38) : ''}</div>
        {M.shMsg && <div style={css('position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:4')}><div style={css("font-family:'Syne',sans-serif;font-weight:800;font-size:40px;color:#fff;text-shadow:3px 3px 0 #15131a;animation:pop .3s ease both")}>{M.shMsg}</div></div>}
      </div>
      {M.shOver ? (
        <>
          <div style={{ ...css("text-align:center;font-family:'Syne',sans-serif;font-weight:800;font-size:26px;margin-bottom:14px"), color: PCOL[M.slots[M.shWin]] }}>{PNAME[M.slots[M.shWin]]} VINCE!</div>
          <div style={css('display:flex;gap:10px')}>
            <button onClick={doRematch} style={css("flex:1;padding:15px;border-radius:16px;background:#c6ff3d;color:#15131a;border:3px solid #15131a;box-shadow:4px 4px 0 #15131a;font-family:'Syne',sans-serif;font-weight:800")}>RIVINCITA</button>
            <button onClick={goHome} style={css("flex:1;padding:15px;border-radius:16px;background:#17131f;border:3px solid #2a2436;font-family:'Syne',sans-serif;font-weight:800")}>HOME</button>
          </div>
        </>
      ) : (
        <>
          <div style={css('display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:12px;font-size:12px;color:#b9b0c8')}><span><b style={{ color: shooterTeamColor }}>{shooterG ? shooterG.name : ''}</b> tira</span><span style={{ color: '#5a5268' }}>·</span><span><b style={{ color: keeperTeamColor }}>{keeperG ? keeperG.name : ''}</b> in porta</span></div>
          <button onClick={doShoot} disabled={!shReady} style={{ ...css("width:100%;padding:17px;border-radius:16px;color:#15131a;border:3px solid #15131a;box-shadow:5px 5px 0 #15131a;font-family:'Syne',sans-serif;font-weight:800;font-size:16px"), background: shReady ? shooterTeamColor : '#3a3350' }}>{M.shBusy ? 'TIRO…' : online && !myShot ? 'IN ATTESA…' : '⚽ TIRA · ' + (shooterG ? shooterG.name : '')}</button>
        </>
      )}
    </div>
  );
}

function Confetti({ z }: { z: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: z }}>
      {Array.from({ length: 24 }).map((_, i) => (
        <div key={i} style={{ position: 'absolute', top: 0, left: ((i * 37) % 100) + '%', width: '9px', height: '14px', borderRadius: '2px', background: COLS[i % 5], animation: `confetti ${(1.6 + (i % 5) * 0.3).toFixed(1)}s linear ${((i % 4) * 0.2).toFixed(1)}s infinite` }} />
      ))}
    </div>
  );
}
