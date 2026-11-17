// Collision volume controls physics and destruction progress; nutrition controls growth.
// Sparse crowns, awnings and vehicles must not count as solid bounding boxes.
export function foodMassFor(spec, volume) {
  const v = Math.max(0, Number.isFinite(volume) ? volume : 0);
  if (Number.isFinite(spec.foodMass) && spec.foodMass >= 0) return Math.min(v, spec.foodMass);

  const ratedObject = spec.kind && spec.kind !== 'block' && spec.kind !== 'chunk';
  if (ratedObject && Number.isFinite(spec.pts) && spec.pts >= 0) return Math.min(v, .8 + spec.pts * .32);

  // Solo panels can be much larger than a vehicle. Taper the reward for their extra volume.
  return v <= 8 ? v : Math.min(v, 8 + 1.8 * Math.sqrt(v - 8));
}
