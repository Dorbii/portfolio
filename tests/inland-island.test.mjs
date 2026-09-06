import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
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

test('deferred inland annotations retain their source and never enter active fields or fall draws',()=>{
  const activeIds=new Set(fields.features.map(f=>f.id));
  const fallIds=new Set(atlas.falls.map(f=>f.id));
  const pendingIds=new Set();
  for(const cell of inventory.cells){
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
    for(let axis=0;axis<2;axis++){
      assert.ok(fall.atlas[axis]>=0&&fall.atlas[axis]+fall.atlas[axis+2]<=1);
      for(const point of [fall.lip,fall.foot,fall.upstream]){
        const local=(point[axis]-fall.context.origin[axis])/fall.context.span[axis];
        assert.ok(local>=-1e-6&&local<=1.000001);
      }
    }
  }
});
