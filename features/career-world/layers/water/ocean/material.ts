import { SPECTRUM_SIZE, WAVE_CASCADES } from "./spectrum.ts";
import { EVENT_SURFACE } from "./events/surface.ts";
import { SEABED_MATERIAL } from "./seabed/material.ts";
import { OCEAN_DETAILS_MATERIAL } from "./details/material.ts";
import { COAST_CONTACT } from "./coast/material.ts";
import { AQUATIC_LIFE } from "./life/material.ts";

export const OCEAN_MATERIAL = /* glsl */ `
uniform sampler2D uSwell;
uniform sampler2D uRipples;
uniform sampler2D uSwellOffset;
uniform sampler2D uRippleOffset;
uniform float uSpectral;
${EVENT_SURFACE}
${SEABED_MATERIAL}
${OCEAN_DETAILS_MATERIAL}
${AQUATIC_LIFE}
uniform sampler2D uSeabedGeography;
uniform float uSeabedRange;
uniform float uBedShown;
${COAST_CONTACT}

// Material coordinates only; the camera and registered coverage never move.
vec2 waterGround(vec2 p) { return vec2(p.x*0.577350269+p.y,-p.x*0.577350269+p.y); }
vec2 waterPaintVector(vec2 p) { return vec2((p.x-p.y)*0.866025404,(p.x+p.y)*0.5); }
vec3 paintNormal(vec2 slope) { return normalize(vec3(-(slope.x-slope.y)*0.577350269,-slope.x-slope.y,1.0)); }

// Long traveling swell sits beneath the two dense, irregular FFT bands. Four
// non-harmonic wavelengths add scale without another set of simulation targets.
vec3 distantSwell(vec2 q,float time,float weather) {
  vec3 result=vec3(0);
  for(int i=0;i<4;i++) {
    float f=float(i), wavelength=34.0+f*23.7+hash11(f+72.0)*17.0;
    float k=TAU/wavelength, angle=uWindAngle-0.65+f*0.37;
    vec2 direction=vec2(cos(angle),sin(angle));
    float phase=dot(q,direction)*k-sqrt(9.81*k)*time+f*8.3;
    float amplitude=(0.10+weather*0.70)/(1.0+f*0.7);
    result+=vec3(sin(phase),direction*k*cos(phase))*amplitude;
  }
  return result;
}

vec4 waveSurface(vec2 p, float time, float weather) {
  if (uSpectral>0.5) {
    vec2 q=waterGround(p);
    float longLod=max(0.0,log2(max(0.001,uPixelMetres)*${SPECTRUM_SIZE.toFixed(1)}/${WAVE_CASCADES[0].length.toFixed(1)}));
    float shortLod=max(0.0,log2(max(0.001,uPixelMetres)*${SPECTRUM_SIZE.toFixed(1)}/${WAVE_CASCADES[1].length.toFixed(1)}));
    // Invert the horizontal displacement once before sampling. Crests bunch
    // together and foam follows displaced water rather than a stationary grid.
    vec2 offset=textureLod(uSwellOffset,q/${WAVE_CASCADES[0].length.toFixed(1)},longLod).rg
      +textureLod(uRippleOffset,q/${WAVE_CASCADES[1].length.toFixed(1)},shortLod).rg;
    q-=offset;
    vec4 swell=textureLod(uSwell,q/${WAVE_CASCADES[0].length.toFixed(1)},longLod);
    vec4 ripple=textureLod(uRipples,q/${WAVE_CASCADES[1].length.toFixed(1)},shortLod);
    // Slow traveling wave groups separate energetic trains from quieter water.
    float group=noise2(q*0.022-vec2(cos(uWindAngle),sin(uWindAngle))*time*0.028);
    float energy=mix(0.48,1.45,smoothstep(0.2,0.8,group));
    float crossGroup=0.65+0.55*noise2(q*0.051+vec2(time*0.018,-time*0.025));
    return vec4(swell.rgb*energy+ripple.rgb*crossGroup+distantSwell(q,time,weather),max(swell.a*energy,ripple.a*0.35*crossGroup));
  }
  vec2 q=waterGround(p), slope=vec2(0); float height=0.0;
  for (int i=0;i<12;i++) {
    float f=float(i), wavelength=18.0*pow(0.72,f), k=TAU/wavelength;
    float angle=uWindAngle+(hash11(f+41.0)-0.5)*1.7;
    vec2 d=vec2(cos(angle),sin(angle));
    float resolved=1.0-smoothstep(wavelength*0.15,wavelength*0.5,uPixelMetres);
    float phase=dot(q,d)*k-sqrt(9.81*k)*time+f*5.37;
    float amplitude=(0.012+weather*0.045)*resolved/(1.0+f*0.3);
    slope+=d*cos(phase)*amplitude*k; height+=sin(phase)*amplitude;
  }
  return vec4(height,slope,0);
}

// Caustics move over a fixed bed and fade when their detail is unresolved.
float waterCaustic(vec2 p, float time) {
  vec2 q=p*1.45+vec2(sin(time*0.37),cos(time*0.29))*0.2;
  float a=sin(q.x+sin(q.y*1.27+time*0.5));
  float b=sin(q.y*1.3+sin(q.x*0.93-time*0.42));
  float ridge=1.0-smoothstep(0.04,0.22,abs(a+b));
  return ridge*(1.0-smoothstep(0.18,0.7,uPixelMetres));
}

vec3 oceanMaterial(vec2 p,float shore,vec2 shoreNormal,float time,float weather,float geographyCoast) {
  vec4 waves=waveSurface(p,time,weather);
  vec2 eventSlope; float eventHeight,eventFoam;
  largeWaveSurface(p,eventSlope,eventHeight,eventFoam);
  float distance=max(0.0,shore);
  float coast=uCoast*geographyCoast;
  vec2 wind=normalize(waterPaintVector(vec2(cos(uWindAngle),sin(uWindAngle))));
  float exposure=0.38+0.62*sqrt(max(0.0,dot(wind,-shoreNormal)));
  // Sets bend around the signed shoreline. Envelope varies in world space,
  // so adjacent bays do not all break in lockstep.
  float setEnvelope=smoothstep(0.33,0.68,noise2(p*0.075+vec2(time*0.04,-time*0.023)));
  float phase=distance*0.83+time*(1.6+weather*0.45)+noise2(p*0.032)*14.0;
  float surfRange=(2.0+weather*5.0)*mix(0.55,1.8,noise2(p*0.021+13.0));
  float surfStart=min(2.5,surfRange*0.55);
  float surfBand=smoothstep(0.0,0.6,distance)*(1.0-smoothstep(surfStart,surfRange,distance));
  float breaker=pow(max(0.0,sin(phase)),7.0)*setEnvelope;
  // Distance-based visual depth proxy, not surveyed bathymetry.
  vec3 geography=texture(uSeabedGeography,p/uWorldMetres).rgb;
  float shelfDistance=geography.r*uSeabedRange;
  SeabedSample substrate=sampleOceanSeabed(p,shelfDistance);
  float depth=substrate.depth;
  // Local fantasy shoals are water-owned visual depth, using the same marine
  // footprint. They do not alter the coast or displace the land artwork.
  float garden=reefGarden(p/uWorldMetres)*smoothstep(0.98,1.0,geography.g);
  float reefDepth=2.6+noise2(p*0.055+vec2(8,31))*1.1;
  depth=mix(depth,min(depth,reefDepth),garden);
  vec2 slope=waves.gb*smoothstep(0.0,2.5,distance);
  vec3 normal=normalize(vec3(-vec2((slope.x-slope.y)*0.577350269,slope.x+slope.y)-eventSlope,1.0));
  normal=normalize(normal+vec3(shoreNormal*cos(phase)*surfBand*exposure*(0.12+weather*0.25)*coast,0));
  vec2 refracted=p+(waterPaintVector(slope)+eventSlope)*min(depth,4.0)*0.5;
  vec3 deep=vec3(0.010,0.055,0.125);
  substrate=sampleOceanSeabed(refracted,shelfDistance);
  vec3 bed=uBedShown>0.5?submergedRelief(substrate.albedo,substrate.normal,p/uWorldMetres):deep;
  bed=oceanDetailBottom(refracted,geography,depth,bed);
  float swimmingDepth=min(depth*0.65,0.45+noise2(p*0.013+21.0)*0.70);
  vec4 life=vec4(0);
  if(uDetailPass>0.5&&geography.g>0.99) {
    vec2 lifeRefracted=p+(waterPaintVector(slope)+eventSlope)*swimmingDepth*0.5;
    life=aquaticLife(lifeRefracted,time,depth);
  }
  float clarity=mix(0.65,2.4,smoothstep(0.22,0.8,noise2(p*0.016+vec2(41,17))));
  clarity=mix(clarity,0.72,garden);
  vec3 attenuation=exp(-vec3(0.38,0.12,0.075)*(1.0+weather*0.5)*depth*clarity);
  vec3 transmission=mix(deep,bed,attenuation);
  transmission+=vec3(0.055,0.11,0.10)*waterCaustic(refracted,time)*exp(-depth*0.45);
  if(life.a>0.0) {
    vec3 lifeAttenuation=exp(-vec3(0.38,0.12,0.075)*(1.0+weather*0.5)*swimmingDepth*clarity);
    vec3 lifeTransmission=mix(deep,submergedRelief(life.rgb,vec3(0,0,1),p/uWorldMetres),lifeAttenuation);
    // Straight-alpha output: apply creature coverage once when combining
    // submerged contributors, not again by fading its color into the seabed.
    float combined=life.a+oceanDetailAlpha*(1.0-life.a);
    transmission=(lifeTransmission*life.a+transmission*oceanDetailAlpha*(1.0-life.a))/max(0.0001,combined);
    oceanDetailAlpha=combined;
  }
  float crest=max(0.0,waves.r+eventHeight*0.5)*0.28;
  transmission+=vec3(0.008,0.13,0.12)*crest;
  float roughness=0.14+weather*0.10+smoothstep(0.3,2.0,uPixelMetres)*0.14+min(0.10,eventHeight*0.015);
  vec3 color=waterOptics(transmission,normal,roughness,p/uWorldMetres);

  float lace=smoothstep(0.26,0.66,noise2(p*2.6+shoreNormal*time*0.4));
  float wash=(1.0-smoothstep(0.3,3.2+weather*1.8,distance))
    *(0.3+0.7*smoothstep(-0.65,0.8,sin(phase-0.8)))*lace;
  float foam=(breaker*surfBand*(0.7+weather*0.65)+wash*0.5*setEnvelope)*exposure*coast;
  float droplets=pow(noise2(p*7.0+shoreNormal*time*1.3),9.0)*8.0;
  foam+=droplets*breaker*surfBand*exposure*weather*coast;
  // Preserve smooth crest coverage. Thresholded high-frequency noise punched
  // a repeating mottled texture through each low-resolution foam-history blob.
  vec2 foamDrift=vec2(cos(uWindAngle),sin(uWindAngle))*time*0.12;
  float foamDensity=mix(0.82,1.0,noise2(waterGround(p)*0.45-foamDrift));
  float whitecap=waves.a*waves.a*foamDensity;
  foam=max(foam,whitecap*smoothstep(0.06,0.7,weather));
  foam=max(foam,eventFoam);
  oceanDetailAlpha*=1.0-clamp(foam,0.0,1.0);
  color=mix(color,illuminatedFoam(p/uWorldMetres),clamp(foam,0.0,0.96));
  // Fantasy bioluminescence lives in aerated crests. It is material emission,
  // not a private light or a competing day/night clock.
  float agitation=max(waves.a*0.35,breaker*surfBand*exposure*coast);
  color+=vec3(0.002,0.065,0.09)*agitation*lace;
  return color;
}
`;
