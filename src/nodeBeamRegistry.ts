/**
 * Dependency-free registry for the node-beam system builder.
 *
 * Keep this module free of imports. `nodeBeamPhysics` registers its builder at
 * module evaluation time; when that call went through `vehicleHelpers`, which
 * sits inside a large import cycle (vehicleHelpers -> vehicleCatalog ->
 * CarDealershipModal -> ... -> physics -> nodeBeamPhysics), the registry
 * variable was still in its temporal dead zone and the production bundle threw
 * "Cannot access '...' before initialization" before the app could start.
 */
export type NodeBeamBuilder = (car: any) => any;

let _nodeBeamBuilder: NodeBeamBuilder | null = null;

export function registerNodeBeamBuilder(builder: NodeBeamBuilder): void {
  _nodeBeamBuilder = builder;
}

export function createNodeBeamForVehicle(car: any) {
  if (_nodeBeamBuilder) return _nodeBeamBuilder(car);
  return null;
}
