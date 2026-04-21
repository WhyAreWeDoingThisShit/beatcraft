import type { Methodology } from "./db";

export interface BeatPreview {
  act?: string;
  title: string;
}

export const SCAFFOLD_TITLES: Record<Methodology, BeatPreview[]> = {
  "three-act": [
    { act: "Act I — Setup", title: "Opening Image" },
    { act: "Act I — Setup", title: "Inciting Incident" },
    { act: "Act I — Setup", title: "First Plot Point" },
    { act: "Act II — Confrontation", title: "Rising Action / First Pinch" },
    { act: "Act II — Confrontation", title: "Midpoint" },
    { act: "Act II — Confrontation", title: "Second Pinch / All Is Lost" },
    { act: "Act III — Resolution", title: "Climax" },
    { act: "Act III — Resolution", title: "Resolution / Final Image" },
  ],
  "save-the-cat": [
    { act: "Act One", title: "Opening Image" },
    { act: "Act One", title: "Theme Stated" },
    { act: "Act One", title: "Set-Up" },
    { act: "Act One", title: "Catalyst" },
    { act: "Act One", title: "Debate" },
    { act: "Act One", title: "Break into Two" },
    { act: "Act Two A", title: "B Story" },
    { act: "Act Two A", title: "Fun and Games" },
    { act: "Act Two A", title: "Midpoint" },
    { act: "Act Two B", title: "Bad Guys Close In" },
    { act: "Act Two B", title: "All Is Lost" },
    { act: "Act Two B", title: "Dark Night of the Soul" },
    { act: "Act Two B", title: "Break into Three" },
    { act: "Act Three", title: "Finale" },
    { act: "Act Three", title: "Final Image" },
  ],
  "heros-journey": [
    { act: "Departure", title: "Ordinary World" },
    { act: "Departure", title: "Call to Adventure" },
    { act: "Departure", title: "Refusal of the Call" },
    { act: "Departure", title: "Meeting the Mentor" },
    { act: "Departure", title: "Crossing the Threshold" },
    { act: "Initiation", title: "Tests, Allies, Enemies" },
    { act: "Initiation", title: "Approach to the Inmost Cave" },
    { act: "Initiation", title: "The Ordeal" },
    { act: "Initiation", title: "Reward (Seizing the Sword)" },
    { act: "Return", title: "The Road Back" },
    { act: "Return", title: "Resurrection" },
    { act: "Return", title: "Return with the Elixir" },
  ],
  freeform: [],
};
