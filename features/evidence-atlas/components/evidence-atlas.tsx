"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEvidenceAtlasState } from "../hooks/use-evidence-atlas-state";
import { traceById } from "../model/evidence-data";
import { projectMediaById } from "../model/project-media";
import {
  snapshotProjectViewport,
  type ProjectEntrySource,
  type ProjectReturnRequest,
  type ProjectTransitionRequest,
  type ProjectViewportSnapshot,
} from "../model/project-transition";
import { DEFAULT_GRAPH_VIEWPORT } from "../rendering/graph-viewport";
import { EvidenceGraph } from "./evidence-graph";
import { EvidenceInspector } from "./evidence-inspector";
import { ProjectMediaStage } from "./project-media-stage";
import { SelectionTray } from "./selection-tray";
import { WorkspaceHeader } from "./workspace-header";

export function EvidenceAtlas() {
  const atlas = useEvidenceAtlasState();
  const projectRequestId = useRef(0);
  const [projectTransition, setProjectTransition] =
    useState<ProjectTransitionRequest | null>(null);
  const [projectMediaRequest, setProjectMediaRequest] =
    useState<ProjectTransitionRequest | null>(null);
  const [projectReturn, setProjectReturn] =
    useState<ProjectReturnRequest | null>(null);
  const [projectMediaOrigin, setProjectMediaOrigin] = useState({ x: 0, y: 0 });
  const [projectEntryReady, setProjectEntryReady] = useState(false);
  const [projectMediaExiting, setProjectMediaExiting] = useState(false);
  const preloadedMediaRef = useRef(new Map<string, HTMLVideoElement>());
  const {
    activeTraceId,
    closeQuery,
    closeTrace,
    inspectorOpen,
    openQuery,
    openTrace,
    queryInspectorOpen,
    selectedIds,
    toggleNode,
  } = atlas;

  const focusElement = useCallback((selector: string) => {
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(selector)?.focus({
        preventScroll: true,
      });
    });
  }, []);

  const restoreNodeFocus = useCallback((nodeId: string | undefined) => {
    if (!nodeId) return;
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLButtonElement>(`[data-node-id="${nodeId}"]`)
        ?.focus({ preventScroll: true });
    });
  }, []);

  const closeEvidenceQuery = useCallback(() => {
    const focusId = selectedIds.at(-1);
    closeQuery();
    restoreNodeFocus(focusId);
  }, [closeQuery, restoreNodeFocus, selectedIds]);

  const openEvidenceQuery = useCallback(() => {
    openQuery();
    focusElement("#query-inspector-title");
  }, [focusElement, openQuery]);

  const preloadProjectMedia = useCallback((projectId: string) => {
    const media = projectMediaById[projectId];
    if (!media || preloadedMediaRef.current.has(projectId)) return;
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = media.videoSrc;
    video.load();
    preloadedMediaRef.current.set(projectId, video);
  }, []);

  const openProject = useCallback(
    (
      projectId: string,
      source: ProjectEntrySource = "activate",
      returnViewport: ProjectViewportSnapshot = DEFAULT_GRAPH_VIEWPORT,
    ) => {
      if (activeTraceId) closeTrace();
      projectRequestId.current += 1;
      const request = {
        projectId,
        requestId: projectRequestId.current,
        source,
        returnViewport: snapshotProjectViewport(returnViewport),
      } satisfies ProjectTransitionRequest;

      if (projectMediaById[projectId]) {
        preloadProjectMedia(projectId);
        const portal = document.querySelector<HTMLElement>(
          `[data-project-id="${projectId}"]`,
        );
        const bounds = portal?.getBoundingClientRect();
        setProjectMediaOrigin(
          bounds
            ? {
                x: bounds.left + bounds.width / 2,
                y: bounds.top + bounds.height / 2,
              }
            : { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        );
        setProjectEntryReady(false);
        setProjectMediaExiting(false);
        setProjectReturn(null);
        setProjectMediaRequest(request);
      }
      setProjectTransition(request);
    },
    [activeTraceId, closeTrace, preloadProjectMedia],
  );

  const completeProjectTransition = useCallback(
    (request: ProjectTransitionRequest) => {
      setProjectTransition((current) =>
        current?.requestId === request.requestId ? null : current,
      );
      if (projectMediaById[request.projectId]) {
        setProjectEntryReady(true);
        return;
      }
      openTrace(request.projectId);
      focusElement("#project-inspector-title");
    },
    [focusElement, openTrace],
  );

  const cancelProjectTransition = useCallback((requestId: number) => {
    setProjectTransition((current) =>
      current?.requestId === requestId ? null : current,
    );
    setProjectMediaRequest((current) =>
      current?.requestId === requestId ? null : current,
    );
    setProjectEntryReady(false);
    setProjectMediaExiting(false);
    setProjectReturn(null);
    setProjectMediaOrigin({ x: 0, y: 0 });
  }, []);

  const beginProjectExit = useCallback(() => {
    const request = projectMediaRequest;
    if (!request || projectMediaExiting) return;
    setProjectTransition((current) =>
      current?.requestId === request.requestId ? null : current,
    );
    projectRequestId.current += 1;
    setProjectEntryReady(false);
    setProjectMediaExiting(true);
    setProjectReturn({
      projectId: request.projectId,
      requestId: projectRequestId.current,
      viewport: snapshotProjectViewport(request.returnViewport),
    });
  }, [projectMediaExiting, projectMediaRequest]);

  const completeProjectReturn = useCallback(
    (request: ProjectReturnRequest) => {
      setProjectReturn((current) =>
        current?.requestId === request.requestId ? null : current,
      );
      setProjectMediaRequest(null);
      setProjectEntryReady(false);
      setProjectMediaExiting(false);
      setProjectMediaOrigin({ x: 0, y: 0 });
      closeTrace();
      focusElement(`[data-project-id="${request.projectId}"]`);
    },
    [closeTrace, focusElement],
  );

  const portalProjectId =
    projectMediaRequest?.projectId ??
    projectTransition?.projectId ??
    atlas.activeTraceId;
  const mediaProject = projectMediaRequest
    ? traceById.get(projectMediaRequest.projectId)
    : null;

  const closeProject = useCallback(() => {
    const projectId = activeTraceId;
    closeTrace();
    if (projectId) focusElement(`[data-project-id="${projectId}"]`);
  }, [activeTraceId, closeTrace, focusElement]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.key !== "Escape" ||
        !inspectorOpen ||
        projectTransition !== null ||
        projectMediaRequest !== null
      ) {
        return;
      }
      const focusId = selectedIds.at(-1);
      if (activeTraceId) {
        const projectId = activeTraceId;
        closeTrace();
        focusElement(`[data-project-id="${projectId}"]`);
      } else {
        closeQuery();
        restoreNodeFocus(focusId);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [
    activeTraceId,
    closeQuery,
    closeTrace,
    focusElement,
    inspectorOpen,
    projectMediaRequest,
    projectTransition,
    restoreNodeFocus,
    selectedIds,
  ]);

  return (
    <main
      className={`evidence-workspace ${atlas.activeTraceId ? "mode-project" : "mode-explore"} ${projectMediaRequest ? "mode-media" : ""}`}
    >
      <div
        className="atlas-content"
        inert={projectMediaRequest ? true : undefined}
        aria-hidden={projectMediaRequest ? true : undefined}
      >
        <WorkspaceHeader />

        <div className="workspace-body">
        <section className="graph-panel" aria-label="Evidence relationship map">
          <EvidenceGraph
            selectedIds={atlas.selectedIds}
            activeProjectId={portalProjectId}
            inspectorOpen={atlas.inspectorOpen}
            projectTransition={projectTransition}
            projectReturn={projectReturn}
            projectStageActive={projectMediaRequest !== null}
            motionSuspended={
              projectMediaRequest !== null &&
              projectTransition === null &&
              projectReturn === null
            }
            onToggle={toggleNode}
            onPreloadProject={preloadProjectMedia}
            onOpenProject={openProject}
            onProjectTransitionComplete={completeProjectTransition}
            onProjectTransitionCancel={cancelProjectTransition}
            onProjectReturnComplete={completeProjectReturn}
          />

          <SelectionTray
            activeTrace={atlas.activeTrace}
            selectedNodes={atlas.selectedNodes}
            selectionLimit={atlas.selectionLimit}
            selectionLimitAttempts={atlas.selectionLimitAttempts}
            copyLabel={atlas.copyLabel}
            queryOpen={queryInspectorOpen}
            onToggleNode={toggleNode}
            onOpenQuery={openEvidenceQuery}
            onCloseTrace={closeProject}
            onCopyView={atlas.copyView}
          />
        </section>

        {atlas.inspectorOpen ? (
          <EvidenceInspector
            activeTraceId={atlas.activeTraceId}
            selectedIds={atlas.selectedIds}
            onCloseQuery={closeEvidenceQuery}
            onCloseTrace={closeProject}
            onOpenTrace={openProject}
            traceStep={atlas.activeTraceStep}
            onTraceStepChange={atlas.changeTraceStep}
            isTracePlaying={atlas.tracePlayback}
            onToggleTracePlayback={atlas.toggleTracePlayback}
          />
        ) : null}
        </div>
      </div>

      {projectMediaRequest &&
      mediaProject &&
      projectMediaById[projectMediaRequest.projectId] ? (
        <ProjectMediaStage
          media={projectMediaById[projectMediaRequest.projectId]!}
          project={mediaProject}
          origin={projectMediaOrigin}
          entrySource={projectMediaRequest.source}
          entryReady={projectEntryReady}
          exiting={projectMediaExiting}
          onExitStart={beginProjectExit}
        />
      ) : null}
    </main>
  );
}
