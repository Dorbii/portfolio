import {
  nodeDomainCssColor,
  nodeDomains,
} from "../model/node-domains";
import type { CSSProperties } from "react";

export function DomainLegend() {
  return (
    <aside className="domain-legend" aria-label="Domain color key">
      <strong>Domains</strong>
      <ul>
        {nodeDomains.map((domain) => (
          <li
            key={domain.id}
            style={
              {
                "--domain-color": nodeDomainCssColor(domain.id),
              } as CSSProperties
            }
          >
            <i aria-hidden="true" />
            <span>{domain.label}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
