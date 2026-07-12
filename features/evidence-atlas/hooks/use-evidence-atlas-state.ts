"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  graphNodes,
  nodeById,
  recordsForTrace,
  traceById,
  type GraphNode,
} from "../model/evidence-data";

const MAX_MANUAL_SELECTIONS = 3;
// Replay steps intentionally replace this capped manual set with every node in
// the active evidence record.
const validNodeIds = new Set(graphNodes.map((node) => node.id));

function supportsTraceMotion() {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useEvidenceAtlasState() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [activeTraceId, setActiveTraceId] = useState<string | null>(null);
  const [activeTraceStep, setActiveTraceStep] = useState(0);
  const [tracePlayback, setTracePlayback] = useState(false);
  const [urlReady, setUrlReady] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy link");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const requestedTrace = params.get("project") ?? params.get("trace");
      const requestedFocus = params
        .get("focus")
        ?.split(",")
        .filter((nodeId) => validNodeIds.has(nodeId))
        .slice(0, MAX_MANUAL_SELECTIONS);

      if (requestedTrace && traceById.has(requestedTrace)) {
        const trace = traceById.get(requestedTrace)!;
        const traceRecords = recordsForTrace(requestedTrace);
        setActiveTraceId(requestedTrace);
        setActiveTraceStep(0);
        setSelectedIds(traceRecords[0]?.nodeIds ?? trace.nodeIds);
        setTracePlayback(
          trace.replayStatus === "ready" &&
            traceRecords.length > 1 &&
            supportsTraceMotion(),
        );
      } else if (requestedFocus && requestedFocus.length > 0) {
        setSelectedIds(requestedFocus);
      }
      setUrlReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!urlReady) return;
    const params = new URLSearchParams();
    if (activeTraceId) params.set("project", activeTraceId);
    else if (selectedIds.length > 0) params.set("focus", selectedIds.join(","));
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    );
  }, [activeTraceId, selectedIds, urlReady]);

  const clearAtlas = useCallback(() => {
    setPreviewId(null);
    setSelectedIds([]);
    setActiveTraceId(null);
    setActiveTraceStep(0);
    setTracePlayback(false);
  }, []);

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearAtlas();
    };
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [clearAtlas]);

  const toggleNode = useCallback(
    (nodeId: string) => {
      const wasTracing = activeTraceId !== null;
      setActiveTraceId(null);
      setTracePlayback(false);
      setSelectedIds((current) => {
        if (wasTracing) return [nodeId];
        if (current.includes(nodeId)) {
          return current.filter((id) => id !== nodeId);
        }
        return [...current, nodeId].slice(-MAX_MANUAL_SELECTIONS);
      });
    },
    [activeTraceId],
  );

  const openTrace = useCallback((traceId: string) => {
    const trace = traceById.get(traceId);
    const traceRecords = recordsForTrace(traceId);
    if (!trace) return;
    setActiveTraceId(traceId);
    setActiveTraceStep(0);
    setSelectedIds(traceRecords[0]?.nodeIds ?? trace.nodeIds);
    setTracePlayback(
      trace.replayStatus === "ready" &&
        traceRecords.length > 1 &&
        supportsTraceMotion(),
    );
    setPreviewId(null);
  }, []);

  const activeTrace = activeTraceId ? traceById.get(activeTraceId) : null;
  const activeTraceRecords = useMemo(
    () => (activeTraceId ? recordsForTrace(activeTraceId) : []),
    [activeTraceId],
  );
  const selectedNodes = useMemo(
    () =>
      selectedIds
        .map((nodeId) => nodeById.get(nodeId))
        .filter((node): node is GraphNode => Boolean(node)),
    [selectedIds],
  );

  const applyTraceStep = useCallback(
    (step: number) => {
      const record = activeTraceRecords[step];
      if (!record) return;
      setActiveTraceStep(step);
      setSelectedIds(record.nodeIds);
    },
    [activeTraceRecords],
  );

  useEffect(() => {
    if (
      !tracePlayback ||
      !activeTraceId ||
      activeTraceStep >= activeTraceRecords.length - 1
    ) {
      return;
    }
    const isLastAdvance = activeTraceStep + 1 >= activeTraceRecords.length - 1;
    const timer = window.setTimeout(() => {
      applyTraceStep(activeTraceStep + 1);
      if (isLastAdvance) setTracePlayback(false);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [
    activeTraceId,
    activeTraceRecords.length,
    activeTraceStep,
    applyTraceStep,
    tracePlayback,
  ]);

  const changeTraceStep = useCallback(
    (step: number) => {
      setTracePlayback(false);
      applyTraceStep(step);
    },
    [applyTraceStep],
  );

  const toggleTracePlayback = useCallback(() => {
    if (tracePlayback) {
      setTracePlayback(false);
      return;
    }
    if (!supportsTraceMotion()) return;
    if (activeTraceStep >= activeTraceRecords.length - 1) {
      applyTraceStep(0);
    }
    setTracePlayback(true);
  }, [
    activeTraceRecords.length,
    activeTraceStep,
    applyTraceStep,
    tracePlayback,
  ]);

  const closeTrace = useCallback(() => {
    setActiveTraceId(null);
    setActiveTraceStep(0);
    setTracePlayback(false);
  }, []);

  const clearQuery = useCallback(() => {
    setSelectedIds([]);
    setPreviewId(null);
  }, []);

  const copyView = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyLabel("Link copied");
      window.setTimeout(() => setCopyLabel("Copy link"), 1600);
    } catch {
      setCopyLabel("Copy URL manually");
    }
  }, []);

  return {
    selectedIds,
    selectedNodes,
    previewId,
    setPreviewId,
    activeTraceId,
    activeTrace,
    activeTraceStep,
    tracePlayback,
    inspectorOpen: Boolean(activeTraceId || selectedIds.length > 0),
    copyLabel,
    toggleNode,
    openTrace,
    closeTrace,
    clearQuery,
    changeTraceStep,
    toggleTracePlayback,
    copyView,
  };
}
