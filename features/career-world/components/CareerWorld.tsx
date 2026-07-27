import { WorldScene } from "../composition/WorldScene";
import "../styles/career-world.css";

interface CareerWorldProps {
  readonly enableDevelopmentTools?: boolean;
  readonly initialInterfaceMode?: "world" | "water";
}

export function CareerWorld({
  enableDevelopmentTools = false,
  initialInterfaceMode = "world",
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
        initialInterfaceMode={initialInterfaceMode}
      />
      <footer className="career-world__footer">
        Phase 6 · capital-core and coastline validation review
      </footer>
    </main>
  );
}
