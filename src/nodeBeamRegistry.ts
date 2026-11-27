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
export type NodeBeamPowertrainUpdater = (car: any) => void;

// Use `var` intentionally so registration can never hit a Temporal Dead Zone
// even if bundler chunk ordering evaluates callers before this module body.
var _nodeBeamBuilder: NodeBeamBuilder | null = null;
var _nodeBeamPowertrainUpdater: NodeBeamPowertrainUpdater | null = null;

export function registerNodeBeamBuilder(builder: NodeBeamBuilder): void {
  _nodeBeamBuilder = builder;
}

export function registerNodeBeamPowertrainUpdater(updater: NodeBeamPowertrainUpdater): void {
  _nodeBeamPowertrainUpdater = updater;
}

export function createNodeBeamForVehicle(car: any) {
  if (_nodeBeamBuilder) return _nodeBeamBuilder(car);
  return null;
}

export function syncNodeBeamPowertrain(car: any): void {
  if (_nodeBeamPowertrainUpdater) _nodeBeamPowertrainUpdater(car);
}

