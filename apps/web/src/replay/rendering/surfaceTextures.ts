import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { Scene } from '@babylonjs/core/scene'

export type SurfacePattern =
  | 'panel'
  | 'armor'
  | 'mobility'
  | 'weapon'
  | 'utility'
  | 'style'
  | 'painted_chipped_armor'
  | 'brushed_weapon_steel'
  | 'scuffed_rubber'
  | 'dirty_electrical_casing'
  | 'emissive_led_glass'
  | 'burnt_critical_metal'
  | 'scraped_style_shell'
  | 'damage_light'
  | 'damage_medium'
  | 'damage_critical'
  | 'trim'
  | 'rubber'
  | 'light'
  | 'warning'
  | 'arena_floor'
  | 'arena_apron'

export type PbrSurfaceTextureSet = {
  baseTexture: DynamicTexture
  metallicRoughnessTexture: DynamicTexture
  normalTexture: DynamicTexture
  occlusionTexture: DynamicTexture
}

export type PbrSurfaceTextureRecipe = {
  baseColor: string
  metallic: number
  pattern: SurfacePattern
  roughness: number
}

type TextureDrawingContext = ReturnType<DynamicTexture['getContext']>

const TEXTURE_SIZE = 384

export function createPbrSurfaceTextures(
  scene: Scene,
  name: string,
  recipe: PbrSurfaceTextureRecipe,
): PbrSurfaceTextureSet {
  const metallicRoughnessTexture = createOrmTexture(
    scene,
    name,
    recipe.pattern,
    recipe.roughness,
    recipe.metallic,
  )

  return {
    baseTexture: createSurfaceTexture(scene, name, recipe.baseColor, recipe.pattern),
    metallicRoughnessTexture,
    normalTexture: createNormalTexture(scene, name, recipe.pattern),
    occlusionTexture: metallicRoughnessTexture,
  }
}

export function isDamageSurfacePattern(pattern: SurfacePattern): boolean {
  return pattern === 'damage_light'
    || pattern === 'damage_medium'
    || pattern === 'damage_critical'
    || pattern === 'burnt_critical_metal'
}

function isRubberSurfacePattern(pattern: SurfacePattern): boolean {
  return pattern === 'rubber' || pattern === 'scuffed_rubber'
}

function isMobilitySurfacePattern(pattern: SurfacePattern): boolean {
  return pattern === 'mobility' || pattern === 'scuffed_rubber'
}

function isWeaponSurfacePattern(pattern: SurfacePattern): boolean {
  return pattern === 'weapon' || pattern === 'brushed_weapon_steel'
}

function isUtilitySurfacePattern(pattern: SurfacePattern): boolean {
  return pattern === 'utility' || pattern === 'dirty_electrical_casing'
}

function isLightSurfacePattern(pattern: SurfacePattern): boolean {
  return pattern === 'light' || pattern === 'emissive_led_glass'
}

function isArmorSurfacePattern(pattern: SurfacePattern): boolean {
  return pattern === 'armor' || pattern === 'painted_chipped_armor'
}

function createSurfaceTexture(
  scene: Scene,
  name: string,
  baseColor: string,
  pattern: SurfacePattern,
): DynamicTexture {
  const texture = new DynamicTexture(`${name}-albedo`, { width: TEXTURE_SIZE, height: TEXTURE_SIZE }, scene, true)
  const context = texture.getContext()
  const dark = rgbaFromHex('#020304', isRubberSurfacePattern(pattern) ? 0.58 : 0.42)
  const light = createSurfaceHighlight(pattern)

  context.fillStyle = baseColor
  context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
  drawGrimeGradient(context, pattern)

  if (isMobilitySurfacePattern(pattern)) {
    drawTreadTexture(context, dark, light)
  } else if (isWeaponSurfacePattern(pattern)) {
    drawWeaponTexture(context, dark)
  } else if (pattern === 'warning') {
    drawWarningTexture(context, dark, light)
  } else if (isUtilitySurfacePattern(pattern)) {
    drawUtilityTexture(context, dark, light)
  } else if (isDamageSurfacePattern(pattern)) {
    drawDamageTexture(context, pattern)
  } else if (isLightSurfacePattern(pattern)) {
    drawLightTexture(context, light)
  } else if (pattern === 'arena_floor' || pattern === 'arena_apron') {
    drawArenaTexture(context, pattern)
  } else {
    drawPanelTexture(context, dark, light, isArmorSurfacePattern(pattern) ? 84 : 92)
  }

  drawEdgeWear(context, pattern)
  drawScuffs(context, pattern)
  applyTextureScale(texture, pattern)
  texture.update(false)

  return texture
}

function createOrmTexture(
  scene: Scene,
  name: string,
  pattern: SurfacePattern,
  roughness: number,
  metallic: number,
): DynamicTexture {
  const texture = new DynamicTexture(`${name}-orm`, { width: TEXTURE_SIZE, height: TEXTURE_SIZE }, scene, true)
  const context = texture.getContext()
  const occlusionBase = isRubberSurfacePattern(pattern)
    ? 150
    : pattern === 'arena_floor' || pattern === 'arena_apron'
      ? 132
      : 178
  const roughnessBase = Math.round(roughness * 255)
  const metallicBase = Math.round(metallic * 255)
  const seamStep = isDamageSurfacePattern(pattern)
    ? 62
    : isMobilitySurfacePattern(pattern)
      ? 34
      : pattern === 'arena_floor'
        ? 96
        : 78

  context.fillStyle = `rgb(${occlusionBase},${roughnessBase},${metallicBase})`
  context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
  context.strokeStyle = `rgb(${Math.max(80, occlusionBase - 54)},${Math.min(255, roughnessBase + 24)},${metallicBase})`
  context.lineWidth = pattern === 'arena_floor' ? 12 : 8

  for (let offset = 48; offset < TEXTURE_SIZE; offset += seamStep) {
    drawLine(context, offset, 0, offset, TEXTURE_SIZE)
    drawLine(context, 0, offset, TEXTURE_SIZE, offset)
  }

  context.strokeStyle = `rgb(${Math.min(255, occlusionBase + 40)},${Math.max(90, roughnessBase - 42)},${metallicBase})`
  context.lineWidth = 3
  drawDeterministicScratches(context, isDamageSurfacePattern(pattern) || pattern === 'arena_floor' ? 38 : pattern === 'weapon' ? 30 : 18, 42)
  applyTextureScale(texture, pattern)
  texture.update(false)

  return texture
}

function createNormalTexture(
  scene: Scene,
  name: string,
  pattern: SurfacePattern,
): DynamicTexture {
  const texture = new DynamicTexture(`${name}-normal`, { width: TEXTURE_SIZE, height: TEXTURE_SIZE }, scene, true)
  const context = texture.getContext()

  context.fillStyle = 'rgb(128,128,255)'
  context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
  context.strokeStyle = isRubberSurfacePattern(pattern) ? 'rgb(116,128,246)' : 'rgb(116,122,242)'
  context.lineWidth = isMobilitySurfacePattern(pattern) ? 9 : 5

  if (isMobilitySurfacePattern(pattern)) {
    for (let y = 16; y < TEXTURE_SIZE; y += 30) {
      drawLine(context, 0, y, TEXTURE_SIZE, y)
    }
  } else {
    const seamStep = isDamageSurfacePattern(pattern)
      ? 68
      : pattern === 'arena_floor'
        ? 96
        : isArmorSurfacePattern(pattern)
          ? 84
          : 92

    for (let offset = 64; offset < TEXTURE_SIZE; offset += seamStep) {
      drawLine(context, offset, 0, offset, TEXTURE_SIZE)
      drawLine(context, 0, offset, TEXTURE_SIZE, offset)
    }
  }

  context.strokeStyle = 'rgb(142,136,255)'
  context.lineWidth = 2
  drawDeterministicScratches(context, isDamageSurfacePattern(pattern) || pattern === 'arena_floor' ? 32 : pattern === 'weapon' ? 26 : 14, 27)
  applyTextureScale(texture, pattern)
  texture.update(false)

  return texture
}

function applyTextureScale(texture: DynamicTexture, pattern: SurfacePattern): void {
  texture.uScale = isMobilitySurfacePattern(pattern) ? 3.4 : 2.2
  texture.vScale = isMobilitySurfacePattern(pattern) ? 2.8 : 2.2

  if (isWeaponSurfacePattern(pattern)) {
    texture.uScale = 2.7
    texture.vScale = 1.7
  }

  if (isDamageSurfacePattern(pattern)) {
    texture.uScale = 2.8
    texture.vScale = 2.35
  }

  if (pattern === 'arena_floor' || pattern === 'arena_apron') {
    texture.uScale = 5.4
    texture.vScale = 5.4
  }
}

function drawPanelTexture(
  context: TextureDrawingContext,
  dark: string,
  light: string,
  step: number,
): void {
  context.strokeStyle = dark
  context.lineWidth = 5

  for (let offset = step; offset < TEXTURE_SIZE; offset += step) {
    drawLine(context, offset, 0, offset, TEXTURE_SIZE)
    drawLine(context, 0, offset, TEXTURE_SIZE, offset)
  }

  context.strokeStyle = light
  context.lineWidth = 2

  for (let x = 42; x < TEXTURE_SIZE; x += 102) {
    for (let y = 42; y < TEXTURE_SIZE; y += 102) {
      drawLine(context, x - 11, y, x + 11, y)
      drawLine(context, x, y - 11, x, y + 11)
    }
  }
}

function drawTreadTexture(
  context: TextureDrawingContext,
  dark: string,
  light: string,
): void {
  context.fillStyle = rgbaFromHex('#030303', 0.28)

  for (let y = 12; y < TEXTURE_SIZE; y += 30) {
    context.fillRect(0, y, TEXTURE_SIZE, 12)
  }

  context.strokeStyle = dark
  context.lineWidth = 9

  for (let x = -48; x < TEXTURE_SIZE; x += 42) {
    drawLine(context, x, TEXTURE_SIZE, x + 110, 0)
  }

  context.strokeStyle = light
  context.lineWidth = 2

  for (let x = 34; x < TEXTURE_SIZE; x += 72) {
    drawLine(context, x, 18, x, TEXTURE_SIZE - 18)
  }
}

function drawWeaponTexture(
  context: TextureDrawingContext,
  dark: string,
): void {
  context.strokeStyle = rgbaFromHex('#e8efea', 0.13)
  context.lineWidth = 2

  for (let y = 18; y < TEXTURE_SIZE; y += 23) {
    const start = (y * 7) % 41
    drawLine(context, -start, y, TEXTURE_SIZE + 24, y + ((y % 3) - 1))
  }

  context.strokeStyle = rgbaFromHex('#030405', 0.28)
  context.lineWidth = 7

  for (let y = 66; y < TEXTURE_SIZE; y += 104) {
    drawLine(context, 28, y, TEXTURE_SIZE - 28, y)
  }

  context.strokeStyle = rgbaFromHex('#d5ddd9', 0.2)
  context.lineWidth = 3

  for (let radius = 58; radius < TEXTURE_SIZE * 0.62; radius += 42) {
    context.beginPath()
    context.arc(TEXTURE_SIZE / 2, TEXTURE_SIZE / 2, radius, Math.PI * 0.08, Math.PI * 1.75)
    context.stroke()
  }

  context.fillStyle = rgbaFromHex('#050607', 0.24)
  for (let index = 0; index < 9; index += 1) {
    const x = 42 + ((index * 79) % (TEXTURE_SIZE - 84))
    const y = 42 + ((index * 47) % (TEXTURE_SIZE - 84))

    context.fillRect(x, y, 13, 13)
  }

  context.strokeStyle = dark
  context.lineWidth = 4
  drawLine(context, 0, 64, TEXTURE_SIZE, 64)
  drawLine(context, 0, TEXTURE_SIZE - 64, TEXTURE_SIZE, TEXTURE_SIZE - 64)
}

function drawWarningTexture(
  context: TextureDrawingContext,
  dark: string,
  light: string,
): void {
  context.strokeStyle = rgbaFromHex('#080808', 0.52)
  context.lineWidth = 24

  for (let x = -320; x < TEXTURE_SIZE; x += 58) {
    drawLine(context, x, TEXTURE_SIZE, x + TEXTURE_SIZE, 0)
  }

  context.strokeStyle = dark
  context.lineWidth = 4
  drawLine(context, 0, 64, TEXTURE_SIZE, 64)
  drawLine(context, 0, TEXTURE_SIZE - 64, TEXTURE_SIZE, TEXTURE_SIZE - 64)
  context.strokeStyle = light
  context.lineWidth = 2
  drawLine(context, 30, TEXTURE_SIZE / 2, TEXTURE_SIZE - 30, TEXTURE_SIZE / 2)
}

function drawUtilityTexture(
  context: TextureDrawingContext,
  dark: string,
  light: string,
): void {
  drawPanelTexture(context, dark, light, 96)
  context.strokeStyle = rgbaFromHex('#071013', 0.6)
  context.lineWidth = 7

  for (let y = 44; y < TEXTURE_SIZE; y += 76) {
    drawLine(context, 42, y, TEXTURE_SIZE - 42, y)
  }

  context.fillStyle = light

  for (let x = 56; x < TEXTURE_SIZE; x += 92) {
    context.fillRect(x, 168, 22, 22)
  }
}

function drawLightTexture(context: TextureDrawingContext, light: string): void {
  context.strokeStyle = light
  context.lineWidth = 18

  for (let y = 32; y < TEXTURE_SIZE; y += 58) {
    drawLine(context, 0, y, TEXTURE_SIZE, y)
  }
}

function drawArenaTexture(context: TextureDrawingContext, pattern: SurfacePattern): void {
  const plateStep = pattern === 'arena_floor' ? 96 : 128

  context.fillStyle = rgbaFromHex('#030405', pattern === 'arena_floor' ? 0.28 : 0.2)
  for (let index = 0; index < 14; index += 1) {
    const x = (index * 59 + 17) % (TEXTURE_SIZE - 82)
    const y = (index * 83 + 43) % (TEXTURE_SIZE - 58)

    context.fillRect(x, y, 82, 58)
  }

  context.strokeStyle = rgbaFromHex('#020304', 0.62)
  context.lineWidth = 8

  for (let offset = plateStep; offset < TEXTURE_SIZE; offset += plateStep) {
    drawLine(context, offset, 0, offset, TEXTURE_SIZE)
    drawLine(context, 0, offset, TEXTURE_SIZE, offset)
  }

  context.strokeStyle = rgbaFromHex('#8e8573', pattern === 'arena_floor' ? 0.14 : 0.18)
  context.lineWidth = 3
  drawDeterministicScratches(context, pattern === 'arena_floor' ? 46 : 24, 63)

  context.fillStyle = rgbaFromHex('#090704', 0.38)
  for (let index = 0; index < 9; index += 1) {
    const x = (index * 73 + 41) % (TEXTURE_SIZE - 54)
    const y = (index * 47 + 68) % (TEXTURE_SIZE - 38)

    context.fillRect(x, y, 54, 18)
  }

  context.strokeStyle = rgbaFromHex('#000000', 0.4)
  context.lineWidth = 6
  for (let index = 0; index < 6; index += 1) {
    const x = (index * 91 + 37) % TEXTURE_SIZE
    const y = (index * 61 + 29) % TEXTURE_SIZE

    drawLine(context, x, y, x + 86, y + 18)
  }
}

function drawDamageTexture(context: TextureDrawingContext, pattern: SurfacePattern): void {
  const criticality = pattern === 'damage_critical' ? 1 : pattern === 'damage_medium' ? 0.66 : 0.34
  const scarCount = Math.round(5 + criticality * 7)
  const heatCount = Math.round(3 + criticality * 7)

  context.fillStyle = rgbaFromHex('#050607', 0.18 + criticality * 0.28)
  context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
  context.strokeStyle = rgbaFromHex('#000000', 0.42 + criticality * 0.36)
  context.lineWidth = 8 + criticality * 8

  for (let index = 0; index < scarCount; index += 1) {
    const x = (index * 67 + 24) % TEXTURE_SIZE
    const y = (index * 89 + 41) % TEXTURE_SIZE

    drawLine(context, x, y, x + 96, y + 24)
    drawLine(context, x + 34, y + 8, x + 56, y + 68)
  }

  context.strokeStyle = rgbaFromHex('#ff8b4a', 0.18 + criticality * 0.36)
  context.lineWidth = 3 + criticality * 4

  for (let index = 0; index < heatCount; index += 1) {
    const x = (index * 77 + 31) % TEXTURE_SIZE
    const y = (index * 53 + 58) % TEXTURE_SIZE

    drawLine(context, x, y, x + 34, y + 9)
  }
}

function drawGrimeGradient(context: TextureDrawingContext, pattern: SurfacePattern): void {
  const gradient = context.createLinearGradient(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)

  gradient.addColorStop(0, rgbaFromHex('#ffffff', isLightSurfacePattern(pattern) ? 0.08 : 0.04))
  gradient.addColorStop(0.45, rgbaFromHex('#000000', isRubberSurfacePattern(pattern) ? 0.1 : 0.06))
  gradient.addColorStop(1, rgbaFromHex('#000000', isDamageSurfacePattern(pattern) ? 0.28 : 0.18))
  context.fillStyle = gradient
  context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
}

function drawEdgeWear(context: TextureDrawingContext, pattern: SurfacePattern): void {
  if (isRubberSurfacePattern(pattern) || isLightSurfacePattern(pattern)) {
    return
  }

  const wearColor = isCoolMetalPattern(pattern)
    ? '#e4ece7'
    : '#d8c8a0'

  context.strokeStyle = rgbaFromHex(
    wearColor,
    isDamageSurfacePattern(pattern)
      ? 0.22
      : pattern === 'arena_floor'
        ? 0.11
      : isWeaponSurfacePattern(pattern) || pattern === 'warning'
        ? 0.18
        : 0.1,
  )
  context.lineWidth = 4
  context.strokeRect(8, 8, TEXTURE_SIZE - 16, TEXTURE_SIZE - 16)
  context.strokeStyle = rgbaFromHex('#050607', 0.36)
  context.lineWidth = 7
  context.strokeRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
}

function createSurfaceHighlight(pattern: SurfacePattern): string {
  return rgbaFromHex(
    isCoolMetalPattern(pattern) ? '#dce7e2' : '#c8c0aa',
    isLightSurfacePattern(pattern) ? 0.32 : 0.16,
  )
}

function isCoolMetalPattern(pattern: SurfacePattern): boolean {
  return pattern === 'panel'
    || pattern === 'armor'
    || pattern === 'weapon'
    || pattern === 'utility'
    || pattern === 'style'
    || pattern === 'trim'
    || pattern === 'painted_chipped_armor'
    || pattern === 'brushed_weapon_steel'
    || pattern === 'dirty_electrical_casing'
    || pattern === 'scraped_style_shell'
}

function drawScuffs(context: TextureDrawingContext, pattern: SurfacePattern): void {
  context.strokeStyle = rgbaFromHex('#ffffff', isDamageSurfacePattern(pattern) ? 0.18 : isWeaponSurfacePattern(pattern) ? 0.22 : 0.12)
  context.lineWidth = isWeaponSurfacePattern(pattern) ? 3 : 2
  drawDeterministicScratches(context, isRubberSurfacePattern(pattern) ? 14 : pattern === 'arena_floor' ? 38 : 24, 19)
}

function drawDeterministicScratches(
  context: TextureDrawingContext,
  count: number,
  seedStep: number,
): void {
  for (let index = 0; index < count; index += 1) {
    const x = (index * 71 + seedStep) % TEXTURE_SIZE
    const y = (index * 97 + seedStep * 2) % TEXTURE_SIZE
    const length = 18 + ((index * 13) % 42)
    const drift = ((index % 5) - 2) * 3

    drawLine(context, x, y, x + length, y + drift)
  }
}

function drawLine(
  context: TextureDrawingContext,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): void {
  context.beginPath()
  context.moveTo(fromX, fromY)
  context.lineTo(toX, toY)
  context.stroke()
}

function rgbaFromHex(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
