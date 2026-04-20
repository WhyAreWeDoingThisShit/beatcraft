import Dexie, { type EntityTable } from "dexie";

type Format = "novel" | "screenplay" | "short-story" | "stage-play" | "tv-pilot";
type Methodology = "three-act" | "save-the-cat" | "heros-journey" | "freeform";

interface Project {
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

class BeatcraftDB extends Dexie {
  projects!: EntityTable<Project, "id">;

  constructor() {
    super("BeatcraftDB");
    this.version(1).stores({
      projects: "&id, updatedAt, createdAt",
    });
  }
}

export const db = new BeatcraftDB();
export type { Project, Format, Methodology };
