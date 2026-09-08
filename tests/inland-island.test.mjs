import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import {INLAND_FALL_PROFILE_SAMPLES} from '../features/career-world/layers/water/inland/profile.ts';
const read=async path=>JSON.parse(await fs.readFile(path));
const inventory=await read('art-source/career-world/water/inland-island-r1.json');
const legacy=await read('art-source/career-world/water/flow-features-r1.json');
const fields=await read('public/career-world/layers/water/fields-r1/manifest.json');
const terrain=await read(fields.source);
const atlas=await read('public/career-world/layers/water/inland/mapped-falls-r1.json');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

test('inland inventory covers every mounted cell and every declared water feature is built',async()=>{
  assert.equal(inventory.cells.length,terrain.tiles.length);
  assert.deepEqual(new Set(inventory.cells.map(c=>c.tileId)),new Set(terrain.tiles.map(t=>t.id)));
  const expected=[];
  for(const cell of inventory.cells){
    assert.equal(hash(await fs.readFile(cell.source)),cell.sha256);
    expected.push(...cell.streams,...cell.pools,...cell.falls);
  }
  expected.push(...legacy.cells.flatMap(c=>c.features));
  assert.equal(new Set(expected.map(f=>f.id)).size,expected.length);
  assert.deepEqual(new Set(fields.features.map(f=>f.id)),new Set(expected.map(f=>f.id)));
  assert.ok(fields.features.every(f=>f.waterPixels>0));
});

test('deferred and retired inland annotations retain provenance and never enter active fields or fall draws',()=>{
  const activeIds=new Set(fields.features.map(f=>f.id));
  const fallIds=new Set(atlas.falls.map(f=>f.id));
  const pendingIds=new Set();
  for(const cell of inventory.cells){
    for(const retired of cell.retiredFeatures??[]){
      assert.ok(retired.reason&&retired.previousSource&&retired.previousSha256);
      assert.ok(!activeIds.has(retired.feature.id),'retired feature entered active fields');
      assert.ok(!fallIds.has(retired.feature.id),'retired feature entered fall atlas');
    }
    const pending=cell.pendingReview;
    if(!pending)continue;
    assert.ok(pending.previousSource&&pending.previousSha256&&pending.reason);
    for(const feature of [...pending.streams,...pending.pools,...pending.falls]){
      assert.ok(!pendingIds.has(feature.id),'duplicate deferred feature');
      assert.ok(!activeIds.has(feature.id),'deferred feature entered active fields');
      assert.ok(!fallIds.has(feature.id),'deferred feature entered fall atlas');
      pendingIds.add(feature.id);
    }
  }
});

test('mapped falls share a current atlas with bounded context coordinates and descending trajectories',async()=>{
  assert.equal(atlas.fieldInputHash,fields.inputHash);
  assert.equal(atlas.generatorHash,hash(await fs.readFile('scripts/build-inland-fall-atlas.mjs')));
  const expected=fields.features.filter(f=>f.kind==='fall'&&f.sourcePath);
  assert.deepEqual(new Set(atlas.falls.map(f=>f.id)),new Set(expected.map(f=>f.id)));
  const bytes=await fs.readFile('public'+atlas.texture.path),meta=await sharp(bytes).metadata();
  assert.equal(hash(bytes),atlas.texture.sha256);
  assert.deepEqual([meta.width,meta.height],atlas.texture.dimensions);
  for(const fall of atlas.falls){
    assert.ok(fall.flight[0]>0&&Number.isFinite(fall.flight[1]));
    assert.ok(fall.widthScale>0&&fall.effectScale>0);
    assert.ok(fall.edgeDirection.every(Number.isFinite));
    assert.ok(fall.style==="cascade"||fall.style==="curtain");
    assert.ok(Math.abs(Math.hypot(...fall.edgeDirection)-1)<1e-8);
    assert.ok(fall.landingAdjustmentPixels>=0);
    assert.equal(fall.profile.length,INLAND_FALL_PROFILE_SAMPLES*4);
    for(let i=0;i<fall.profile.length;i+=4){
      assert.ok(fall.profile.slice(i,i+4).every(Number.isFinite));
      assert.ok(fall.profile[i+2]>=0);
      if(i)assert.ok(fall.profile[i+1]>fall.profile[i-3]);
    }
    for(let axis=0;axis<2;axis++){
      assert.ok(fall.atlas[axis]>=0&&fall.atlas[axis]+fall.atlas[axis+2]<=1);
      for(const point of [fall.lip,fall.foot,fall.upstream]){
        const local=(point[axis]-fall.context.origin[axis])/fall.context.span[axis];
        assert.ok(local>=-1e-6&&local<=1.000001);
      }
    }
  }
});

test('the submerged stone groove has bounded registration and a transparent texture border',async()=>{
  const feature=await read('public/career-world/layers/water/inland/submerged-groove-r9.json');
  const tile=terrain.tiles.find(tile=>tile.id===feature.tileId);
  assert.ok(tile);
  for(let axis=0;axis<2;axis++){
    assert.ok(feature.span[axis]>0);
    assert.ok(feature.origin[axis]>=tile.worldBounds.origin[axis]);
    assert.ok(feature.origin[axis]+feature.span[axis]<=tile.worldBounds.origin[axis]+tile.worldBounds.span[axis]);
  }
  const bytes=await fs.readFile('public'+feature.texture.path);
  assert.equal(hash(bytes),feature.texture.sha256);
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.deepEqual([info.width,info.height],feature.texture.dimensions);
  let coverage=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const alpha=data[(y*info.width+x)*4+3];coverage+=alpha;
    if(x===0||y===0||x===info.width-1||y===info.height-1)assert.equal(alpha,0);
  }
  assert.ok(coverage>0);
  const canonical=await sharp(feature.source).ensureAlpha().raw().toBuffer();
  const land=await sharp(feature.landSource).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const permission=await sharp(feature.permissionMask).toColourspace('b-w').raw().toBuffer();
  let verified=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const sx=feature.sourceCrop.left+x,sy=feature.sourceCrop.top+y,c=(sy*2048+sx)*4;
    const lp=((sy+256)*land.info.width+sx+256)*4;
    const px=sx+256-feature.permissionCrop.left,py=sy+256-feature.permissionCrop.top;
    if(canonical[c+3]>128&&land.data[lp+3]===0&&permission[py*feature.permissionCrop.width+px]===255){
      assert.equal(data[(y*info.width+x)*4+3],canonical[c+3]);verified++;
    }
  }
  assert.ok(verified>0,'canonical submerged route coverage was lost');
});
