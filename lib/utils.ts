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
    case "merchant": return "Έμπορος";
    case "factory": return "Εργοστάσιο";
    case "admin": return "Διαχειριστής";
    default: return role;
  }
}

export function priceFormat(n: number, unit: string): string {
  return `${n.toFixed(2)} €/${unit}`;
}
