// Large breakers deform the same material as the surrounding sea. No separate
// sheet, rectangular alpha patch, or competing ocean color is composited here.
export const EVENT_SURFACE = /* glsl */ `
uniform int uEventCount;
uniform vec4 uEventSites[8];
uniform vec4 uEventMotion[8];
uniform vec2 uEventStyle[8];
void largeWaveSurface(vec2 p,out vec2 slope,out float height,out float foam) {
  slope=vec2(0);height=0.0;foam=0.0;
  for(int i=0;i<8;i++) {
    if(i>=uEventCount) break;
    vec4 site=uEventSites[i], motion=uEventMotion[i];
    vec2 direction=motion.xy,tangent=vec2(-direction.y,direction.x);
    float age=motion.z,impact=motion.w,strength=uEventStyle[i].x;
    vec2 center=site.xy+direction*(age-4.0)*2.5*(1.0-impact);
    vec2 q=p-center;
    float halfLength=site.z*0.5;
    float along=dot(q,tangent)/halfLength;
    float across=dot(q,direction)+along*along*3.0;
    if(abs(along)>1.4||abs(across)>35.0) continue;
    float ends=exp(-pow(along*1.5,4.0));
    float life=smoothstep(0.0,1.8,age)*(1.0-smoothstep(4.3,7.5,age));
    float curl=smoothstep(1.5,3.8,age);
    float width=across>0.0?mix(5.0,1.7,curl):9.0;
    float h=site.w*life*ends*exp(-across*across/(width*width))*strength*(1.0-impact);
    float derivative=-2.0*across/(width*width)*h;
    slope+=direction*derivative+tangent*(derivative*6.0*along/halfLength-h*20.25*along*along*along/halfLength);
    height+=h;
    float breaking=smoothstep(1.7,3.0,age)*(1.0-smoothstep(4.4,7.0,age));
    float crest=exp(-pow((across-0.5)/1.4,2.0))*ends*breaking*(1.0-impact);
    float wakeAge=max(0.0,age-mix(3.4,0.4,impact));
    // Foam disperses behind the crest and loses density as it widens. The old
    // symmetric, linearly expanding high-frequency patch read as a texture trail.
    float wakeWidth=2.2+sqrt(wakeAge)*1.4;
    float behind=across+wakeAge*1.7*(1.0-impact);
    float wake=exp(-pow(behind/wakeWidth,2.0)-pow(along*1.5,4.0));
    wake*=smoothstep(0.0,0.55,wakeAge)*exp(-wakeAge*0.9)*(2.2/wakeWidth);
    vec2 foamPosition=p-direction*age*0.30;
    float cells=noise2(foamPosition*0.32+noise2(foamPosition*0.09)*1.7);
    float breakup=smoothstep(0.24,0.70,cells);
    float fine=mix(0.82,1.0,noise2(foamPosition*1.1));
    foam=max(foam,(crest*0.88+wake*0.46)*breakup*fine*strength);
  }
}
`;
