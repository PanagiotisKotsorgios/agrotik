import { describe, expect, it } from "vitest";
import { parseBuyerFilters, parseProducerFilters } from "@/lib/domain/search-params";

describe("parseBuyerFilters", () => {
  it("defaults to price_desc sort", () => {
    const f = parseBuyerFilters({});
    expect(f.sort).toBe("price_desc");
  });
  it("accepts allowlisted sorts", () => {
    expect(parseBuyerFilters({ sort: "price_asc" }).sort).toBe("price_asc");
    expect(parseBuyerFilters({ sort: "updated" }).sort).toBe("updated");
    expect(parseBuyerFilters({ sort: "hack" }).sort).toBe("price_desc");
  });
  it("orders inverted price ranges", () => {
    const f = parseBuyerFilters({ price_min: "10", price_max: "5" });
    expect(f.price_min).toBe(5);
    expect(f.price_max).toBe(10);
  });
  it("clamps oversize text params", () => {
    const long = "a".repeat(300);
    const f = parseBuyerFilters({ name: long });
    expect(f.name?.length ?? 0).toBeLessThanOrEqual(120);
  });
  it("parses attribute filters through the attr_ prefix", () => {
    const f = parseBuyerFilters({ attr_variety: "koroneiki" });
    expect(f.attributes?.variety).toBe("koroneiki");
  });
  it("ignores attribute keys with invalid characters", () => {
    const f = parseBuyerFilters({ "attr_bad-key!": "value" });
    expect(f.attributes).toBeUndefined();
  });
  it("filters buyer_type to allowed roles", () => {
    expect(parseBuyerFilters({ buyer_type: "merchant,factory" }).buyer_type).toEqual([
      "merchant",
      "factory",
    ]);
    expect(parseBuyerFilters({ buyer_type: "merchant,admin" }).buyer_type).toEqual(["merchant"]);
    expect(parseBuyerFilters({ buyer_type: "admin" }).buyer_type).toBeUndefined();
  });
});

describe("parseProducerFilters", () => {
  it("defaults to updated sort", () => {
    expect(parseProducerFilters({}).sort).toBe("updated");
  });
  it("accepts quantity sorts", () => {
    expect(parseProducerFilters({ sort: "quantity_desc" }).sort).toBe("quantity_desc");
    expect(parseProducerFilters({ sort: "quantity_asc" }).sort).toBe("quantity_asc");
  });
  it("rejects unknown sorts", () => {
    expect(parseProducerFilters({ sort: "delete-my-data" }).sort).toBe("updated");
  });
});
