import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector'

export function rotationFromYAxis(axis: Vector3): Quaternion {
  const up = Vector3.Up()
  const normalized = axis.normalize()
  const dot = Vector3.Dot(up, normalized)

  if (dot < -0.999) {
    return Quaternion.RotationAxis(Vector3.Right(), Math.PI)
  }

  const cross = Vector3.Cross(up, normalized)

  return new Quaternion(cross.x, cross.y, cross.z, 1 + dot).normalize()
}
