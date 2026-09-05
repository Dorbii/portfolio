// Bounded world-space schools and rays. Their silhouettes enter the submerged
// material before refraction, attenuation, reflections and foam are applied.
export const AQUATIC_LIFE = /* glsl */ `
uniform float uAquaticLife;
vec4 aquaticLife(vec2 p,float time,float depth) {
  if(uAquaticLife<0.5||depth<1.4||depth>22.0)return vec4(0);
  float alpha=0.0; vec3 color=vec3(0.025,0.065,0.07);
  vec2 cell=floor(p/36.0);
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++) {
    vec2 id=cell+vec2(float(x),float(y));
    float seed=hash21(id+vec2(71.0,13.0));
    if(seed<0.72)continue;
    float angle=time*(0.075+seed*0.035)+seed*TAU;
    vec2 center=(id+0.5)*36.0+vec2(cos(angle),sin(angle))*9.0;
    vec2 forward=vec2(-sin(angle),cos(angle));
    vec2 side=vec2(-forward.y,forward.x);
    vec2 delta=p-center;
    vec2 q=vec2(dot(delta,forward),dot(delta,side));
    float aa=max(0.08,uPixelMetres*0.75);
    if(seed>0.94) {
      float flap=0.80+0.20*sin(time*2.2+seed*25.0);
      float body=pow(abs(q.x)/2.1,1.25)+pow(abs(q.y)/(2.8*flap),1.25);
      float ray=1.0-smoothstep(0.82,1.0+aa*0.3,body);
      float tail=(1.0-smoothstep(0.09,0.09+aa,abs(q.y-0.16*sin(q.x*2.0+time*2.0))))
        *smoothstep(-4.3,-3.6,q.x)*(1.0-smoothstep(-1.8,-1.2,q.x));
      float coverage=max(ray,tail)*0.88;
      if(coverage>alpha) {
        alpha=coverage;
        color=mix(vec3(0.025,0.095,0.11),vec3(0.085,0.19,0.20),exp(-abs(q.y)*1.9));
      }
    } else if(uPixelMetres<0.8) {
      for(int i=0;i<4;i++) {
        float f=float(i); vec2 fish=q-vec2(f*1.5-2.0,sin(f*4.7+seed)*1.8);
        fish.y+=sin(time*4.0+f)*0.18;
        float body=length(fish/vec2(0.82,0.24));
        float silhouette=1.0-smoothstep(0.7,1.0+aa,body);
        float tail=(1.0-smoothstep(0.1,0.1+aa,abs(fish.x+0.8)))
          *(1.0-smoothstep(0.08,0.35+aa,abs(fish.y+sin(time*5.0+f)*0.12)));
        float coverage=max(silhouette,tail)*0.86*(1.0-smoothstep(0.4,0.8,uPixelMetres));
        if(coverage>alpha) {
          alpha=coverage;
          color=mix(vec3(0.08,0.19,0.20),vec3(0.32,0.46,0.39),smoothstep(-0.2,0.18,fish.y));
        }
      }
    }
  }
  return vec4(color,alpha);
}
`;
