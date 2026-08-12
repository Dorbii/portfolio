import { CareerWorld } from "@/features/career-world";

interface HomePageProps {
  readonly searchParams?: Promise<{
    readonly view?: string | readonly string[];
  }>;
}

function primaryView(value: string | readonly string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const view = primaryView((await searchParams)?.view);

  switch (view) {
    case "ninjaone-environment":
      return <CareerWorld enableDevelopmentTools environmentProof />;
    case "ninjaone-capital-mvp":
      return <CareerWorld enableDevelopmentTools initialView="ninjaone-capital" />;
    case "ninjaone-capital-topology":
      return <CareerWorld enableDevelopmentTools topologyProof />;
    case "territory-landform":
      return <CareerWorld enableDevelopmentTools />;
    default:
      return <CareerWorld />;
  }
}
