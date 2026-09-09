import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { crownMask, crownComponents, dilate } from "./crown-mask.mjs";
const root=path.resolve(import.meta.dirname,"../../..");
const out=path.join(root,".codex-tmp/qa/original-pine-branches");
fs.mkdirSync(out,{recursive:true});
const spec=JSON.parse(fs.readFileSync(path.join(import.meta.dirname,"original-pine-branches.json"),"utf8"));
const [left,top,W,H]=spec.crop;
const full=await sharp(path.join(root,spec.source)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const source=Buffer.alloc(W*H*4);
for(let y=0;y<H;y++)full.data.copy(source,y*W*4,((top+y)*full.info.width+left)*4,((top+y)*full.info.width+left+W)*4);
const raw={width:W,height:H,channels:4};
await sharp(source,{raw}).png().toFile(path.join(out,"original.png"));
const inside=(x,y,poly)=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
const closed=crownMask(full.data,full.info.width);
const {comps}=crownComponents(closed,full.info.width);
const crown=comps.find(c=>c&&c.footX===208&&c.footY===879);
if(!crown)throw new Error("Reviewed source pine no longer resolves.");
const one=new Uint8Array(closed.length);for(const p of crown.members)one[p]=1;
// The hand contours own branch identity. A narrow expansion of the source
// crown keeps the painted lip/edge pixels while avoiding surrounding ground.
const silhouette=dilate(one,full.info.width,2);
const owner=new Int16Array(W*H).fill(-1),trunk=new Uint8Array(W*H);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const p=y*W+x;trunk[p]=inside(x+.5,y+.5,spec.trunk)?1:0;
 if(trunk[p]||!silhouette[(top+y)*full.info.width+left+x])continue;
 for(let i=0;i<spec.branches.length;i++)if(inside(x+.5,y+.5,spec.branches[i].polygon))owner[p]=i;
}
// The original sprite tool already authored a ground patch under this tree.
const authority=path.join(root,"public/career-world/layers/terrain/authority/tiles/l2-tanium");
const old=JSON.parse(fs.readFileSync(path.join(authority,"c3-1-trees.json"),"utf8"));
const oldTree=old.trees.find(t=>t.foot[0]===208&&t.foot[1]===879);
if(!oldTree)throw new Error("Original pine ground-patch registration is missing.");
const atlas=await sharp(path.join(authority,"c3-1-trees.webp")).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const ground=Buffer.from(source);
for(let y=0;y<oldTree.box[3];y++)for(let x=0;x<oldTree.box[2];x++){
 const tx=oldTree.box[0]-left+x,ty=oldTree.box[1]-top+y;if(tx<0||ty<0||tx>=W||ty>=H)continue;
 const from=((oldTree.patch[1]+y)*atlas.info.width+oldTree.patch[0]+x)*4,to=(ty*W+tx)*4,a=atlas.data[from+3]/255;
 for(let k=0;k<3;k++)ground[to+k]=Math.round(atlas.data[from+k]*a+ground[to+k]*(1-a));
}
// Exclude the cut's fringe from canopy donors so its edge is not mirrored
// back into the hole. Every donor remains an existing source pixel.
const nearCut=new Uint8Array(W*H);
for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(owner[y*W+x]>=0)for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<W&&yy<H)nearCut[yy*W+xx]=1;}
const donors=[];
for(let y=75;y<190;y++)for(let x=80;x<136;x++){const p=y*W+x;if(!trunk[p]&&!nearCut[p]&&one[(top+y)*full.info.width+left+x]&&inside(x,y,spec.canopyBody))donors.push([x,y,p]);}
if(!donors.length)throw new Error("No uncut original-canopy pixels available for hidden fill.");
const base=Buffer.from(source),front=Buffer.alloc(source.length),layers=spec.branches.map(()=>Buffer.alloc(source.length));
let canopyFill=0,groundFill=0;
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const p=y*W+x,o=p*4;
 if(trunk[p])source.copy(front,o,o,o+4);
 if(owner[p]<0)continue;
 source.copy(layers[owner[p]],o,o,o+4);layers[owner[p]][o+3]=255;
 if(inside(x+.5,y+.5,spec.canopyBody)){
  let best=null,distance=Infinity;
  for(const donor of donors){const d=(x-donor[0])**2+(y-donor[1])**2;if(d<distance){best=donor;distance=d;}}
  source.copy(base,o,best[2]*4,best[2]*4+3);canopyFill++;
 }else{ground.copy(base,o,o,o+3);groundFill++;}
}
await sharp(base,{raw}).png().toFile(path.join(out,"underpainting.png"));
await sharp(front,{raw}).png().toFile(path.join(out,"trunk-front.png"));
const branches=[];
for(let i=0;i<layers.length;i++){
 const layer=layers[i];let minX=W,minY=H,maxX=-1,maxY=-1,count=0;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(layer[(y*W+x)*4+3]){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);count++;}
 if(!count)throw new Error("A hand-selected branch is empty.");
 const box=[Math.max(0,minX-2),Math.max(0,minY-2),Math.min(W,maxX+3),Math.min(H,maxY+3)];
 const file=spec.branches[i].id+".png";
 await sharp(layer,{raw}).extract({left:box[0],top:box[1],width:box[2]-box[0],height:box[3]-box[1]}).png().toFile(path.join(out,file));
 branches.push({...spec.branches[i],file,origin:box.slice(0,2),size:[box[2]-box[0],box[3]-box[1]],pixels:count});
}
// Reassemble the actual layer data, rather than substituting the original
// when the angle is zero. Every visible branch byte must come from source.
const restored=Buffer.from(base);let sourceChanges=0,outsideChanges=0;
for(const layer of layers)for(let p=0;p<W*H;p++)if(layer[p*4+3]){for(let k=0;k<4;k++){if(layer[p*4+k]!==source[p*4+k])sourceChanges++;restored[p*4+k]=layer[p*4+k];}}
for(let p=0;p<W*H;p++){if(front[p*4+3])front.copy(restored,p*4,p*4,p*4+4);if(owner[p]<0)for(let k=0;k<4;k++)outsideChanges+=base[p*4+k]!==source[p*4+k]?1:0;}
let restDifferences=0;for(let i=0;i<source.length;i++)restDifferences+=source[i]!==restored[i]?1:0;
if(restDifferences||sourceChanges||outsideChanges)throw new Error("Original-art preservation check failed.");
const manifest={source:spec.source,crop:spec.crop,size:[W,H],branches,proof:{restDifferences,sourceChanges,outsideChanges,canopyFill,groundFill,selectedPixels:canopyFill+groundFill,donorPixels:donors.length}};
fs.writeFileSync(path.join(out,"branches.json"),JSON.stringify(manifest,null,2));
fs.copyFileSync(path.join(import.meta.dirname,"original-pine-branches.html"),path.join(out,"index.html"));
console.log(JSON.stringify(manifest.proof));
