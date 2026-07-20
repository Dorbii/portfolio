"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  employerById,
  projectById,
  type CareerProjectId,
  type EmployerId,
} from "../model/world-registry";
import {
  projectScenePositionById,
  sceneNodes,
  worldZones,
} from "../model/scene-composition";
import {
  cameraForWorldRect,
  cameraForPoint,
  constrainWorldCamera,
  sceneNodeBounds,
  unionWorldRects,
  WORLD_CAMERA,
  type WorldCamera,
} from "../rendering/world-camera";
import { isEvidenceEligibleProject } from "../model/evidence-adapter";

export type CareerWorldFocus =
  | Readonly<{ kind: "world" }>
  | Readonly<{ kind: "employer"; employerId: EmployerId }>
  | Readonly<{ kind: "project"; projectId: CareerProjectId }>;

export function resolveCareerWorldUrlState(search: string): CareerWorldFocus {
  const params = new URLSearchParams(search);
  const projectId = params.get("project") as CareerProjectId | null;
  if (projectId && projectById.has(projectId)) return { kind: "project", projectId };

  const employerId = params.get("employer") as EmployerId | null;
  if (employerId && employerById.has(employerId)) return { kind: "employer", employerId };
  return { kind: "world" };
}

export function cameraForFocus(focus: CareerWorldFocus): WorldCamera {
  if (focus.kind === "employer") {
    const zone = worldZones.find((candidate) => candidate.id === focus.employerId)!;
    const bounds = unionWorldRects([
      zone.bounds,
      ...sceneNodes
        .filter((node) => node.employerId === focus.employerId)
        .map(sceneNodeBounds),
    ]);
    return cameraForWorldRect(bounds, 2, 16);
  }
  if (focus.kind === "project") {
    const point = projectScenePositionById.get(focus.projectId);
    if (!point) return WORLD_CAMERA;
    return cameraForPoint(point, 4.5);
  }
  return WORLD_CAMERA;
}

function urlForFocus(focus: CareerWorldFocus) {
  if (focus.kind === "employer") return `?employer=${focus.employerId}`;
  if (focus.kind === "project") {
    return `?employer=${projectById.get(focus.projectId)!.employerId}&project=${focus.projectId}`;
  }
  return "/";
}

function subscribeToUrlState(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener("career-world-url", onStoreChange);
  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener("career-world-url", onStoreChange);
  };
}

const getClientSearch = () => window.location.search;
const getServerSearch = () => "";

function focusKey(focus: CareerWorldFocus) {
  if (focus.kind === "employer") return `employer:${focus.employerId}`;
  if (focus.kind === "project") return `project:${focus.projectId}`;
  return "world";
}

export function drawerProjectForFocus(
  focus: CareerWorldFocus,
  dismissedProjectId: CareerProjectId | null,
) {
  return focus.kind === "project" &&
    isEvidenceEligibleProject(focus.projectId) &&
    dismissedProjectId !== focus.projectId
    ? focus.projectId
    : null;
}

export function useCareerWorldState() {
  const search = useSyncExternalStore(
    subscribeToUrlState,
    getClientSearch,
    getServerSearch,
  );
  const focus = resolveCareerWorldUrlState(search);
  const [cameraOverride, setCameraOverride] = useState<{
    key: string;
    camera: WorldCamera;
  } | null>(null);
  const [dismissedProjectId, setDismissedProjectId] =
    useState<CareerProjectId | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const key = focusKey(focus);
  const camera = cameraOverride?.key === key ? cameraOverride.camera : cameraForFocus(focus);
  const drawerProjectId = drawerProjectForFocus(focus, dismissedProjectId);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const applyFocus = useCallback(
    (next: CareerWorldFocus, preservedCamera?: WorldCamera) => {
      setCameraOverride(
        preservedCamera
          ? { key: focusKey(next), camera: constrainWorldCamera(preservedCamera) }
          : null,
      );
      setDismissedProjectId(null);
      window.history.replaceState(null, "", urlForFocus(next));
      window.dispatchEvent(new Event("career-world-url"));
    },
    [setCameraOverride, setDismissedProjectId],
  );

  const openEmployer = useCallback(
    (employerId: EmployerId) => applyFocus({ kind: "employer", employerId }),
    [applyFocus],
  );
  const openProject = useCallback(
    (projectId: CareerProjectId) =>
      applyFocus({ kind: "project", projectId }, camera),
    [applyFocus, camera],
  );
  const goBack = useCallback(() => {
    if (focus.kind === "project") {
      openEmployer(projectById.get(focus.projectId)!.employerId);
    } else if (focus.kind === "employer") {
      applyFocus({ kind: "world" });
    }
  }, [applyFocus, focus, openEmployer]);
  const reset = useCallback(() => applyFocus({ kind: "world" }), [applyFocus]);

  return {
    camera,
    drawerProjectId,
    focus,
    reducedMotion,
    closeDrawer: () => {
      if (focus.kind === "project") setDismissedProjectId(focus.projectId);
    },
    goBack,
    openEmployer,
    openProject,
    reset,
    setCamera: (next: WorldCamera) =>
      setCameraOverride({ key, camera: constrainWorldCamera(next) }),
  };
}
