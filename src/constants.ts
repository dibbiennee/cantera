import type { Girl, Stats, Role, HairStyle, AccType, League } from './types';

export const ORDER = [0, 1, 1, 0, 0, 1, 1, 0, 0, 1];
export const HAIRS = ['#1c1b22', '#3a281c', '#5b3a29', '#8a5a2b', '#caa15a', '#e8c07a', '#ff5da2', '#9b6bff', '#36e0e0', '#c6ff3d', '#ff6b3d', '#ffffff'];
export const ACCPAL = ['#ff4d9d', '#c6ff3d', '#9b6bff', '#36e0e0', '#ffd23f', '#ff6b3d', '#ffffff', '#15131a'];
export const CATS: [keyof Stats, string, string][] = [
  ['pesca', 'Pesca', '🍑'],
  ['cili', 'Ciliegie', '🍒'],
  ['simp', 'Simpatia', '😄'],
  ['abil', 'Abilità', '✨'],
  ['ener', 'Energia', '⚡'],
];
export const STYLES: [HairStyle, string][] = [
  ['long', 'Lunghi'], ['wavy', 'Mossi'], ['bun', 'Raccolti'], ['short', 'Corti'],
];
export const ACCS: [AccType, string][] = [
  ['none', 'Niente'], ['bow', 'Fiocco'], ['cap', 'Cappello'], ['beanie', 'Beanie'],
  ['crown', 'Corona'], ['flower', 'Fiore'], ['catears', 'Orecchie'], ['headband', 'Cerchietto'],
];
export const PCOL = ['#c6ff3d', '#ff4d9d', '#9b6bff'];
export const PNAME = ['Edoardo', 'Luca', 'Nico'];
export const UKEY = ['edoardo', 'luca', 'nico'];
export const MODULES: { name: string; roles: Role[] }[] = [
  { name: '2-1-1', roles: ['POR', 'DIF', 'DIF', 'CEN', 'ATT'] },
  { name: '1-2-1', roles: ['POR', 'DIF', 'CEN', 'CEN', 'ATT'] },
  { name: '1-1-2', roles: ['POR', 'DIF', 'CEN', 'ATT', 'ATT'] },
  { name: '2-2-0', roles: ['POR', 'DIF', 'DIF', 'CEN', 'CEN'] },
  { name: '0-2-2', roles: ['POR', 'CEN', 'CEN', 'ATT', 'ATT'] },
  { name: '3-0-1', roles: ['POR', 'DIF', 'DIF', 'DIF', 'ATT'] },
];
export const ROLECOL: Record<string, string> = { POR: '#ffd23f', DIF: '#36e0e0', CEN: '#c6ff3d', ATT: '#ff4d9d' };

const mk = (
  id: string, name: string, hair: string, gl: boolean, skin: string,
  style: HairStyle, acc: AccType, accC: string, ear: boolean, role: string,
  pesca: number, cili: number, simp: number, abil: number, ener: number,
  c1: string, c2: string,
): Girl => ({ id, name, hair, gl, skin, style, acc, accC, ear, role, stats: { pesca, cili, simp, abil, ener }, c1, c2 });

// Default in codice; i campi mutabili (stats + avatar) vengono sovrascritti dal DB condiviso.
export const DEFAULT_GIRLS: Girl[] = [
  mk('aurora', 'Aurora', '#caa15a', false, '#f1c9a5', 'long', 'crown', '#ffd23f', true, 'ICONA', 5, 4, 3, 4, 2, '#ffd23f', '#ff9a2e'),
  mk('sirya', 'Sirya', '#ff5da2', false, '#e8b48f', 'wavy', 'bow', '#ff4d9d', false, 'FANTASISTA', 5, 4, 3, 5, 3, '#ff4d9d', '#c01e6a'),
  mk('ilaria', 'Ilaria', '#5b3a29', true, '#f3d2b3', 'long', 'headband', '#36e0e0', false, 'REGISTA', 5, 1, 4, 5, 4, '#36e0e0', '#1a9aa0'),
  mk('miriam', 'Miriam', '#1c1b22', false, '#d99e76', 'bun', 'flower', '#ff4d9d', true, 'MURO', 5, 2, 5, 4, 5, '#9b6bff', '#6a37d6'),
  mk('marta', 'Marta', '#e8c07a', false, '#f3d2b3', 'long', 'headband', '#ffd23f', true, 'BOMBER', 2, 2, 3, 3, 3, '#ffd23f', '#ff9a2e'),
  mk('matilde', 'Matilde', '#8a5a2b', true, '#f1c9a5', 'wavy', 'beanie', '#c6ff3d', false, 'JOLLY', 4, 3, 5, 4, 4, '#c6ff3d', '#7bd11a'),
  mk('chiara', 'Chiara', '#5b3a29', false, '#e8b48f', 'long', 'flower', '#ff6b3d', false, 'ICONA', 5, 3, 4, 6, 4, '#ff6b3d', '#c8401a'),
  mk('raffaella', 'Raffaella', '#1c1b22', false, '#d99e76', 'long', 'cap', '#9b6bff', false, 'REGISTA', 1, 3, 5, 3, 4, '#9b6bff', '#6a37d6'),
  mk('noemi', 'Noemi', '#3a281c', false, '#e8b48f', 'bun', 'bow', '#36e0e0', true, 'FANTASISTA', 4, 3, 2, 3, 2, '#36e0e0', '#1a9aa0'),
  mk('carolina', 'Carolina', '#8a5a2b', true, '#f3d2b3', 'wavy', 'catears', '#ff4d9d', false, 'JOLLY', 4, 3, 3, 4, 3, '#ff4d9d', '#c01e6a'),
];

// Stato iniziale della lega (seed del DB la prima volta).
export const DEFAULT_LEAGUE: League = {
  giornata: 3,
  budgets: [300, 300, 300],
  owners: { aurora: 0, marta: 0, raffaella: 0, miriam: 0, sirya: 1, matilde: 1, noemi: 1, ilaria: 2, chiara: 2, carolina: 2 },
  prices: { aurora: 42, marta: 55, raffaella: 30, miriam: 28, sirya: 48, matilde: 35, noemi: 33, ilaria: 26, chiara: 40, carolina: 38 },
  events: [
    { label: 'Risponde', pts: 3 }, { label: 'Mette like', pts: 2 }, { label: 'Storia / tag', pts: 4 },
    { label: 'Si esce insieme', pts: 10 }, { label: 'Visto&non risp.', pts: -2 }, { label: 'Bidone', pts: -5 },
  ],
  girls: {},
  aucNom: 0,
  aucPhase: 'nominate',
  aucLot: null,
  aucBid: 0,
  aucLeader: null,
  log: [
    { p: 0, g: 'marta', label: 'Si esce insieme', pts: 10 }, { p: 0, g: 'aurora', label: 'Voto G1', pts: 7 }, { p: 0, g: 'raffaella', label: 'Voto G2', pts: 6 },
    { p: 1, g: 'sirya', label: 'Voto G1', pts: 8 }, { p: 1, g: 'matilde', label: 'Mette like', pts: 2 }, { p: 1, g: 'noemi', label: 'Voto G2', pts: 7 },
    { p: 2, g: 'carolina', label: 'Voto G2', pts: 9 }, { p: 2, g: 'ilaria', label: 'Voto G1', pts: 6 }, { p: 2, g: 'chiara', label: 'Storia/tag', pts: 4 }, { p: 2, g: 'chiara', label: 'Bidone', pts: -5 },
  ],
};
