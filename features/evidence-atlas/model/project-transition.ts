export type ProjectEntrySource = "activate" | "zoom";

export const PROJECT_ENTRY_DURATION_MS: Record<ProjectEntrySource, number> = {
  activate: 760,
  zoom: 520,
};

export type ProjectTransitionRequest = {
  projectId: string;
  requestId: number;
  source: ProjectEntrySource;
};
