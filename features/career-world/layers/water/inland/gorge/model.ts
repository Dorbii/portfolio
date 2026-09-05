import fields from "../../../../../../public/career-world/layers/water/fields-r1/manifest.json" with { type: "json" };
import terrain from "../../../../../../public/career-world/layers/terrain/authority/manifests/terrain-local-mount-r1.json" with { type: "json" };

const fall=fields.features.find(feature=>feature.id==="great-gorge-fall")!;
const feeder=fields.features.find(feature=>feature.id==="gorge-feeder")!;
const lower=fields.features.find(feature=>feature.id==="gorge-lower-cascade")!;
const tile=terrain.tiles.find(tile=>tile.id==="l2-c3-1")!;
export const GORGE_FALL={
  id:fall.id,
  lip:fall.points[0],foot:fall.points.at(-1)!,upstream:feeder.points.at(-2)!,
  outlet:lower.points[0],lowerFoot:lower.points.at(-1)!,
  tileBounds:tile.worldBounds,cliffPath:tile.sources.site.path,
  world:fields.worldSize.map(n=>n*fields.metresPerWorldUnit),
  gravity:9.81,verticalProjection:0.86,entrySpeed:1.5,
} as const;

export function gorgeFlight(){
  const drop=(GORGE_FALL.foot[1]-GORGE_FALL.lip[1])*GORGE_FALL.world[1];
  const acceleration=GORGE_FALL.gravity*GORGE_FALL.verticalProjection;
  const duration=(Math.sqrt(GORGE_FALL.entrySpeed**2+2*acceleration*drop)-GORGE_FALL.entrySpeed)/acceleration;
  return {duration,velocityX:(GORGE_FALL.foot[0]-GORGE_FALL.lip[0])*GORGE_FALL.world[0]/duration};
}

// Projected ballistic sheet centerline. The source-bound lip and foot stay fixed.
export function gorgeSheetPoint(age:number){
  const flight=gorgeFlight(),t=Math.max(0,Math.min(flight.duration,age));
  return [GORGE_FALL.lip[0]*GORGE_FALL.world[0]+flight.velocityX*t,
    GORGE_FALL.lip[1]*GORGE_FALL.world[1]+GORGE_FALL.entrySpeed*t+0.5*GORGE_FALL.gravity*GORGE_FALL.verticalProjection*t*t];
}
