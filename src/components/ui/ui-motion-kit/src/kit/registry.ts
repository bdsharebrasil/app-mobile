import type { ComponentModule, DemoModule, Family, PieceMeta } from "./types";
import { FAMILIES } from "./types";

/**
 * Automatic piece registry. Every folder `src/kit/<family>/<slug>/` with meta.ts, Demo.tsx and
 * Component.tsx is picked up at build time; adding a piece needs no edit here.
 * Demos and metas load eagerly (the gallery shows every card); real components load on demand.
 */

const metas = import.meta.glob<PieceMeta>("./*/*/meta.ts", { eager: true, import: "default" });
const demos = import.meta.glob<DemoModule>("./*/*/Demo.tsx", { eager: true });
const components = import.meta.glob<ComponentModule>("./*/*/Component.tsx");

export interface Piece {
  meta: PieceMeta;
  demo: DemoModule;
  loadComponent: () => Promise<ComponentModule>;
  /** Folder, e.g. "overlays/modal". */
  dir: string;
}

function folderOf(path: string) {
  const [, family, slug] = path.split("/");
  return { family: family ?? "", slug: slug ?? "", dir: `${family}/${slug}` };
}

/** Builds the registry and reports every convention break instead of failing on the first. */
export function collectPieces(): { pieces: Piece[]; problems: string[] } {
  const pieces: Piece[] = [];
  const problems: string[] = [];
  for (const [path, meta] of Object.entries(metas)) {
    const { family, slug, dir } = folderOf(path);
    const demo = demos[`./${dir}/Demo.tsx`];
    const loadComponent = components[`./${dir}/Component.tsx`];
    if (!demo) problems.push(`${dir}: missing Demo.tsx`);
    if (!loadComponent) problems.push(`${dir}: missing Component.tsx`);
    if (meta.slug !== slug) problems.push(`${dir}: meta.slug "${meta.slug}" must equal the folder name "${slug}"`);
    if (meta.family !== family) problems.push(`${dir}: meta.family "${meta.family}" must equal the folder "${family}"`);
    if (!FAMILIES.includes(family as Family)) problems.push(`${dir}: unknown family "${family}"`);
    if (demo && !demo.timeline) problems.push(`${dir}: Demo.tsx must export a built \`timeline\``);
    if (demo && typeof demo.default !== "function") problems.push(`${dir}: Demo.tsx must default-export the scene`);
    if (demo?.timeline && demo.timeline.duration !== meta.loopMs) {
      problems.push(`${dir}: meta.loopMs ${meta.loopMs} differs from the timeline duration ${demo.timeline.duration}`);
    }
    if (demo && loadComponent) pieces.push({ meta, demo, loadComponent, dir });
  }
  for (const path of Object.keys(demos)) {
    const { dir } = folderOf(path);
    if (!metas[`./${dir}/meta.ts`]) problems.push(`${dir}: missing meta.ts`);
  }
  const seen = new Set<string>();
  for (const p of pieces) {
    if (seen.has(p.meta.slug)) problems.push(`duplicate slug "${p.meta.slug}"`);
    seen.add(p.meta.slug);
  }
  pieces.sort(
    (a, b) => FAMILIES.indexOf(a.meta.family) - FAMILIES.indexOf(b.meta.family) || a.meta.name.localeCompare(b.meta.name),
  );
  return { pieces, problems };
}

const collected = collectPieces();
if (collected.problems.length && import.meta.env.DEV) {
  console.warn(`[ui-motion-kit] registry problems:\n- ${collected.problems.join("\n- ")}`);
}

export const pieces = collected.pieces;

export function getPiece(slug: string) {
  return pieces.find((p) => p.meta.slug === slug);
}

export function piecesByFamily() {
  const groups = new Map<Family, Piece[]>();
  for (const p of pieces) {
    const list = groups.get(p.meta.family) ?? [];
    list.push(p);
    groups.set(p.meta.family, list);
  }
  return [...groups.entries()];
}
