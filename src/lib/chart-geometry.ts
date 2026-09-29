export const FLOW_GEOMETRY = {
  top: 218,
  bottom: 276,
  zero: 247,
  maxHeight: 25,
} as const;

export function flowBarGeometry(value: number, maxAbs: number): { y: number; height: number } {
  const height = maxAbs > 0 ? Math.min(FLOW_GEOMETRY.maxHeight, (Math.abs(value) / maxAbs) * FLOW_GEOMETRY.maxHeight) : 0;
  return { y: value >= 0 ? FLOW_GEOMETRY.zero - height : FLOW_GEOMETRY.zero, height };
}
