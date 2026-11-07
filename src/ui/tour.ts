// La visite guidée : Max présente son bureau, coin par coin, avec sa voix (ElevenLabs). La caméra suit,
// et s'il n'y a pas de mission en cours, une équipe de démonstration s'installe le temps de la visite.
import { say, stopVoice, type Line } from '../audio/voice.ts';
import { camera, world } from '../engine/instance.ts';
import { useOffice } from '../state/store.ts';

// Les répliques sans « line » n'ont pas de voix enregistrée : elles s'affichent seulement (le temps de les lire).
const STEPS: { line?: Line; text: string; shot: [number, number, number] }[] = [
  { line: 'visite-1', text: 'Bienvenue dans mon bureau ! Moi, c’est Max, le chef. Ici, une équipe d’agents IA bosse pour toi, jour et nuit.', shot: [176, 186, 1.9] },
  { text: 'Au centre, c’est toi, Younes, le patron. Chaque rapport de l’équipe finit sur ton bureau.', shot: [176, 112, 2.1] },
  { text: 'Là, Virgile. Il construit tes équations de recherche, base par base, et compte les résultats.', shot: [64, 76, 1.9] },
  { text: 'Ici, Adrien. Il joue le jury et traque les failles de ta méthode, avant la soutenance.', shot: [276, 76, 1.95] },
  { text: 'Nathan corrige la forme : l’orthographe, la typographie et les références.', shot: [56, 188, 1.95] },
  { text: 'Et Dayen, polyglotte. Chaque mot repris d’un article doit dire exactement ce que dit la source.', shot: [276, 188, 1.95] },
  { text: 'Sur ce tableau, j’écris le plan de chaque mission. Moi, je suis à mon poste, juste devant le tien.', shot: [176, 46, 2.05] },
  { line: 'visite-8', text: 'Toi, tu me dis ce que tu veux. Je monte l’équipe. Et tu regardes.', shot: [176, 128, 1] },
];

let run = 0;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function startTour() {
  const id = ++run;
  const st = useOffice.getState();
  useOffice.setState({ modal: null, showFinal: false });
  const demo = !st.busySince;
  if (demo) world.demoTeam(true);
  for (let i = 0; i < STEPS.length; i++) {
    if (run !== id) return;
    const s = STEPS[i];
    camera.shot(s.shot[0], s.shot[1], s.shot[2], 60);
    useOffice.setState({ tour: { step: i, text: s.text } });
    if (i === 0 || i === STEPS.length - 1) world.chef.happyUntil = world.time + 2;
    const t0 = Date.now();
    if (s.line) await say(s.line, true);
    // sans la voix (ou si elle est coupée), on laisse le temps de lire
    const minMs = 900 + s.text.length * 38;
    const spent = Date.now() - t0;
    if (spent < minMs) await wait(minMs - spent);
    await wait(350);
  }
  if (run !== id) return;
  endTour(demo);
}

function endTour(demo: boolean) {
  useOffice.setState({ tour: null });
  camera.wide(2);
  if (demo) world.demoTeam(false);
}

export function stopTour() {
  if (!useOffice.getState().tour) return;
  run++;
  stopVoice();
  endTour(true);
}
