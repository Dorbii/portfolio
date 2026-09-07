import { INLAND_FALL_PROFILE_SAMPLES } from '../../features/career-world/layers/water/inland/profile.ts';

// Trace a descending channel close to its declared anchors. The source alpha,
// rather than a free-flight arc, determines where a mapped fall may run.
export function traceInlandFall(rgba,width,height,fall){
  const count=INLAND_FALL_PROFILE_SAMPLES,lipIndex=6,step=2;
  const pixel=p=>[p[0]*width,p[1]*height];
  const a=pixel(fall.upstream),b=pixel(fall.lip),c=pixel(fall.foot);
  if(!(a[1]<b[1]&&b[1]<c[1]))throw new Error(`Fall anchors must descend: ${fall.id}`);
  const radius=Math.max(32,fall.radius*width*1.5);
  const left=Math.max(0,Math.floor((Math.min(a[0],b[0],c[0])-radius)/step)*step);
  const right=Math.min(width-1,Math.ceil(Math.max(a[0],b[0],c[0])+radius));
  const columns=Math.floor((right-left)/step)+1;
  const guide=Array.from({length:count},(_,i)=>{
    const t=i<=lipIndex?i/lipIndex:(i-lipIndex)/(count-1-lipIndex),from=i<=lipIndex?a:b,to=i<=lipIndex?b:c;
    return [from[0]+(to[0]-from[0])*t,from[1]+(to[1]-from[1])*t];
  });
  const wet=(x,y)=>{const ix=Math.round(x),iy=Math.round(y);return ix>=0&&iy>=0&&ix<width&&iy<height&&rgba[(iy*width+ix)*4+3]<128;};
  const parents=new Int32Array(count*columns).fill(-1);
  let previous=new Float64Array(columns).fill(Infinity);
  for(let row=0;row<count;row++){
    const [gx,gy]=guide[row],current=new Float64Array(columns).fill(Infinity);
    const expectedStep=row?gx-guide[row-1][0]:0,dy=row?gy-guide[row-1][1]:1;
    const reach=Math.max(8,Math.ceil((Math.abs(expectedStep)+Math.abs(dy)*1.5+8)/step));
    for(let column=0;column<columns;column++){
      const x=left+column*step;
      if(Math.abs(x-gx)>radius)continue;
      let bank=0;
      if(wet(x,gy))for(let d=1;d<=24;d++){if(!wet(x-d,gy)||!wet(x+d,gy))break;bank=d;}
      const local=(wet(x,gy)?1/(1+bank):40)+((x-gx)/radius)**2*(row===0||row===lipIndex||row===count-1?3:.35);
      if(!row){current[column]=local;continue;}
      for(let k=Math.max(0,column-reach);k<=Math.min(columns-1,column+reach);k++){
        const delta=(column-k)*step-expectedStep;
        const cost=previous[k]+local+.12*delta*delta/(dy*dy+16);
        if(cost<current[column]){current[column]=cost;parents[row*columns+column]=k;}
      }
    }
    previous=current;
  }
  let best=0;for(let k=1;k<columns;k++)if(previous[k]<previous[best])best=k;
  if(!Number.isFinite(previous[best]))throw new Error(`No bounded fall trace: ${fall.id}`);
  const points=Array(count);
  for(let row=count-1;row>=0;row--){points[row]=[left+best*step,guide[row][1]];if(row)best=parents[row*columns+best];}
  const maxHalf=Math.max(6,fall.radius*width*1.15);
  const halfWidths=points.map((point,i)=>{
    if(!wet(...point))return 0;
    const start=points[Math.max(0,i-1)],end=points[Math.min(count-1,i+1)];
    const dx=end[0]-start[0],dy=end[1]-start[1],length=Math.hypot(dx,dy)||1,n=[-dy/length,dx/length];
    const sides=[-1,1].map(sign=>{let distance=0;for(let d=1;d<=maxHalf;d++){if(!wet(point[0]+n[0]*d*sign,point[1]+n[1]*d*sign))break;distance=d;}return distance;});
    return Math.min(...sides)*.86;
  });
  return {points:points.map(p=>[p[0]/width,p[1]/height]),halfWidths:halfWidths.map(n=>n/width),lipIndex,
    opaqueSamples:points.filter(p=>!wet(...p)).length,
    maximumAdjustmentPixels:Math.max(...points.map((p,i)=>Math.abs(p[0]-guide[i][0])))};
}
