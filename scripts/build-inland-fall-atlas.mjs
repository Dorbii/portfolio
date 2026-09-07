import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';

const fields=JSON.parse(await fs.readFile('public/career-world/layers/water/fields-r1/manifest.json'));
const terrain=JSON.parse(await fs.readFile(fields.source));
const falls=fields.features.filter(f=>f.kind==='fall'&&f.sourcePath);
const width=2048,height=Math.ceil(falls.length/8)*512,overlays=[],entries=[];
const world=fields.worldSize.map(n=>n*fields.metresPerWorldUnit);
for(const [index,fall] of falls.entries()){
  const tile=terrain.tiles.find(t=>t.id===fall.tileId),source='public'+fall.sourcePath;
  const bytes=await fs.readFile(source),sourceHash=crypto.createHash('sha256').update(bytes).digest('hex');
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const local=p=>p.map((n,a)=>(n-tile.worldBounds.origin[a])/tile.worldBounds.span[a]);
  const lip=local(fall.points[0]),foot=local(fall.points.at(-1)),upstream=local(fall.upstream);
  const points=[...fall.profile.points.map(local),lip,foot,upstream];
  const left=Math.max(0,Math.floor((Math.min(...points.map(p=>p[0]))-.095)*info.width));
  const top=Math.max(0,Math.floor((Math.min(...points.map(p=>p[1]))-.07)*info.height));
  const right=Math.min(info.width,Math.ceil((Math.max(...points.map(p=>p[0]))+.095)*info.width));
  const bottom=Math.min(info.height,Math.ceil((Math.max(...points.map(p=>p[1]))+.08)*info.height));
  const widths=[];
  for(const t of [.2,.5,.8]){
    const row=Math.round((lip[1]+(foot[1]-lip[1])*t)*(info.height-1));
    const expected=Math.round((lip[0]+(foot[0]-lip[0])*t)*(info.width-1));
    let center=-1;
    for(let d=0;d<80&&center<0;d++)for(const x of [expected-d,expected+d])
      if(x>=0&&x<info.width&&data[(row*info.width+x)*4+3]<128){center=x;break;}
    if(center<0)continue;
    let a=center,b=center;
    while(a>0&&center-a<120&&data[(row*info.width+a-1)*4+3]<128)a--;
    while(b+1<info.width&&b-center<120&&data[(row*info.width+b+1)*4+3]<128)b++;
    widths.push((b-a+1)/info.width*tile.worldBounds.span[0]*world[0]);
  }
  widths.sort((a,b)=>a-b);
  const widthMetres=widths.length?widths[Math.floor(widths.length/2)]:fall.widthMetres;
  const lipWorld=fall.points[0],footWorld=fall.points.at(-1);
  const drop=(footWorld[1]-lipWorld[1])*world[1];
  if(drop<=0)throw new Error(`Non-descending mapped fall: ${fall.id}`);
  const duration=(Math.sqrt(1.5**2+2*9.81*.86*drop)-1.5)/(9.81*.86);
  const profilePoints=fall.profile.points.map(p=>p.map((n,a)=>n*world[a]));
  const arcs=[0];for(let i=1;i<profilePoints.length;i++)arcs.push(arcs.at(-1)+Math.hypot(...profilePoints[i].map((n,a)=>n-profilePoints[i-1][a])));
  const profile=profilePoints.flatMap((point,i)=>{
    const age=i<fall.profile.lipIndex?-(arcs[fall.profile.lipIndex]-arcs[i])/1.5
      :(Math.sqrt(1.5**2+2*9.81*.86*Math.max(0,point[1]-lipWorld[1]*world[1]))-1.5)/(9.81*.86);
    return [...point,fall.profile.halfWidths[i],age];
  });
  const context={origin:[tile.worldBounds.origin[0]+left/info.width*tile.worldBounds.span[0],tile.worldBounds.origin[1]+top/info.height*tile.worldBounds.span[1]],
    span:[(right-left)/info.width*tile.worldBounds.span[0],(bottom-top)/info.height*tile.worldBounds.span[1]]};
  const x=(index%8)*256+2,y=Math.floor(index/8)*512+2;
  overlays.push({input:await sharp(bytes).extract({left,top,width:right-left,height:bottom-top}).resize(252,508,{fit:'fill'}).png().toBuffer(),left:x,top:y});
  entries.push({id:fall.id,tileId:fall.tileId,source,sourceHash,lip:lipWorld,foot:footWorld,upstream:fall.upstream,hasLanding:fall.hasLanding!==false,
    context,atlas:[x/width,y/height,252/width,508/height],profile,
    profileLipIndex:fall.profile.lipIndex,opaqueProfileSamples:fall.profile.opaqueSamples,
    backingOffset:fall.backingOffset.map((n,a)=>n*tile.worldBounds.span[a]/context.span[a]),
    flight:[duration,(footWorld[0]-lipWorld[0])*world[0]/duration],
    widthScale:Math.max(.12,Math.min(1.25,widthMetres/3.2)),
    effectScale:Math.max(.20,Math.min(1.0,Math.sqrt(drop/24)*Math.pow(Math.max(.15,widthMetres/3.2),.25)))});
}
const output='public/career-world/layers/water/inland';await fs.mkdir(output,{recursive:true});
const image=await sharp({create:{width,height,channels:4,background:'#00000000'}}).composite(overlays).webp({lossless:true}).toBuffer();
const imageHash=crypto.createHash('sha256').update(image).digest('hex');
const imageName=`fall-context-${imageHash.slice(0,16)}.webp`;
await fs.writeFile(output+'/'+imageName,image);
await fs.writeFile(output+'/mapped-falls-r1.json',JSON.stringify({version:1,fieldInputHash:fields.inputHash,world,
  generatorHash:crypto.createHash('sha256').update(await fs.readFile(new URL(import.meta.url))).digest('hex'),
  texture:{path:'/career-world/layers/water/inland/'+imageName,dimensions:[width,height],sha256:imageHash},falls:entries},null,2)+'\n');
console.log(JSON.stringify({falls:entries.length,dimensions:[width,height],bytes:image.length}));
