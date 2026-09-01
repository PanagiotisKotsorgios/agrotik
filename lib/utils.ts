import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";
import { el } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelative(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: el });
  } catch {
    return iso;
  }
}

export function roleLabel(role: string): string {
  switch (role) {
    case "farmer": return "Αγρότης";
    case "fisher": return "Αλιέας";
    case "farmer_fisher": return "Αγρότης & Αλιέας";
    case "merchant": return "Έμπορος";
    case "factory": return "Εργοστάσιο";
    case "admin": return "Διαχειριστής";
    default: return role;
  }
}

export function isProducerRole(role: string | null | undefined): boolean {
  return role === "farmer" || role === "fisher" || role === "farmer_fisher";
}

export function hasFarmerRole(role: string | null | undefined): boolean {
  return role === "farmer" || role === "farmer_fisher";
}

export function hasFisherRole(role: string | null | undefined): boolean {
  return role === "fisher" || role === "farmer_fisher";
}

export function roleBadgeTone(role: string | null | undefined): "brand" | "fisher" {
  return hasFisherRole(role) ? "fisher" : "brand";
}

const attributeLabels: Record<string, string> = {
  grade: "Νούμερο / καλίμπρο",
  variety: "Ποικιλία",
  kind: "Τύπος",
  acidity_max: "Μέγιστη οξύτητα",
  protein_min: "Ελάχιστη πρωτεΐνη",
  crop: "Καλλιέργεια / ποικιλία",
  species: "Είδος αλιεύματος",
  condition: "Μορφή / κατάσταση",
  size: "Μέγεθος / διαλογή",
  origin: "Περιοχή αλίευσης / προέλευση",
};

export function attributeLabel(key: string): string {
  return attributeLabels[key] ?? key;
}

export function priceFormat(n: number, unit: string): string {
  return `${n.toFixed(2)} €/${unit}`;
}

const quantityNumberFormatter = new Intl.NumberFormat("el-GR", {
  maximumFractionDigits: 3,
});

const quantityUnits: Record<string, { singular: string; plural: string }> = {
  κιλό: { singular: "κιλό", plural: "κιλά" },
  κιλο: { singular: "κιλό", plural: "κιλά" },
  κιλά: { singular: "κιλό", plural: "κιλά" },
  κιλα: { singular: "κιλό", plural: "κιλά" },
  λίτρο: { singular: "λίτρο", plural: "λίτρα" },
  λιτρο: { singular: "λίτρο", plural: "λίτρα" },
  λίτρα: { singular: "λίτρο", plural: "λίτρα" },
  λιτρα: { singular: "λίτρο", plural: "λίτρα" },
  τόνος: { singular: "τόνος", plural: "τόνοι" },
  τονος: { singular: "τόνος", plural: "τόνοι" },
  τόνοι: { singular: "τόνος", plural: "τόνοι" },
  τονοι: { singular: "τόνος", plural: "τόνοι" },
  τεμάχιο: { singular: "τεμάχιο", plural: "τεμάχια" },
  τεμαχιο: { singular: "τεμάχιο", plural: "τεμάχια" },
  τεμάχια: { singular: "τεμάχιο", plural: "τεμάχια" },
  τεμαχια: { singular: "τεμάχιο", plural: "τεμάχια" },
  στρέμμα: { singular: "στρέμμα", plural: "στρέμματα" },
  στρεμμα: { singular: "στρέμμα", plural: "στρέμματα" },
  στρέμματα: { singular: "στρέμμα", plural: "στρέμματα" },
  στρεμματα: { singular: "στρέμμα", plural: "στρέμματα" },
  κιβώτιο: { singular: "κιβώτιο", plural: "κιβώτια" },
  κιβωτιο: { singular: "κιβώτιο", plural: "κιβώτια" },
  κιβώτια: { singular: "κιβώτιο", plural: "κιβώτια" },
  κιβωτια: { singular: "κιβώτιο", plural: "κιβώτια" },
};

export function formatQuantityNumber(quantity: number | string): string {
  const value = Number(quantity);
  return Number.isFinite(value) ? quantityNumberFormatter.format(value) : String(quantity);
}

export function pluralizeQuantityUnit(unit: string | null | undefined, quantity: number | string): string {
  const trimmedUnit = unit?.trim() ?? "";
  const forms = quantityUnits[trimmedUnit.toLocaleLowerCase("el-GR")];
  if (!forms) return trimmedUnit;

  return Math.abs(Number(quantity)) === 1 ? forms.singular : forms.plural;
}

export function formatQuantity(quantity: number | string, unit: string | null | undefined): string {
  return [formatQuantityNumber(quantity), pluralizeQuantityUnit(unit, quantity)].filter(Boolean).join(" ");
}
