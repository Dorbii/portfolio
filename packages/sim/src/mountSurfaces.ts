import type {
  MountPoseInput,
  MountPoseParameters,
  MountSurface,
  OrientationBasis,
  PanelMountSurface,
  ResolvedMountPose,
  SphereMountSurface,
  ValidationIssue,
  ValidationResult,
  Vector3,
} from '../../schemas/src/index.js'
import {
  addVectors,
  applyYawRollToBasis,
  canonicalDegrees,
  canonicalUnit,
  canonicalVector,
  crossVectors,
  normalizeVector,
  scaleVector,
  surfaceBasis,
  vectorMagnitude,
} from './transforms.js'

export function validateMountPoseInput(input: MountPoseInput): ValidationResult {
  const issues: ValidationIssue[] = []

  if (!input.surface || typeof input.surface !== 'object') {
    issues.push(issue('INVALID_MOUNT_SURFACE', 'surface', 'Mount pose requires a surface definition.'))
    return { ok: false, issues }
  }

  validateSurface(input.surface, issues)
  pushFiniteNumberIssue(issues, input.u, 'u')
  pushFiniteNumberIssue(issues, input.v, 'v')
  pushFiniteNumberIssue(issues, input.yawDegrees ?? 0, 'yawDegrees')
  pushFiniteNumberIssue(issues, input.rollDegrees ?? 0, 'rollDegrees')

  if (Number.isFinite(input.u) && (input.u < 0 || input.u > 1)) {
    issues.push(issue('MOUNT_PARAMETER_OUT_OF_BOUNDS', 'u', 'Mount parameter u must be between 0 and 1.'))
  }

  if (Number.isFinite(input.v) && (input.v < 0 || input.v > 1)) {
    issues.push(issue('MOUNT_PARAMETER_OUT_OF_BOUNDS', 'v', 'Mount parameter v must be between 0 and 1.'))
  }

  if (Array.isArray(input.surface.accepts) && !input.surface.accepts.includes(input.partCategory)) {
    issues.push(issue(
      'MOUNT_SURFACE_CATEGORY_REJECTED',
      'partCategory',
      `${input.surface.id} does not accept ${input.partCategory} parts.`,
    ))
  }

  return issues.length === 0 ? { ok: true } : { ok: false, issues }
}

export function resolveMountPose(input: MountPoseInput): ResolvedMountPose {
  const validation = validateMountPoseInput(input)

  if (!validation.ok) {
    throw new Error(`Invalid mount pose input: ${validation.issues.map((entry) => entry.code).join(', ')}`)
  }

  const parameters = normalizeMountPoseParameters(input)

  return input.surface.kind === 'sphere'
    ? resolveSphereMountPose(input.surface, input.partCategory, parameters)
    : resolvePanelMountPose(input.surface, input.partCategory, parameters)
}

function resolveSphereMountPose(
  surface: SphereMountSurface,
  partCategory: MountPoseInput['partCategory'],
  parameters: MountPoseParameters,
): ResolvedMountPose {
  const azimuth = parameters.u * Math.PI * 2
  const elevation = (parameters.v - 0.5) * Math.PI
  const horizontal = Math.cos(elevation)
  const surfaceNormal = canonicalVector([
    Math.sin(azimuth) * horizontal,
    Math.sin(elevation),
    Math.cos(azimuth) * horizontal,
  ])
  const tangent = canonicalVector([Math.cos(azimuth), 0, -Math.sin(azimuth)])
  const bitangent = normalizeVector(crossVectors(tangent, surfaceNormal), [0, 1, 0])
  const orientation = applyYawRollToBasis(
    surfaceBasis(surfaceNormal, tangent, bitangent),
    parameters.yawDegrees,
    parameters.rollDegrees,
  )
  const position = addVectors(surface.center, scaleVector(surfaceNormal, surface.radius))

  return resolvedPose(surface, partCategory, parameters, position, surfaceNormal, orientation)
}

function resolvePanelMountPose(
  surface: PanelMountSurface,
  partCategory: MountPoseInput['partCategory'],
  parameters: MountPoseParameters,
): ResolvedMountPose {
  const uOffset = (parameters.u - 0.5) * surface.size[0]
  const vOffset = (parameters.v - 0.5) * surface.size[1]
  const surfaceNormal = normalizeVector(surface.normal)
  const position = addVectors(
    addVectors(surface.center, scaleVector(normalizeVector(surface.uAxis), uOffset)),
    scaleVector(normalizeVector(surface.vAxis), vOffset),
  )
  const orientation = applyYawRollToBasis(
    surfaceBasis(surfaceNormal, surface.uAxis, surface.vAxis),
    parameters.yawDegrees,
    parameters.rollDegrees,
  )

  return resolvedPose(surface, partCategory, parameters, position, surfaceNormal, orientation)
}

function resolvedPose(
  surface: MountSurface,
  partCategory: MountPoseInput['partCategory'],
  parameters: MountPoseParameters,
  position: Vector3,
  surfaceNormal: Vector3,
  orientation: OrientationBasis,
): ResolvedMountPose {
  return {
    surfaceId: surface.id,
    surfaceKind: surface.kind,
    partCategory,
    parameters,
    position: canonicalVector(position),
    surfaceNormal: canonicalVector(surfaceNormal),
    orientation,
  }
}

function normalizeMountPoseParameters(input: MountPoseInput): MountPoseParameters {
  return {
    u: canonicalUnit(input.u, input.surface.kind === 'sphere'),
    v: canonicalUnit(input.v, false),
    yawDegrees: canonicalDegrees(input.yawDegrees ?? 0),
    rollDegrees: canonicalDegrees(input.rollDegrees ?? 0),
  }
}

function validateSurface(surface: MountSurface, issues: ValidationIssue[]): void {
  if (typeof surface.id !== 'string' || surface.id.length === 0) {
    issues.push(issue('INVALID_MOUNT_SURFACE', 'surface.id', 'Mount surface id is required.'))
  }

  if (!Array.isArray(surface.accepts) || surface.accepts.length === 0) {
    issues.push(issue('INVALID_MOUNT_SURFACE', 'surface.accepts', 'Mount surface must accept at least one part category.'))
  }

  if (surface.kind === 'sphere') {
    validateVector(surface.center, 'surface.center', issues)
    pushFiniteNumberIssue(issues, surface.radius, 'surface.radius')

    if (Number.isFinite(surface.radius) && surface.radius <= 0) {
      issues.push(issue('INVALID_MOUNT_SURFACE', 'surface.radius', 'Sphere mount surface radius must be positive.'))
    }

    return
  }

  if (surface.kind === 'panel') {
    validateVector(surface.center, 'surface.center', issues)
    validateVector(surface.normal, 'surface.normal', issues)
    validateVector(surface.uAxis, 'surface.uAxis', issues)
    validateVector(surface.vAxis, 'surface.vAxis', issues)
    if (!Array.isArray(surface.size) || surface.size.length !== 2) {
      issues.push(issue('INVALID_MOUNT_SURFACE', 'surface.size', 'Panel mount surface size must have two components.'))
      return
    }

    pushFiniteNumberIssue(issues, surface.size[0], 'surface.size.0')
    pushFiniteNumberIssue(issues, surface.size[1], 'surface.size.1')

    if (Number.isFinite(surface.size[0]) && surface.size[0] <= 0) {
      issues.push(issue('INVALID_MOUNT_SURFACE', 'surface.size.0', 'Panel mount surface width must be positive.'))
    }

    if (Number.isFinite(surface.size[1]) && surface.size[1] <= 0) {
      issues.push(issue('INVALID_MOUNT_SURFACE', 'surface.size.1', 'Panel mount surface height must be positive.'))
    }

    if (vectorMagnitude(surface.normal) === 0) {
      issues.push(issue('INVALID_MOUNT_SURFACE', 'surface.normal', 'Panel mount surface normal must not be zero.'))
    }

    if (vectorMagnitude(surface.uAxis) === 0) {
      issues.push(issue('INVALID_MOUNT_SURFACE', 'surface.uAxis', 'Panel mount surface uAxis must not be zero.'))
    }

    if (vectorMagnitude(surface.vAxis) === 0) {
      issues.push(issue('INVALID_MOUNT_SURFACE', 'surface.vAxis', 'Panel mount surface vAxis must not be zero.'))
    }

    return
  }

  issues.push(issue('INVALID_MOUNT_SURFACE', 'surface.kind', 'Mount surface kind must be panel or sphere.'))
}

function validateVector(vector: Vector3, path: string, issues: ValidationIssue[]): void {
  if (!Array.isArray(vector) || vector.length !== 3) {
    issues.push(issue('INVALID_MOUNT_SURFACE', path, `${path} must be a three-component vector.`))
    return
  }

  vector.forEach((component, index) => {
    pushFiniteNumberIssue(issues, component, `${path}.${index}`)
  })
}

function pushFiniteNumberIssue(issues: ValidationIssue[], value: number, path: string): void {
  if (!Number.isFinite(value)) {
    issues.push(issue('INVALID_MOUNT_PARAMETER', path, `${path} must be a finite number.`))
  }
}

function issue(code: string, path: string, message: string): ValidationIssue {
  return {
    code,
    path,
    message,
  }
}
