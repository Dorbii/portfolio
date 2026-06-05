import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Scene } from '@babylonjs/core/scene'
import type {
  PartCategory,
  TeamRole,
} from '../../../../packages/schemas/src/index.js'

export type TeamMaterialSet = {
  chassis: StandardMaterial
  armor: StandardMaterial
  mobility: StandardMaterial
  weapon: StandardMaterial
  utility: StandardMaterial
  style: StandardMaterial
  trim: StandardMaterial
  rubber: StandardMaterial
  light: StandardMaterial
  warning: StandardMaterial
}

type SurfacePattern = 'panel' | 'armor' | 'mobility' | 'weapon' | 'utility' | 'style' | 'trim' | 'rubber' | 'light' | 'warning'
type TextureDrawingContext = ReturnType<DynamicTexture['getContext']>

export function createTeamMaterials(
  scene: Scene,
): Record<TeamRole, TeamMaterialSet> {
  return {
    red: {
      chassis: createMaterial(scene, 'red-chassis', '#b72e3b', '#23070a', 0.34, 'panel'),
      armor: createMaterial(scene, 'red-armor', '#e84c5a', '#2b080c', 0.3, 'armor'),
      mobility: createMaterial(scene, 'red-mobility', '#474b4e', '#070808', 0.32, 'mobility'),
      weapon: createMaterial(scene, 'red-weapon', '#f6bd4f', '#4d2a05', 0.36, 'weapon'),
      utility: createMaterial(scene, 'red-utility', '#f47b54', '#321005', 0.34, 'utility'),
      style: createMaterial(scene, 'red-style', '#ff92a8', '#3c1019', 0.4, 'style'),
      trim: createMaterial(scene, 'red-trim', '#17191b', '#050505', 0.26, 'trim'),
      rubber: createMaterial(scene, 'red-rubber', '#0d0e10', '#020202', 0.18, 'rubber'),
      light: createMaterial(scene, 'red-light', '#ff5b68', '#ff1f35', 0.72, 'light'),
      warning: createMaterial(scene, 'red-warning', '#f4c95b', '#5b3605', 0.3, 'warning'),
    },
    blue: {
      chassis: createMaterial(scene, 'blue-chassis', '#1f6fc2', '#051323', 0.34, 'panel'),
      armor: createMaterial(scene, 'blue-armor', '#55a9ff', '#06182d', 0.3, 'armor'),
      mobility: createMaterial(scene, 'blue-mobility', '#3f4c55', '#070b0d', 0.32, 'mobility'),
      weapon: createMaterial(scene, 'blue-weapon', '#f6bd4f', '#3a2503', 0.36, 'weapon'),
      utility: createMaterial(scene, 'blue-utility', '#33c4ca', '#082629', 0.34, 'utility'),
      style: createMaterial(scene, 'blue-style', '#98e5ff', '#09283b', 0.4, 'style'),
      trim: createMaterial(scene, 'blue-trim', '#171b20', '#050608', 0.26, 'trim'),
      rubber: createMaterial(scene, 'blue-rubber', '#0d0f12', '#020203', 0.18, 'rubber'),
      light: createMaterial(scene, 'blue-light', '#58a9ff', '#167cff', 0.78, 'light'),
      warning: createMaterial(scene, 'blue-warning', '#f4c95b', '#4b3205', 0.3, 'warning'),
    },
  }
}

export function materialForCategory(
  materials: TeamMaterialSet,
  category: PartCategory,
): StandardMaterial {
  if (category === 'defense') {
    return materials.armor
  }

  if (category === 'mobility') {
    return materials.mobility
  }

  if (category === 'weapon') {
    return materials.weapon
  }

  if (category === 'utility') {
    return materials.utility
  }

  if (category === 'style') {
    return materials.style
  }

  return materials.chassis
}

function createMaterial(
  scene: Scene,
  name: string,
  diffuse: string,
  emissive: string,
  specular = 0.34,
  pattern: SurfacePattern = 'panel',
): StandardMaterial {
  const material = new StandardMaterial(name, scene)

  material.diffuseColor = Color3.FromHexString(diffuse)
  material.specularColor = new Color3(specular, specular, Math.max(0.18, specular * 0.86))
  material.emissiveColor = Color3.FromHexString(emissive)
  material.diffuseTexture = createSurfaceTexture(scene, name, diffuse, pattern)

  return material
}

function createSurfaceTexture(
  scene: Scene,
  name: string,
  baseColor: string,
  pattern: SurfacePattern,
): DynamicTexture {
  const texture = new DynamicTexture(`${name}-surface`, { width: 256, height: 256 }, scene, true)
  const context = texture.getContext()
  const dark = rgbaFromHex('#050607', 0.52)
  const light = rgbaFromHex('#f6f0d0', pattern === 'light' ? 0.34 : 0.16)

  context.fillStyle = baseColor
  context.fillRect(0, 0, 256, 256)

  if (pattern === 'rubber' || pattern === 'mobility') {
    drawTreadTexture(context, dark, light)
  } else if (pattern === 'warning' || pattern === 'weapon') {
    drawWarningTexture(context, dark, light)
  } else if (pattern === 'utility') {
    drawUtilityTexture(context, dark, light)
  } else if (pattern === 'light') {
    drawLightTexture(context, light)
  } else {
    drawPanelTexture(context, dark, light, pattern === 'armor' ? 58 : 64)
  }

  drawScuffs(context)
  texture.uScale = pattern === 'rubber' || pattern === 'mobility' ? 3 : 2
  texture.vScale = pattern === 'rubber' || pattern === 'mobility' ? 2.6 : 2
  texture.update(false)

  return texture
}

function drawPanelTexture(
  context: TextureDrawingContext,
  dark: string,
  light: string,
  step: number,
): void {
  context.strokeStyle = dark
  context.lineWidth = 3

  for (let offset = step; offset < 256; offset += step) {
    drawLine(context, offset, 0, offset, 256)
    drawLine(context, 0, offset, 256, offset)
  }

  context.strokeStyle = light
  context.lineWidth = 2

  for (let x = 28; x < 256; x += 68) {
    for (let y = 28; y < 256; y += 68) {
      drawLine(context, x - 8, y, x + 8, y)
      drawLine(context, x, y - 8, x, y + 8)
    }
  }
}

function drawTreadTexture(
  context: TextureDrawingContext,
  dark: string,
  light: string,
): void {
  context.fillStyle = rgbaFromHex('#030303', 0.34)

  for (let y = 8; y < 256; y += 24) {
    context.fillRect(0, y, 256, 10)
  }

  context.strokeStyle = dark
  context.lineWidth = 6

  for (let x = -32; x < 256; x += 34) {
    drawLine(context, x, 256, x + 72, 0)
  }

  context.strokeStyle = light
  context.lineWidth = 2

  for (let x = 20; x < 256; x += 52) {
    drawLine(context, x, 12, x, 244)
  }
}

function drawWarningTexture(
  context: TextureDrawingContext,
  dark: string,
  light: string,
): void {
  context.strokeStyle = rgbaFromHex('#101010', 0.54)
  context.lineWidth = 18

  for (let x = -220; x < 256; x += 52) {
    drawLine(context, x, 256, x + 256, 0)
  }

  context.strokeStyle = dark
  context.lineWidth = 3
  drawLine(context, 0, 42, 256, 42)
  drawLine(context, 0, 214, 256, 214)
  context.strokeStyle = light
  context.lineWidth = 2
  drawLine(context, 20, 128, 236, 128)
}

function drawUtilityTexture(
  context: TextureDrawingContext,
  dark: string,
  light: string,
): void {
  drawPanelTexture(context, dark, light, 72)
  context.strokeStyle = rgbaFromHex('#0a1012', 0.62)
  context.lineWidth = 5

  for (let y = 30; y < 256; y += 56) {
    drawLine(context, 28, y, 228, y)
  }

  context.fillStyle = light

  for (let x = 40; x < 256; x += 72) {
    context.fillRect(x, 112, 18, 18)
  }
}

function drawLightTexture(context: TextureDrawingContext, light: string): void {
  context.strokeStyle = light
  context.lineWidth = 12

  for (let y = 24; y < 256; y += 42) {
    drawLine(context, 0, y, 256, y)
  }
}

function drawScuffs(context: TextureDrawingContext): void {
  context.strokeStyle = rgbaFromHex('#ffffff', 0.13)
  context.lineWidth = 2

  for (let index = 0; index < 18; index += 1) {
    const x = (index * 47 + 19) % 256
    const y = (index * 71 + 31) % 256
    drawLine(context, x, y, x + 18, y + 5)
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
