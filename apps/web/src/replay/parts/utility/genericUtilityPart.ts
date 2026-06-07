import type { UtilityPartRenderArgs } from './types'
import { createBatteryUtilityPart } from './batteryPart'
import { createBoosterUtilityPart } from './boosterPart'
import { createDroneControllerUtilityPart } from './droneControllerPart'
import { createPlainUtilityPart } from './plainUtilityPart'
import { createRepairKitUtilityPart } from './repairKitPart'
import { createSensorUtilityPart } from './sensorPart'
import { createSmokeUtilityPart } from './smokePart'

export function createGenericUtilityPart(args: UtilityPartRenderArgs, partId: string): void {
  if (partId.includes('Booster')) {
    createBoosterUtilityPart(args)
    return
  }

  if (partId.includes('Battery')) {
    createBatteryUtilityPart(args)
    return
  }

  if (partId.includes('Drone')) {
    createDroneControllerUtilityPart(args)
    return
  }

  if (partId.includes('Smoke')) {
    createSmokeUtilityPart(args)
    return
  }

  if (partId.includes('Sensor')) {
    createSensorUtilityPart(args)
    return
  }

  if (partId.includes('RepairKit')) {
    createRepairKitUtilityPart(args)
    return
  }

  createPlainUtilityPart(args)
}
