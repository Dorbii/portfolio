export type NodeDomainId =
  | "backend"
  | "frontend"
  | "data"
  | "infrastructure"
  | "architecture"
  | "assurance";

export type NodeDomain = {
  id: NodeDomainId;
  label: string;
  color: readonly [number, number, number];
};

export const nodeDomains: readonly NodeDomain[] = [
  { id: "backend", label: "Backend", color: [86, 213, 238] },
  { id: "frontend", label: "Frontend", color: [185, 151, 255] },
  { id: "data", label: "Data", color: [246, 196, 83] },
  { id: "infrastructure", label: "Infrastructure", color: [126, 211, 167] },
  { id: "architecture", label: "Architecture", color: [110, 150, 255] },
  { id: "assurance", label: "Assurance", color: [255, 139, 111] },
];

export const nodeDomainById = Object.fromEntries(
  nodeDomains.map((domain) => [domain.id, domain]),
) as Record<NodeDomainId, NodeDomain>;

export function nodeDomainCssColor(domainId: NodeDomainId) {
  const [red, green, blue] = nodeDomainById[domainId].color;
  return `rgb(${red} ${green} ${blue})`;
}
