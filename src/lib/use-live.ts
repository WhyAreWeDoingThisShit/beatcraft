"use client";

import Dexie from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import type { ActivityLog, Beat, BeatStatus, Character, Place, Project, Scene } from "./db";

export function useLiveProjects(): Project[] {
  return (
    useLiveQuery(() => db.projects.orderBy("updatedAt").reverse().toArray(), [], []) ?? []
  );
}

export function useLiveProject(id: string): Project | undefined {
  return useLiveQuery(() => db.projects.get(id), [id]);
}

export function useLiveBeats(projectId: string): Beat[] {
  return (
    useLiveQuery(
      () =>
        db.beats
          .where("[projectId+order]")
          .between([projectId, Dexie.minKey], [projectId, Dexie.maxKey], true, true)
          .toArray(),
      [projectId],
      [],
    ) ?? []
  );
}

export function useLiveScenes(beatId: string): Scene[] {
  return (
    useLiveQuery(
      () =>
        db.scenes
          .where("[beatId+order]")
          .between([beatId, Dexie.minKey], [beatId, Dexie.maxKey], true, true)
          .toArray(),
      [beatId],
      [],
    ) ?? []
  );
}

export function useLiveSceneCount(beatId: string): number {
  return (
    useLiveQuery(
      () =>
        db.scenes
          .where("[beatId+order]")
          .between([beatId, Dexie.minKey], [beatId, Dexie.maxKey], true, true)
          .count(),
      [beatId],
      0,
    ) ?? 0
  );
}

export function useLiveProjectScenes(projectId: string): Scene[] {
  return (
    useLiveQuery(
      () => db.scenes.where("projectId").equals(projectId).toArray(),
      [projectId],
      [],
    ) ?? []
  );
}

function computeDerivedStatus(scenes: Scene[], fallback: BeatStatus): BeatStatus {
  if (scenes.length === 0) return fallback;
  const nonSkipped = scenes.filter((s) => s.status !== "skipped");
  if (nonSkipped.length === 0) return "skipped";
  if (nonSkipped.every((s) => s.status === "done")) return "done";
  if (nonSkipped.some((s) => s.status === "drafted" || s.status === "done")) return "drafted";
  return "untouched";
}

export function useLiveBeatStatus(beatId: string): BeatStatus | undefined {
  return useLiveQuery(async () => {
    const beat = await db.beats.get(beatId);
    if (!beat) return undefined;
    const scenes = await db.scenes
      .where("[beatId+order]")
      .between([beatId, Dexie.minKey], [beatId, Dexie.maxKey], true, true)
      .toArray();
    return computeDerivedStatus(scenes, beat.status);
  }, [beatId]);
}

export function useLiveBeatsWithStatus(
  projectId: string,
): { beat: Beat; effectiveStatus: BeatStatus }[] {
  return (
    useLiveQuery(
      async () => {
        const beats = await db.beats
          .where("[projectId+order]")
          .between([projectId, Dexie.minKey], [projectId, Dexie.maxKey], true, true)
          .toArray();

        const result: { beat: Beat; effectiveStatus: BeatStatus }[] = [];
        for (const beat of beats) {
          const scenes = await db.scenes
            .where("[beatId+order]")
            .between([beat.id, Dexie.minKey], [beat.id, Dexie.maxKey], true, true)
            .toArray();
          result.push({ beat, effectiveStatus: computeDerivedStatus(scenes, beat.status) });
        }
        return result;
      },
      [projectId],
      [],
    ) ?? []
  );
}

export function useLiveCharacters(projectId: string): Character[] {
  return (
    useLiveQuery(
      () => db.characters.where("projectId").equals(projectId).toArray(),
      [projectId],
      [],
    ) ?? []
  );
}

export function useLivePlaces(projectId: string): Place[] {
  return (
    useLiveQuery(
      () => db.places.where("projectId").equals(projectId).toArray(),
      [projectId],
      [],
    ) ?? []
  );
}

export function useLiveActivityLog(projectId: string): ActivityLog[] {
  return (
    useLiveQuery(
      () =>
        db.activityLog
          .where("[projectId+day]")
          .between([projectId, Dexie.minKey], [projectId, Dexie.maxKey], true, true)
          .toArray(),
      [projectId],
      [],
    ) ?? []
  );
}
