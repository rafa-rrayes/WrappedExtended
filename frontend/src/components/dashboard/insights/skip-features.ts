/**
 * Human labels for the skip model's raw feature columns.
 *
 * The model is trained on engineered columns (`start_fwdbtn`, `pos_in_session`, …) and
 * ships them straight through in `drivers`. A chart of those identifiers is a database
 * dump, not an insight, so every column gets a name and a sentence of what it means.
 * Unknown columns fall back to a de-snaked label rather than being dropped — a new
 * feature on the backend should still render.
 */
export interface SkipFeatureCopy {
  label: string;
  explanation: string;
}

const FEATURES: Record<string, SkipFeatureCopy> = {
  shuffle: {
    label: "Shuffle was on",
    explanation:
      "Whether the play came out of a shuffled queue rather than a deliberate order.",
  },
  artist_familiarity: {
    label: "How well you know the artist",
    explanation:
      "How much you have played that artist overall — a first encounter behaves very differently from a regular.",
  },
  track_familiarity: {
    label: "How well you know the track",
    explanation: "How often that specific track has come up in your history before.",
  },
  start_fwdbtn: {
    label: "Arrived via the skip button",
    explanation:
      "The play started because you skipped the previous track — you were already restless.",
  },
  start_trackdone: {
    label: "Auto-played after a finished track",
    explanation:
      "The previous track ended on its own and this one followed — the passive path into a play.",
  },
  start_click: {
    label: "You picked it yourself",
    explanation: "The play started because you clicked the track in a list or playlist.",
  },
  pos_in_session: {
    label: "Position in the session",
    explanation:
      "How deep into a listening session the play landed; early and late in a session behave differently.",
  },
  hour: {
    label: "Hour of the day",
    explanation: "The clock hour the play started at.",
  },
  weekday: {
    label: "Day of the week",
    explanation: "Which weekday the play happened on.",
  },
  is_weekend: {
    label: "Weekend",
    explanation: "Whether the play happened on a Saturday or Sunday.",
  },
  offline: {
    label: "Offline playback",
    explanation: "The track was played from downloads rather than streamed.",
  },
  is_mobile: {
    label: "On a phone",
    explanation: "The play happened on iOS or Android rather than desktop or web.",
  },
};

export function skipFeatureCopy(feature: string): SkipFeatureCopy {
  const known = FEATURES[feature];
  if (known) return known;
  return {
    label: feature
      .split("_")
      .filter(Boolean)
      .map((word, index) => (index === 0 ? word[0].toUpperCase() + word.slice(1) : word))
      .join(" "),
    explanation: "A feature the skip model was trained on.",
  };
}
