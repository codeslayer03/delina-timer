export const FEATURES = ['music', 'timer', 'weather', 'quotes'];
export function validFeatures(value) {
  if (!Array.isArray(value)) return [...FEATURES];
  const selected = FEATURES.filter(name => value.includes(name));
  return selected.length ? selected : [...FEATURES];
}
