export type NodeDomainId =
  | "backend"
  | "frontend"
  | "data"
  | "infrastructure";

export type NodeDomain = {
  id: NodeDomainId;
  label: string;
  color: readonly [number, number, number];
};

export const nodeDomains: readonly NodeDomain[] = [
  { id: "frontend", label: "UI / Client", color: [185, 151, 255] },
  { id: "backend", label: "Services / APIs", color: [86, 213, 238] },
  { id: "data", label: "Data / Processing", color: [246, 196, 83] },
  {
    id: "infrastructure",
    label: "Platform / Infrastructure",
    color: [126, 211, 167],
  },
];

export const nodeDomainById = Object.fromEntries(
  nodeDomains.map((domain) => [domain.id, domain]),
) as Record<NodeDomainId, NodeDomain>;

export function nodeDomainCssColor(domainId: NodeDomainId) {
  const [red, green, blue] = nodeDomainById[domainId].color;
  return `rgb(${red} ${green} ${blue})`;
}
