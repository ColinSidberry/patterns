// Static map from pattern id to Codex chapter slug. Updated by hand as
// new chapters land — keeping this hand-curated (vs. auto-discovering from
// the Obsidian audio folder) lets us decide which patterns are ready to
// link without surfacing half-drafted material.

export const PATTERN_TO_CHAPTER: Record<string, string> = {
  'stack-matching': 'Chapter 1 - Stack Matching',
}

// Returns the slug for the chapter that covers this pattern, or null if
// no chapter has been published yet.
export function chapterSlugForPattern(patternId: string | null | undefined): string | null {
  if (!patternId) return null
  return PATTERN_TO_CHAPTER[patternId] ?? null
}
