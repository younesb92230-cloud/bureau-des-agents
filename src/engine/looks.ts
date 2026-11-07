// L'apparence de chaque robot : celle de sa fiche (shared/equipe.ts), retouchée dans le bureau
// (« Les fiches » → « Changer son apparence »). Les retouches restent dans ce navigateur.
import { EQUIPE, type Apparence } from '../../shared/equipe.ts';
import type { Role } from '../../shared/protocol.ts';

const KEY = 'bureau:apparence';

const RENFORT: Apparence = { tete: '#ffffff', corps: '#9AA3B5', yeux: '#FF8A3D', accessoire: 'aucun', cravate: false };

export const DEFAULT_LOOKS = Object.fromEntries([
  ...EQUIPE.map((m) => [m.role, m.apparence]),
  ['renfort', RENFORT],
]) as Record<Role, Apparence>;

function load(): Partial<Record<Role, Partial<Apparence>>> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {}; } catch { return {}; }
}

let overrides = load();
let version = 0;
const listeners = new Set<() => void>();

/** L'apparence actuelle d'un métier. */
export function lookFor(role: Role): Apparence {
  return { ...(DEFAULT_LOOKS[role] ?? RENFORT), ...(overrides[role] ?? {}) };
}

/** Change l'apparence d'un métier (et la garde pour la prochaine fois). */
export function setLook(role: Role, patch: Partial<Apparence>) {
  overrides = { ...overrides, [role]: { ...(overrides[role] ?? {}), ...patch } };
  save();
}

/** Revient à l'apparence de la fiche. */
export function resetLook(role: Role) {
  const { [role]: _, ...rest } = overrides;
  overrides = rest;
  save();
}

export const isCustom = (role: Role) => !!overrides[role] && Object.keys(overrides[role]!).length > 0;

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(overrides)); } catch { /* navigation privée */ }
  version++;
  for (const fn of listeners) fn();
}

/** Prévient quand une apparence change (les sprites sont alors redessinés). */
export function onLooks(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export const looksVersion = () => version;
