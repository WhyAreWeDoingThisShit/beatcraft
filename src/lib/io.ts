import Dexie from "dexie";
import { nanoid } from "nanoid";
import { db } from "./db";
import type { Beat, Character, Place, Project } from "./db";

interface ExportBundle {
  version: 1;
  exportedAt: number;
  project: Project;
  beats: Beat[];
  characters: Character[];
  places: Place[];
}

export async function exportProject(projectId: string): Promise<Blob> {
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

  const bundle: ExportBundle = {
    version: 1,
    exportedAt: Date.now(),
    project,
    beats,
    characters,
    places,
  };

  return new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
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
