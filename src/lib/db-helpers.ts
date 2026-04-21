import Dexie from "dexie";
import { nanoid } from "nanoid";
import { format as formatDate } from "date-fns";
import { db } from "./db";
import type { Beat, BeatStatus, Character, Methodology, Place, Project } from "./db";
import { BEAT_SCAFFOLDS } from "./scaffolds";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreateProjectInput = Omit<Project, "id" | "createdAt" | "updatedAt">;
export type CreateCharacterInput = Omit<Character, "id" | "createdAt">;
export type CreatePlaceInput = Omit<Place, "id" | "createdAt">;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function beatRange(projectId: string) {
  return db.beats
    .where("[projectId+order]")
    .between([projectId, Dexie.minKey], [projectId, Dexie.maxKey], true, true);
}

function activityRange(projectId: string) {
  return db.activityLog
    .where("[projectId+day]")
    .between([projectId, Dexie.minKey], [projectId, Dexie.maxKey], true, true);
}

function scaffoldToBeats(
  projectId: string,
  methodology: Methodology,
  targetWordCount?: number,
  startOrder = 1000,
): Beat[] {
  const scaffold = BEAT_SCAFFOLDS[methodology];
  return scaffold.map((s, i) => ({
    id: nanoid(),
    projectId,
    order: startOrder + i * 1000,
    act: s.act,
    title: s.title,
    prompt: s.prompt,
    body: "",
    status: "untouched" as BeatStatus,
    wordCountTarget:
      s.wordCountTargetFraction !== undefined && targetWordCount !== undefined
        ? Math.round(s.wordCountTargetFraction * targetWordCount)
        : undefined,
    linkedCharacterIds: [],
    linkedPlaceIds: [],
    isCustom: false,
  }));
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function createProject(input: CreateProjectInput): Promise<string> {
  const now = Date.now();
  const id = nanoid();
  const project: Project = { ...input, id, createdAt: now, updatedAt: now };

  const beats = scaffoldToBeats(id, input.methodology, input.targetWordCount);

  await db.transaction("rw", [db.projects, db.beats], async () => {
    await db.projects.add(project);
    if (beats.length > 0) await db.beats.bulkAdd(beats);
  });

  return id;
}

export async function deleteProject(id: string): Promise<void> {
  await db.transaction(
    "rw",
    [db.projects, db.beats, db.characters, db.places, db.activityLog],
    async () => {
      await Promise.all([
        db.projects.delete(id),
        beatRange(id).delete(),
        db.characters.where("projectId").equals(id).delete(),
        db.places.where("projectId").equals(id).delete(),
        activityRange(id).delete(),
      ]);
    },
  );
}

export async function listProjects(): Promise<Project[]> {
  return db.projects.orderBy("updatedAt").reverse().toArray();
}

export async function getProject(id: string): Promise<Project | undefined> {
  return db.projects.get(id);
}

// ---------------------------------------------------------------------------
// Beats
// ---------------------------------------------------------------------------

export async function listBeats(projectId: string): Promise<Beat[]> {
  return beatRange(projectId).toArray();
}

export async function upsertBeat(beat: Beat): Promise<void> {
  await db.beats.put(beat);
}

export async function updateBeat(
  id: string,
  changes: Partial<Omit<Beat, "id">>,
): Promise<void> {
  await db.beats.update(id, changes);
}

export async function deleteBeat(id: string): Promise<void> {
  await db.beats.delete(id);
}

export async function setBeatStatus(beatId: string, status: BeatStatus): Promise<void> {
  await db.beats.update(beatId, { status });
}

/** Caller computes the midpoint between neighbors; no resequencing needed. */
export async function reorderBeat(beatId: string, newOrder: number): Promise<void> {
  await db.beats.update(beatId, { order: newOrder });
}

export async function addCustomBeat(
  projectId: string,
  act: string | undefined,
): Promise<string> {
  const existing = await beatRange(projectId).toArray();
  const actBeats = existing.filter((b) => b.act === act);
  const maxOrder =
    actBeats.length > 0 ? Math.max(...actBeats.map((b) => b.order)) : 0;

  const id = nanoid();
  await db.beats.add({
    id,
    projectId,
    order: maxOrder + 1000,
    act,
    title: "New beat",
    prompt: "",
    body: "",
    status: "untouched",
    linkedCharacterIds: [],
    linkedPlaceIds: [],
    isCustom: true,
  });
  return id;
}

export async function resetBeatsToScaffold(
  projectId: string,
  methodology: Methodology,
  keepCustoms: boolean,
): Promise<void> {
  const project = await db.projects.get(projectId);
  if (!project) return;

  await db.transaction("rw", [db.projects, db.beats], async () => {
    const existing = await beatRange(projectId).toArray();
    const customs = existing.filter((b) => b.isCustom);

    if (keepCustoms) {
      const nonCustomIds = existing.filter((b) => !b.isCustom).map((b) => b.id);
      await db.beats.bulkDelete(nonCustomIds);
    } else {
      await beatRange(projectId).delete();
    }

    const newBeats = scaffoldToBeats(projectId, methodology, project.targetWordCount);
    await db.beats.bulkAdd(newBeats);

    if (keepCustoms && customs.length > 0) {
      const baseOrder = newBeats.length * 1000;
      await Promise.all(
        customs.map((b, i) =>
          db.beats.update(b.id, { order: baseOrder + (i + 1) * 1000, act: undefined }),
        ),
      );
    }

    await db.projects.update(projectId, { updatedAt: Date.now() });
  });
}

export async function detachFromMethodology(projectId: string): Promise<void> {
  await db.transaction("rw", [db.projects, db.beats], async () => {
    await db.projects.update(projectId, { methodology: "freeform", updatedAt: Date.now() });
    const beats = await beatRange(projectId).toArray();
    await Promise.all(beats.map((b) => db.beats.update(b.id, { act: undefined })));
  });
}

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------

export async function listCharacters(projectId: string): Promise<Character[]> {
  return db.characters.where("projectId").equals(projectId).toArray();
}

export async function createCharacter(input: CreateCharacterInput): Promise<string> {
  const id = nanoid();
  await db.characters.add({ ...input, id, createdAt: Date.now() });
  return id;
}

export async function updateCharacter(
  id: string,
  changes: Partial<Omit<Character, "id" | "projectId" | "createdAt">>,
): Promise<void> {
  await db.characters.update(id, changes);
}

export async function deleteCharacter(id: string): Promise<void> {
  const char = await db.characters.get(id);
  if (!char) return;

  await db.transaction("rw", [db.characters, db.beats], async () => {
    await db.characters.delete(id);

    const affected = await beatRange(char.projectId)
      .filter((b) => b.linkedCharacterIds.includes(id))
      .toArray();

    await Promise.all(
      affected.map((b) =>
        db.beats.update(b.id, {
          linkedCharacterIds: b.linkedCharacterIds.filter((cid) => cid !== id),
        }),
      ),
    );
  });
}

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

export async function listPlaces(projectId: string): Promise<Place[]> {
  return db.places.where("projectId").equals(projectId).toArray();
}

export async function createPlace(input: CreatePlaceInput): Promise<string> {
  const id = nanoid();
  await db.places.add({ ...input, id, createdAt: Date.now() });
  return id;
}

export async function updatePlace(
  id: string,
  changes: Partial<Omit<Place, "id" | "projectId" | "createdAt">>,
): Promise<void> {
  await db.places.update(id, changes);
}

export async function deletePlace(id: string): Promise<void> {
  const place = await db.places.get(id);
  if (!place) return;

  await db.transaction("rw", [db.places, db.beats], async () => {
    await db.places.delete(id);

    const affected = await beatRange(place.projectId)
      .filter((b) => b.linkedPlaceIds.includes(id))
      .toArray();

    await Promise.all(
      affected.map((b) =>
        db.beats.update(b.id, {
          linkedPlaceIds: b.linkedPlaceIds.filter((pid) => pid !== id),
        }),
      ),
    );
  });
}

// ---------------------------------------------------------------------------
// Activity log
// ---------------------------------------------------------------------------

/** Upserts today's row, adding to existing counts. */
export async function logActivity(
  projectId: string,
  wordsWritten: number,
  beatsCompleted: number,
): Promise<void> {
  const day = formatDate(new Date(), "yyyy-MM-dd");

  await db.transaction("rw", db.activityLog, async () => {
    const existing = await db.activityLog
      .where("[projectId+day]")
      .equals([projectId, day])
      .first();

    if (existing) {
      await db.activityLog.update(existing.id, {
        wordsWritten: existing.wordsWritten + wordsWritten,
        beatsCompleted: existing.beatsCompleted + beatsCompleted,
      });
    } else {
      await db.activityLog.add({
        id: nanoid(),
        projectId,
        day,
        wordsWritten,
        beatsCompleted,
      });
    }
  });
}
