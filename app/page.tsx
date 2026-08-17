import { CareerWorld } from "@/features/career-world";
import type { NinjaOneCapitalCityProofViewId } from "@/features/career-world/layers/city";

interface HomePageProps {
  readonly searchParams?: Promise<{
    readonly intent?: string | readonly string[];
    readonly lod?: string | readonly string[];
    readonly view?: string | readonly string[];
  }>;
}

function primaryView(value: string | readonly string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cityProofView(
  value: string | readonly string[] | undefined,
): NinjaOneCapitalCityProofViewId | null {
  const candidate = primaryView(value);
  return candidate === "world"
    || candidate === "territory"
    || candidate === "capital"
    || candidate === "d06-site"
    || candidate === "d06-close"
    ? candidate
    : null;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const intent = primaryView(resolvedSearchParams?.intent);
  const proofView = cityProofView(resolvedSearchParams?.lod);
  const view = primaryView(resolvedSearchParams?.view);

  switch (view) {
    case "ninjaone-environment":
      return <CareerWorld enableDevelopmentTools environmentProof />;
    case "ninjaone-capital-city-layer":
      return (
        <CareerWorld
          cityLayerProof
          cityProofView={proofView}
          cityVisualIntent={intent === "concept"}
          enableDevelopmentTools
          enablePerformanceProbe
          initialView="ninjaone-capital"
        />
      );
    case "terrain":
      return <CareerWorld enableDevelopmentTools />;
    default:
      return <CareerWorld />;
  }
}
