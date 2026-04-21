import Dexie, { type EntityTable } from "dexie";

export type Format = "novel" | "screenplay" | "short-story" | "stage-play" | "tv-pilot";
export type Methodology = "three-act" | "save-the-cat" | "heros-journey" | "freeform";
export type BeatStatus = "untouched" | "drafted" | "done" | "skipped";
export type SceneStatus = "untouched" | "drafted" | "done" | "skipped";

export interface Project {
  id: string;
  title: string;
  logline?: string;
  format: Format;
  methodology: Methodology;
  targetWordCount?: number;
  targetPageCount?: number;
  deadline?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Beat {
  id: string;
  projectId: string;
  order: number;
  act?: string;
  title: string;
  prompt: string;
  body: string;
  status: BeatStatus;
  wordCountTarget?: number;
  wordCountActual?: number;
  linkedCharacterIds: string[];
  linkedPlaceIds: string[];
  isCustom: boolean;
}

export interface Scene {
  id: string;
  beatId: string;
  projectId: string;
  order: number;
  title: string;
  body: string;
  status: SceneStatus;
  linkedCharacterIds: string[];
  linkedPlaceIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  role?: string;
  want?: string;
  need?: string;
  flaw?: string;
  notes: string;
  color?: string;
  createdAt: number;
}

export interface Place {
  id: string;
  projectId: string;
  name: string;
  kind?: string;
  description: string;
  notes: string;
  createdAt: number;
}

export interface ActivityLog {
  id: string;
  projectId: string;
  day: string; // YYYY-MM-DD
  wordsWritten: number;
  beatsCompleted: number;
}

class BosanquetDB extends Dexie {
  projects!: EntityTable<Project, "id">;
  beats!: EntityTable<Beat, "id">;
  scenes!: EntityTable<Scene, "id">;
  characters!: EntityTable<Character, "id">;
  places!: EntityTable<Place, "id">;
  activityLog!: EntityTable<ActivityLog, "id">;

  constructor() {
    // NOTE: The IndexedDB name is 'BeatcraftDB' (the project's old name) on
    // purpose. Renaming it would orphan every existing user's data. A proper
    // migration (open old DB, copy tables, delete old DB) is tracked for v0.2.0.
    // Do not "fix" this without writing the migration first.
    super("BeatcraftDB");
    this.version(1).stores({
      projects: "&id, updatedAt",
      beats: "&id, [projectId+order]",
      characters: "&id, projectId",
      places: "&id, projectId",
      activityLog: "&id, &[projectId+day]",
    });
    this.version(2).stores({
      scenes: "&id, beatId, projectId, [beatId+order], updatedAt",
    });
  }
}

export const db = new BosanquetDB();
