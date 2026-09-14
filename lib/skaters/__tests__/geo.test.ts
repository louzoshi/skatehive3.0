/**
 * Unit tests for the location resolver.
 * Run with tsx: npx tsx lib/skaters/__tests__/geo.test.ts
 *
 * Every case below is a real `profile.location` string taken from a Skatehive
 * account, which is the point: the resolver only has to survive what people
 * actually write.
 */

import assert from "node:assert";
import { countryFromSlug, countrySlug, normalizeKey, resolveLocation } from "../geo";

const tests: Array<() => void> = [];
let hasFailures = false;

function it(name: string, fn: () => void) {
  tests.push(() => {
    try {
      fn();
      console.log(`  ✅ ${name}`);
    } catch (error) {
      hasFailures = true;
      console.error(`  ❌ ${name}`);
      console.error(`     ${error}`);
    }
  });
}

console.log("\n📦 resolveLocation");

it("empty and whitespace locations resolve to nothing", () => {
  for (const input of ["", "   ", undefined, null]) {
    const result = resolveLocation(input as string);
    assert.strictEqual(result.country, null);
    assert.strictEqual(result.city, null);
    assert.strictEqual(result.nowhere, false);
  }
});

it("normalizes ISO codes, names and native spellings to one country", () => {
  const brazil = ["BR", "Brazil", "brazil", "BRAZIL", "Brasil", "sc, Brasil", "Brasil Sp"];
  for (const input of brazil) {
    assert.strictEqual(resolveLocation(input).country, "Brazil", input);
  }
  const venezuela = ["Venezuela", "venezuela", "VENEZUELA", "Vzla", "veneziela", "Venezuela."];
  for (const input of venezuela) {
    assert.strictEqual(resolveLocation(input).country, "Venezuela", input);
  }
});

it("this is the bug the old grouping had: a city is not a country", () => {
  // The previous implementation split on "," and called the last piece the
  // country, which produced countries named "Rio de Janeiro" and "Lagos".
  const rio = resolveLocation("Rio de Janeiro");
  assert.strictEqual(rio.country, "Brazil");
  assert.strictEqual(rio.city, "Rio de Janeiro");

  const lagos = resolveLocation("Lagos");
  assert.strictEqual(lagos.country, "Nigeria");
  assert.strictEqual(lagos.city, "Lagos");
});

it("reads city and country out of the separators people actually use", () => {
  const cases: Array<[string, string, string]> = [
    ["Caracas, Venezuela", "Caracas", "Venezuela"],
    ["Caracas - Venezuela", "Caracas", "Venezuela"],
    ["Caracas Venezuela", "Caracas", "Venezuela"],
    ["CUMANÁ-VENEZUELA", "Cumaná", "Venezuela"],
    ["sao paulo brazil", "São Paulo", "Brazil"],
    ["Rio de Janeiro, BR", "Rio de Janeiro", "Brazil"],
    ["Thessaloniki Greece", "Thessaloniki", "Greece"],
    ["Los Angeles, CA, USA", "Los Angeles", "United States"],
    ["Muizenberg,Cape Town, South Africa", "Cape Town", "South Africa"],
    ["Belo Horizonte, MG - Brazil", "Belo Horizonte", "Brazil"],
  ];
  for (const [input, city, country] of cases) {
    const result = resolveLocation(input);
    assert.strictEqual(result.city, city, input);
    assert.strictEqual(result.country, country, input);
    assert.ok(result.coords, `${input} should be mappable`);
  }
});

it("picks the longest city match, not the first", () => {
  // "Santa Cruz" is in Bolivia; "Santa Cruz do Sul" is in Brazil.
  assert.strictEqual(resolveLocation("Santa Cruz - Bolivia").city, "Santa Cruz");
  assert.strictEqual(resolveLocation("Santa Cruz - Bolivia").country, "Bolivia");
  assert.strictEqual(resolveLocation("Santa Cruz do Sul, RS - Brasil").country, "Brazil");
});

it("falls back to US states when no city is recognised", () => {
  for (const input of ["Nevada", "west virginia", "ColoRADo", "Arizona, USA", "FL"]) {
    assert.strictEqual(resolveLocation(input).country, "United States", input);
  }
});

it("does not let a two-letter word inside a phrase hijack the country", () => {
  // "in" is the ISO code for India — "In Peru" is Peru, not India.
  assert.strictEqual(resolveLocation("In Peru").country, "Peru");
  assert.strictEqual(resolveLocation("American in Korea").country, "South Korea");
});

it("buckets jokes and non-places instead of inventing a country", () => {
  for (const input of ["Moon", "Universe", "Metaverse", "Earth", "Mordor", "Everywhere", "Worldwide"]) {
    const result = resolveLocation(input);
    assert.strictEqual(result.country, null, input);
    assert.strictEqual(result.nowhere, true, input);
    assert.strictEqual(result.coords, null, input);
  }
});

it("keeps genuinely unreadable locations out of both buckets", () => {
  for (const input of ["A=432hz", "2048", "Jugirgofa"]) {
    const result = resolveLocation(input);
    assert.strictEqual(result.country, null, input);
    assert.strictEqual(result.nowhere, false, input);
    assert.strictEqual(result.label, input, input);
  }
});

it("ignores URLs pasted into the location field", () => {
  const result = resolveLocation("https://images.ecency.com/p/5Z");
  assert.strictEqual(result.country, null);
  assert.strictEqual(result.city, null);
});

it("strips emoji and accents before matching", () => {
  assert.strictEqual(resolveLocation("🇻🇪Venezuela🇻🇪").country, "Venezuela");
  assert.strictEqual(resolveLocation("Ghana 🇬🇭").country, "Ghana");
  assert.strictEqual(resolveLocation("México").country, "Mexico");
  assert.strictEqual(normalizeKey("São Paulo"), "sao paulo");
});

it("every resolved country carries coordinates we can pin", () => {
  for (const input of ["Brazil", "Nigeria", "Greece", "Lagos", "Nevada", "Caracas, Venezuela"]) {
    assert.ok(resolveLocation(input).coords, input);
  }
});

console.log("\n📦 country slugs");

it("round-trips a country through its slug", () => {
  for (const country of ["Brazil", "United States", "South Africa", "United Arab Emirates"]) {
    assert.strictEqual(countrySlug(country).includes(" "), false);
    assert.strictEqual(countryFromSlug(countrySlug(country)), country);
  }
});

it("returns null for a slug that is not a country", () => {
  assert.strictEqual(countryFromSlug("mordor"), null);
  assert.strictEqual(countryFromSlug(""), null);
});

(async () => {
  for (const run of tests) run();
  if (hasFailures) {
    console.error("\n❌ geo tests failed\n");
    process.exit(1);
  }
  console.log("\n✅ geo tests passed\n");
})();
