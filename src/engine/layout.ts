// Le plan du bureau : une grille de 22 × 16 cases de 16 pixels, vue de dessus (en 3/4, comme dans
// les jeux en pixel art). Chaque membre de l'équipe a son coin, ses bureaux et ses chaises ; Younes,
// le patron, est au centre ; Max, le chef de projet, a son poste juste devant ; la porte est en bas,
// c'est par là qu'arrive l'équipe.
import type { Role } from '../../shared/protocol.ts';

export const T = 16;
export const COLS = 22;
export const ROWS = 16;
export const W = COLS * T;
export const H = ROWS * T;

export type FurnKind =
  | 'desk' | 'chefDesk' | 'chair' | 'chefChair' | 'plantBig' | 'plantTall' | 'plantSmall' | 'rack' | 'printer'
  | 'cooler' | 'coffee' | 'sofa' | 'tableLow' | 'shelf' | 'lamp' | 'easel' | 'bin' | 'jukebox';

export interface Furn {
  id: string;
  kind: FurnKind;
  /** case en haut à gauche de l'emprise au sol */
  tx: number;
  ty: number;
  /** emprise au sol, en cases (bloque le passage) */
  w: number;
  h: number;
  role?: Role;
  seed?: number;
}

export interface Seat {
  id: string;
  role: Role;
  /** la case où le robot s'arrête avant de s'asseoir */
  tile: [number, number];
  /** les pieds du robot une fois assis (en pixels) */
  x: number;
  y: number;
  deskId: string;
}

export interface Zone { role: Role; label: string; x: number; y: number; w: number; h: number }

/** Les coins du bureau (le tapis au sol et l'étiquette). Un coin par membre de l'équipe, Younes au centre. */
export const ZONES: Zone[] = [
  { role: 'equations', label: 'Virgile, équations et bases', x: 1, y: 3, w: 6, h: 3 },
  { role: 'jury', label: 'Adrien, le jury', x: 15, y: 3, w: 4, h: 3 },
  { role: 'corrections', label: 'Nathan, corrections', x: 1, y: 10, w: 4, h: 3 },
  { role: 'langue', label: 'Dayen, langue et sens', x: 15, y: 10, w: 4, h: 3 },
  { role: 'patron', label: 'Younes, le patron', x: 9, y: 6, w: 4, h: 3 },
];

const furn: Furn[] = [];
const seats: Seat[] = [];

function desk(role: Role, tx: number, ty: number) {
  const id = `desk-${role}-${tx}-${ty}`;
  furn.push({ id, kind: 'desk', tx, ty, w: 2, h: 1, role, seed: tx * 31 + ty });
  furn.push({ id: `chair-${id}`, kind: 'chair', tx, ty: ty - 1, w: 0, h: 0, role });
  seats.push({ id: `seat-${id}`, role, tile: [tx, ty - 1], x: (tx + 1) * T, y: ty * T - 1, deskId: id });
  return seats[seats.length - 1];
}

// Virgile : trois postes (Max le lance souvent en parallèle, une base de données par poste)
for (const tx of [1, 3, 5]) desk('equations', tx, 5);
// Adrien, le jury
for (const tx of [15, 17]) desk('jury', tx, 5);
// Nathan, les corrections
for (const tx of [1, 3]) desk('corrections', tx, 12);
// Dayen, la langue et le sens des mots
for (const tx of [15, 17]) desk('langue', tx, 12);

// Le bureau de Younes, le patron, au centre : c'est là que finissent tous les rapports
furn.push({ id: 'chefDesk', kind: 'chefDesk', tx: 9, ty: 7, w: 4, h: 1, role: 'patron' });
furn.push({ id: 'chefChair', kind: 'chefChair', tx: 10, ty: 6, w: 0, h: 0, role: 'patron' });
export const PATRON_SEAT: Seat = { id: 'seat-patron', role: 'patron', tile: [10, 6], x: 11 * T, y: 7 * T - 1, deskId: 'chefDesk' };

// Le poste de Max, le chef de projet : entre la porte et le bureau du patron
export const CHEF_SEAT: Seat = desk('chef', 10, 11);
seats.pop();

// Le matériel et la déco
furn.push({ id: 'rack', kind: 'rack', tx: 14, ty: 3, w: 1, h: 1 });
furn.push({ id: 'printer', kind: 'printer', tx: 12, ty: 4, w: 1, h: 1 });
furn.push({ id: 'cooler', kind: 'cooler', tx: 9, ty: 4, w: 1, h: 1 });
furn.push({ id: 'plant-jury', kind: 'plantSmall', tx: 20, ty: 5, w: 1, h: 1, seed: 7 });
furn.push({ id: 'plant-corrections', kind: 'plantTall', tx: 6, ty: 12, w: 1, h: 1, seed: 13 });
furn.push({ id: 'plant-design', kind: 'plantBig', tx: 20, ty: 8, w: 1, h: 1, seed: 3 });
furn.push({ id: 'plant-entry-l', kind: 'plantTall', tx: 8, ty: 14, w: 1, h: 1, seed: 5 });
furn.push({ id: 'plant-entry-r', kind: 'plantBig', tx: 13, ty: 14, w: 1, h: 1, seed: 9 });
furn.push({ id: 'plant-analyse', kind: 'plantTall', tx: 20, ty: 11, w: 1, h: 1, seed: 11 });
furn.push({ id: 'sofa', kind: 'sofa', tx: 2, ty: 14, w: 3, h: 1 });
furn.push({ id: 'tableLow', kind: 'tableLow', tx: 2, ty: 13, w: 2, h: 0 });
furn.push({ id: 'lamp', kind: 'lamp', tx: 1, ty: 14, w: 1, h: 1 });
furn.push({ id: 'shelf', kind: 'shelf', tx: 5, ty: 14, w: 2, h: 1 });
furn.push({ id: 'coffee', kind: 'coffee', tx: 16, ty: 14, w: 3, h: 1 });
furn.push({ id: 'jukebox', kind: 'jukebox', tx: 14, ty: 14, w: 2, h: 1 });
furn.push({ id: 'plant-coffee', kind: 'plantBig', tx: 19, ty: 14, w: 1, h: 1, seed: 21 });
furn.push({ id: 'lamp-r', kind: 'lamp', tx: 20, ty: 14, w: 1, h: 1 });
furn.push({ id: 'bin', kind: 'bin', tx: 7, ty: 12, w: 0, h: 0 });
furn.push({ id: 'plant-langue', kind: 'plantSmall', tx: 19, ty: 12, w: 1, h: 1, seed: 17 });

export const FURNITURE = furn;
export const SEATS = seats;

/** Les points de passage importants. Les pieds d'un robot debout sur une case : (x*16+8, y*16+13). */
export const SPOTS = {
  door: [10, 15] as [number, number],
  doorOut: { x: 11 * T, y: 16 * T + 6 },
  /** là où Max t'accueille, et où il te présente le rendu */
  reception: [10, 12] as [number, number],
  receptionPx: { x: 11 * T, y: 12 * T + 13 },
  /** devant le tableau du plan */
  board: [10, 3] as [number, number],
  boardPx: { x: 11 * T, y: 3 * T + 13 },
  /** devant le bureau de Younes : on y rend son rapport */
  deliver: [[10, 8], [11, 8], [9, 8], [12, 8], [8, 8], [13, 8]] as [number, number][],
  /** pour ceux qui n'ont pas de bureau libre */
  overflow: [[7, 4], [8, 6], [13, 6], [7, 10], [14, 10], [8, 11], [13, 11], [7, 13]] as [number, number][],
};

/** Le tableau du plan, accroché au mur du fond (en pixels). */
export const BOARD = { x: 128, y: 7, w: 96, h: 35 };
export const WINDOWS = [{ x: 22, y: 8, w: 66, h: 32 }, { x: 264, y: 8, w: 66, h: 32 }];
export const NEON = { x: 97, y: 11 };
export const CLOCK = { x: 232, y: 13 };
export const POSTER = { x: 252, y: 12, w: 10, h: 14 };
export const DOOR = { x: 160, y: 228, w: 32, h: 28 };

/** La grille des cases où l'on peut marcher. */
export function walkGrid(): boolean[][] {
  const g: boolean[][] = [];
  for (let y = 0; y < ROWS; y++) {
    g.push([]);
    for (let x = 0; x < COLS; x++) g[y].push(x >= 1 && x <= 20 && y >= 3 && y <= 14);
  }
  // la porte
  g[15][10] = true;
  g[15][11] = true;
  for (const f of FURNITURE) {
    for (let y = f.ty; y < f.ty + f.h; y++) for (let x = f.tx; x < f.tx + f.w; x++) if (g[y]?.[x] !== undefined) g[y][x] = false;
  }
  return g;
}

export const tileFeet = (t: [number, number]) => ({ x: t[0] * T + 8, y: t[1] * T + 13 });
