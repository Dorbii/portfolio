import { PointLight } from '@babylonjs/core/Lights/pointLight'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import type { Scene } from '@babylonjs/core/scene'
import type { TeamRole } from '../../../../packages/schemas/src/index.js'
import type { AssemblyResources } from './botAssemblyAnimation'

export function createAssemblyRoom(scene: Scene, role: TeamRole): AssemblyResources['rig'] {
  const teamPrimary = role === 'red' ? '#fc4f5d' : '#5eb2ff'
  const teamAccent = role === 'red' ? '#ff2e44' : '#338eff'
  const teamSoft = role === 'red' ? '#ff8f92' : '#8bc7ff'
  const floorMaterial = createAssemblyMaterial(scene, 'assembly-floor-mat', '#171d24', '#06070c')
  const pitMaterial = createAssemblyMaterial(scene, 'assembly-pit-mat', '#212a33', '#0a0c11')
  const wallMaterial = createAssemblyMaterial(scene, 'assembly-wall-mat', '#1f272f', '#090a0c')
  const railMaterial = createAssemblyMaterial(scene, 'assembly-rail-mat', '#333f4a', '#090b10')
  const trimMaterial = createAssemblyMaterial(scene, 'assembly-trim-mat', '#0b0d12', '#020203')
  const detailMaterial = createAssemblyMaterial(scene, 'assembly-detail-mat', '#4c5d6d', '#1a1f24')
  const teamMaterial = createAssemblyMaterial(scene, 'assembly-team-mat', teamPrimary, teamAccent)
  const teamSignalMaterial = createAssemblyMaterial(scene, 'assembly-team-signal-mat', teamSoft, teamAccent, 0.78)
  const workLightMaterial = createAssemblyMaterial(scene, 'assembly-work-light-mat', '#fff3c4', '#ffcf6d', 0.86)
  const toolHeadMaterial = createAssemblyMaterial(scene, 'assembly-tool-head-mat', '#a9bbc8', '#303942')
  const warningMaterial = createAssemblyMaterial(scene, 'assembly-warning-mat', '#d4ae42', '#473005')
  const sparkMaterial = createAssemblyMaterial(scene, 'assembly-spark-mat', '#ffe8a3', '#ffba32', 0.88)

  const shell = MeshBuilder.CreateBox('assembly-shell-floor', { width: 8, height: 0.14, depth: 5.8 }, scene)
  shell.position.y = -0.13
  shell.material = floorMaterial

  const pitDeck = MeshBuilder.CreateBox('assembly-pit-deck', { width: 5.4, height: 0.12, depth: 3.45 }, scene)
  pitDeck.position.set(0, -0.025, -0.1)
  pitDeck.material = pitMaterial

  for (let index = 0; index < 7; index += 1) {
    const marker = MeshBuilder.CreateBox(`assembly-floor-rail-${index}`, { width: 0.06, height: 0.01, depth: 3.45 }, scene)

    marker.position.set(-2.4 + index * 0.8, -0.02, -0.1)
    marker.material = detailMaterial
  }

  for (let index = 0; index < 4; index += 1) {
    const seam = MeshBuilder.CreateBox(`assembly-floor-panel-seam-${index}`, { width: 5.4, height: 0.012, depth: 0.045 }, scene)

    seam.position.set(0, -0.015, -1.32 + index * 0.82)
    seam.material = trimMaterial
  }

  const backWall = MeshBuilder.CreateBox('assembly-back-wall', { width: 8, height: 2.8, depth: 0.14 }, scene)
  backWall.position.set(0, 1.1, 2.77)
  backWall.material = wallMaterial

  for (let index = 0; index < 5; index += 1) {
    const wallPanel = MeshBuilder.CreateBox(`assembly-back-wall-panel-${index}`, { width: 1.18, height: 1.05, depth: 0.04 }, scene)

    wallPanel.position.set(-2.7 + index * 1.35, 1.25, 2.68)
    wallPanel.material = index % 2 === 0 ? wallMaterial : trimMaterial
  }

  const toolRack = MeshBuilder.CreateBox('assembly-tool-rack', { width: 1.55, height: 0.5, depth: 0.08 }, scene)
  toolRack.position.set(-2.7, 1.33, 2.55)
  toolRack.material = trimMaterial

  for (let index = 0; index < 4; index += 1) {
    const toolPeg = MeshBuilder.CreateCylinder(
      `assembly-tool-peg-${index}`,
      { height: 0.34, diameter: 0.035, tessellation: 8 },
      scene,
    )
    const toolGrip = MeshBuilder.CreateBox(`assembly-tool-grip-${index}`, { width: 0.08, height: 0.26, depth: 0.05 }, scene)

    toolPeg.position.set(-3.22 + index * 0.35, 1.36, 2.45)
    toolPeg.rotation.x = Math.PI / 2
    toolPeg.material = detailMaterial
    toolGrip.position.set(-3.22 + index * 0.35, 1.2, 2.42)
    toolGrip.rotation.z = index % 2 === 0 ? 0.2 : -0.14
    toolGrip.material = toolHeadMaterial
  }

  const leftWall = MeshBuilder.CreateBox('assembly-left-wall', { width: 0.14, height: 2.8, depth: 5.8 }, scene)
  const rightWall = MeshBuilder.CreateBox('assembly-right-wall', { width: 0.14, height: 2.8, depth: 5.8 }, scene)
  leftWall.position.set(-3.93, 1.1, -0.02)
  rightWall.position.set(3.93, 1.1, -0.02)
  leftWall.material = wallMaterial
  rightWall.material = wallMaterial

  const pitWallLeft = MeshBuilder.CreateBox('assembly-pit-wall-left', { width: 0.1, height: 1.1, depth: 3.45 }, scene)
  const pitWallRight = MeshBuilder.CreateBox('assembly-pit-wall-right', { width: 0.1, height: 1.1, depth: 3.45 }, scene)
  pitWallLeft.position.set(-2.65, 0.44, -0.1)
  pitWallRight.position.set(2.65, 0.44, -0.1)
  pitWallLeft.material = wallMaterial
  pitWallRight.material = wallMaterial

  const stationDeck = MeshBuilder.CreateCylinder('assembly-station-deck', { height: 0.08, diameter: 2.9, tessellation: 18 }, scene)
  stationDeck.position.y = 0.04
  stationDeck.material = teamMaterial

  const ring = MeshBuilder.CreateTorus('assembly-cradle-ring', { diameter: 3.0, thickness: 0.08, tessellation: 28 }, scene)
  ring.position.y = 0.14
  ring.rotation.x = Math.PI / 2
  ring.material = warningMaterial

  const cradlePostL = MeshBuilder.CreateCylinder(
    'assembly-cradle-post-l',
    { height: 0.48, diameterTop: 0.18, diameterBottom: 0.26, tessellation: 10 },
    scene,
  )
  const cradlePostR = MeshBuilder.CreateCylinder(
    'assembly-cradle-post-r',
    { height: 0.48, diameterTop: 0.18, diameterBottom: 0.26, tessellation: 10 },
    scene,
  )
  cradlePostL.position.set(-1.15, 0.24, 0)
  cradlePostR.position.set(1.15, 0.24, 0)
  cradlePostL.material = detailMaterial
  cradlePostR.material = detailMaterial

  for (let side = -1; side <= 1; side += 2) {
    const jackBase = MeshBuilder.CreateCylinder(
      `assembly-cradle-jack-base-${side}`,
      { height: 0.08, diameter: 0.44, tessellation: 10 },
      scene,
    )
    const jackPiston = MeshBuilder.CreateCylinder(
      `assembly-cradle-jack-piston-${side}`,
      { height: 0.58, diameter: 0.08, tessellation: 8 },
      scene,
    )
    const jackPad = MeshBuilder.CreateBox(
      `assembly-cradle-jack-pad-${side}`,
      { width: 0.5, height: 0.08, depth: 0.28 },
      scene,
    )

    jackBase.position.set(side * 1.55, 0.1, -0.7)
    jackPiston.position.set(side * 1.55, 0.4, -0.7)
    jackPad.position.set(side * 1.55, 0.72, -0.7)
    jackBase.material = trimMaterial
    jackPiston.material = detailMaterial
    jackPad.material = warningMaterial
  }

  const clampRing = MeshBuilder.CreateTorus('assembly-rig-clamp-ring', { diameter: 1.8, thickness: 0.1, tessellation: 24 }, scene)
  clampRing.position.y = 0.54
  clampRing.rotation.x = Math.PI / 2
  clampRing.material = trimMaterial

  const leftColumn = MeshBuilder.CreateBox('assembly-column-left', { width: 0.24, height: 2.5, depth: 0.24 }, scene)
  const rightColumn = MeshBuilder.CreateBox('assembly-column-right', { width: 0.24, height: 2.5, depth: 0.24 }, scene)
  leftColumn.position.set(-2.82, 0.98, -0.45)
  rightColumn.position.set(2.82, 0.98, -0.45)
  leftColumn.material = railMaterial
  rightColumn.material = railMaterial

  const beam = MeshBuilder.CreateBox('assembly-gantry-beam', { width: 5.6, height: 0.18, depth: 0.28 }, scene)
  beam.position.set(0, 2.72, -0.45)
  beam.material = trimMaterial

  const trolley = MeshBuilder.CreateBox(
    'assembly-gantry-trolley',
    { width: 1.0, height: 0.16, depth: 0.42 },
    scene,
  )
  trolley.position.set(0.08, 2.66, -0.45)
  trolley.material = detailMaterial

  const hoistCable = MeshBuilder.CreateCylinder(
    'assembly-hoist-cable',
    { height: 1.08, diameter: 0.035, tessellation: 8 },
    scene,
  )
  hoistCable.position.set(0.08, 2.05, -0.45)
  hoistCable.material = trimMaterial

  const suspendedPanel = MeshBuilder.CreateBox(
    'assembly-suspended-armor-panel',
    { width: 1.0, height: 0.08, depth: 0.48 },
    scene,
  )
  suspendedPanel.position.set(0.08, 1.46, -0.45)
  suspendedPanel.rotation.z = role === 'red' ? -0.12 : 0.12
  suspendedPanel.material = teamMaterial

  const leftRigArm = MeshBuilder.CreateBox(
    'assembly-tool-arm-left',
    { width: 2.1, height: 0.12, depth: 0.22 },
    scene,
  )
  const rightRigArm = MeshBuilder.CreateBox(
    'assembly-tool-arm-right',
    { width: 2.1, height: 0.12, depth: 0.22 },
    scene,
  )
  leftRigArm.position.set(-0.95, 1.92, 0.42)
  rightRigArm.position.set(0.95, 1.92, 0.42)
  leftRigArm.rotation.z = 0.11
  rightRigArm.rotation.z = -0.11
  leftRigArm.material = railMaterial
  rightRigArm.material = railMaterial

  const leftClamp = MeshBuilder.CreateBox('assembly-tool-clamp-left', { width: 0.34, height: 0.18, depth: 0.3 }, scene)
  const rightClamp = MeshBuilder.CreateBox('assembly-tool-clamp-right', { width: 0.34, height: 0.18, depth: 0.3 }, scene)
  leftClamp.position.set(-0.55, 1.42, 1.12)
  rightClamp.position.set(0.55, 1.42, 1.12)
  leftClamp.material = teamMaterial
  rightClamp.material = teamMaterial

  const leftToolHead = MeshBuilder.CreateCylinder(
    'assembly-tool-head-left',
    { height: 0.34, diameterTop: 0.08, diameterBottom: 0.18, tessellation: 10 },
    scene,
  )
  const rightToolHead = MeshBuilder.CreateCylinder(
    'assembly-tool-head-right',
    { height: 0.34, diameterTop: 0.08, diameterBottom: 0.18, tessellation: 10 },
    scene,
  )
  leftToolHead.position.set(-0.18, 1.18, 0.85)
  rightToolHead.position.set(0.18, 1.18, 0.85)
  leftToolHead.rotation.x = Math.PI / 2
  rightToolHead.rotation.x = Math.PI / 2
  leftToolHead.material = toolHeadMaterial
  rightToolHead.material = toolHeadMaterial

  const overheadRails = MeshBuilder.CreateBox('assembly-gantry-rails', { width: 5.6, height: 0.06, depth: 0.06 }, scene)
  overheadRails.position.set(0, 2.34, 0.32)
  overheadRails.material = detailMaterial

  for (let index = 0; index < 3; index += 1) {
    const taskLight = MeshBuilder.CreateBox(`assembly-task-light-${index}`, { width: 0.62, height: 0.05, depth: 0.12 }, scene)

    taskLight.position.set(-1.35 + index * 1.35, 2.18, 1.68)
    taskLight.rotation.x = -0.22
    taskLight.material = workLightMaterial
  }

  for (let side = -1; side <= 1; side += 2) {
    const teamStrip = MeshBuilder.CreateBox(
      `assembly-team-light-strip-${side}`,
      { width: 0.08, height: 0.08, depth: 2.1 },
      scene,
    )

    teamStrip.position.set(side * 3.08, 0.34, 0.25)
    teamStrip.material = teamSignalMaterial
  }

  for (let index = 0; index < 4; index += 1) {
    const monitor = MeshBuilder.CreateBox(`assembly-control-node-${index}`, { width: 0.26, height: 0.2, depth: 0.12 }, scene)

    monitor.position.set(-2.06 + index * 1.37, 1.85, 2.24)
    monitor.rotation.y = -0.5
    monitor.material = index % 2 === 0 ? teamMaterial : trimMaterial
  }

  const supportPanel = MeshBuilder.CreateBox('assembly-support-panel', { width: 1.05, height: 0.5, depth: 0.16 }, scene)
  supportPanel.position.set(2.96, 0.86, -1.76)
  supportPanel.material = detailMaterial

  const ventStack = MeshBuilder.CreateCylinder(
    'assembly-vent-stack',
    { height: 0.86, diameterTop: 0.28, diameterBottom: 0.45, tessellation: 10 },
    scene,
  )
  ventStack.position.set(-2.8, 0.7, 0.6)
  ventStack.material = trimMaterial

  const leftPartsCart = MeshBuilder.CreateBox('assembly-left-parts-cart', { width: 1.0, height: 0.14, depth: 0.78 }, scene)
  const rightPartsCart = MeshBuilder.CreateBox('assembly-right-parts-cart', { width: 1.0, height: 0.14, depth: 0.78 }, scene)
  leftPartsCart.position.set(-2.45, 0.14, -1.62)
  rightPartsCart.position.set(2.45, 0.14, -1.62)
  leftPartsCart.material = trimMaterial
  rightPartsCart.material = trimMaterial

  for (let side = -1; side <= 1; side += 2) {
    const stagedWheel = MeshBuilder.CreateCylinder(
      `assembly-staged-wheel-${side}`,
      { height: 0.22, diameter: 0.46, tessellation: 14 },
      scene,
    )
    const stagedArmor = MeshBuilder.CreateBox(
      `assembly-staged-armor-${side}`,
      { width: 0.56, height: 0.08, depth: 0.36 },
      scene,
    )
    const stagedWeaponDisc = MeshBuilder.CreateCylinder(
      `assembly-staged-disc-${side}`,
      { height: 0.09, diameter: 0.5, tessellation: 18 },
      scene,
    )

    stagedWheel.position.set(side * 2.62, 0.38, -1.82)
    stagedWheel.rotation.z = Math.PI / 2
    stagedArmor.position.set(side * 2.28, 0.32, -1.48)
    stagedArmor.rotation.y = side * 0.22
    stagedWeaponDisc.position.set(side * 2.54, 0.35, -1.32)
    stagedWeaponDisc.rotation.x = Math.PI / 2
    stagedWheel.material = trimMaterial
    stagedArmor.material = side === -1 ? teamMaterial : detailMaterial
    stagedWeaponDisc.material = warningMaterial
  }

  for (let index = 0; index < 5; index += 1) {
    const crate = MeshBuilder.CreateBox(`assembly-part-crate-${index}`, { width: 0.38, height: 0.26, depth: 0.34 }, scene)

    crate.position.set(-3.05 + index * 0.34, 0.22 + (index % 2) * 0.11, -2.0)
    crate.rotation.y = index * 0.18
    crate.material = index === 2 ? teamMaterial : detailMaterial
  }

  for (let index = 0; index < 3; index += 1) {
    const beam = MeshBuilder.CreateBox(
      `assembly-floor-beam-${index}`,
      { width: 0.06, height: 1.12, depth: 0.06 },
      scene,
    )

    beam.position.set(-2.65 + index * 2.65, 0.42, -1.6)
    beam.material = trimMaterial
  }

  const sparks = Array.from({ length: 14 }, (_, index) => {
    const spark = MeshBuilder.CreateSphere(`assembly-weld-spark-${index}`, { diameter: 0.045, segments: 6 }, scene)
    const basePosition = new Vector3(
      -0.22 + (index % 4) * 0.14,
      0.86 + (index % 3) * 0.08,
      0.55 + (index % 5) * 0.08,
    )

    spark.position.copyFrom(basePosition)
    spark.material = sparkMaterial

    return {
      mesh: spark,
      basePosition,
      phase: index * 0.37,
    }
  })

  return {
    trolley,
    hoistCable,
    suspendedPanel,
    leftArm: leftRigArm,
    rightArm: rightRigArm,
    leftToolHead,
    rightToolHead,
    leftClamp,
    rightClamp,
    clampRing,
    sparks,
    trolleyBaseX: trolley.position.x,
    suspendedPanelBaseY: suspendedPanel.position.y,
    leftClampBaseY: leftClamp.position.y,
    rightClampBaseY: rightClamp.position.y,
    leftArmBaseZ: leftRigArm.position.z,
    rightArmBaseZ: rightRigArm.position.z,
  }
}

export function createTeamBayLights(scene: Scene, role: TeamRole): PointLight[] {
  const teamColor = role === 'red' ? '#ff5c6c' : '#5c91ff'
  const portLight = new PointLight(
    'assembly-team-port-light',
    new Vector3(-1.9, 1.95, 2.0),
    scene,
  )
  const starboardLight = new PointLight(
    'assembly-team-starboard-light',
    new Vector3(1.9, 1.95, 2.0),
    scene,
  )
  const overheadLight = new PointLight(
    'assembly-team-overhead-light',
    new Vector3(0, 2.65, -0.6),
    scene,
  )

  portLight.intensity = 0.5
  starboardLight.intensity = 0.5
  overheadLight.intensity = 0.4

  portLight.diffuse = Color3.FromHexString(teamColor)
  starboardLight.diffuse = Color3.FromHexString(teamColor)
  overheadLight.diffuse = Color3.FromHexString(role === 'red' ? '#ff6f7f' : '#6ca6ff')

  return [portLight, starboardLight, overheadLight]
}

export function createAssemblyMaterial(
  scene: Scene,
  name: string,
  diffuse: string,
  emissive: string,
  alpha = 1,
): StandardMaterial {
  const material = new StandardMaterial(name, scene)

  material.diffuseColor = Color3.FromHexString(diffuse)
  material.emissiveColor = Color3.FromHexString(emissive)
  material.specularColor = new Color3(0.18, 0.18, 0.16)
  material.alpha = alpha
  material.backFaceCulling = alpha >= 1

  return material
}
