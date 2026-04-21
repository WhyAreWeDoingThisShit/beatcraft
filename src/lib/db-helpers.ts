import Dexie from "dexie";
import { nanoid } from "nanoid";
import { format as formatDate } from "date-fns";
import { db } from "./db";
import type { Beat, BeatStatus, Character, Methodology, Place, Project, Scene, SceneStatus } from "./db";
import { BEAT_SCAFFOLDS } from "./scaffolds";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreateProjectInput = Omit<Project, "id" | "createdAt" | "updatedAt">;
export type CreateCharacterInput = Omit<Character, "id" | "createdAt">;
export type CreatePlaceInput = Omit<Place, "id" | "createdAt">;
export type CreateSceneInput = Partial<Pick<Scene, "title" | "body" | "status" | "linkedCharacterIds" | "linkedPlaceIds" | "order">> & { projectId: string };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function beatRange(projectId: string) {
  return db.beats
    .where("[projectId+order]")
    .between([projectId, Dexie.minKey], [projectId, Dexie.maxKey], true, true);
}

function sceneRange(beatId: string) {
  return db.scenes
    .where("[beatId+order]")
    .between([beatId, Dexie.minKey], [beatId, Dexie.maxKey], true, true);
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

export async function updateProject(
  id: string,
  changes: Partial<Omit<Project, "id" | "createdAt">>,
): Promise<void> {
  await db.projects.update(id, { ...changes, updatedAt: Date.now() });
}

export async function eraseAllData(): Promise<void> {
  await db.transaction(
    "rw",
    [db.projects, db.beats, db.scenes, db.characters, db.places, db.activityLog],
    async () => {
      await Promise.all([
        db.projects.clear(),
        db.beats.clear(),
        db.scenes.clear(),
        db.characters.clear(),
        db.places.clear(),
        db.activityLog.clear(),
      ]);
    },
  );
}

export async function changeMethodology(
  projectId: string,
  methodology: Methodology,
  keepCustoms: boolean,
): Promise<void> {
  const project = await db.projects.get(projectId);
  if (!project) return;

  await db.transaction("rw", [db.projects, db.beats, db.scenes], async () => {
    const existing = await beatRange(projectId).toArray();
    const customs = existing.filter((b) => b.isCustom);
    const toDelete = keepCustoms ? existing.filter((b) => !b.isCustom) : existing;

    // Cascade-delete scenes for beats being removed
    await Promise.all(toDelete.map((b) => sceneRange(b.id).delete()));

    if (keepCustoms) {
      await db.beats.bulkDelete(toDelete.map((b) => b.id));
    } else {
      await beatRange(projectId).delete();
    }

    const newBeats = scaffoldToBeats(projectId, methodology, project.targetWordCount);
    if (newBeats.length) await db.beats.bulkAdd(newBeats);

    if (keepCustoms && customs.length) {
      const baseOrder = newBeats.length * 1000;
      await Promise.all(
        customs.map((b, i) =>
          db.beats.update(b.id, { order: baseOrder + (i + 1) * 1000, act: undefined }),
        ),
      );
    }

    await db.projects.update(projectId, { methodology, updatedAt: Date.now() });
  });
}

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
    [db.projects, db.beats, db.scenes, db.characters, db.places, db.activityLog],
    async () => {
      await Promise.all([
        db.projects.delete(id),
        beatRange(id).delete(),
        db.scenes.where("projectId").equals(id).delete(),
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
  await db.transaction("rw", [db.beats, db.scenes], async () => {
    await sceneRange(id).delete();
    await db.beats.delete(id);
  });
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
): Promise<{ beatCount: number; sceneCount: number }> {
  const project = await db.projects.get(projectId);
  if (!project) return { beatCount: 0, sceneCount: 0 };

  const existing = await beatRange(projectId).toArray();
  const toDelete = keepCustoms ? existing.filter((b) => !b.isCustom) : existing;

  // Count scenes that will be lost
  let sceneCount = 0;
  for (const b of toDelete) {
    sceneCount += await sceneRange(b.id).count();
  }

  await db.transaction("rw", [db.projects, db.beats, db.scenes], async () => {
    const customs = existing.filter((b) => b.isCustom);

    // Cascade-delete scenes for beats being removed
    await Promise.all(toDelete.map((b) => sceneRange(b.id).delete()));

    if (keepCustoms) {
      await db.beats.bulkDelete(toDelete.map((b) => b.id));
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

  return { beatCount: toDelete.length, sceneCount };
}

export async function detachFromMethodology(projectId: string): Promise<void> {
  await db.transaction("rw", [db.projects, db.beats], async () => {
    await db.projects.update(projectId, { methodology: "freeform", updatedAt: Date.now() });
    const beats = await beatRange(projectId).toArray();
    await Promise.all(beats.map((b) => db.beats.update(b.id, { act: undefined })));
  });
}

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------

export async function listScenes(beatId: string): Promise<Scene[]> {
  return sceneRange(beatId).toArray();
}

export async function createScene(beatId: string, partial: CreateSceneInput): Promise<string> {
  const existing = await sceneRange(beatId).toArray();
  const maxOrder = existing.length > 0 ? Math.max(...existing.map((s) => s.order)) : 0;

  const now = Date.now();
  const id = nanoid();
  await db.scenes.add({
    id,
    beatId,
    projectId: partial.projectId,
    order: partial.order ?? maxOrder + 1000,
    title: partial.title ?? "New scene",
    body: partial.body ?? "",
    status: partial.status ?? "untouched",
    linkedCharacterIds: partial.linkedCharacterIds ?? [],
    linkedPlaceIds: partial.linkedPlaceIds ?? [],
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateScene(
  id: string,
  patch: Partial<Omit<Scene, "id" | "beatId" | "projectId" | "createdAt">>,
): Promise<void> {
  await db.scenes.update(id, { ...patch, updatedAt: Date.now() });
}

export async function setSceneStatus(sceneId: string, status: SceneStatus): Promise<void> {
  await db.scenes.update(sceneId, { status, updatedAt: Date.now() });
}

export async function deleteScene(id: string): Promise<void> {
  await db.scenes.delete(id);
}

export async function reorderScene(sceneId: string, newOrder: number): Promise<void> {
  await db.scenes.update(sceneId, { order: newOrder, updatedAt: Date.now() });
}

export async function moveSceneToBeat(
  sceneId: string,
  newBeatId: string,
  newOrder?: number,
): Promise<void> {
  const beat = await db.beats.get(newBeatId);
  if (!beat) return;

  let order = newOrder;
  if (order === undefined) {
    const last = await sceneRange(newBeatId).last();
    order = (last?.order ?? 0) + 1000;
  }

  await db.scenes.update(sceneId, {
    beatId: newBeatId,
    projectId: beat.projectId,
    order,
    updatedAt: Date.now(),
  });
}

export async function getSceneCount(beatId: string): Promise<number> {
  return sceneRange(beatId).count();
}

export async function deriveBeatStatus(beatId: string): Promise<BeatStatus | undefined> {
  const beat = await db.beats.get(beatId);
  if (!beat) return undefined;

  const scenes = await sceneRange(beatId).toArray();
  if (scenes.length === 0) return beat.status;

  const nonSkipped = scenes.filter((s) => s.status !== "skipped");
  if (nonSkipped.length === 0) return "skipped";
  if (nonSkipped.every((s) => s.status === "done")) return "done";
  if (nonSkipped.some((s) => s.status === "drafted" || s.status === "done")) return "drafted";
  return "untouched";
}

export async function getPreviousScene(sceneId: string): Promise<Scene | undefined> {
  const scene = await db.scenes.get(sceneId);
  if (!scene) return undefined;

  // Scene with next-lower order in same beat
  const prev = await db.scenes
    .where("[beatId+order]")
    .between([scene.beatId, Dexie.minKey], [scene.beatId, scene.order], true, false)
    .last();

  if (prev) return prev;

  // First in beat — fall back to last scene of previous beat
  const currentBeat = await db.beats.get(scene.beatId);
  if (!currentBeat) return undefined;

  const prevBeat = await db.beats
    .where("[projectId+order]")
    .between([scene.projectId, Dexie.minKey], [scene.projectId, currentBeat.order], true, false)
    .last();

  if (!prevBeat) return undefined;

  return sceneRange(prevBeat.id).last();
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

  await db.transaction("rw", [db.characters, db.beats, db.scenes], async () => {
    await db.characters.delete(id);

    const affectedBeats = await beatRange(char.projectId)
      .filter((b) => b.linkedCharacterIds.includes(id))
      .toArray();

    await Promise.all(
      affectedBeats.map((b) =>
        db.beats.update(b.id, {
          linkedCharacterIds: b.linkedCharacterIds.filter((cid) => cid !== id),
        }),
      ),
    );

    const affectedScenes = await db.scenes
      .where("projectId")
      .equals(char.projectId)
      .filter((s) => s.linkedCharacterIds.includes(id))
      .toArray();

    await Promise.all(
      affectedScenes.map((s) =>
        db.scenes.update(s.id, {
          linkedCharacterIds: s.linkedCharacterIds.filter((cid) => cid !== id),
          updatedAt: Date.now(),
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

  await db.transaction("rw", [db.places, db.beats, db.scenes], async () => {
    await db.places.delete(id);

    const affectedBeats = await beatRange(place.projectId)
      .filter((b) => b.linkedPlaceIds.includes(id))
      .toArray();

    await Promise.all(
      affectedBeats.map((b) =>
        db.beats.update(b.id, {
          linkedPlaceIds: b.linkedPlaceIds.filter((pid) => pid !== id),
        }),
      ),
    );

    const affectedScenes = await db.scenes
      .where("projectId")
      .equals(place.projectId)
      .filter((s) => s.linkedPlaceIds.includes(id))
      .toArray();

    await Promise.all(
      affectedScenes.map((s) =>
        db.scenes.update(s.id, {
          linkedPlaceIds: s.linkedPlaceIds.filter((pid) => pid !== id),
          updatedAt: Date.now(),
        }),
      ),
    );
  });
}

// ---------------------------------------------------------------------------
// Entity usage
// ---------------------------------------------------------------------------

export async function getEntityUsage(
  entityId: string,
  kind: "character" | "place",
): Promise<{ beatCount: number; sceneCount: number }> {
  const entity =
    kind === "character"
      ? await db.characters.get(entityId)
      : await db.places.get(entityId);
  if (!entity) return { beatCount: 0, sceneCount: 0 };

  const field = kind === "character" ? "linkedCharacterIds" : "linkedPlaceIds";

  const beatCount = await beatRange(entity.projectId)
    .filter((b) => (b[field] as string[]).includes(entityId))
    .count();

  const sceneCount = await db.scenes
    .where("projectId")
    .equals(entity.projectId)
    .filter((s) => (s[field] as string[]).includes(entityId))
    .count();

  return { beatCount, sceneCount };
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
