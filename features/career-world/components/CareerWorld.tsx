import { WorldScene } from "../composition/WorldScene";
import "../styles/career-world.css";

interface CareerWorldProps {
  readonly enableDevelopmentTools?: boolean;
  readonly enablePerformanceProbe?: boolean;
  readonly environmentProof?: boolean;
  readonly initialView?: "world" | "ninjaone-capital";
  readonly topologyProof?: boolean;
}

export function CareerWorld({
  enableDevelopmentTools = false,
  enablePerformanceProbe = false,
  environmentProof = false,
  initialView = "world",
  topologyProof = false,
}: CareerWorldProps) {
  return (
    <main className="career-world">
      <header className="career-world__header">
        <div>
          <p>Steven Doris · infrastructure engineer</p>
          <h1>Career World</h1>
        </div>
        <p className="career-world__lede">
          One illustrated world plane. Detail is added as the camera closes in;
          the geography does not change underneath it.
        </p>
      </header>
      <WorldScene
        enableDevelopmentTools={enableDevelopmentTools}
        enablePerformanceProbe={enablePerformanceProbe}
        environmentProof={environmentProof}
        initialView={initialView}
        topologyProof={topologyProof}
      />
    </main>
  );
}
