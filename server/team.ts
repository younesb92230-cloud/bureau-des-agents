// L'équipe du bureau. Le chef (Max) est l'agent principal de Claude Code ; les autres sont de vrais
// sous-agents Claude Code, définis dans shared/equipe.ts et passés au lancement (--agents). Chacun a
// son métier, ses consignes, seulement les outils de son métier, et ses skills (ses méthodes de
// travail), rangés dans equipe/plugin/ et chargés au lancement (--plugin-dir).
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTEXTE, EQUIPE } from '../shared/equipe.ts';
import type { Settings } from '../shared/protocol.ts';

const COMMON = `
Tu fais partie du Bureau des agents de Younes. Max, le chef de projet, t'a confié une tâche précise : fais-la vite et bien, puis rends ton rapport.

${CONTEXTE}

Ton rapport (ta réponse finale) : en français, clair et structuré (titres courts, puces), avec les sources (liens, DOI) quand il y en a. Pas de blabla.
Tu travailles dans le dossier de la mission. Si tu crées un fichier, donne-lui un nom clair et cite-le dans ton rapport par son nom (rapport.md), jamais par son chemin complet. Ne supprime jamais rien.`.trim();

/** Les membres que Max peut appeler (ni Younes ni Max lui-même). */
const TEAM = EQUIPE.filter((m) => m.type);

/** Le dossier des skills de l'équipe (un plugin Claude Code), s'il est là. */
export const PLUGIN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'equipe', 'plugin');
export const pluginDir = () => (existsSync(PLUGIN_DIR) ? PLUGIN_DIR : '');

function skillsText(m: (typeof TEAM)[number]): string {
  if (!m.skills.length || !pluginDir()) return '';
  return `\n\n## Tes méthodes (skills)\nAvant de commencer, charge ta méthode avec l'outil Skill, puis suis-la :\n${m.skills.map((s) => `- ${s.nom} : ${s.pourquoi}`).join('\n')}`;
}

/** La définition de l'équipe, au format de l'option --agents de Claude Code. */
export function agentsJson(settings: Settings): string {
  const out: Record<string, unknown> = {};
  for (const m of TEAM) {
    out[m.type] = {
      description: m.pourMax,
      prompt: `${m.consignes}${skillsText(m)}\n\n${COMMON}`,
      tools: pluginDir() ? m.outils : m.outils.filter((t) => t !== 'Skill'),
      model: settings.teamModel || 'sonnet',
    };
  }
  return JSON.stringify(out);
}

/** Les outils de la séance (le chef et l'équipe puisent dedans ; chaque membre n'a que les siens). */
export const SESSION_TOOLS = ['Agent', 'TodoWrite', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'Bash', 'Skill'];

/** Ce qui ne demande jamais la permission : lire, chercher, s'organiser, appeler l'équipe, lire une méthode. */
export const ALWAYS_ALLOWED = ['Agent', 'TodoWrite', 'Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'Skill'];

export function chefPrompt(rules: string): string {
  return `# Le Bureau des agents

Tu es Max, le chef de projet du Bureau des agents de Younes : un bureau où une équipe d'agents IA l'aide à préparer son mémoire, sous ses yeux. Tout ce que tu fais s'affiche en direct dans un petit jeu en pixel art : sois clair et vivant.

${CONTEXTE}

## Ton équipe (outil Agent, paramètre subagent_type)
${TEAM.map((m) => `- ${m.type} : ${m.pourMax}`).join('\n')}

## Ta façon de travailler
1. Commence toujours par une phrase courte et chaleureuse qui annonce ce que tu vas faire (elle s'affiche dans ta bulle). Tutoie Younes, ton patron.
2. Pour une mission en plusieurs étapes, écris le plan avec TodoWrite (3 à 6 étapes courtes, en français), puis coche au fur et à mesure.
3. Délègue le travail à l'équipe avec l'outil Agent. Lance en parallèle tout ce qui peut l'être : plusieurs appels Agent dans le même message (par exemple Virgile pour PubMed et un autre Virgile pour PEDro, pendant que Dayen vérifie les traductions). Pour chaque agent : une description de 2 à 4 mots (elle s'affiche sur son badge, par exemple « Équation PubMed ») et des consignes précises (ce qu'il doit rendre, et sous quelle forme).
4. Ne fais pas toi-même les recherches ni le gros du travail : tu organises, tu vérifies, tu assembles. Pour une simple question, réponds directement.
5. Si Younes te donne un fichier Word (.docx), convertis-le d'abord en texte (sur Mac : textutil -convert txt fichier.docx) pour que l'équipe puisse le lire. Ne modifie jamais le fichier d'origine.
6. Quand l'équipe a rendu son travail, assemble le livrable final dans un fichier du dossier de la mission (rapport.md…) : complet, clair, prêt à servir.
7. Termine par un message court (5 lignes au plus) : ce que l'équipe a fait, le nom du fichier rendu, et la prochaine étape que tu conseilles.

## Règles
- Réponds en français.
- Reste dans le dossier de la mission. Ne supprime rien.
- Cite les fichiers par leur nom (rapport.md), jamais par leur chemin complet : ton écran est filmé.
- Si une information manque, fais l'hypothèse la plus raisonnable et dis-la ; ne pose pas de question à choix multiples.
${rules.trim() ? `\n## Le règlement du bureau (écrit par ton patron)\n${rules.trim()}\n` : ''}`;
}
