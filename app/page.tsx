import { CareerWorld } from "@/features/career-world";

interface HomePageProps {
  readonly searchParams?: Promise<{
    readonly intent?: string | readonly string[];
    readonly layers?: string | readonly string[];
    readonly lod?: string | readonly string[];
    readonly view?: string | readonly string[];
  }>;
}

function primaryView(value: string | readonly string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const intent = primaryView(resolvedSearchParams?.intent);
  const view = primaryView(resolvedSearchParams?.view);

  switch (view) {
    case "water":
      return <CareerWorld enableDevelopmentTools enablePerformanceProbe layerInspector initialView="ninjaone-capital" />;
    case "ninjaone-capital-city-layer":
      return (
        <CareerWorld
          cityLayerProof
          cityVisualIntent={intent === "concept"}
          enableDevelopmentTools
          enablePerformanceProbe
          initialView="ninjaone-capital"
        />
      );
    case "terrain":
      return <CareerWorld enableDevelopmentTools />;
    default:
      return (
        <CareerWorld layerInspector={resolvedSearchParams?.layers !== undefined} />
      );
  }
}
