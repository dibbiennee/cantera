export type StatKey = 'pesca' | 'cili' | 'simp' | 'abil' | 'ener';
export type Stats = Record<StatKey, number>;
export type Role = 'POR' | 'DIF' | 'CEN' | 'ATT';
export type HairStyle = 'long' | 'wavy' | 'bun' | 'short';
export type AccType =
  | 'none' | 'bow' | 'cap' | 'beanie' | 'crown' | 'flower' | 'catears' | 'headband';

export interface Girl {
  id: string;
  name: string;
  hair: string;
  gl: boolean;
  skin: string;
  style: HairStyle;
  acc: AccType;
  accC: string;
  ear: boolean;
  role: string;
  stats: Stats;
  c1: string;
  c2: string;
}

// Parti mutabili di una ragazza, persistite nel DB condiviso.
export interface GirlOverride {
  hair?: string;
  gl?: boolean;
  skin?: string;
  style?: HairStyle;
  acc?: AccType;
  accC?: string;
  ear?: boolean;
  stats?: Stats;
}

export interface LogEntry {
  p: number;
  g: string;
  label: string;
  pts: number;
}

export interface EventDef {
  label: string;
  pts: number;
}

export interface UserRec {
  pass: string;
  word: string;
}

export type AucPhase = 'nominate' | 'bid';

// Stato condiviso della lega (Fantacantera), sincronizzato live tra i 3 telefoni.
export interface League {
  giornata: number;
  budgets: number[];
  owners: Record<string, number>;
  prices: Record<string, number>;
  log: LogEntry[];
  events: EventDef[];
  girls: Record<string, GirlOverride>;
  aucNom: number;
  aucPhase: AucPhase;
  aucLot: string | null;
  aucBid: number;
  aucLeader: number | null;
}

export type ShootOutcome = 'goal' | 'save' | 'miss';

// Stato realtime di una stanza draft online 1v1.
export interface Room {
  host: number;
  guest: number | null;
  status: 'waiting' | 'forming' | 'drafting' | 'shootout' | 'done';
  forms: [number, number];
  turn: number;
  order: number[];
  options: string[];
  optAt: number;
  teams: { 0: string[]; 1: string[] };
  // fase rigori
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
