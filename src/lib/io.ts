import Dexie from "dexie";
import { nanoid } from "nanoid";
import { db } from "./db";
import type { Beat, Character, Place, Project } from "./db";

export interface ExportBundle {
  version: 1;
  exportedAt: number;
  project: Project;
  beats: Beat[];
  characters: Character[];
  places: Place[];
}

async function fetchBundle(projectId: string): Promise<ExportBundle> {
  const [project, beats, characters, places] = await Promise.all([
    db.projects.get(projectId),
    db.beats
      .where("[projectId+order]")
      .between([projectId, Dexie.minKey], [projectId, Dexie.maxKey], true, true)
      .toArray(),
    db.characters.where("projectId").equals(projectId).toArray(),
    db.places.where("projectId").equals(projectId).toArray(),
  ]);
  if (!project) throw new Error(`Project ${projectId} not found`);
  return { version: 1, exportedAt: Date.now(), project, beats, characters, places };
}

export async function exportProject(projectId: string): Promise<Blob> {
  const bundle = await fetchBundle(projectId);
  return new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
}

export async function exportProjectAsMarkdown(projectId: string): Promise<Blob> {
  const { project, beats, characters, places } = await fetchBundle(projectId);

  const lines: string[] = [];
  lines.push(`# ${project.title}`);
  if (project.logline) {
    lines.push("", `*${project.logline}*`);
  }
  lines.push("");

  const actGroups = new Map<string, Beat[]>();
  for (const beat of beats) {
    const act = beat.act ?? "Beats";
    if (!actGroups.has(act)) actGroups.set(act, []);
    actGroups.get(act)!.push(beat);
  }

  for (const [act, actBeats] of actGroups) {
    lines.push(`## ${act}`, "");
    for (const beat of actBeats) {
      lines.push(`### ${beat.title}`);
      if (beat.prompt) lines.push("", `> ${beat.prompt}`);
      if (beat.body) lines.push("", beat.body);
      lines.push("");
    }
  }

  if (characters.length) {
    lines.push("## Cast", "");
    for (const c of characters) {
      lines.push(`### ${c.name}`);
      if (c.role) lines.push(`**Role:** ${c.role}`);
      if (c.want) lines.push(`**Want:** ${c.want}`);
      if (c.need) lines.push(`**Need:** ${c.need}`);
      if (c.flaw) lines.push(`**Flaw:** ${c.flaw}`);
      if (c.notes) lines.push("", c.notes);
      lines.push("");
    }
  }

  if (places.length) {
    lines.push("## Places", "");
    for (const p of places) {
      lines.push(`### ${p.name}`);
      if (p.kind) lines.push(`**Kind:** ${p.kind}`);
      if (p.description) lines.push("", p.description);
      if (p.notes) lines.push("", p.notes);
      lines.push("");
    }
  }

  return new Blob([lines.join("\n")], { type: "text/markdown" });
}

export async function exportProjectAsZip(projectId: string): Promise<Blob> {
  const bundle = await fetchBundle(projectId);
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  zip.file("project.json", JSON.stringify(bundle, null, 2));

  const mdBlob = await exportProjectAsMarkdown(projectId);
  zip.file("story.md", await mdBlob.text());

  zip.file("characters.json", JSON.stringify(bundle.characters, null, 2));
  zip.file("places.json", JSON.stringify(bundle.places, null, 2));

  return zip.generateAsync({ type: "blob", mimeType: "application/zip" });
}

/** Imports a project from a JSON file, regenerating all ids to avoid collisions. */
export async function importProject(file: File): Promise<string> {
  const text = await file.text();
  const bundle = JSON.parse(text) as ExportBundle;

  const idMap = new Map<string, string>();
  const remap = (oldId: string) => {
    if (!idMap.has(oldId)) idMap.set(oldId, nanoid());
    return idMap.get(oldId)!;
  };

  const projectId = remap(bundle.project.id);
  const now = Date.now();

  const project: Project = {
    ...bundle.project,
    id: projectId,
    createdAt: now,
    updatedAt: now,
  };

  const characters: Character[] = bundle.characters.map((c) => ({
    ...c,
    id: remap(c.id),
    projectId,
  }));

  const places: Place[] = bundle.places.map((p) => ({
    ...p,
    id: remap(p.id),
    projectId,
  }));

  const beats: Beat[] = bundle.beats.map((b) => ({
    ...b,
    id: remap(b.id),
    projectId,
    linkedCharacterIds: b.linkedCharacterIds.map(remap),
    linkedPlaceIds: b.linkedPlaceIds.map(remap),
  }));

  await db.transaction("rw", [db.projects, db.beats, db.characters, db.places], async () => {
    await db.projects.add(project);
    if (characters.length) await db.characters.bulkAdd(characters);
    if (places.length) await db.places.bulkAdd(places);
    if (beats.length) await db.beats.bulkAdd(beats);
  });

  return projectId;
}
