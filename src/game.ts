import type { Girl, Stats, ShootOutcome } from './types';
import { CATS } from './constants';

// Overall = somma stelle × 4 (max 100). Identico al prototipo.
export function ov(s: Stats): number {
  return CATS.reduce((t, c) => t + (s[c[0]] || 0), 0) * 4;
}

// Estrae 2 id casuali dal pool rimanente (escludendo quelli già pescati).
export function pick2(girls: Girl[], exclude: string[]): string[] {
  const rem = girls.filter((g) => !exclude.includes(g.id)).map((g) => g.id);
  for (let i = rem.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rem[i], rem[j]] = [rem[j], rem[i]];
  }
  return rem.slice(0, 2);
}

export interface ShootResult {
  outcome: ShootOutcome;
  zi: number; // zona tiro 0-4
  ki: number; // zona portiere 0-4
  bx: number; // posizione finale palla X (%)
  by: number; // posizione finale palla Y (%)
  keepX: number; // posizione portiere X (%)
}

export const ZONES = [20, 35, 50, 65, 80];

// Esito di un rigore, pesato leggermente dalle stats. Identico al prototipo.
export function resolveShoot(shooter: Girl, keeper: Girl): ShootResult {
  const power = ov(shooter.stats);
  const def = ov(keeper.stats);
  const zi = Math.floor(Math.random() * 5);
  const guessRight = Math.random() < Math.min(0.42, 0.16 + (def - 70) / 220);
  const ki = guessRight ? zi : Math.floor(Math.random() * 5);
  const miss = Math.random() < Math.max(0.04, 0.12 - (power - 78) / 240);
  const outcome: ShootOutcome = miss ? 'miss' : ki === zi ? 'save' : 'goal';
  const bx = miss ? ZONES[zi] + (zi < 2 ? -14 : 14) : ZONES[zi];
  const by = miss ? 12 : 24;
  return { outcome, zi, ki, bx, by, keepX: ZONES[ki] };
}
