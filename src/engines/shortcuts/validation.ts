import { evalExpr } from "./utils/mathEval";
import { mulberry32 } from "./utils/random";
export interface ValidationDomain {
  variables: Record<
    string,
    { min: number; max: number; integer?: boolean; exclude?: number[] }
  >;
}

const DEFAULT_SAMPLE_COUNT = 200;
const DEFAULT_EPSILON = 1e-6;

export interface PropertyTestFailure {
  input: Record<string, number>;
  shortcutValue: number | null;
  canonicalValue: number | null;
}

export interface PropertyTestResult {
  status: "PASS" | "FAIL";
  samplesTested: number;
  epsilon: number;
  failures: PropertyTestFailure[];
}

function randomSample(
  domain: ValidationDomain,
  rng: () => number,
): Record<string, number> {
  const sample: Record<string, number> = {};
  for (const [name, spec] of Object.entries(domain.variables)) {
    let v = spec.min + rng() * (spec.max - spec.min);
    if (spec.integer) v = Math.round(v);
    if (spec.exclude?.includes(v)) v += 1e-3;
    sample[name] = v;
  }
  return sample;
}

/** Min/max/zero/one corner cases for every variable, capped so the cartesian product can't explode. */
function boundarySamples(domain: ValidationDomain): Record<string, number>[] {
  const names = Object.keys(domain.variables);
  if (names.length === 0) return [];
  const options = names.map((name) => {
    const spec = domain.variables[name]!;
    const opts = new Set<number>([spec.min, spec.max]);
    if (spec.min <= 0 && spec.max >= 0) opts.add(0);
    if (spec.min <= 1 && spec.max >= 1) opts.add(1);
    return Array.from(opts);
  });
  let combos: Record<string, number>[] = [{}];
  names.forEach((name, i) => {
    const next: Record<string, number>[] = [];
    for (const combo of combos) {
      for (const val of options[i]!) next.push({ ...combo, [name]: val });
    }
    combos = next;
  });
  return combos.slice(0, 64);
}

/**
 * The mathematical heart of Feature 57 (secs. 22-28, 245-250, 279-280).
 * Compares a shortcut's expression against the canonical expression over
 * random samples plus boundary cases within the declared domain. A shortcut
 * only PASSes if every sample agrees within epsilon - one mismatch is
 * enough to FAIL and record a counterexample.
 */
export function runPropertyBasedValidation(
  shortcutExpression: string,
  canonicalExpression: string,
  domain: ValidationDomain,
  opts: { sampleCount?: number; epsilon?: number; seed?: number } = {},
): PropertyTestResult {
  const sampleCount = opts.sampleCount ?? DEFAULT_SAMPLE_COUNT;
  const epsilon = opts.epsilon ?? DEFAULT_EPSILON;
  const rng = mulberry32(opts.seed ?? 42);

  const inputs = [
    ...boundarySamples(domain),
    ...Array.from({ length: sampleCount }, () => randomSample(domain, rng)),
  ];

  const failures: PropertyTestFailure[] = [];
  let tested = 0;

  for (const input of inputs) {
    tested += 1;
    let shortcutValue: number | null = null;
    let canonicalValue: number | null = null;
    try {
      shortcutValue = evalExpr(shortcutExpression, input);
    } catch {
      /* recorded as null below */
    }
    try {
      canonicalValue = evalExpr(canonicalExpression, input);
    } catch {
      /* recorded as null below */
    }

    const mismatch =
      shortcutValue === null ||
      canonicalValue === null ||
      Math.abs(shortcutValue - canonicalValue) >
        epsilon * Math.max(1, Math.abs(canonicalValue));

    if (mismatch) {
      failures.push({ input, shortcutValue, canonicalValue });
      if (failures.length >= 10) break; // cap recorded counterexamples - the first few make the point
    }
  }

  return {
    status: failures.length === 0 ? "PASS" : "FAIL",
    samplesTested: tested,
    epsilon,
    failures,
  };
}

/**
 * Confirms a shortcut correctly *diverges* from the canonical method outside
 * its declared domain (secs. 25, 28, 30) - proof the non-applicability
 * condition is real, not just asserted.
 */
