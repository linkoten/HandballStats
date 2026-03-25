import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a player name stored in FFHB format "NOMprenom" (surname in ALL CAPS
 * directly concatenated with a lowercase firstname, e.g. "COUSINadelise") into
 * "COUSIN Adelise". Also handles compound surnames like "LE GRANDmarie" →
 * "LE GRAND Marie" and hyphenated firstnames like "DUPONTjean-paul" →
 * "DUPONT Jean-Paul".
 *
 * If the string is already all-uppercase (no firstname detected) it is returned
 * unchanged.
 */
export function formatNomPrenom(raw: string | null | undefined): string {
  if (!raw) return "";
  const s = raw.trim();

  // Find the first lowercase letter — that is where the firstname starts
  const firstLowerIndex = s.search(/[a-zàâäéèêëîïôùûüçœæ]/);

  if (firstLowerIndex === -1) {
    // All uppercase — no firstname detected, return as-is
    return s;
  }

  const surname = s.slice(0, firstLowerIndex).trim();
  const firstNameRaw = s.slice(firstLowerIndex);
  const firstName = firstNameRaw
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("-");

  return surname ? `${surname} ${firstName}` : firstName;
}
