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
  emissiveTexture?: DynamicTexture
  metallicRoughnessTexture: DynamicTexture
  normalTexture: DynamicTexture
  occlusionTexture: DynamicTexture
}

export type PbrSurfaceTextureRecipe = {
  baseColor: string
  emissiveColor?: string
  metallic: number
  pattern: SurfacePattern
  roughness: number
}

type TextureDrawingContext = ReturnType<DynamicTexture['getContext']>

const TEXTURE_SIZE = 512

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
    emissiveTexture: createEmissiveTexture(scene, name, recipe.emissiveColor, recipe.pattern),
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

  drawProfileSurfaceDetails(context, pattern, dark, light)
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
  drawProfileOrmDetails(context, pattern, occlusionBase, roughnessBase, metallicBase)
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
  drawProfileNormalDetails(context, pattern)
  applyTextureScale(texture, pattern)
  texture.update(false)

  return texture
}

function createEmissiveTexture(
  scene: Scene,
  name: string,
  emissiveColor: string | undefined,
  pattern: SurfacePattern,
): DynamicTexture | undefined {
  const shouldDrawEmissiveTexture =
    isLightSurfacePattern(pattern) ||
    pattern === 'burnt_critical_metal' ||
    pattern === 'damage_critical'

  if (!shouldDrawEmissiveTexture) {
    return undefined
  }

  const texture = new DynamicTexture(`${name}-emissive`, { width: TEXTURE_SIZE, height: TEXTURE_SIZE }, scene, true)
  const context = texture.getContext()
  const glowColor = emissiveColor ?? '#000000'
  const centerGlow = isLightSurfacePattern(pattern)
    ? 0.74
    : pattern === 'burnt_critical_metal' || pattern === 'damage_critical'
      ? 0.2
      : 0.1

  context.fillStyle = '#000000'
  context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)

  if (isLightSurfacePattern(pattern)) {
    drawEmissiveBands(context, glowColor)
    drawEmissiveLensCells(context, glowColor)
  } else if (pattern === 'burnt_critical_metal' || pattern === 'damage_critical') {
    drawEmberFlecks(context, glowColor)
  }

  const radial = context.createRadialGradient(
    TEXTURE_SIZE / 2,
    TEXTURE_SIZE / 2,
    12,
    TEXTURE_SIZE / 2,
    TEXTURE_SIZE / 2,
    TEXTURE_SIZE * 0.48,
  )

  radial.addColorStop(0, rgbaFromHex(glowColor, centerGlow))
  radial.addColorStop(0.42, rgbaFromHex(glowColor, centerGlow * 0.28))
  radial.addColorStop(1, rgbaFromHex(glowColor, 0))
  context.fillStyle = radial
  context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
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

function drawProfileSurfaceDetails(
  context: TextureDrawingContext,
  pattern: SurfacePattern,
  dark: string,
  light: string,
): void {
  if (pattern === 'painted_chipped_armor' || pattern === 'armor') {
    drawBoltHalos(context, dark, light, 4, 4)
    drawPaintChips(context, '#2b3436', '#d8c8a0', 18)
    drawPanelArrows(context, light)
    return
  }

  if (pattern === 'brushed_weapon_steel' || pattern === 'weapon') {
    drawDirectionalGrinding(context)
    drawImpactGouges(context, '#f4f7f0', '#111516')
    return
  }

  if (pattern === 'scuffed_rubber' || pattern === 'rubber' || pattern === 'mobility') {
    drawRubberSidewalls(context, light)
    drawRubberContactScuffs(context)
    return
  }

  if (pattern === 'dirty_electrical_casing' || pattern === 'utility') {
    drawServiceLabelsAndVents(context, dark, light)
    drawBoltHalos(context, dark, light, 3, 3)
    return
  }

  if (pattern === 'emissive_led_glass' || pattern === 'light') {
    drawLensRings(context, light)
    return
  }

  if (pattern === 'burnt_critical_metal' || isDamageSurfacePattern(pattern)) {
    drawCrackedBurntPaint(context)
    return
  }

  if (pattern === 'scraped_style_shell' || pattern === 'style') {
    drawShowpieceScrapes(context, light)
    drawBoltHalos(context, dark, light, 3, 2)
  }
}

function drawProfileOrmDetails(
  context: TextureDrawingContext,
  pattern: SurfacePattern,
  occlusionBase: number,
  roughnessBase: number,
  metallicBase: number,
): void {
  if (pattern === 'emissive_led_glass' || pattern === 'light') {
    context.fillStyle = `rgb(${Math.max(30, occlusionBase - 70)},${Math.max(18, roughnessBase - 46)},${Math.max(0, metallicBase - 16)})`
    for (let index = 0; index < 7; index += 1) {
      const size = 20 + (index % 3) * 10
      const x = 46 + ((index * 67) % (TEXTURE_SIZE - 92))
      const y = 48 + ((index * 91) % (TEXTURE_SIZE - 96))

      context.beginPath()
      context.arc(x, y, size * 0.72, 0, Math.PI * 2)
      context.fill()
    }
    return
  }

  if (pattern === 'scuffed_rubber' || pattern === 'rubber' || pattern === 'mobility') {
    context.strokeStyle = `rgb(${Math.max(40, occlusionBase - 72)},${Math.min(255, roughnessBase + 18)},0)`
    context.lineWidth = 11
    for (let y = 26; y < TEXTURE_SIZE; y += 42) {
      drawLine(context, 0, y, TEXTURE_SIZE, y)
    }
    return
  }

  if (pattern === 'brushed_weapon_steel' || pattern === 'weapon') {
    context.strokeStyle = `rgb(${Math.max(88, occlusionBase - 46)},${Math.max(70, roughnessBase - 38)},${Math.min(255, metallicBase + 18)})`
    context.lineWidth = 2
    for (let y = 16; y < TEXTURE_SIZE; y += 12) {
      drawLine(context, 0, y, TEXTURE_SIZE, y + ((y / 12) % 3 - 1))
    }
    return
  }

  if (pattern === 'painted_chipped_armor' || pattern === 'scraped_style_shell' || isDamageSurfacePattern(pattern)) {
    context.fillStyle = `rgb(${Math.max(40, occlusionBase - 62)},${Math.min(255, roughnessBase + 22)},${Math.max(0, metallicBase - 16)})`
    for (let index = 0; index < 16; index += 1) {
      const x = 28 + ((index * 79) % (TEXTURE_SIZE - 56))
      const y = 26 + ((index * 53) % (TEXTURE_SIZE - 52))

      context.fillRect(x, y, 28 + (index % 4) * 7, 8 + (index % 3) * 5)
    }
  }
}

function drawProfileNormalDetails(context: TextureDrawingContext, pattern: SurfacePattern): void {
  if (pattern === 'scuffed_rubber' || pattern === 'rubber' || pattern === 'mobility') {
    context.strokeStyle = 'rgb(112,128,240)'
    context.lineWidth = 6
    for (let x = 22; x < TEXTURE_SIZE; x += 44) {
      drawLine(context, x, 0, x + 18, TEXTURE_SIZE)
    }
    return
  }

  if (pattern === 'emissive_led_glass' || pattern === 'light') {
    context.strokeStyle = 'rgb(151,143,255)'
    context.lineWidth = 5
    for (let radius = 34; radius <= 134; radius += 28) {
      context.beginPath()
      context.arc(TEXTURE_SIZE / 2, TEXTURE_SIZE / 2, radius, 0, Math.PI * 2)
      context.stroke()
    }
    return
  }

  if (pattern === 'dirty_electrical_casing' || pattern === 'utility') {
    context.strokeStyle = 'rgb(114,124,244)'
    context.lineWidth = 4
    for (let y = 48; y < TEXTURE_SIZE; y += 82) {
      for (let x = 46; x < TEXTURE_SIZE - 72; x += 28) {
        drawLine(context, x, y, x + 14, y)
      }
    }
    return
  }

  if (pattern === 'brushed_weapon_steel' || pattern === 'weapon') {
    context.strokeStyle = 'rgb(146,132,255)'
    context.lineWidth = 2
    for (let y = 18; y < TEXTURE_SIZE; y += 11) {
      drawLine(context, 0, y, TEXTURE_SIZE, y + (y % 4) - 2)
    }
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

function drawBoltHalos(
  context: TextureDrawingContext,
  dark: string,
  light: string,
  columns: number,
  rows: number,
): void {
  const xStep = TEXTURE_SIZE / (columns + 1)
  const yStep = TEXTURE_SIZE / (rows + 1)

  for (let xIndex = 1; xIndex <= columns; xIndex += 1) {
    for (let yIndex = 1; yIndex <= rows; yIndex += 1) {
      const x = xIndex * xStep
      const y = yIndex * yStep

      context.fillStyle = dark
      context.beginPath()
      context.arc(x, y, 13, 0, Math.PI * 2)
      context.fill()
      context.fillStyle = light
      context.beginPath()
      context.arc(x, y, 5, 0, Math.PI * 2)
      context.fill()
    }
  }
}

function drawPaintChips(
  context: TextureDrawingContext,
  substrate: string,
  exposedEdge: string,
  count: number,
): void {
  for (let index = 0; index < count; index += 1) {
    const x = 18 + ((index * 83) % (TEXTURE_SIZE - 58))
    const y = 20 + ((index * 47) % (TEXTURE_SIZE - 62))
    const width = 18 + ((index * 11) % 34)
    const height = 7 + ((index * 5) % 16)

    context.fillStyle = rgbaFromHex(substrate, 0.4)
    context.fillRect(x, y, width, height)
    context.strokeStyle = rgbaFromHex(exposedEdge, 0.25)
    context.lineWidth = 2
    drawLine(context, x, y, x + width, y + Math.max(1, height * 0.15))
  }
}

function drawPanelArrows(context: TextureDrawingContext, light: string): void {
  context.strokeStyle = light
  context.lineWidth = 3

  for (let index = 0; index < 5; index += 1) {
    const x = 52 + index * 92
    const y = 72 + ((index * 67) % (TEXTURE_SIZE - 144))

    drawLine(context, x, y, x + 34, y)
    drawLine(context, x + 34, y, x + 22, y - 10)
    drawLine(context, x + 34, y, x + 22, y + 10)
  }
}

function drawDirectionalGrinding(context: TextureDrawingContext): void {
  context.strokeStyle = rgbaFromHex('#f6fff8', 0.16)
  context.lineWidth = 2

  for (let y = 12; y < TEXTURE_SIZE; y += 10) {
    drawLine(context, 0, y, TEXTURE_SIZE, y + ((y / 10) % 5 - 2))
  }
}

function drawImpactGouges(
  context: TextureDrawingContext,
  bright: string,
  dark: string,
): void {
  for (let index = 0; index < 16; index += 1) {
    const x = 24 + ((index * 61) % (TEXTURE_SIZE - 86))
    const y = 32 + ((index * 97) % (TEXTURE_SIZE - 72))
    const length = 24 + ((index * 17) % 66)

    context.strokeStyle = rgbaFromHex(dark, 0.38)
    context.lineWidth = 7
    drawLine(context, x, y, x + length, y + ((index % 5) - 2) * 4)
    context.strokeStyle = rgbaFromHex(bright, 0.22)
    context.lineWidth = 2
    drawLine(context, x + 3, y - 2, x + length - 4, y + ((index % 5) - 2) * 4 - 2)
  }
}

function drawRubberSidewalls(context: TextureDrawingContext, light: string): void {
  context.strokeStyle = rgbaFromHex('#050607', 0.48)
  context.lineWidth = 12

  for (let radius = 54; radius < TEXTURE_SIZE * 0.66; radius += 48) {
    context.beginPath()
    context.arc(TEXTURE_SIZE / 2, TEXTURE_SIZE / 2, radius, 0, Math.PI * 2)
    context.stroke()
  }

  context.strokeStyle = light
  context.lineWidth = 3

  for (let radius = 76; radius < TEXTURE_SIZE * 0.58; radius += 64) {
    context.beginPath()
    context.arc(TEXTURE_SIZE / 2, TEXTURE_SIZE / 2, radius, Math.PI * 0.12, Math.PI * 1.88)
    context.stroke()
  }
}

function drawRubberContactScuffs(context: TextureDrawingContext): void {
  context.strokeStyle = rgbaFromHex('#c7c9c0', 0.2)
  context.lineWidth = 6

  for (let index = 0; index < 18; index += 1) {
    const x = 18 + ((index * 57) % (TEXTURE_SIZE - 36))
    const y = 24 + ((index * 41) % (TEXTURE_SIZE - 48))

    drawLine(context, x, y, x + 44, y + ((index % 3) - 1) * 8)
  }
}

function drawServiceLabelsAndVents(
  context: TextureDrawingContext,
  dark: string,
  light: string,
): void {
  context.fillStyle = rgbaFromHex('#d7ddd8', 0.18)

  for (let index = 0; index < 7; index += 1) {
    const x = 36 + ((index * 73) % (TEXTURE_SIZE - 114))
    const y = 34 + ((index * 59) % (TEXTURE_SIZE - 92))

    context.fillRect(x, y, 64, 18)
    context.fillStyle = dark
    context.fillRect(x + 8, y + 6, 44, 4)
    context.fillStyle = rgbaFromHex('#d7ddd8', 0.18)
  }

  context.strokeStyle = light
  context.lineWidth = 3

  for (let y = 76; y < TEXTURE_SIZE; y += 88) {
    for (let x = 44; x < TEXTURE_SIZE - 54; x += 26) {
      drawLine(context, x, y, x + 14, y)
    }
  }
}

function drawLensRings(context: TextureDrawingContext, light: string): void {
  const gradient = context.createRadialGradient(
    TEXTURE_SIZE / 2,
    TEXTURE_SIZE / 2,
    10,
    TEXTURE_SIZE / 2,
    TEXTURE_SIZE / 2,
    TEXTURE_SIZE * 0.5,
  )

  gradient.addColorStop(0, rgbaFromHex('#ffffff', 0.28))
  gradient.addColorStop(0.45, light)
  gradient.addColorStop(1, rgbaFromHex('#030406', 0.22))
  context.fillStyle = gradient
  context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
  context.strokeStyle = rgbaFromHex('#ffffff', 0.24)
  context.lineWidth = 4

  for (let radius = 42; radius <= 162; radius += 38) {
    context.beginPath()
    context.arc(TEXTURE_SIZE / 2, TEXTURE_SIZE / 2, radius, 0, Math.PI * 2)
    context.stroke()
  }
}

function drawCrackedBurntPaint(context: TextureDrawingContext): void {
  context.strokeStyle = rgbaFromHex('#050302', 0.62)
  context.lineWidth = 7

  for (let index = 0; index < 12; index += 1) {
    const x = 22 + ((index * 89) % (TEXTURE_SIZE - 64))
    const y = 30 + ((index * 73) % (TEXTURE_SIZE - 72))

    drawLine(context, x, y, x + 52, y + 18)
    drawLine(context, x + 22, y + 8, x + 34, y + 56)
  }

  context.strokeStyle = rgbaFromHex('#ff8a38', 0.22)
  context.lineWidth = 3
  drawDeterministicScratches(context, 22, 81)
}

function drawShowpieceScrapes(context: TextureDrawingContext, light: string): void {
  context.strokeStyle = light
  context.lineWidth = 5

  for (let y = 48; y < TEXTURE_SIZE; y += 84) {
    drawLine(context, 28, y, TEXTURE_SIZE - 42, y + 18)
  }

  drawPaintChips(context, '#202729', '#efe2bd', 14)
}

function drawEmissiveBands(context: TextureDrawingContext, glowColor: string): void {
  context.strokeStyle = rgbaFromHex(glowColor, 0.72)
  context.lineWidth = 18

  for (let y = 46; y < TEXTURE_SIZE; y += 76) {
    drawLine(context, 22, y, TEXTURE_SIZE - 22, y)
  }
}

function drawEmissiveLensCells(context: TextureDrawingContext, glowColor: string): void {
  context.fillStyle = rgbaFromHex(glowColor, 0.86)

  for (let index = 0; index < 9; index += 1) {
    const x = 58 + ((index * 73) % (TEXTURE_SIZE - 116))
    const y = 62 + ((index * 47) % (TEXTURE_SIZE - 124))

    context.beginPath()
    context.arc(x, y, 18, 0, Math.PI * 2)
    context.fill()
  }
}

function drawEmberFlecks(context: TextureDrawingContext, glowColor: string): void {
  context.fillStyle = rgbaFromHex(glowColor, 0.46)

  for (let index = 0; index < 16; index += 1) {
    const x = 24 + ((index * 83) % (TEXTURE_SIZE - 48))
    const y = 28 + ((index * 61) % (TEXTURE_SIZE - 56))

    context.fillRect(x, y, 10 + (index % 3) * 5, 3 + (index % 2) * 3)
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
