import { WorldScene } from "../composition/WorldScene";
import "../styles/career-world.css";

interface CareerWorldProps {
  readonly cityLayerProof?: boolean;
  readonly cityVisualIntent?: boolean;
  readonly enableDevelopmentTools?: boolean;
  readonly enablePerformanceProbe?: boolean;
  readonly initialView?: "world" | "ninjaone-capital";
  readonly layerInspector?: boolean;
}

export function CareerWorld({
  cityLayerProof = false,
  cityVisualIntent = false,
  enableDevelopmentTools = false,
  enablePerformanceProbe = false,
  initialView = "world",
  layerInspector = false,
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
        cityLayerProof={cityLayerProof}
        cityVisualIntent={cityVisualIntent}
        enableDevelopmentTools={enableDevelopmentTools}
        enablePerformanceProbe={enablePerformanceProbe}
        initialView={initialView}
        layerInspector={layerInspector}
      />
    </main>
  );
}
