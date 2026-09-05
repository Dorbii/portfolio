// Water-owned contact effects. Signed distance bounds the painted-land overlap;
// projected marine coverage excludes inland banks and provisional tile edges.
export const COAST_CONTACT = /* glsl */ `
vec4 coastContact(vec2 p,float shore,vec2 normal,float time,float weather,float permission) {
  vec2 waterPoint=p+normal*(max(0.0,-shore)+2.0);
  float marine=texture(uSeabedGeography,waterPoint/uWorldMetres).g;
  float allowed=uCoast*permission*smoothstep(0.9,0.99,marine);
  float shorePatch=noise2(p*0.09+vec2(11.0,5.0));
  float phase=time*(1.15+weather*0.35)+noise2(p*0.025)*19.0;
  float arrival=pow(max(0.0,sin(phase)),2.0);
  float activity=smoothstep(0.18,0.62,shorePatch)*arrival;
  float reach=(0.5+weather*1.5)*activity;
  float edge=shore+reach;
  float aa=max(0.12,min(uPixelMetres,0.65));
  float lace=smoothstep(0.26,0.72,noise2(p*3.7-normal*time*0.55));
  float rim=(1.0-smoothstep(aa+0.12,aa+0.65,abs(edge)))*(0.3+0.7*lace)*activity;
  float wet=smoothstep(-1.9,0.0,shore)*(1.0-smoothstep(0.0,0.8,shore));
  wet*=smoothstep(-0.7,0.5,sin(phase-0.65))*shorePatch*0.25;
  float spindrift=pow(noise2(p*5.0-normal*time*1.4),6.0)
    *smoothstep(-2.0,-0.6,shore)*(1.0-smoothstep(-0.2,0.3,shore))*activity*weather*2.5;
  float foam=rim*(0.65+weather*0.45)+spindrift;
  float alpha=(foam+wet)*allowed*(1.0-smoothstep(1.5,2.3,abs(shore)));
  vec3 color=mix(vec3(0.025,0.055,0.05),illuminatedFoam(p/uWorldMetres),foam/max(0.001,foam+wet));
  return vec4(color,clamp(alpha,0.0,0.88));
}
`;
