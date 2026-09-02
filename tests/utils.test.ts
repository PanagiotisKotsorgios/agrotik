import { describe, expect, it } from "vitest";
import {
  safeHttpUrl,
  roleLabel,
  isProducerRole,
  hasFisherRole,
  hasFarmerRole,
  roleBadgeTone,
  formatCurrency,
  formatDate,
  formatQuantity,
  formatQuantityNumber,
  pluralizeQuantityUnit,
  priceFormat,
} from "@/lib/utils";

describe("safeHttpUrl", () => {
  it("accepts https URLs", () => {
    expect(safeHttpUrl("https://example.com/path")).toBe("https://example.com/path");
  });
  it("accepts http URLs", () => {
    expect(safeHttpUrl("http://example.com/")).toBe("http://example.com/");
  });
  it("rejects non-http protocols", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<script>")).toBeNull();
    expect(safeHttpUrl("ftp://example.com")).toBeNull();
  });
  it("rejects malformed URLs", () => {
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
  });
  it("rejects overlong strings", () => {
    expect(safeHttpUrl("https://" + "a".repeat(3000))).toBeNull();
  });
  it("rejects non-string values", () => {
    expect(safeHttpUrl(null)).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
    expect(safeHttpUrl(123)).toBeNull();
  });
});

describe("role helpers", () => {
  it("labels every known role in Greek", () => {
    expect(roleLabel("farmer")).toBe("Αγρότης");
    expect(roleLabel("fisher")).toBe("Αλιέας");
    expect(roleLabel("farmer_fisher")).toBe("Αγρότης & Αλιέας");
    expect(roleLabel("merchant")).toBe("Έμπορος");
    expect(roleLabel("factory")).toBe("Εργοστάσιο");
    expect(roleLabel("admin")).toBe("Διαχειριστής");
  });
  it("falls back to the raw role for unknowns", () => {
    expect(roleLabel("weird_role")).toBe("weird_role");
  });
  it("classifies producer roles", () => {
    expect(isProducerRole("farmer")).toBe(true);
    expect(isProducerRole("fisher")).toBe(true);
    expect(isProducerRole("farmer_fisher")).toBe(true);
    expect(isProducerRole("merchant")).toBe(false);
    expect(isProducerRole(null)).toBe(false);
  });
  it("classifies farmer vs fisher lanes", () => {
    expect(hasFarmerRole("farmer")).toBe(true);
    expect(hasFarmerRole("farmer_fisher")).toBe(true);
    expect(hasFarmerRole("fisher")).toBe(false);
    expect(hasFisherRole("fisher")).toBe(true);
    expect(hasFisherRole("farmer_fisher")).toBe(true);
    expect(hasFisherRole("farmer")).toBe(false);
  });
  it("picks fisher tone for fisher/dual profiles", () => {
    expect(roleBadgeTone("fisher")).toBe("fisher");
    expect(roleBadgeTone("farmer_fisher")).toBe("fisher");
    expect(roleBadgeTone("farmer")).toBe("brand");
    expect(roleBadgeTone("merchant")).toBe("brand");
  });
});

describe("formatCurrency", () => {
  it("formats numbers in Greek EUR", () => {
    expect(formatCurrency(1234.5)).toMatch(/1\.234,50/);
    expect(formatCurrency(0)).toMatch(/0,00/);
  });
  it("passes strings through when not a finite number", () => {
    expect(formatCurrency("not-a-number")).toBe("not-a-number");
  });
});

describe("formatDate", () => {
  it("formats ISO dates as dd/mm/yyyy", () => {
    expect(formatDate("2026-03-15")).toBe("15/03/2026");
  });
  it("returns empty for null/undefined/empty", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("")).toBe("");
  });
});

describe("quantity formatting", () => {
  it("formats numbers with Greek grouping", () => {
    expect(formatQuantityNumber(1234)).toMatch(/1\.234/);
    expect(formatQuantityNumber("2.5")).toMatch(/2,5/);
  });
  it("pluralizes Greek units by quantity", () => {
    expect(pluralizeQuantityUnit("κιλό", 1)).toBe("κιλό");
    expect(pluralizeQuantityUnit("κιλο", 2)).toBe("κιλά");
    expect(pluralizeQuantityUnit("τόνος", 5)).toBe("τόνοι");
    expect(pluralizeQuantityUnit("τεμάχιο", 1)).toBe("τεμάχιο");
  });
  it("passes unknown units through unchanged", () => {
    expect(pluralizeQuantityUnit("frozzles", 3)).toBe("frozzles");
  });
  it("composes number + unit", () => {
    expect(formatQuantity(3, "κιλό")).toMatch(/κιλά/);
    expect(formatQuantity(1, "λίτρο")).toMatch(/λίτρο/);
  });
});

describe("priceFormat", () => {
  it("appends unit after currency", () => {
    expect(priceFormat(2.5, "kg")).toMatch(/\/kg$/);
  });
});
