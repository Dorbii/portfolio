export const INLAND_MATERIAL = /* glsl */ `
vec3 inlandMaterial(vec2 p, float shore, vec2 flow, float time, float weather) {
  float strength = length(flow);
  float stream = smoothstep(0.3, 0.5, strength);
  float fall = smoothstep(0.83, 0.98, strength);
  vec2 direction = strength > 0.01 ? flow / strength : vec2(0.0, 1.0);
  vec2 tangent = vec2(-direction.y, direction.x);
  float speed = mix(0.035 + weather * 0.045, 0.7, stream);
  speed = mix(speed, 3.5, fall);
  float along = dot(p, direction), across = dot(p, tangent);
  float phase = along * 7.0 - time * speed * 7.0;
  float resolved = 1.0 - smoothstep(0.1, 0.55, uPixelMetres);
  vec2 slope = direction * cos(phase + noise2(p * 0.7) * 1.5) * mix(0.012, 0.07, stream);
  slope += tangent * sin(across * 9.0 + time * 0.5) * 0.012;
  vec3 normal = normalize(vec3(-slope * resolved, 1.0));
  float shallow = exp(-max(shore, 0.0) / 1.3);
  vec3 pigment = mix(vec3(0.028, 0.09, 0.14), vec3(0.095, 0.22, 0.20), shallow);
  // The bed is stationary; moving highlights express water moving over it.
  pigment *= 0.95 + noise2(p * 2.3) * 0.10 * shallow;
  vec3 color = illuminateWater(pigment, normal, mix(105.0, 60.0, stream), p / uWorldMetres);
  float run = pow(max(0.0, sin(phase)), 8.0)
    * smoothstep(0.35, 0.70, noise2(vec2(across * 3.0, along * 0.18 - time * speed * 0.18)));
  float bank = (1.0 - smoothstep(0.3, 1.0, shore)) * smoothstep(0.05, 0.2, shore);
  float poolGlint = pow(max(0.0,sin(phase+noise2(p*1.4)*3.0)),24.0)*0.07*(1.0-stream)*resolved;
  float foam = (run * 0.4 + bank * run * 0.25) * stream * resolved + poolGlint * 0.24;
  foam = mix(foam, (0.55 + 0.4 * noise2(vec2(across * 6.0, along * 1.7 - time * speed))) * resolved, fall);
  return mix(color, illuminatedFoam(p / uWorldMetres), foam * uInlandEffects);
}
`;
