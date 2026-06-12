import { useEffect, useRef, useState } from 'react';
import { ref, onValue, set, update, get, remove } from 'firebase/database';
import { db } from './firebase';
import { ORDER, DEFAULT_GIRLS } from './constants';
import { pick2, resolveShoot } from './game';
import type { Girl, Room } from './types';

const girlsById = (girls: Girl[]) => Object.fromEntries(girls.map((g) => [g.id, g]));

function freshRoom(host: number): Room {
  return {
    host,
    guest: null,
    status: 'waiting',
    forms: [0, 0],
    turn: 0,
    order: ORDER,
    options: [],
    optAt: 0,
    teams: { 0: [], 1: [] },
    shA: [], shB: [], shTurn: 0, shBusy: false,
    shBallX: 50, shBallY: 82, shKeepX: 50, shMsg: '', shOver: false, shWin: 0,
    shShooterId: null,
  };
}

function code4(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

export interface RoomApi {
  room: Room | null;
  code: string;
  isHost: boolean;
  mySlot: 0 | 1 | null;
  create: () => Promise<string>;
  join: (code: string) => Promise<boolean>;
  leave: () => void;
  setForm: (idx: number) => void;
  startDraft: () => void;
  pickGirl: (id: string) => void;
  shoot: () => void;
  rematch: () => void;
}

// Hook per la stanza draft 1v1 online realtime. L'host è autoritativo per RNG e timer.
export function useRoom(currentUser: number, girls: Girl[]): RoomApi {
  const [code, setCode] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const busyRef = useRef(false);
  const gById = girlsById(girls.length ? girls : DEFAULT_GIRLS);

  const isHost = room != null && room.host === currentUser;
  const mySlot: 0 | 1 | null = room == null ? null : room.host === currentUser ? 0 : room.guest === currentUser ? 1 : null;

  useEffect(() => {
    if (!code) { setRoom(null); return; }
    const r = ref(db, `rooms/${code}`);
    const unsub = onValue(r, (snap) => setRoom((snap.val() as Room) || null));
    return () => unsub();
  }, [code]);

  // Host autoritativo: genera le 2 carte quando servono.
  useEffect(() => {
    if (!room || !isHost) return;
    // Genera SOLO quando le opzioni sono vuote (dopo una pesca le svuotiamo).
    // All'ultima pescata resta 1 sola ragazza: pick2 ne ritorna 1 ed è corretto
    // — non rigenerare finché options ha almeno 1 carta (evita loop infinito).
    if (room.status === 'drafting' && room.turn < 10 && (!room.options || room.options.length === 0)) {
      const exclude = [...(room.teams?.[0] || []), ...(room.teams?.[1] || [])];
      const opts = pick2(girls, exclude);
      update(ref(db, `rooms/${code}`), { options: opts, optAt: Date.now() });
    }
  }, [room, isHost, code, girls]);

  // Host autoritativo: risolve il rigore richiesto (shFire).
  useEffect(() => {
    const r = room as (Room & { shFire?: boolean }) | null;
    if (!r || !isHost) return;
    if (r.status !== 'shootout' || !r.shFire || r.shBusy || r.shOver) return;
    if (busyRef.current) return;
    busyRef.current = true;
    const slot = r.shTurn;
    const shooter = r.shShooterId ? gById[r.shShooterId] : null;
    const keeperId = (r.teams?.[(1 - slot) as 0 | 1] || [])[0];
    const keeper = keeperId ? gById[keeperId] : null;
    if (!shooter || !keeper) { busyRef.current = false; return; }
    const res = resolveShoot(shooter, keeper);
    const path = `rooms/${code}`;
    // Lock durevole = shBusy su RTDB. Il guard in-memory copre solo la finestra
    // lettura→primo write; va rilasciato subito dopo, altrimenti uno snapshot
    // shFire che arriva durante l'animazione viene perso e i rigori si bloccano.
    update(ref(db, path), { shFire: false, shBusy: true, shMsg: '', shBallX: res.bx, shBallY: res.by, shKeepX: res.keepX })
      .then(() => { busyRef.current = false; });
    setTimeout(async () => {
      const snap = (await get(ref(db, path))).val() as Room;
      const msg = res.outcome === 'goal' ? 'GOOOL!' : res.outcome === 'save' ? 'PARATO!' : 'FUORI!';
      const shA = slot === 0 ? [...(snap.shA || []), res.outcome] : (snap.shA || []);
      const shB = slot === 1 ? [...(snap.shB || []), res.outcome] : (snap.shB || []);
      const ga = shA.filter((x) => x === 'goal').length;
      const gb = shB.filter((x) => x === 'goal').length;
      const a = shA.length, b = shB.length;
      const decided = a >= 5 && b >= 5 && a === b && ga !== gb;
      await update(ref(db, path), { shA, shB, shMsg: msg, shOver: decided, shWin: ga > gb ? 0 : 1 });
      setTimeout(async () => {
        const s2 = (await get(ref(db, path))).val() as Room;
        if (s2.shOver) {
          await update(ref(db, path), { shBusy: false, status: 'done' });
        } else {
          const ns = 1 - slot;
          const nt = s2.teams?.[ns as 0 | 1] || [];
          await update(ref(db, path), {
            shBallX: 50, shBallY: 82, shKeepX: 50, shMsg: '', shTurn: ns, shBusy: false,
            shShooterId: nt[Math.floor(Math.random() * nt.length)],
          });
        }
      }, 1500);
    }, 850);
  }, [room, isHost, code, gById]);

  const create = async (): Promise<string> => {
    const c = code4();
    await set(ref(db, `rooms/${c}`), freshRoom(currentUser));
    setCode(c);
    return c;
  };

  const join = async (c: string): Promise<boolean> => {
    const cc = (c || '').toUpperCase();
    const snap = await get(ref(db, `rooms/${cc}`));
    const r = snap.val() as Room | null;
    if (!r || r.status !== 'waiting' || r.host === currentUser) return false;
    await update(ref(db, `rooms/${cc}`), { guest: currentUser, status: 'forming' });
    setCode(cc);
    return true;
  };

  const leave = () => {
    if (code && isHost) remove(ref(db, `rooms/${code}`));
    setCode('');
    setRoom(null);
  };

  const setForm = (idx: number) => {
    if (!room || mySlot == null) return;
    const forms: [number, number] = [...room.forms] as [number, number];
    forms[mySlot] = idx;
    update(ref(db, `rooms/${code}`), { forms });
  };

  const startDraft = () => {
    if (!room) return;
    update(ref(db, `rooms/${code}`), { status: 'drafting', turn: 0, teams: { 0: [], 1: [] }, options: [] });
  };

  const pickGirl = (id: string) => {
    if (!room) return;
    const slot = ORDER[room.turn];
    const controlling = slot === 0 ? room.host : room.guest;
    if (controlling !== currentUser) return;
    const teams = { 0: [...(room.teams?.[0] || [])], 1: [...(room.teams?.[1] || [])] };
    (teams[slot as 0 | 1]).push(id);
    const turn = room.turn + 1;
    if (turn >= 10) {
      update(ref(db, `rooms/${code}`), {
        teams, turn, status: 'shootout',
        shA: [], shB: [], shTurn: 0, shBusy: false, shBallX: 50, shBallY: 82, shKeepX: 50,
        shMsg: '', shOver: false, shWin: 0,
        shShooterId: teams[0][Math.floor(Math.random() * teams[0].length)],
      });
    } else {
      update(ref(db, `rooms/${code}`), { teams, turn, options: [] });
    }
  };

  const shoot = () => {
    if (!room || room.status !== 'shootout') return;
    const controlling = room.shTurn === 0 ? room.host : room.guest;
    if (controlling !== currentUser || room.shBusy || room.shOver) return;
    update(ref(db, `rooms/${code}`), { shFire: true });
  };

  const rematch = () => {
    if (!room) return;
    update(ref(db, `rooms/${code}`), { ...freshRoom(room.host), guest: room.guest, status: 'forming', forms: room.forms });
  };

  return { room, code, isHost, mySlot, create, join, leave, setForm, startDraft, pickGirl, shoot, rematch };
}
