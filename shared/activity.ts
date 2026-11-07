// Les métiers du bureau, et la traduction en français de ce que fait vraiment chaque agent :
// chaque outil de Claude Code devient une action (une icône, une animation, une bulle).
import { EQUIPE } from './equipe.ts';
import type { ActKind, MissionStats, OfficeEvent, Role } from './protocol.ts';

export interface RoleInfo {
  /** le nom du métier, tel qu'il s'affiche dans le bureau */
  label: string;
  icon: string;
  color: string;
  /** l'agent Claude Code (subagent_type) qui fait ce métier */
  type: string;
  what: string;
}

const RENFORT: RoleInfo = { label: 'Renfort', icon: '🤖', color: '#9AA3B5', type: '', what: 'Un coup de main sur une tâche à part.' };

/** Les métiers, tirés des fiches de l'équipe (shared/equipe.ts). */
export const ROLES = Object.fromEntries([
  ...EQUIPE.map((m) => [m.role, { label: m.metier, icon: m.icon, color: m.couleur, type: m.type, what: m.enBref }]),
  ['renfort', RENFORT],
]) as Record<Role, RoleInfo>;

/** Les outils Claude Code de chaque métier (le chef a tous ceux de la séance). */
export const ROLE_TOOLS = Object.fromEntries([...EQUIPE.map((m) => [m.role, m.outils]), ['renfort', []]]) as Record<Role, string[]>;

/** Ce que veut dire chaque outil, en français (pour la fiche des métiers). */
export const TOOL_INFO: Record<string, string> = {
  Agent: 'appelle un membre de l’équipe', TodoWrite: 'écrit et coche le plan', Read: 'lit un fichier', Write: 'crée un fichier',
  Edit: 'retouche un fichier', Glob: 'cherche des fichiers', Grep: 'cherche dans les fichiers', WebSearch: 'cherche sur internet',
  WebFetch: 'lit une page web', Bash: 'lance une commande', Skill: 'applique une de ses méthodes (skills)',
};

/** Les métiers des anciennes missions (avant l'équipe du mémoire), pour pouvoir encore les rejouer. */
const OLD_ROLES: Record<string, Role> = { recherche: 'equations', analyse: 'jury', redaction: 'corrections', design: 'langue', code: 'renfort' };

/** Le métier, même s'il vient d'une ancienne mission. */
export function normRole(r: string): Role {
  if (r in ROLES) return r as Role;
  return OLD_ROLES[r] ?? 'renfort';
}

/** Le métier d'un agent, d'après le type d'agent que le chef a appelé. */
export function roleOfType(type: string): Role {
  for (const [role, info] of Object.entries(ROLES) as [Role, RoleInfo][]) if (info.type && info.type === type) return role;
  return 'renfort';
}

/** Les prénoms, par métier. Chaque membre de l'équipe a le sien ; un deuxième Virgile devient « Virgile 2 ». */
export const NAMES = Object.fromEntries([
  ...EQUIPE.map((m) => [m.role, [m.prenom]]),
  ['renfort', ['Bob', 'Lulu', 'Gaston', 'Nina', 'Momo', 'Kiki']],
]) as Record<Role, string[]>;

const base = (p: unknown) => (typeof p === 'string' ? p.split(/[\\/]/).filter(Boolean).pop() ?? p : '');
export const cut = (s: unknown, n = 60) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};
export const host = (u: unknown) => {
  try { return new URL(String(u)).hostname.replace(/^www\./, ''); } catch { return cut(u, 40); }
};

const MCP_NAMES: Record<string, string> = {
  gmail: 'Gmail', google_drive: 'Google Drive', notion: 'Notion', google_calendar: 'Google Agenda', calendar: 'Google Agenda',
  slack: 'Slack', github: 'GitHub', stripe: 'Stripe', hubspot: 'HubSpot', airtable: 'Airtable',
};

/** Le nom lisible d'un connecteur MCP : mcp__claude_ai_Gmail__search_threads → Gmail */
export function mcpName(tool: string): { server: string; action: string } {
  const parts = tool.split('__');
  const raw = (parts[1] ?? '').replace(/^claude_ai_/, '').replace(/^plugin_[^_]+_/, '');
  const server = MCP_NAMES[raw.toLowerCase()] ?? raw.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return { server, action: (parts[2] ?? '').replace(/[_-]+/g, ' ') };
}

/** L'action, sa phrase (courte, pour la bulle) et le détail complet (pour le panneau). */
export function describeAct(tool: string, input: Record<string, unknown> | undefined): { kind: ActKind; label: string; detail: string } {
  const i = input ?? {};
  switch (tool) {
    case 'WebSearch': return { kind: 'search', label: `Je cherche « ${cut(i.query, 44)} »`, detail: String(i.query ?? '') };
    case 'WebFetch': return { kind: 'web', label: `Je lis ${host(i.url)}`, detail: String(i.url ?? '') };
    case 'Read': return { kind: 'read', label: `Je lis ${cut(base(i.file_path), 36)}`, detail: String(i.file_path ?? '') };
    case 'Glob': return { kind: 'read', label: 'Je fouille le dossier', detail: String(i.pattern ?? '') };
    case 'Grep': return { kind: 'read', label: `Je cherche « ${cut(i.pattern, 30)} »`, detail: `${i.pattern ?? ''}${i.path ? ' dans ' + i.path : ''}` };
    case 'LS': return { kind: 'read', label: 'Je regarde le dossier', detail: String(i.path ?? '') };
    case 'Write': return { kind: 'write', label: `J’écris ${cut(base(i.file_path), 36)}`, detail: String(i.file_path ?? '') };
    case 'Edit':
    case 'MultiEdit': return { kind: 'edit', label: `Je retouche ${cut(base(i.file_path), 34)}`, detail: String(i.file_path ?? '') };
    case 'NotebookEdit': return { kind: 'edit', label: `Je retouche ${cut(base(i.notebook_path), 34)}`, detail: String(i.notebook_path ?? '') };
    case 'Bash': {
      const c = String(i.command ?? '').replace(/\s+/g, ' ').trim();
      return { kind: 'bash', label: `Je lance ${c.length <= 34 ? `« ${c} »` : cut(i.description || c, 40)}`, detail: String(i.command ?? '') };
    }
    case 'TodoWrite': return { kind: 'plan', label: 'Je mets le plan à jour', detail: '' };
    case 'Skill': return { kind: 'skill', label: `J’applique la méthode ${cut(i.skill ?? i.name, 24)}`, detail: String(i.args ?? '') };
    case 'ToolSearch': return { kind: 'other', label: 'Je cherche le bon outil', detail: String(i.query ?? '') };
  }
  if (tool.startsWith('mcp__')) {
    const { server, action } = mcpName(tool);
    return { kind: 'mcp', label: `Je passe par ${server}`, detail: action };
  }
  return { kind: 'other', label: `J’utilise ${tool}`, detail: '' };
}

export const emptyStats = (): MissionStats => ({ agents: 0, searches: 0, pages: 0, reads: 0, writes: 0, commands: 0 });

/** Les compteurs de la mission (recherches, pages lues…), mis à jour événement par événement. */
export function countStats(s: MissionStats, ev: OfficeEvent) {
  if (ev.k === 'hire') s.agents++;
  if (ev.k !== 'act') return;
  if (ev.kind === 'search') s.searches++;
  else if (ev.kind === 'web') s.pages++;
  else if (ev.kind === 'read') s.reads++;
  else if (ev.kind === 'write' || ev.kind === 'edit') s.writes++;
  else if (ev.kind === 'bash') s.commands++;
}

/** Remplace le chemin du dossier de la mission par « . » partout où il apparaît en entier. */
export function relToFolder(text: string, folder: string): string {
  if (!folder) return text;
  const esc = folder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(esc + '(?=$|[/"\'\\s])', 'g'), '.').replace(/(^|[\s"'])\.\//g, '$1');
}

/** La commande telle qu'elle sera lancée, juste rendue lisible (le dossier de la mission devient « . »). Rien n'est caché. */
export function readableCommand(cmd: unknown, folder: string): string {
  return relToFolder(String(cmd ?? ''), folder).trim().replace(/^cd\s+(?:"\."|'\.'|\.)\s*&&\s*/, '');
}

const FULL_MAX = 72;

/**
 * La demande de permission : la phrase de la bulle, le détail complet, et `full`
 * (vrai seulement si la bulle montre toute l'action : on peut alors répondre directement dans la bulle).
 */
export function permissionText(tool: string, input: Record<string, unknown> | undefined, folder: string): { label: string; detail: string; full: boolean } {
  const i = input ?? {};
  if (tool === 'Bash') {
    const c = readableCommand(i.command, folder);
    const full = c.length > 0 && c.length <= FULL_MAX && !c.includes('\n');
    return { label: `Je peux lancer « ${full ? c : cut(c, 48)} » ?`, detail: c, full };
  }
  if (tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit' || tool === 'NotebookEdit') {
    const raw = String(i.file_path ?? i.notebook_path ?? '');
    const rel = relToFolder(raw, folder);
    const inside = !!folder && raw.startsWith(folder + '/') && !rel.includes('..');
    return { label: `Je peux ${tool === 'Write' ? 'écrire' : 'modifier'} ${inside ? rel : raw} ?`, detail: raw, full: inside && rel.length <= FULL_MAX };
  }
  if (tool === 'WebFetch') return { label: `Je peux lire ${host(i.url)} ?`, detail: String(i.url ?? ''), full: false };
  const detail = relToFolder(JSON.stringify(i, null, 2), folder);
  const clipped = detail.length > 1500 ? detail.slice(0, 1499) + '…' : detail;
  if (tool.startsWith('mcp__')) {
    const { server, action } = mcpName(tool);
    return { label: `Je peux passer par ${server} (${action}) ?`, detail: clipped, full: false };
  }
  return { label: `Je peux utiliser ${tool} ?`, detail: clipped, full: false };
}
