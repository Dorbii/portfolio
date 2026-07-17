export type ProjectEntrySource = "activate" | "zoom";

export type ProjectViewportSnapshot = {
  x: number;
  y: number;
  scale: number;
};

export function snapshotProjectViewport(
  viewport: ProjectViewportSnapshot,
): ProjectViewportSnapshot {
  return {
    x: viewport.x,
    y: viewport.y,
    scale: viewport.scale,
  };
}

export const PROJECT_ENTRY_DURATION_MS: Record<ProjectEntrySource, number> = {
  activate: 760,
  zoom: 520,
};

export const PROJECT_EXIT_DURATION_MS = 680;

// Escape gets one brief camera-lurch frame before the existing return transition.
// Keep this below the point where a keyboard escape starts to feel intercepted.
export const PROJECT_ABORT_DURATION_MS = 240;

export type ProjectTransitionRequest = {
  projectId: string;
  requestId: number;
  source: ProjectEntrySource;
  returnViewport: ProjectViewportSnapshot;
};

export type ProjectReturnRequest = {
  projectId: string;
  requestId: number;
  viewport: ProjectViewportSnapshot;
};
