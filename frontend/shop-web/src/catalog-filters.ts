import type { CopyKey } from "./i18n";

export const SECTIONS = [
  { slug: "clothing", label: "fClothing", leaves: [
    ["t-shirt", "fTshirt"],
    ["hoodie", "fHoodie"],
    ["zip-hoodie", "fZipHoodie"],
    ["sweatshirt", "fSweatshirt"],
    ["socks", "fSocks"],
  ] },
  { slug: "accessories", label: "fAccessories", leaves: [
    ["earrings", "fEarrings"],
    ["earring-set", "fEarringSet"],
    ["necklaces", "fNecklaces"],
    ["rings", "fRings"],
    ["bracelet", "fBracelet"],
    ["pins", "fPins"],
    ["keychains", "fKeychains"],
    ["phone-chain", "fPhoneChain"],
    ["hair-clips", "fHairClips"],
    ["charm", "fCharm"],
    ["pack", "fPack"],
  ] },
  { slug: "bags", label: "fBags", leaves: [
    ["tote", "fTote"],
    ["wallet", "fWallet"],
  ] },
  { slug: "makeup", label: "fMakeup", leaves: [
    ["lips", "fLips"],
    ["cheeks", "fCheeks"],
    ["eyes", "fEyes"],
    ["face", "fFace"],
    ["body", "fBody"],
  ] },
] as const satisfies ReadonlyArray<{ slug: string; label: CopyKey; leaves: ReadonlyArray<readonly [string, CopyKey]> }>;

const sectionBySlug = new Map(SECTIONS.map((section) => [section.slug, section]));

export function sectionLabel(slug: string): CopyKey | null {
  return sectionBySlug.get(slug)?.label ?? null;
}

export function categoryLabel(section: string, category: string): CopyKey | null {
  const leaf = sectionBySlug.get(section)?.leaves.find((row) => row[0] === category);
  return leaf?.[1] ?? null;
}

export function leavesOf(section: string): ReadonlyArray<readonly [string, CopyKey]> {
  return sectionBySlug.get(section)?.leaves ?? [];
}

type Tagged = { section: string | null; category: string | null; displayName: string };

export function countSection<T extends Tagged>(items: T[], section: string): number {
  return items.filter((item) => item.section === section).length;
}

export function countCategory<T extends Tagged>(items: T[], section: string, category: string): number {
  return items.filter((item) => item.section === section && item.category === category).length;
}

export function matchesCatalog<T extends Tagged>(
  item: T,
  filter: { section: string; category: string; q: string },
): boolean {
  if (filter.section && item.section !== filter.section) return false;
  if (filter.category && item.category !== filter.category) return false;
  const needle = filter.q.trim().toLowerCase();
  if (needle && !item.displayName.toLowerCase().includes(needle)) return false;
  return true;
}
