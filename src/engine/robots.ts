// Les robots du bureau : des cubes-robots, comme le logo de VibesMoney (visière noire, yeux orange).
// Max, le chef, est le robot noir du logo ; Younes porte la couronne du patron ; l'équipe est blanche,
// avec la couleur de son métier et un accessoire (la toque du jury, le casque de Dayen…). L'apparence
// de chacun vient de sa fiche (shared/equipe.ts et src/engine/looks.ts). Tout est dessiné en code,
// pose par pose, puis gardé en mémoire.
import type { Role } from '../../shared/protocol.ts';
import type { Accessoire } from '../../shared/equipe.ts';
import { lookFor, onLooks } from './looks.ts';
import { darken, g2d, lighten, makeCanvas, mirror, outline, P, px, rect } from './pixels.ts';

export type Dir = 'down' | 'up' | 'left' | 'right';
export type Pose = 'stand' | 'walk' | 'sit' | 'type' | 'read' | 'think' | 'carry' | 'raise' | 'cheer' | 'wave' | 'write';
export type Eyes = 'open' | 'blink' | 'down' | 'up' | 'left' | 'right' | 'happy';

/** Taille d'un sprite de robot ; les pieds (le bas du contour) sont au point d'ancrage. */
export const ROBOT_W = 20;
export const ROBOT_H = 24;
export const ANCHOR_X = 10;
export const ANCHOR_Y = 22;

interface Look {
  /** une tête foncée (comme Max) : contour et antenne plus sombres */
  dark: boolean;
  acc: Accessoire;
  tie: boolean;
  top: string; front: string; shade: string; visor: string; visorHi: string;
  body: string; bodyHi: string; bodyShade: string;
  arm: string; hand: string; leg: string; tip: string;
  eye: string; eyeHi: string; eyeDim: string; accent: string;
}

/** La clarté d'une couleur (0 = noir, 1 = blanc). */
function luma(hex: string) {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

function lookOf(role: Role): Look {
  const a = lookFor(role);
  const dark = luma(a.tete) < 0.4;
  const white = a.tete.toLowerCase() === '#ffffff';
  const head = white
    ? { top: '#ffffff', front: '#e8e5f1', shade: '#c4bfd4' }
    : { top: lighten(a.tete, 0.3), front: a.tete, shade: darken(a.tete, 0.3) };
  return {
    dark, acc: a.accessoire, tie: a.cravate, ...head,
    visor: '#15121c', visorHi: '#3d3852',
    body: a.corps, bodyHi: lighten(a.corps, 0.3), bodyShade: darken(a.corps, 0.25),
    arm: dark ? lighten(a.tete, 0.1) : '#d7d3e2', hand: dark ? darken(a.tete, 0.15) : '#b9b4c9', leg: dark ? '#2a2734' : '#3a3547',
    tip: dark ? a.yeux : a.corps,
    eye: a.yeux, eyeHi: lighten(a.yeux, 0.65), eyeDim: darken(a.yeux, 0.3),
    // la couleur des accessoires : celle du corps, sauf si le corps est trop pâle ou trop sombre
    accent: luma(a.corps) > 0.85 || luma(a.corps) < 0.2 ? a.yeux : a.corps,
  };
}

/** Les yeux, dans la visière (vue de face). ox, oy = décalage du regard. */
function drawEyes(g: CanvasRenderingContext2D, L: Look, eyes: Eyes, bob: number) {
  const EYE = L.eye, EYE_HI = L.eyeHi, EYE_DIM = L.eyeDim;
  const y0 = 8 + bob;
  if (eyes === 'blink') {
    rect(g, 7, y0 + 1, 2, 1, EYE_DIM);
    rect(g, 11, y0 + 1, 2, 1, EYE_DIM);
    return;
  }
  if (eyes === 'happy') {
    for (const x of [7, 11]) {
      rect(g, x, y0, 2, 1, EYE);
      px(g, x - 1, y0 + 1, EYE);
      px(g, x + 2, y0 + 1, EYE);
    }
    return;
  }
  const ox = eyes === 'left' ? -1 : eyes === 'right' ? 1 : 0;
  const oy = eyes === 'down' ? 1 : eyes === 'up' ? -1 : 0;
  for (const x of [7, 11]) {
    rect(g, x + ox, y0 + oy, 2, 2, EYE);
    px(g, x + ox, y0 + oy, EYE_HI);
  }
}

/** La tête (cube) vue de face, de dos ou de profil. */
function drawHead(g: CanvasRenderingContext2D, L: Look, dir: Dir, eyes: Eyes, bob: number) {
  const y = 4 + bob;
  // dessus du cube (plus clair), puis la face
  rect(g, 4, y, 12, 2, L.top);
  rect(g, 4, y + 2, 12, 8, L.front);
  rect(g, 15, y + 2, 1, 8, L.shade);
  rect(g, 4, y + 9, 12, 1, L.shade);
  // l'arête lumineuse entre le dessus et la face
  rect(g, 4, y + 2, 11, 1, lighten(L.front, 0.12));
  if (dir === 'down') {
    rect(g, 6, y + 3, 8, 4, L.visor);
    rect(g, 6, y + 3, 3, 1, L.visorHi);
    drawEyes(g, L, eyes, bob);
  } else if (dir === 'up') {
    // l'arrière de la tête : une petite grille d'aération
    rect(g, 8, y + 5, 4, 1, L.shade);
    rect(g, 8, y + 7, 4, 1, L.shade);
  } else {
    // de profil (vers la droite) : la visière occupe l'avant de la tête, un seul œil
    rect(g, 10, y + 3, 6, 4, L.visor);
    rect(g, 10, y + 3, 2, 1, L.visorHi);
    const oy = eyes === 'down' ? 1 : eyes === 'up' ? -1 : 0;
    const EYE = L.eye, EYE_HI = L.eyeHi, EYE_DIM = L.eyeDim;
    if (eyes === 'blink') rect(g, 13, y + 5, 2, 1, EYE_DIM);
    else if (eyes === 'happy') { rect(g, 13, y + 4, 2, 1, EYE); px(g, 12, y + 5, EYE); }
    else { rect(g, 13, y + 4 + oy, 2, 2, EYE); px(g, 13, y + 4 + oy, EYE_HI); }
    rect(g, 4, y + 2, 1, 8, L.shade);
  }
}

/** L'antenne, avec sa petite boule de couleur. */
function drawAntenna(g: CanvasRenderingContext2D, L: Look, bob: number) {
  rect(g, 9, 3 + bob, 2, 1, L.dark ? '#5b566a' : '#9d98ae');
  rect(g, 9, 1 + bob, 2, 2, L.tip);
  px(g, 9, 1 + bob, lighten(L.tip, 0.5));
}

/** Les accessoires, par-dessus la tête (on les choisit dans la fiche de chacun). */
function drawAccessory(g: CanvasRenderingContext2D, L: Look, dir: Dir, bob: number) {
  const y = bob;
  const c = L.accent;
  switch (L.acc) {
    case 'beret': { // un béret, penché
      rect(g, 5, 2 + y, 10, 2, c);
      rect(g, 4, 3 + y, 12, 1, darken(c, 0.15));
      rect(g, 6, 1 + y, 6, 1, lighten(c, 0.25));
      px(g, 11, 0 + y, darken(c, 0.3));
      break;
    }
    case 'chapeau': { // un chapeau d'explorateur (il part à la chasse aux articles)
      rect(g, 3, 4 + y, 14, 1, '#d6bd86');
      rect(g, 6, 1 + y, 8, 3, '#c7aa70');
      rect(g, 6, 3 + y, 8, 1, '#7c6337');
      rect(g, 7, 1 + y, 6, 1, '#e3cf9e');
      break;
    }
    case 'couronne': { // la couronne du patron
      const gold = '#ffd34d', goldDark = '#c9951c';
      rect(g, 5, 2 + y, 10, 3, gold);
      rect(g, 5, 4 + y, 10, 1, goldDark);
      for (const x of [5, 9, 13]) { rect(g, x, 0 + y, 2, 2, gold); px(g, x, 0 + y, '#fff3b0'); }
      px(g, 7, 3 + y, '#e5484d');
      px(g, 10, 3 + y, '#4fb3ff');
      px(g, 12, 3 + y, '#3ddc97');
      break;
    }
    case 'toque': { // la toque de diplômé (le jury)
      const k = '#24202e';
      rect(g, 6, 2 + y, 8, 3, k);
      rect(g, 2, 1 + y, 16, 2, '#3a3547');
      rect(g, 2, 1 + y, 16, 1, '#4a4558');
      if (dir === 'down' || dir === 'up') { px(g, 15, 3 + y, c); rect(g, 15, 4 + y, 1, 3, c); }
      else { px(g, 5, 3 + y, c); rect(g, 5, 4 + y, 1, 3, c); }
      break;
    }
    case 'casque': { // un casque audio
      rect(g, 4, 3 + y, 12, 1, '#2b2836');
      if (dir === 'left' || dir === 'right') {
        rect(g, 7, 6 + y, 3, 4, c);
        rect(g, 7, 9 + y, 3, 1, darken(c, 0.3));
      } else {
        rect(g, 2, 6 + y, 2, 5, c);
        rect(g, 16, 6 + y, 2, 5, c);
        rect(g, 2, 10 + y, 2, 1, darken(c, 0.3));
        rect(g, 16, 10 + y, 2, 1, darken(c, 0.3));
      }
      break;
    }
    case 'bandeau': { // un bandeau de sport, sur le front
      rect(g, 4, 6 + y, 12, 2, c);
      rect(g, 4, 6 + y, 12, 1, lighten(c, 0.3));
      if (dir === 'up') { rect(g, 9, 8 + y, 1, 3, c); rect(g, 11, 8 + y, 1, 2, c); }
      break;
    }
    case 'lunettes': { // des lunettes, sur la visière
      const f = '#f3f1f8';
      if (dir === 'down') {
        for (const x of [6, 10]) {
          rect(g, x, 7 + y, 4, 1, f);
          rect(g, x, 10 + y, 4, 1, f);
          rect(g, x, 7 + y, 1, 4, f);
          rect(g, x + 3, 7 + y, 1, 4, f);
        }
      } else if (dir !== 'up') {
        rect(g, 12, 7 + y, 4, 1, f);
        rect(g, 12, 10 + y, 4, 1, f);
        rect(g, 12, 7 + y, 1, 4, f);
      }
      break;
    }
    case 'crayon': { // un crayon sur l'oreille
      if (dir === 'down') {
        px(g, 16, 3 + y, '#ff8fb1');
        rect(g, 16, 4 + y, 1, 5, '#ffd166');
        px(g, 16, 9 + y, '#3a3547');
      }
      break;
    }
  }
}

interface Limbs { la: [number, number, number]; ra: [number, number, number]; ll: number; rl: number }

/** Le corps, les bras et les jambes, vus de face ou de dos. */
function drawBodyFront(g: CanvasRenderingContext2D, L: Look, dir: Dir, limbs: Limbs, bob: number, seated: boolean) {
  const y = 14 + bob;
  // jambes (cachées sous le bureau quand il est assis)
  if (!seated) {
    rect(g, 7, 19, 2, 3 - limbs.ll, L.leg);
    rect(g, 11, 19, 2, 3 - limbs.rl, L.leg);
  }
  // corps
  rect(g, 6, y, 8, 5, L.body);
  rect(g, 6, y, 8, 1, L.bodyHi);
  rect(g, 6, y + 4, 8, 1, L.bodyShade);
  rect(g, 13, y + 1, 1, 3, L.bodyShade);
  if (L.tie && dir === 'down') {
    // la cravate (de la couleur des yeux)
    rect(g, 9, y, 2, 1, darken(L.eye, 0.2));
    rect(g, 9, y + 1, 2, 2, L.eye);
    px(g, 9, y + 3, L.eye);
  } else if (dir === 'down') {
    // un petit voyant sur la poitrine
    px(g, 8, y + 2, lighten(L.body, 0.55));
  }
  // bras : [x, y, hauteur]
  for (const [x, ay, h] of [limbs.la, limbs.ra]) {
    rect(g, x, ay + bob, 2, h, L.arm);
    rect(g, x, ay + bob + h - 1, 2, 1, L.hand);
  }
}

function drawBodySide(g: CanvasRenderingContext2D, L: Look, frame: number, walking: boolean, bob: number, pose: Pose) {
  const y = 14 + bob;
  const swing = walking ? [0, 1, 0, -1][frame % 4] : 0;
  // jambes : l'une devant, l'autre derrière
  rect(g, 8 + swing, 19, 2, 3, darken(L.leg, 0.15));
  rect(g, 10 - swing, 19, 2, 3, L.leg);
  rect(g, 7, y, 7, 5, L.body);
  rect(g, 7, y, 7, 1, L.bodyHi);
  rect(g, 7, y + 4, 7, 1, L.bodyShade);
  if (pose === 'carry') {
    // la feuille tenue devant lui
    rect(g, 12, y, 5, 6, P.paper);
    rect(g, 13, y + 2, 3, 1, P.paperLine);
    rect(g, 13, y + 4, 2, 1, P.paperLine);
    rect(g, 11, y + 1, 3, 2, L.arm);
  } else {
    rect(g, 9 - swing, y + 1, 2, 4, L.arm);
    rect(g, 9 - swing, y + 4, 2, 1, L.hand);
  }
}

function limbsFor(pose: Pose, frame: number): Limbs {
  const f = frame % 4;
  switch (pose) {
    case 'walk':
      return { la: [4, 14 + (f === 1 ? 1 : f === 3 ? -1 : 0), 4], ra: [14, 14 + (f === 1 ? -1 : f === 3 ? 1 : 0), 4], ll: f === 1 ? 1 : 0, rl: f === 3 ? 1 : 0 };
    case 'type':
      return { la: [5, 16 - (frame % 2 === 0 ? 1 : 0), 3], ra: [13, 16 - (frame % 2 === 1 ? 1 : 0), 3], ll: 0, rl: 0 };
    case 'sit':
    case 'read':
      return { la: [5, 16, 3], ra: [13, 16, 3], ll: 0, rl: 0 };
    case 'think':
      return { la: [4, 14, 4], ra: [13, 11, 4], ll: 0, rl: 0 };
    case 'raise':
      return { la: [4, 14, 4], ra: [15, 2 + (frame % 2), 6], ll: 0, rl: 0 };
    case 'cheer':
      return { la: [3, 3 + (frame % 2), 6], ra: [15, 3 + ((frame + 1) % 2), 6], ll: frame % 2, rl: (frame + 1) % 2 };
    case 'wave':
      return { la: [4, 14, 4], ra: [15 + (frame % 2), 4, 6], ll: 0, rl: 0 };
    case 'write':
      return { la: [4, 14, 4], ra: [14, 7 + (frame % 2), 6], ll: 0, rl: 0 };
    case 'carry':
      return { la: [5, 15, 3], ra: [13, 15, 3], ll: 0, rl: 0 };
    default:
      return { la: [4, 14, 4], ra: [14, 14, 4], ll: 0, rl: 0 };
  }
}

function build(role: Role, pose: Pose, dir: Dir, frame: number, eyes: Eyes): HTMLCanvasElement {
  const L = lookOf(role);
  if (dir === 'left') return mirror(build(role, pose, 'right', frame, eyes));
  const c = makeCanvas(ROBOT_W, ROBOT_H);
  const g = g2d(c);
  const seated = pose === 'sit' || pose === 'type' || pose === 'read' || (pose === 'think' && frame >= 100);
  const walking = pose === 'walk';
  const f = frame % 4;
  const bob = walking ? (f === 1 || f === 3 ? -1 : 0) : pose === 'cheer' ? -(frame % 2) : 0;
  const hatted = L.acc === 'beret' || L.acc === 'chapeau' || L.acc === 'couronne' || L.acc === 'toque';
  if (dir === 'right') {
    drawBodySide(g, L, frame, walking, bob, pose);
    if (!hatted) drawAntenna(g, L, bob);
    drawHead(g, L, 'right', eyes, bob);
    drawAccessory(g, L, 'right', bob);
  } else {
    const limbs = limbsFor(pose, frame);
    // les bras levés passent derrière la tête : on les dessine d'abord
    drawBodyFront(g, L, dir, limbs, bob, seated);
    if (!hatted) drawAntenna(g, L, bob);
    drawHead(g, L, dir, eyes, bob);
    drawAccessory(g, L, dir, bob);
    if (pose === 'carry' && dir === 'down') {
      // la feuille, tenue à deux mains devant le ventre
      rect(g, 7, 15 + bob, 6, 6, P.paper);
      rect(g, 8, 17 + bob, 4, 1, P.paperLine);
      rect(g, 8, 19 + bob, 3, 1, P.paperLine);
      rect(g, 12, 15 + bob, 1, 6, P.paperShade);
      rect(g, 5, 16 + bob, 2, 2, L.hand);
      rect(g, 13, 16 + bob, 2, 2, L.hand);
    }
    if ((pose === 'raise' || pose === 'cheer' || pose === 'wave') && dir === 'down') {
      // le bras levé redessiné par-dessus la tête quand il la recouvre
      const [x, ay, h] = limbs.ra;
      if (x <= 15) { rect(g, x, ay + bob, 2, h, L.arm); rect(g, x, ay + bob, 2, 1, L.hand); }
      if (pose === 'cheer') { const [lx, ly, lh] = limbs.la; rect(g, lx, ly + bob, 2, lh, L.arm); rect(g, lx, ly + bob, 2, 1, L.hand); }
    }
  }
  outline(c, L.dark ? '#07060a' : P.ink);
  return c;
}

const cache = new Map<string, HTMLCanvasElement>();
// une apparence a changé dans une fiche : on redessine tout
onLooks(() => cache.clear());

/** Le sprite d'un robot (gardé en mémoire : chaque pose n'est dessinée qu'une fois). */
export function robotSprite(role: Role, pose: Pose, dir: Dir, frame: number, eyes: Eyes = 'open'): HTMLCanvasElement {
  const key = `${role}|${pose}|${dir}|${frame}|${eyes}`;
  let c = cache.get(key);
  if (!c) {
    c = build(role, pose, dir, frame, eyes);
    cache.set(key, c);
  }
  return c;
}

/** Le visage d'un robot en grand (pour la boîte de dialogue). */
export function portrait(role: Role, eyes: Eyes, scale: number): HTMLCanvasElement {
  const src = robotSprite(role, 'stand', 'down', 0, eyes);
  const c = makeCanvas(16 * scale, 16 * scale);
  const g = g2d(c);
  g.drawImage(src, 2, 0, 16, 16, 0, 0, 16 * scale, 16 * scale);
  return c;
}
