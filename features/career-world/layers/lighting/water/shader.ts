// This adapter is owned by lighting. Water supplies material normals and
// pigment; sun, ambient, and the shared cloud field are supplied here.
export const WATER_LIGHTING_SHADER = /* glsl */ `
uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform vec3 uAmbientColor;
uniform float uLightIntensity;
uniform sampler2D uLightingCloud;
uniform vec2 uLightingCloudOffset;
uniform float uLightingCloudStrength;
uniform float uLightingEnabled;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;
float cloudVisibility(vec2 worldUv) {
  float s = texture(uLightingCloud, fract(worldUv + uLightingCloudOffset)).r;
  float linear = s <= 0.04045 ? s / 12.92 : pow((s + 0.055) / 1.055, 2.4);
  return mix(1.0, linear, uLightingCloudStrength);
}
vec3 illuminateWater(vec3 pigment, vec3 normal, float roughnessPower, vec2 worldUv) {
  if (uLightingEnabled < 0.5) return pigment;
  float visibility = cloudVisibility(worldUv);
  float diffuse = max(0.0, dot(normal, uLightDirection));
  vec3 view = normalize(vec3(0.0, -0.30, 0.954));
  vec3 halfVector = (uLightDirection + view) / max(0.0001, length(uLightDirection + view));
  float spec = pow(max(0.0, dot(normal, halfVector)), roughnessPower) * max(0.0, uLightDirection.z);
  vec3 illumination = uAmbientColor * 1.6 + uLightColor * uLightIntensity * diffuse * visibility;
  return pigment * illumination + uLightColor * uLightIntensity * spec * 0.032 * visibility;
}
vec3 illuminatedFoam(vec2 worldUv) {
  if (uLightingEnabled < 0.5) return vec3(0.78, 0.86, 0.83);
  return vec3(0.78, 0.86, 0.83) * (uAmbientColor * 1.6 + uLightColor * uLightIntensity * max(0.0, uLightDirection.z) * cloudVisibility(worldUv));
}
vec3 submergedRelief(vec3 albedo,vec3 normal,vec2 worldUv) {
  if(uLightingEnabled<0.5) return albedo;
  vec3 ambient=uAmbientColor*1.6;
  vec3 direct=uLightColor*uLightIntensity*cloudVisibility(worldUv);
  vec3 referenceLight=ambient+direct*max(0.0,uLightDirection.z);
  vec3 local=ambient+direct*max(0.0,dot(normal,uLightDirection));
  return albedo*local/max(referenceLight,vec3(0.0001));
}
vec3 waterOptics(vec3 transmission, vec3 normal, float roughness, vec2 worldUv) {
  if (uLightingEnabled < 0.5) return transmission;
  vec3 view=normalize(vec3(0.0,-0.30,0.954));
  vec3 reflected=reflect(-view,normal);
  float facing=max(0.01,dot(normal,view));
  float fresnel=0.0204+0.9796*pow(1.0-facing,5.0);
  float skyHeight=clamp(reflected.z,0.0,1.0);
  vec3 sky=mix(uSkyHorizon,uSkyZenith,pow(skyHeight,0.45));
  float clouds=texture(uLightingCloud,fract(reflected.xy*0.55+vec2(0.4,0.3))).r;
  sky=mix(sky,uSkyHorizon,smoothstep(0.56,0.88,clouds)*0.75);
  vec3 h=normalize(view+uLightDirection);
  float nh=max(0.0,dot(normal,h)), nl=max(0.0,dot(normal,uLightDirection));
  float vh=max(0.0,dot(view,h));
  // Material roughness already includes the screen footprint. Screen-quad
  // derivatives here produced block-shaped highlights on steep event normals.
  float a2=pow(roughness,4.0);
  float denominator=nh*nh*(a2-1.0)+1.0;
  float distribution=a2/(3.14159265*denominator*denominator);
  float masking=2.0*nl/(nl+sqrt(a2+(1.0-a2)*nl*nl)+0.0001);
  float sunFresnel=0.0204+0.9796*pow(1.0-vh,5.0);
  float spec=distribution*masking*sunFresnel/(4.0*facing+0.001);
  float visibility=cloudVisibility(worldUv);
  float incoming=mix(max(0.0,uLightDirection.z),nl,0.7);
  vec3 illumination=uAmbientColor*1.6+uLightColor*uLightIntensity*incoming*visibility;
  vec3 result=transmission*illumination*(1.0-fresnel)+sky*fresnel;
  result+=uLightColor*uLightIntensity*min(spec,4.0)*visibility;
  return result;
}
`;
