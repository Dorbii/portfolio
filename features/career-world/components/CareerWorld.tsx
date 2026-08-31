import { WorldScene } from "../composition/WorldScene";
import type { NinjaOneCapitalCityProofViewId } from "../layers/city";
import "../styles/career-world.css";

interface CareerWorldProps {
  readonly cityLayerProof?: boolean;
  readonly cityProofView?: NinjaOneCapitalCityProofViewId | null;
  readonly cityVisualIntent?: boolean;
  readonly enableDevelopmentTools?: boolean;
  readonly enablePerformanceProbe?: boolean;
  readonly environmentProof?: boolean;
  readonly initialView?: "world" | "ninjaone-capital";
  readonly layerInspector?: boolean;
}

export function CareerWorld({
  cityLayerProof = false,
  cityProofView = null,
  cityVisualIntent = false,
  enableDevelopmentTools = false,
  enablePerformanceProbe = false,
  environmentProof = false,
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
        cityProofView={cityProofView}
        cityVisualIntent={cityVisualIntent}
        enableDevelopmentTools={enableDevelopmentTools}
        enablePerformanceProbe={enablePerformanceProbe}
        environmentProof={environmentProof}
        initialView={initialView}
        key={cityProofView ?? "interactive"}
        layerInspector={layerInspector}
      />
    </main>
  );
}
