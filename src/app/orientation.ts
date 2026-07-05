import type { GuidedInspectionId } from "./guidedInspection";

export type TopLevelModelId =
  | "davis"
  | "ygamma"
  | "gamma"
  | "projection"
  | "quotient-games";

export interface ModelExplanation {
  id: TopLevelModelId;
  label: string;
  teachingLabel: string;
  shortDescription: string;
  whyUseIt: string;
}

export type StartHereActionId =
  | "explore-coxeter-example"
  | "find-relation-cell"
  | "understand-ygamma"
  | "study-quotient-game"
  | "check-certificates-data";

export interface StartHereAction {
  id: StartHereActionId;
  label: string;
  summary: string;
  guideId?: GuidedInspectionId;
}

export interface InspectorAnswer {
  heading: "What is selected?" | "Why is it here?" | "Exact or drawing?";
  purpose: string;
}

export const modelExplanations: Record<TopLevelModelId, ModelExplanation> = {
  davis: {
    id: "davis",
    label: "Davis",
    teachingLabel: "Davis complex",
    shortDescription: "Cayley graph plus Davis cells.",
    whyUseIt:
      "Use this to inspect finite balls, relation polygons, and local links.",
  },
  ygamma: {
    id: "ygamma",
    label: "Y_Gamma",
    teachingLabel: "Y_Gamma",
    shortDescription: "One fundamental-domain model.",
    whyUseIt:
      "Use this to read the one-vertex generator spine and its relation faces.",
  },
  gamma: {
    id: "gamma",
    label: "Gamma",
    teachingLabel: "Defining graph Gamma",
    shortDescription: "Defining graph of the Coxeter system.",
    whyUseIt:
      "Use this to read the Coxeter matrix as generator vertices and relation edges.",
  },
  projection: {
    id: "projection",
    label: "Projection",
    teachingLabel: "Projection drawing",
    shortDescription: "Chamber barycenters drawn in 3D.",
    whyUseIt:
      "Use this when reflection data exists and you want a projected geometric picture.",
  },
  "quotient-games": {
    id: "quotient-games",
    label: "Quotient + Games",
    teachingLabel: "Quotient + Games",
    shortDescription:
      "Imported/generated quotient complex and game diagnostics.",
    whyUseIt:
      "Use this for quotient actions, cochains, JNW state moves, and link diagnostics.",
  },
};

export const startHereActions: StartHereAction[] = [
  {
    id: "explore-coxeter-example",
    label: "Explore a Coxeter example",
    summary: "Open the local Davis view and step around one chamber.",
  },
  {
    id: "find-relation-cell",
    label: "Find a relation cell",
    summary: "Focus one finite rank-two relation polygon.",
    guideId: "one-relation",
  },
  {
    id: "understand-ygamma",
    label: "Understand Y_Gamma",
    summary: "Switch to the one-vertex fundamental-domain complex.",
    guideId: "inspect-ygamma",
  },
  {
    id: "study-quotient-game",
    label: "Study a quotient/game",
    summary:
      "Open the JNW cube graph legal-system game with state-dependent directions.",
    guideId: "quotient-game-experiment",
  },
  {
    id: "check-certificates-data",
    label: "Inspect exactness and data status",
    summary: "Open Research mode, examples, backend status, and caveats.",
  },
];

export const inspectorAnswers: InspectorAnswer[] = [
  {
    heading: "What is selected?",
    purpose: "Names the object under inspection.",
  },
  {
    heading: "Why is it here?",
    purpose:
      "Explains the Coxeter, Davis, Y_Gamma, quotient, or projection reason.",
  },
  {
    heading: "Exact or drawing?",
    purpose:
      "Separates certified data, exact incidence, drawing conventions, and local checks.",
  },
];

export function modelExplanationForLabel(label: string): ModelExplanation {
  const normalized = label.toLowerCase();
  if (normalized.includes("y_gamma")) {
    return modelExplanations.ygamma;
  }
  if (normalized.includes("gamma")) {
    return modelExplanations.gamma;
  }
  if (normalized.includes("projection")) {
    return modelExplanations.projection;
  }
  if (normalized.includes("quotient")) {
    return modelExplanations["quotient-games"];
  }
  return modelExplanations.davis;
}
