import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db";
import {
  addCustomBeat,
  createProject,
  createScene,
  deleteBeat,
  listBeats,
  listScenes,
  reorderBeat,
  upsertBeat,
} from "../db-helpers";
import type { Beat } from "../db";

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("createProject + listProjects", () => {
  it("creates a project and lists it", async () => {
    const id = await createProject({
      title: "The Last Signal",
      format: "screenplay",
      methodology: "save-the-cat",
    });

    const { listProjects } = await import("../db-helpers");
    const projects = await listProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].id).toBe(id);
    expect(projects[0].title).toBe("The Last Signal");
    expect(projects[0].createdAt).toBeGreaterThan(0);
    expect(projects[0].updatedAt).toBe(projects[0].createdAt);
  });

  it("lists projects sorted by updatedAt descending", async () => {
    const id1 = await createProject({ title: "First", format: "novel", methodology: "freeform" });
    await new Promise((r) => setTimeout(r, 5));
    const id2 = await createProject({
      title: "Second",
      format: "short-story",
      methodology: "three-act",
    });

    const { listProjects } = await import("../db-helpers");
    const projects = await listProjects();
    expect(projects[0].id).toBe(id2);
    expect(projects[1].id).toBe(id1);
  });
});

describe("fractional beat reordering", () => {
  it("inserting between order 1000 and 2000 with order 1500 appears in the right slot", async () => {
    const projectId = await createProject({
      title: "Order Test",
      format: "novel",
      methodology: "freeform",
    });

    const makeBeat = (order: number, title: string): Beat => ({
      id: `beat-${order}`,
      projectId,
      order,
      title,
      prompt: "",
      body: "",
      status: "untouched",
      linkedCharacterIds: [],
      linkedPlaceIds: [],
      isCustom: false,
    });

    await upsertBeat(makeBeat(1000, "Opening Image"));
    await upsertBeat(makeBeat(2000, "Fun & Games"));
    await upsertBeat(makeBeat(1500, "Theme Stated"));

    const beats = await listBeats(projectId);
    expect(beats.map((b) => b.order)).toEqual([1000, 1500, 2000]);
    expect(beats.map((b) => b.title)).toEqual(["Opening Image", "Theme Stated", "Fun & Games"]);
  });

  it("reorderBeat moves a beat to the midpoint slot without resequencing", async () => {
    const projectId = await createProject({
      title: "Reorder Test",
      format: "novel",
      methodology: "freeform",
    });

    const make = (order: number): Beat => ({
      id: `b${order}`,
      projectId,
      order,
      title: `Beat ${order}`,
      prompt: "",
      body: "",
      status: "untouched",
      linkedCharacterIds: [],
      linkedPlaceIds: [],
      isCustom: false,
    });

    await upsertBeat(make(1000));
    await upsertBeat(make(2000));
    await upsertBeat(make(3000));

    await reorderBeat("b3000", 1500);

    const beats = await listBeats(projectId);
    expect(beats.map((b) => b.order)).toEqual([1000, 1500, 2000]);
    expect(beats.find((b) => b.id === "b1000")!.order).toBe(1000);
    expect(beats.find((b) => b.id === "b2000")!.order).toBe(2000);
  });
});

describe("scene cascade delete", () => {
  it("deleting a beat cascades to its scenes", async () => {
    const projectId = await createProject({
      title: "Scenes Test",
      format: "novel",
      methodology: "freeform",
    });

    const beatId = await addCustomBeat(projectId, undefined);

    await createScene(beatId, { projectId, title: "Scene 1" });
    await createScene(beatId, { projectId, title: "Scene 2" });
    await createScene(beatId, { projectId, title: "Scene 3" });

    const scenesBefore = await listScenes(beatId);
    expect(scenesBefore).toHaveLength(3);

    await deleteBeat(beatId);

    const scenesAfter = await listScenes(beatId);
    expect(scenesAfter).toHaveLength(0);
  });
});
