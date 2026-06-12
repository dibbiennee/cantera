import { useEffect, useState } from 'react';
import { ref, onValue, update, set } from 'firebase/database';
import { db } from './firebase';
import { DEFAULT_GIRLS, DEFAULT_LEAGUE } from './constants';
import type { Girl, GirlOverride, League, LogEntry, EventDef, Stats, UserRec } from './types';

function normalizeLeague(raw: Partial<League> | null): League {
  const r = raw || {};
  return {
    giornata: r.giornata ?? DEFAULT_LEAGUE.giornata,
    budgets: (r.budgets as number[]) ?? [...DEFAULT_LEAGUE.budgets],
    owners: r.owners ?? {},
    prices: r.prices ?? {},
    log: (r.log as LogEntry[]) ?? [],
    events: (r.events as EventDef[]) ?? [...DEFAULT_LEAGUE.events],
    girls: r.girls ?? {},
    aucNom: r.aucNom ?? 0,
    aucPhase: r.aucPhase ?? 'nominate',
    aucLot: r.aucLot ?? null,
    aucBid: r.aucBid ?? 0,
    aucLeader: r.aucLeader ?? null,
  };
}

// Unisce i default in codice con gli override mutabili dal DB condiviso.
export function mergeGirls(overrides: Record<string, GirlOverride> | undefined): Girl[] {
  return DEFAULT_GIRLS.map((g) => {
    const o = overrides?.[g.id];
    if (!o) return g;
    return {
      ...g,
      ...o,
      stats: o.stats ? { ...g.stats, ...o.stats } : g.stats,
    } as Girl;
  });
}

export interface LeagueApi {
  league: League;
  girls: Girl[];
  users: Record<string, UserRec>;
  ready: boolean;
  patchLeague: (patch: Partial<League>) => void;
  addLog: (entry: LogEntry) => void;
  setEvents: (events: EventDef[]) => void;
  setGirl: (id: string, patch: GirlOverride) => void;
  setUser: (ukey: string, rec: UserRec) => void;
}

export function useLeague(): LeagueApi {
  const [league, setLeague] = useState<League>(() => normalizeLeague(DEFAULT_LEAGUE));
  const [users, setUsers] = useState<Record<string, UserRec>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const leagueRef = ref(db, 'league');
    const unsub = onValue(leagueRef, (snap) => {
      const val = snap.val() as Partial<League> | null;
      if (val == null) {
        // Seed iniziale del DB la prima volta.
        set(leagueRef, DEFAULT_LEAGUE);
        setLeague(normalizeLeague(DEFAULT_LEAGUE));
      } else {
        setLeague(normalizeLeague(val));
      }
      setReady(true);
    });
    const usersRef = ref(db, 'users');
    const unsubU = onValue(usersRef, (snap) => {
      setUsers((snap.val() as Record<string, UserRec>) || {});
    });
    return () => { unsub(); unsubU(); };
  }, []);

  const girls = mergeGirls(league.girls);

  const patchLeague = (patch: Partial<League>) => { update(ref(db, 'league'), patch); };
  const addLog = (entry: LogEntry) => { set(ref(db, 'league/log'), [...league.log, entry]); };
  const setEvents = (events: EventDef[]) => { set(ref(db, 'league/events'), events); };
  const setGirl = (id: string, patch: GirlOverride) => {
    const base = league.girls?.[id] || {};
    const merged: GirlOverride = { ...base, ...patch };
    if (patch.stats) merged.stats = { ...(base.stats as Stats | undefined), ...patch.stats } as Stats;
    update(ref(db, `league/girls/${id}`), merged);
  };
  const setUser = (ukey: string, rec: UserRec) => { set(ref(db, `users/${ukey}`), rec); };

  return { league, girls, users, ready, patchLeague, addLog, setEvents, setGirl, setUser };
}
