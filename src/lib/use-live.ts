"use client";

import Dexie from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import type { ActivityLog, Beat, Character, Place, Project } from "./db";

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
