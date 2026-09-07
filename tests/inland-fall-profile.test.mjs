import assert from 'node:assert/strict';
import test from 'node:test';
import {traceInlandFall} from '../scripts/lib/inland-fall-profile.mjs';

test('mapped fall profiles follow a curved opening without changing source pixels',()=>{
  const width=180,height=220,rgba=new Uint8Array(width*height*4);
  const center=y=>80+26*Math.sin(y/height*Math.PI);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)rgba[(y*width+x)*4+3]=Math.abs(x-center(y))<11?0:255;
  const before=rgba.slice();
  const fall={id:'curved',upstream:[.45,.08],lip:[.49,.20],foot:[.50,.90],radius:.19};
  const result=traceInlandFall(rgba,width,height,fall);
  assert.equal(result.opaqueSamples,0);
  assert.deepEqual(rgba,before);
  assert.ok(result.points.length>2);
  assert.equal(result.halfWidths.length,result.points.length);
  for(let i=0;i<result.points.length;i++){
    const [x,y]=result.points[i];
    assert.ok(Math.abs(x*width-center(y*height))<11);
    assert.ok(result.halfWidths[i]>=0&&result.halfWidths[i]<11/width);
    if(i)assert.ok(y>result.points[i-1][1]);
  }
});

test('a completely opaque channel is reported rather than treated as open water',()=>{
  const width=80,height=100,rgba=new Uint8Array(width*height*4).fill(255);
  const result=traceInlandFall(rgba,width,height,{id:'closed',upstream:[.5,.1],lip:[.5,.3],foot:[.5,.85],radius:.1});
  assert.equal(result.opaqueSamples,result.points.length);
  assert.ok(result.halfWidths.every(n=>n===0));
});

test('non-descending anchors fail before producing a misleading profile',()=>{
  assert.throws(()=>traceInlandFall(new Uint8Array(80*100*4),80,100,{id:'reversed',upstream:[.5,.3],lip:[.5,.2],foot:[.5,.1],radius:.1}),/must descend/);
});
