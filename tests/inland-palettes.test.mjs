import assert from "node:assert/strict";
import test from "node:test";
import { INLAND_PALETTES, INLAND_REGIONS, INLAND_REGION_PALETTES } from "../features/career-world/layers/water/inland/palettes.ts";
import { INLAND_FALL_ENDPOINTS, INLAND_FALL_SEGMENTS } from "../features/career-world/layers/water/inland/falls.ts";
import fields from "../public/career-world/layers/water/fields-r1/manifest.json" with {type:"json"};
import { GORGE_FALL,gorgeFlight,gorgeSheetPoint } from "../features/career-world/layers/water/inland/gorge/model.ts";

test("every inland palette region resolves to registered land with bounded linear colors", () => {
  assert.deepEqual(new Set(INLAND_REGIONS.map(region => region.tileId)),new Set(Object.keys(INLAND_REGION_PALETTES)));
  for(const region of INLAND_REGIONS) {
    assert.ok(region.palette in INLAND_PALETTES);
    for(let axis=0;axis<2;axis++) {
      assert.ok(region.bounds.origin[axis]>=0);
      assert.ok(region.bounds.span[axis]>0);
      assert.ok(region.bounds.origin[axis]+region.bounds.span[axis]<=1);
    }
  }
  for(const palette of Object.values(INLAND_PALETTES))for(const color of Object.values(palette)) {
    assert.equal(color.length,3);
    assert.ok(color.every(channel=>Number.isFinite(channel)&&channel>=0&&channel<=1));
  }
});

test("fall impact positions follow the current mapped endpoints",()=>{
  const falls=fields.features.filter(feature=>feature.kind==="fall");
  assert.deepEqual(INLAND_FALL_ENDPOINTS.map(fall=>fall.id),falls.map(fall=>fall.id));
  for(const endpoint of INLAND_FALL_ENDPOINTS) {
    const source=falls.find(fall=>fall.id===endpoint.id);
    assert.deepEqual(endpoint.point,source.points.at(-1));
    assert.ok(endpoint.point.every(coordinate=>coordinate>=0&&coordinate<=1));
  }
});

test("fall texture distance is continuous through mapped segment joins",()=>{
  for(const fall of INLAND_FALL_ENDPOINTS){
    const segments=INLAND_FALL_SEGMENTS.filter(segment=>segment.fallId===fall.id);
    assert.equal(segments[0].arc,0);
    assert.ok(segments.at(-1).terminal);
    assert.ok(segments.slice(0,-1).every(segment=>!segment.terminal));
    for(let i=0;i<segments.length;i++){
      assert.ok(Number.isFinite(segments[i].length)&&segments[i].length>0);
      if(i){
        assert.deepEqual(segments[i-1].end,segments[i].start);
        assert.ok(Math.abs(segments[i].arc-segments[i-1].arc-segments[i-1].length)<1e-8);
      }
    }
  }
});

test("dedicated gorge sheet keeps its registered anchors and accelerates into the landing",()=>{
  const {duration}=gorgeFlight();
  assert.ok(Number.isFinite(duration)&&duration>0);
  const start=gorgeSheetPoint(0),end=gorgeSheetPoint(duration);
  for(let axis=0;axis<2;axis++){
    assert.ok(Math.abs(start[axis]-GORGE_FALL.lip[axis]*GORGE_FALL.world[axis])<1e-7);
    assert.ok(Math.abs(end[axis]-GORGE_FALL.foot[axis]*GORGE_FALL.world[axis])<1e-7);
  }
  let previousSpeed=0;
  for(let i=1;i<=12;i++){
    const a=gorgeSheetPoint(duration*(i-1)/12),b=gorgeSheetPoint(duration*i/12);
    const speed=(b[1]-a[1])/(duration/12);
    assert.ok(speed>previousSpeed);previousSpeed=speed;
  }
});
