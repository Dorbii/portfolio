import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';import sharp from 'sharp';
const dir='art-source/career-world/water/pond-bank-r9',registration=JSON.parse(await fs.readFile(dir+'/registration.json')),source=registration.source,chainFile=registration.chain,{crop}=registration;
const gen=await sharp(dir+'/quarantine/candidate-submerged-line.png').resize(crop.width,crop.height).ensureAlpha().raw().toBuffer(),combined=await sharp(dir+'/combined-crop.png').ensureAlpha().raw().toBuffer(),baseBefore=await fs.readFile(source),{data:base,info}=await sharp(baseBefore).ensureAlpha().raw().toBuffer({resolveWithObject:true}),chainBefore=await fs.readFile(chainFile),chain=await sharp(chainBefore).ensureAlpha().raw().toBuffer();
const N=crop.width,cyan=new Uint8Array(N*N),water=new Uint8Array(N*N),permission=Buffer.alloc(N*N);for(let i=0;i<cyan.length;i++){const p=i*4;cyan[i]=gen[p+1]>gen[p]+40&&gen[p+2]>gen[p]+40&&Math.min(gen[p+1],gen[p+2])>70?1:0;water[i]=cyan[i];}
// The cyan regions above and below the stone groove belong to one pond.
// Close only the crossing band; land-side portions remain land.
for(let x=0;x<N;x++){const center=Math.round(465+x*.22);let above=-1,below=-1;for(let d=5;d<75;d++){if(above<0&&center-d>=0&&cyan[(center-d)*N+x])above=center-d;if(below<0&&center+d<N&&cyan[(center+d)*N+x])below=center+d;}if(above>=0&&below>=0)for(let y=above;y<=below;y++)water[y*N+x]=1;}
let rgbChanges=0,alphaDown=0,alphaUp=0;const out=Buffer.from(base);
for(let y=0;y<N;y++)for(let x=0;x<N;x++){
 const i=y*N+x,p=i*4,d=Math.hypot((x-520)/290,(y-510)/285),t=Math.max(0,Math.min(1,(1-d)/.075)),weight=t*t*(3-2*t);permission[i]=Math.round(weight*255);if(!permission[i])continue;
 const o=((y+crop.top)*info.width+x+crop.left)*4,newA=water[i]?0:255,oldA=combined[p+3],alpha=oldA*(1-weight)+newA*weight;
 for(let k=0;k<3;k++)out[o+k]=alpha>0?Math.round((combined[p+k]*oldA*(1-weight)+gen[p+k]*newA*weight)/alpha):gen[p+k];out[o+3]=Math.round(alpha);
 const cx=x+crop.left-256,cy=y+crop.top-256;if(cx>=0&&cy>=0&&cx<2048&&cy<2048)chain[(cy*2048+cx)*4+3]=0;
}
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const p=(y*info.width+x)*4;const changed=out[p]!==base[p]||out[p+1]!==base[p+1]||out[p+2]!==base[p+2]||out[p+3]!==base[p+3];if(!changed)continue;const lx=x-crop.left,ly=y-crop.top;if(lx<0||ly<0||lx>=N||ly>=N||!permission[ly*N+lx])throw new Error('Pond patch escaped its permission mask');rgbChanges+=Number(out[p]!==base[p]||out[p+1]!==base[p+1]||out[p+2]!==base[p+2]);alphaDown+=Number(out[p+3]<base[p+3]);alphaUp+=Number(out[p+3]>base[p+3]);}
if(!(await fs.stat(dir+'/source-before.png').catch(()=>null)))await fs.writeFile(dir+'/source-before.png',baseBefore);if(!(await fs.stat(dir+'/chain-before.png').catch(()=>null)))await fs.writeFile(dir+'/chain-before.png',chainBefore);await sharp(out,{raw:{width:info.width,height:info.height,channels:4}}).png().toFile(source);await sharp(chain,{raw:{width:2048,height:2048,channels:4}}).png().toFile(chainFile);
const waterFile=source.replace('-l2.png','-water.png'),originalWater=await fs.readFile(waterFile),waterData=await sharp(originalWater).ensureAlpha().raw().toBuffer();if(!(await fs.stat(dir+'/water-before.png').catch(()=>null)))await fs.writeFile(dir+'/water-before.png',originalWater);for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=y*N+x;if(!permission[i])continue;const p=((y+crop.top)*info.width+x+crop.left)*4,v=255-out[p+3];waterData[p]=waterData[p+1]=waterData[p+2]=v;waterData[p+3]=255;}await sharp(waterData,{raw:{width:info.width,height:info.height,channels:4}}).png().toFile(waterFile);
await sharp(permission,{raw:{width:N,height:N,channels:1}}).png().toFile(dir+'/permission-mask.png');await sharp(water,{raw:{width:N,height:N,channels:1}}).linear(255,0).png().toFile(dir+'/water-mask.png');
execFileSync(process.execPath,['scripts/build-submerged-groove.mjs'],{stdio:'pipe',maxBuffer:16*1024*1024,windowsHide:true});
const bed=JSON.parse(await fs.readFile('public/career-world/layers/water/inland/submerged-groove-r9.json'));
const previous=await fs.readFile(dir+'/verification.json','utf8').then(JSON.parse).catch(()=>null);
const proof=previous??{source,chain:chainFile,crop,rgbChangedPixels:rgbChanges,alphaDecreasedPixels:alphaDown,alphaIncreasedPixels:alphaUp,changesOutsidePermissionMask:0};
proof.featureRectangle=bed.sourceCrop;proof.featureRectangleSpace='kept-cell-pixels';proof.featureFromCanonicalRoute=true;
await fs.writeFile(dir+'/verification.json',JSON.stringify(proof,null,2));
console.log({rgbChanges,alphaDown,alphaUp,feature:bed.sourceCrop});
