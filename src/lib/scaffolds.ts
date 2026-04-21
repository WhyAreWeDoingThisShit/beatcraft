import type { Methodology } from "./db";

export interface ScaffoldBeat {
  act?: string;
  title: string;
  prompt: string;
  wordCountTargetFraction?: number;
}

export const BEAT_SCAFFOLDS: Record<Methodology, ScaffoldBeat[]> = {
  "three-act": [
    {
      act: "Act I — Setup",
      title: "Opening Image",
      prompt:
        "Write the first concrete image a reader/viewer meets. What does it say — without telling — about the world, the tone, and the protagonist's current shape? This image should be answerable, later, by the Final Image.",
      wordCountTargetFraction: 1 / 8,
    },
    {
      act: "Act I — Setup",
      title: "Inciting Incident",
      prompt:
        "What specific event breaks the status quo and forces the protagonist to choose? Not a feeling — an event. Where were they standing. Who spoke. What arrived.",
      wordCountTargetFraction: 1 / 8,
    },
    {
      act: "Act I — Setup",
      title: "First Plot Point",
      prompt:
        "The protagonist commits. Door closes behind them. What is the new question the story is now asking that it wasn't asking on page one?",
      wordCountTargetFraction: 1 / 8,
    },
    {
      act: "Act II — Confrontation",
      title: "Rising Action / First Pinch",
      prompt:
        "List three escalating complications. The third should cost the protagonist something they didn't know they valued.",
      wordCountTargetFraction: 1 / 8,
    },
    {
      act: "Act II — Confrontation",
      title: "Midpoint",
      prompt:
        "Something the protagonist believed on page one is now false. What is it, and what replaces it? This is not a twist for the reader — it's a twist for the character.",
      wordCountTargetFraction: 1 / 8,
    },
    {
      act: "Act II — Confrontation",
      title: "Second Pinch / All Is Lost",
      prompt:
        "Strip the protagonist of their best asset, their ally, or their hope — pick one. Describe the moment they realize it's gone.",
      wordCountTargetFraction: 1 / 8,
    },
    {
      act: "Act III — Resolution",
      title: "Climax",
      prompt:
        "The protagonist confronts the story's central question with everything they've become. What is the choice only this person, having lived this story, could now make?",
      wordCountTargetFraction: 1 / 8,
    },
    {
      act: "Act III — Resolution",
      title: "Resolution / Final Image",
      prompt:
        "Mirror the Opening Image. What has changed? Resist wrapping everything — leave one thread for the reader to carry out.",
      wordCountTargetFraction: 1 / 8,
    },
  ],

  "save-the-cat": [
    {
      act: "Act One",
      title: "Opening Image",
      prompt:
        "A one-image snapshot of your protagonist's 'before.' Mood, tone, status quo. It must be payable by the Final Image.",
      wordCountTargetFraction: 1 / 15,
    },
    {
      act: "Act One",
      title: "Theme Stated",
      prompt:
        "Somewhere in the first 5% of the story, a minor character speaks the theme aloud — usually to a protagonist who isn't ready to hear it. Write that line.",
      wordCountTargetFraction: 1 / 15,
    },
    {
      act: "Act One",
      title: "Set-Up",
      prompt:
        "Show the protagonist's life and the three things that must change by the end. Plant them now; you'll collect later.",
      wordCountTargetFraction: 1 / 15,
    },
    {
      act: "Act One",
      title: "Catalyst",
      prompt:
        "An external event shatters the status quo. Not internal — external. What happens to them?",
      wordCountTargetFraction: 1 / 15,
    },
    {
      act: "Act One",
      title: "Debate",
      prompt:
        "Why not? For a full act break, the protagonist resists. Write the three reasons they give themselves.",
      wordCountTargetFraction: 1 / 15,
    },
    {
      act: "Act One",
      title: "Break into Two",
      prompt:
        "They choose. Proactive, not forced. What is the concrete action that crosses them into the new world?",
      wordCountTargetFraction: 1 / 15,
    },
    {
      act: "Act Two A",
      title: "B Story",
      prompt:
        "A new character or relationship arrives, often carrying the theme. Who shows up, and what do they force the protagonist to confront?",
      wordCountTargetFraction: 1 / 15,
    },
    {
      act: "Act Two A",
      title: "Fun and Games",
      prompt:
        "The 'promise of the premise.' If this is a body-swap comedy, this is where we swap. Deliver the marquee pleasure of your hook.",
      wordCountTargetFraction: 1 / 15,
    },
    {
      act: "Act Two A",
      title: "Midpoint",
      prompt:
        "A false victory or false defeat. The stakes are raised. Public-facing A-story collides with private-facing B-story for the first time.",
      wordCountTargetFraction: 1 / 15,
    },
    {
      act: "Act Two B",
      title: "Bad Guys Close In",
      prompt:
        "External antagonists advance; internal doubts metastasize. List both columns.",
      wordCountTargetFraction: 1 / 15,
    },
    {
      act: "Act Two B",
      title: "All Is Lost",
      prompt:
        "The 'whiff of death.' Something (or someone) ends. Mentor dies, dream collapses, mask falls. What dies here?",
      wordCountTargetFraction: 1 / 15,
    },
    {
      act: "Act Two B",
      title: "Dark Night of the Soul",
      prompt:
        "The protagonist at rock bottom. Not plot — interiority. What belief must they abandon to go on?",
      wordCountTargetFraction: 1 / 15,
    },
    {
      act: "Act Two B",
      title: "Break into Three",
      prompt:
        "A solution arrives, usually from the B-story. What does the protagonist now understand that they didn't at the Midpoint?",
      wordCountTargetFraction: 1 / 15,
    },
    {
      act: "Act Three",
      title: "Finale",
      prompt:
        "Five-part structure: gather the team, execute the plan, high tower surprise, dig deep down, execution of the new plan. Sketch each.",
      wordCountTargetFraction: 1 / 15,
    },
    {
      act: "Act Three",
      title: "Final Image",
      prompt:
        "Mirror Opening Image. What has changed in the frame? The delta is your story's meaning.",
      wordCountTargetFraction: 1 / 15,
    },
  ],

  "heros-journey": [
    {
      act: "Departure",
      title: "Ordinary World",
      prompt:
        "Show the hero's normal life with enough texture that we feel its pull. What is the one thing they'd miss most? Plant it.",
      wordCountTargetFraction: 1 / 12,
    },
    {
      act: "Departure",
      title: "Call to Adventure",
      prompt:
        "A disturbance or invitation. It should feel inevitable in retrospect but surprising in the moment.",
      wordCountTargetFraction: 1 / 12,
    },
    {
      act: "Departure",
      title: "Refusal of the Call",
      prompt:
        "Why not? The refusal isn't cowardice — it's the hero's current identity defending itself.",
      wordCountTargetFraction: 1 / 12,
    },
    {
      act: "Departure",
      title: "Meeting the Mentor",
      prompt:
        "A figure who gives the hero a gift: knowledge, a tool, confidence, or all three. The gift should matter later.",
      wordCountTargetFraction: 1 / 12,
    },
    {
      act: "Departure",
      title: "Crossing the Threshold",
      prompt:
        "The point of no return. What is physically different about the world past this line?",
      wordCountTargetFraction: 1 / 12,
    },
    {
      act: "Initiation",
      title: "Tests, Allies, Enemies",
      prompt:
        "Three encounters that teach the rules of the new world. Each should reveal something about the hero they didn't know.",
      wordCountTargetFraction: 1 / 12,
    },
    {
      act: "Initiation",
      title: "Approach to the Inmost Cave",
      prompt:
        "Preparation before the great ordeal. Dread as atmosphere. What does the hero fear is about to be demanded of them?",
      wordCountTargetFraction: 1 / 12,
    },
    {
      act: "Initiation",
      title: "The Ordeal",
      prompt:
        "The hero faces their greatest fear — and symbolically dies. What part of their old self does not survive this scene?",
      wordCountTargetFraction: 1 / 12,
    },
    {
      act: "Initiation",
      title: "Reward (Seizing the Sword)",
      prompt:
        "They take something: an object, knowledge, a truth, a commitment. It is not yet safe. What's the cost they haven't paid yet?",
      wordCountTargetFraction: 1 / 12,
    },
    {
      act: "Return",
      title: "The Road Back",
      prompt:
        "The hero recommits to the ordinary world. An enemy or consequence follows them home.",
      wordCountTargetFraction: 1 / 12,
    },
    {
      act: "Return",
      title: "Resurrection",
      prompt:
        "A final test where the hero uses everything they've learned. The old self is tested one last time — and fails, so the new self can act.",
      wordCountTargetFraction: 1 / 12,
    },
    {
      act: "Return",
      title: "Return with the Elixir",
      prompt:
        "They return changed, carrying a gift for the community. What is it, and who specifically is healed by it?",
      wordCountTargetFraction: 1 / 12,
    },
  ],

  freeform: [],
};
