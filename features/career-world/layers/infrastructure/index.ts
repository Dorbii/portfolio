import type { LayerDescriptor } from "../../shared/layers";

export const INFRASTRUCTURE_LAYER: LayerDescriptor = Object.freeze({
  id: "infrastructure",
  order: 4,
  status: "active",
  owns: Object.freeze([
    "roads",
    "trails",
    "docks",
    "bridges",
    "plazas",
    "town blocks",
    "pedestrian loops",
    "terrain seams",
    "entrances",
  ]),
});

export { InfrastructureLayer } from "./components/InfrastructureLayer";
export {
  CAPITAL_CAMPUS_INFRASTRUCTURE,
  PROJECT_TOWN_INFRASTRUCTURE,
  PROJECT_TOWN_INFRASTRUCTURE_POLICY,
  PROJECT_TOWN_SITE_POLICY,
  TOWN_PLAN_BLOCK_KINDS,
  TOWN_PLAN_PLAZA_KINDS,
  TOWN_PLAN_STREET_KINDS,
  TOWN_PLAN_TERRAIN_SEAM_KINDS,
  type CapitalCampusInfrastructure,
  type ProjectTownInfrastructure,
  type ProjectTownPalette,
  type ProjectTownTerrainProfile,
  type TownPlan,
  type TownPlanBlock,
  type TownPlanBlockKind,
  type TownPlanEntrance,
  type TownPlanPedestrianLoop,
  type TownPlanPlaza,
  type TownPlanPlazaKind,
  type TownPlanStreet,
  type TownPlanStreetKind,
  type TownPlanTerrainSeam,
  type TownPlanTerrainSeamKind,
} from "./model/projectTowns";
