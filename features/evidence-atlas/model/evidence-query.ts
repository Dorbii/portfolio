// Deterministic evidence intersection and path resolution.
import {
  evidenceRecords,
  evidenceTraces,
  graphNodes,
  recordById,
  traceById,
  type EvidenceRecord,
} from "./evidence-data";

export type EvidenceQueryMode =
  | "all"
  | "direct"
  | "shared-trace"
  | "bridge"
  | "disconnected";

export type EvidencePathSegment = {
  fromId: string;
  toId: string;
  recordId: string;
};

export type EvidenceQueryResolution = {
  mode: EvidenceQueryMode;
  selectedIds: string[];
  directRecords: EvidenceRecord[];
  supportingRecords: EvidenceRecord[];
  pathNodeIds: string[];
  pathSegments: EvidencePathSegment[];
  relatedTraceIds: string[];
  title: string;
  explanation: string;
};

type AdjacencyStep = {
  nodeId: string;
  recordId: string;
  weight: number;
};

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function recordsInScope(traceId?: string | null) {
  return traceId
    ? evidenceRecords.filter((record) => record.traceId === traceId)
    : evidenceRecords;
}

function buildAdjacency(records: EvidenceRecord[]) {
  const adjacency = new Map<string, Map<string, AdjacencyStep>>();

  for (const record of records) {
    const nodeIds = unique(record.nodeIds);
    for (let leftIndex = 0; leftIndex < nodeIds.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < nodeIds.length;
        rightIndex += 1
      ) {
        const leftId = nodeIds[leftIndex];
        const rightId = nodeIds[rightIndex];
        const leftNeighbors = adjacency.get(leftId) ?? new Map();
        const rightNeighbors = adjacency.get(rightId) ?? new Map();
        const existingLeft = leftNeighbors.get(rightId);
        const existingRight = rightNeighbors.get(leftId);

        if (!existingLeft || existingLeft.weight < record.weight) {
          leftNeighbors.set(rightId, {
            nodeId: rightId,
            recordId: record.id,
            weight: record.weight,
          });
        }
        if (!existingRight || existingRight.weight < record.weight) {
          rightNeighbors.set(leftId, {
            nodeId: leftId,
            recordId: record.id,
            weight: record.weight,
          });
        }

        adjacency.set(leftId, leftNeighbors);
        adjacency.set(rightId, rightNeighbors);
      }
    }
  }

  return adjacency;
}

function findShortestPath(
  startId: string,
  targetId: string,
  adjacency: Map<string, Map<string, AdjacencyStep>>,
) {
  if (startId === targetId) return [];

  const queue: { nodeId: string; path: EvidencePathSegment[] }[] = [
    { nodeId: startId, path: [] },
  ];
  const visited = new Set([startId]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = [...(adjacency.get(current.nodeId)?.values() ?? [])].sort(
      (left, right) => right.weight - left.weight,
    );

    for (const neighbor of neighbors) {
      if (visited.has(neighbor.nodeId)) continue;
      const segment: EvidencePathSegment = {
        fromId: current.nodeId,
        toId: neighbor.nodeId,
        recordId: neighbor.recordId,
      };
      const path = [...current.path, segment];
      if (neighbor.nodeId === targetId) return path;
      visited.add(neighbor.nodeId);
      queue.push({ nodeId: neighbor.nodeId, path });
    }
  }

  return null;
}

function connectSelectedNodes(selectedIds: string[], records: EvidenceRecord[]) {
  if (selectedIds.length < 2) return [];
  const adjacency = buildAdjacency(records);
  const canonicalIds = [...selectedIds].sort();
  const candidates: EvidencePathSegment[][] = [];

  for (const rootId of canonicalIds) {
    const segments: EvidencePathSegment[] = [];
    let connected = true;

    for (const targetId of canonicalIds.filter((nodeId) => nodeId !== rootId)) {
      const path = findShortestPath(rootId, targetId, adjacency);
      if (!path) {
        connected = false;
        break;
      }
      for (const segment of path) {
        const alreadyIncluded = segments.some(
          (current) =>
            (current.fromId === segment.fromId && current.toId === segment.toId) ||
            (current.fromId === segment.toId && current.toId === segment.fromId),
        );
        if (!alreadyIncluded) segments.push(segment);
      }
    }

    if (connected) candidates.push(segments);
  }

  if (candidates.length === 0) return null;

  return candidates.sort((left, right) => {
    if (left.length !== right.length) return left.length - right.length;

    const weight = (segments: EvidencePathSegment[]) =>
      unique(segments.map((segment) => segment.recordId)).reduce(
        (total, recordId) => total + (recordById.get(recordId)?.weight ?? 0),
        0,
      );
    const weightDifference = weight(right) - weight(left);
    if (weightDifference !== 0) return weightDifference;

    const signature = (segments: EvidencePathSegment[]) =>
      segments
        .map(
          (segment) =>
            `${segment.fromId}>${segment.toId}:${segment.recordId}`,
        )
        .join("|");
    return signature(left).localeCompare(signature(right));
  })[0];
}

function recordsForSegments(segments: EvidencePathSegment[]) {
  return unique(segments.map((segment) => segment.recordId))
    .map((recordId) => recordById.get(recordId))
    .filter((record): record is EvidenceRecord => Boolean(record));
}

function nodesForRecords(records: EvidenceRecord[], selectedIds: string[]) {
  return unique([
    ...selectedIds,
    ...records.flatMap((record) => record.nodeIds),
  ]);
}

function nodesForSegments(
  segments: EvidencePathSegment[],
  selectedIds: string[],
) {
  return unique([
    ...segments.flatMap((segment) => [segment.fromId, segment.toId]),
    ...selectedIds,
  ]);
}

export function resolveEvidenceQuery(
  requestedNodeIds: string[],
  traceId?: string | null,
): EvidenceQueryResolution {
  const validNodeIds = new Set(graphNodes.map((node) => node.id));
  const selectedIds = unique(requestedNodeIds).filter((nodeId) =>
    validNodeIds.has(nodeId),
  );
  const scopedRecords = recordsInScope(traceId);

  if (selectedIds.length === 0) {
    const trace = traceId ? traceById.get(traceId) : null;
    return {
      mode: "all",
      selectedIds,
      directRecords: [],
      supportingRecords: scopedRecords,
      pathNodeIds: trace?.nodeIds ?? graphNodes.map((node) => node.id),
      pathSegments: [],
      relatedTraceIds: unique(scopedRecords.map((record) => record.traceId)),
      title: trace ? "Pinned evidence trace" : "Evidence atlas",
      explanation: trace
        ? "The graph is showing every documented record in this trace."
        : "The graph is showing every documented relationship.",
    };
  }

  const directRecords = scopedRecords.filter((record) =>
    selectedIds.every((nodeId) => record.nodeIds.includes(nodeId)),
  );

  if (directRecords.length > 0) {
    return {
      mode: "direct",
      selectedIds,
      directRecords,
      supportingRecords: directRecords,
      pathNodeIds: nodesForRecords(directRecords, selectedIds),
      pathSegments: [],
      relatedTraceIds: unique(directRecords.map((record) => record.traceId)),
      title: selectedIds.length === 1 ? "Direct evidence" : "Direct intersection",
      explanation:
        selectedIds.length === 1
          ? "These records directly contain the selected concept."
          : "Every selected concept appears in the same evidence record.",
    };
  }

  const sharedTraceCandidates = evidenceTraces.filter(
    (trace) =>
      (!traceId || trace.id === traceId) &&
      selectedIds.every((nodeId) => trace.nodeIds.includes(nodeId)),
  );

  if (sharedTraceCandidates.length > 0) {
    const trace = sharedTraceCandidates[0];
    const traceRecords = evidenceRecords.filter(
      (record) => record.traceId === trace.id,
    );
    const pathSegments = connectSelectedNodes(selectedIds, traceRecords) ?? [];
    const supportingRecords =
      pathSegments.length > 0
        ? recordsForSegments(pathSegments)
        : traceRecords.filter((record) =>
            selectedIds.some((nodeId) => record.nodeIds.includes(nodeId)),
          );

    return {
      mode: "shared-trace",
      selectedIds,
      directRecords: [],
      supportingRecords,
      pathNodeIds:
        pathSegments.length > 0
          ? nodesForSegments(pathSegments, selectedIds)
          : nodesForRecords(supportingRecords, selectedIds),
      pathSegments,
      relatedTraceIds: [trace.id],
      title: "Shared evidence trace",
      explanation:
        "The selected concepts belong to the same curated trace, but no single record contains all of them. The path is structural evidence, not a direct outcome claim.",
    };
  }

  const pathSegments = connectSelectedNodes(selectedIds, scopedRecords);
  if (pathSegments) {
    const supportingRecords = recordsForSegments(pathSegments);
    return {
      mode: "bridge",
      selectedIds,
      directRecords: [],
      supportingRecords,
      pathNodeIds: nodesForSegments(pathSegments, selectedIds),
      pathSegments,
      relatedTraceIds: unique(supportingRecords.map((record) => record.traceId)),
      title: "Documented structural path",
      explanation:
        "No single record contains every selected concept. The graph found the shortest chain of documented co-occurrences; this explains connection, not direct proof.",
    };
  }

  return {
    mode: "disconnected",
    selectedIds,
    directRecords: [],
    supportingRecords: [],
    pathNodeIds: selectedIds,
    pathSegments: [],
    relatedTraceIds: [],
    title: "No documented path",
    explanation:
      "The current evidence model contains neither a direct record nor a documented relationship path between every selected concept.",
  };
}
