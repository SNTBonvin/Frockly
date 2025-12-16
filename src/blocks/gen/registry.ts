import type { FnSpec, FnSpecMap } from "./types";

const map: FnSpecMap = new Map();

export function setFnSpecs(specs: FnSpec[]) {
  map.clear();
  for (const s of specs) map.set(s.name, s);
}

export function getFnSpec(name: string): FnSpec | undefined {
  return map.get(name.toUpperCase());
}

export function getAllFnSpecs(): FnSpec[] {
  return [...map.values()];
}
