import heroLiving from "@/assets/hero-living-room.jpg";
import laurel from "@/assets/project-laurel.jpg";
import atelier from "@/assets/project-atelier.jpg";
import nordic from "@/assets/project-nordic.jpg";
import coastal from "@/assets/project-coastal.jpg";
import maison from "@/assets/project-maison.jpg";
import studio from "@/assets/studio-atelier.jpg";

export const images = {
  hero: heroLiving,
  studio,
  laurel,
  atelier,
  nordic,
  coastal,
  maison,
};

const bySlug: Record<string, string> = {
  "the-laurel-residence": laurel,
  "atelier-blanc": atelier,
  "the-nordic-penthouse": nordic,
  "coastal-sanctuary": coastal,
  "maison-verte": maison,
};

const fallbacks = [laurel, atelier, nordic, coastal, maison];

export function projectImage(
  slug: string,
  coverImageUrl?: string | null,
  index = 0,
): string {
  if (coverImageUrl) return coverImageUrl;
  return bySlug[slug] ?? fallbacks[index % fallbacks.length]!;
}
