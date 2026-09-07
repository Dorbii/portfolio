// Small world-space shoals, reef fish, ribbon fish and gliding rays. All enter
// the existing submerged material; unresolved animals fade instead of growing.
export const AQUATIC_LIFE = /* glsl */ `
uniform float uAquaticLife;
float lifeOval(vec2 q,vec2 radii,float aa) {
  float d=length(q/radii)-1.0;
  return 1.0-smoothstep(-aa/radii.y,aa/radii.y,d);
}
vec4 aquaticLife(vec2 p,float time,float depth) {
  // These animals swim near the surface; deep seabed does not exclude them.
  if(uAquaticLife<0.5||depth<1.0||uPixelMetres>0.9)return vec4(0);
  float alpha=0.0; vec3 color=vec3(0.025,0.065,0.07);
  vec2 cell=floor(p/19.0);
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++) {
    vec2 id=cell+vec2(float(x),float(y));
    float seed=hash21(id+vec2(71.0,13.0));
    if(seed<0.20)continue;
    float species=hash21(id+vec2(8.3,41.9));
    float rate=mix(0.025,0.145,hash21(id+9.7));
    float dart=species<0.40?0.90:0.22;
    // Integral of a positive varying speed: smooth bursts with no phase reset.
    float beat=time*0.85+seed*TAU;
    float angle=rate*(time+dart*sin(beat)/0.85)+seed*TAU;
    vec2 orbit=species>0.90?vec2(6.7,4.3):vec2(5.2,3.4);
    vec2 center=(id+0.5)*19.0+vec2(cos(angle),sin(angle))*orbit;
    vec2 delta=p-center;
    if(dot(delta,delta)>42.0)continue;
    vec2 forward=normalize(vec2(-sin(angle)*orbit.x,cos(angle)*orbit.y));
    vec2 side=vec2(-forward.y,forward.x);
    vec2 q=vec2(dot(delta,forward),dot(delta,side));
    float aa=max(0.012,uPixelMetres*0.55);
    if(species>0.90) {
      float size=mix(0.58,0.94,seed);
      float flap=0.83+0.17*sin(time*(1.3+seed)+seed*25.0);
      float body=pow(abs(q.x)/(size*0.65),1.25)+pow(abs(q.y)/(size*flap),1.25);
      float ray=1.0-smoothstep(0.85-aa/size,1.0+aa/size,body);
      float tail=(1.0-smoothstep(0.025,0.025+aa,abs(q.y-0.06*sin(q.x*5.0+time*1.6))))
        *smoothstep(-size*1.9,-size*1.6,q.x)*(1.0-smoothstep(-size*0.6,-size*0.35,q.x));
      float coverage=max(ray,tail)*0.88*smoothstep(0.8,2.5,size/uPixelMetres);
      if(coverage>alpha) {
        alpha=coverage;
        float spots=pow(max(0.0,sin(q.x*31.0)*sin(q.y*27.0)),5.0);
        color=mix(vec3(0.045,0.11,0.14),vec3(0.33,0.70,0.65),exp(-abs(q.y)*5.0)*0.5+spots*0.45);
      }
    } else {
      for(int i=0;i<10;i++) {
        float f=float(i),individual=hash21(id+vec2(f*4.7,31.0));
        if(species>0.70&&i>1)break;
        float lengthMetres=mix(0.26,0.72,individual*individual);
        float halfBody=lengthMetres*0.38;
        float girth=lengthMetres*(species<0.40?0.11:species<0.70?0.22:0.08);
        if(species>0.70)halfBody*=1.8;
        float visible=smoothstep(0.5,1.5,lengthMetres/uPixelMetres);
        if(visible<0.01)continue;
        float stroke=time*(3.2+rate*35.0+individual*2.0)+f*1.7;
        vec2 offset=vec2((f-4.5)*0.62,sin(f*4.7+seed)*0.85);
        offset+=vec2(sin(time*(0.5+individual)+f)*0.16,cos(time*0.8+f)*0.12);
        vec2 fish=q-offset;
        if(abs(fish.x)>halfBody*2.0+aa||abs(fish.y)>girth*2.5+aa)continue;
        float bend=sin(stroke-fish.x/halfBody*2.0)*girth*0.45*(1.0-smoothstep(-halfBody,halfBody,fish.x));
        fish.y-=bend;
        float silhouette=lifeOval(fish,vec2(halfBody,girth),aa);
        float tailX=fish.x+halfBody*1.35;
        float tailWidth=girth*1.15*(1.0-clamp((tailX+halfBody*0.35)/(halfBody*0.7),0.0,1.0));
        float tail=(1.0-smoothstep(tailWidth,tailWidth+aa,abs(fish.y)))
          *(1.0-smoothstep(halfBody*0.33,halfBody*0.33+aa,abs(tailX)));
        float fins=lifeOval(fish-vec2(-halfBody*0.2,0),vec2(halfBody*0.25,girth*1.75),aa)*0.6;
        float coverage=max(max(silhouette,tail),fins)*0.9*visible;
        if(coverage>alpha) {
          alpha=coverage;
          vec3 flank=species<0.40?vec3(0.64,0.82,0.74):species<0.70?vec3(0.67,0.43,0.86):vec3(0.30,0.78,0.58);
          float stripeDetail=smoothstep(3.0,7.0,lengthMetres/uPixelMetres);
          float stripe=species>0.40&&species<0.70?mix(0.75,0.5+0.5*sin(fish.x/halfBody*9.0),stripeDetail):1.0;
          color=mix(vec3(0.025,0.055,0.085),flank,smoothstep(-girth,girth,fish.y)*mix(0.55,1.0,stripe));
        }
      }
    }
  }
  return vec4(color,alpha);
}
`;
