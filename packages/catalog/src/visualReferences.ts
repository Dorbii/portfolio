export type PartVisualReference = {
  partId: string
  references: string[]
  approvedForRuntimeAsset: false
  noReferenceReason?: string
  notes: string[]
}

export const PART_VISUAL_REFERENCES: PartVisualReference[] = [
  reference('Armor_Cage', ['local_docs/part_references/Armor_Cage_ref.png'], [
    'Use structural cage members with visible spacing and bracketed joints.',
  ]),
  reference('Armor_Front_Plate', ['local_docs/part_references/Armor_Front_Plate_ref.png'], [
    'Keep the front plate visibly directional and thick enough to read from broadcast camera.',
  ]),
  reference('Armor_Heavy', ['local_docs/part_references/Armor_Heavy_ref.png'], [
    'Use layered heavy plate language with dents and chipped paint.',
  ]),
  reference('Armor_Light', ['local_docs/part_references/Armor_Light_ref.png'], [
    'Use thinner panel language so light armor does not read as heavy plating.',
  ]),
  reference('Armor_Reactive', ['local_docs/part_references/Armor_Reactive_ref.png'], [
    'Use discrete sacrificial panels rather than a single slab.',
  ]),
  reference('Armor_Shield', ['local_docs/part_references/Armor_Shield_ref.png'], [
    'Keep shield silhouette broad and protective without implying weapon behavior.',
  ]),
  reference('Armor_Spiked', ['local_docs/part_references/Armor_Spiked_ref.png'], [
    'Spikes should read as defensive protrusions unless behavior says otherwise.',
  ]),
  reference('Body_Cylinder_Large', ['local_docs/part_references/Body_Cylinder_Large_ref.png'], [
    'Make the large cylinder visually distinct from square chassis blocks.',
  ]),
  reference('Body_Cylinder_Small', ['local_docs/part_references/Body_Cylinder_Small_ref.png'], [
    'Keep compact cylindrical core language readable at catalog scale.',
  ]),
  reference('Body_Heavy_Block', ['local_docs/part_references/Body_Heavy_Block_ref.png'], [
    'Use heavy block massing with seams and bolted structure.',
  ]),
  reference('Body_Light_Frame', ['local_docs/part_references/Body_Light_Frame_ref.png'], [
    'Use open frame rails and brackets instead of a solid block.',
  ]),
  reference('Body_Rectangle_Long', ['local_docs/part_references/Body_Rectangle_Long_ref.png'], [
    'Emphasize long chassis proportions and mount surfaces.',
  ]),
  reference('Body_Square_Large', ['local_docs/part_references/Body_Square_Large_ref.png'], [
    'Keep large square core visually heavier than the small and medium variants.',
  ]),
  reference('Body_Square_Medium', ['local_docs/part_references/Body_Square_Medium_ref.png'], [
    'Use medium square core proportions and simple panel structure.',
  ]),
  reference('Body_Square_Small', ['local_docs/part_references/Body_Square_Small_ref.png'], [
    'Keep small square core compact but visibly mountable.',
  ]),
  reference('Body_Wedge', ['local_docs/part_references/Body_Wedge_ref.png'], [
    'Wedge silhouette should stay directional and low.',
  ]),
  reference('Leg_Spring', ['local_docs/part_references/Leg_Spring_ref.png'], [
    'Use spring or linkage language without changing movement mechanics.',
  ]),
  reference('Skid_Plate', ['local_docs/part_references/Skid_Plate_ref.png'], [
    'Skid plate should read as a low-friction contact surface.',
  ]),
  reference('Tread_Heavy', ['local_docs/part_references/Tread_Heavy_ref.png'], [
    'Use heavy belt and roller detail.',
  ]),
  reference('Tread_Light', ['local_docs/part_references/Tread_Light_ref.png'], [
    'Use lighter track language with clear belt direction.',
  ]),
  reference('Wheel_Large', ['local_docs/part_references/Wheel_Large_ref.png'], [
    'Large wheel should read as heavy rubber and hub structure.',
  ]),
  reference('Wheel_Medium', ['local_docs/part_references/Wheel_Medium_ref.png'], [
    'Medium wheel should preserve rubber and rim separation.',
  ]),
  reference('Wheel_Omni', [
    'local_docs/part_references/omni_wheel_reference.jpg',
    'local_docs/part_references/omni_wheel_plastic.jpg',
  ], [
    'Omni wheel needs visible roller language.',
  ]),
  reference('Wheel_Small', ['local_docs/part_references/Wheel_Small_ref.png'], [
    'Small wheel should still read as rubber, not a metal puck.',
  ]),
  reference('Wheel_Spiked', ['local_docs/part_references/Wheel_Spiked_ref.png'], [
    'Spikes should stay visual/mobility language unless behavior changes.',
  ]),
  reference('Wheel_Tank', ['local_docs/part_references/tank_wheel_reference.jpg'], [
    'Use tank wheel reference for wheel-belt industrial language.',
  ]),
  reference('Utility_Anchor', ['local_docs/part_references/Utility_Anchor_ref.png'], [
    'Anchor should read as clamp or ground-locking hardware.',
  ]),
  reference('Utility_Booster', ['local_docs/part_references/Utility_Booster_ref.png'], [
    'Booster should use nozzle and thrust hardware language.',
  ]),
  reference('Utility_DroneController', ['local_docs/part_references/Utility_DroneController_ref.png'], [
    'Drone controller should read as a control module, not a generic box.',
  ]),
  reference('Utility_Gyro', ['local_docs/part_references/Utility_Gyro_ref.png'], [
    'Gyro should show stabilization rotor or gimbal language.',
  ]),
  reference('Utility_Magnet', ['local_docs/part_references/Utility_Magnet_ref.png'], [
    'Magnet should be visually distinct from battery and energy modules.',
  ]),
  reference('Utility_RepairKit', ['local_docs/part_references/Utility_RepairKit_ref.png'], [
    'Repair kit should read as service hardware.',
  ]),
  reference('Utility_Sensor', ['local_docs/part_references/Utility_Sensor_ref.png'], [
    'Sensor should include lens or glass material language.',
  ]),
  reference('Utility_Smoke', ['local_docs/part_references/Utility_Smoke_ref.png'], [
    'Smoke should imply canister and emitter hardware.',
  ]),
  reference('Weapon_Flipper', ['local_docs/part_references/Weapon_Flipper_ref.png'], [
    'Flipper needs hinge and lift mechanism language.',
  ]),
  reference('Weapon_Grabber', ['local_docs/part_references/Weapon_Grabber_ref.png'], [
    'Grabber should show jaws, arms, and pivot structure.',
  ]),
  reference('Weapon_Hammer', ['local_docs/part_references/Weapon_Hammer_ref.png'], [
    'Use thick pivot bracket, impact head wear, and warning stripes near swing arc.',
  ]),
  reference('Weapon_Net', ['local_docs/part_references/Weapon_Net_ref.png'], [
    'Net launcher should not read as a generic box.',
  ]),
  reference('Weapon_Ram', ['local_docs/part_references/Weapon_Ram_ref.png'], [
    'Ram should read as reinforced impact structure.',
  ]),
  reference('Weapon_Saw', ['local_docs/part_references/Weapon_Saw_ref.png'], [
    'Saw needs a readable toothed edge and guard/mount language.',
  ]),
  reference('Weapon_Spear', ['local_docs/part_references/Weapon_Spear_ref.png'], [
    'Spear should read as a piercing weapon with a stable mount.',
  ]),
  reference('Weapon_Spinner_Large', ['local_docs/part_references/Weapon_Spinner_Large_ref.png'], [
    'Large spinner should emphasize dangerous rotational mass.',
  ]),
  reference('Weapon_Spinner_Small', ['local_docs/part_references/Weapon_Spinner_Small_ref.png'], [
    'Small spinner should still show sharp rotational edge language.',
  ]),
  reference('Weapon_Turret', ['local_docs/part_references/Weapon_Turret_ref.png'], [
    'Turret needs base, ring, and barrel distinction.',
  ]),
  reference('Style_Crown', ['local_docs/part_references/Style_Crown_ref.png'], [
    'Crown should read clearly at catalog scale and look intentionally expensive.',
  ]),
  reference('Style_DragonHead', ['local_docs/part_references/Style_DragonHead_ref.png'], [
    'Dragon head may use idle flair only; combat fire must remain behavior-backed.',
  ]),
  reference('Style_Flag', ['local_docs/part_references/Style_Flag_ref.png'], [
    'Flag should be readable without hiding bot silhouette.',
  ]),
  reference('Style_Neon', ['local_docs/part_references/Style_Neon_ref.png'], [
    'Neon may pulse visually but must not claim unsupported effects.',
  ]),
  reference('Style_Spikes', ['local_docs/part_references/Style_Spikes_ref.png'], [
    'Style spikes should be loud cosmetics without new combat behavior claims.',
  ]),
  reference('Style_TrashCan', ['local_docs/part_references/Style_TrashCan_ref.png'], [
    'Trash can shell should look intentionally mounted, not accidental clutter.',
  ]),
  reference('Style_Wings', ['local_docs/part_references/Style_Wings_ref.png'], [
    'Wings may idle/buffet visually without fabricating combat outcomes.',
  ]),
]

export const PART_VISUAL_REFERENCE_IDS = new Set(PART_VISUAL_REFERENCES.map((entry) => entry.partId))

function reference(
  partId: string,
  references: string[],
  notes: string[],
): PartVisualReference {
  return {
    partId,
    references,
    approvedForRuntimeAsset: false,
    notes,
  }
}
