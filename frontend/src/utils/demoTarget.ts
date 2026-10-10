// Pages the landing's "Try it" cards may open inside the demo (U9). Anything
// else (another path, a full URL, a protocol-relative "//host") goes Home.
export const DEMO_TARGETS = ['/salat', '/fasting', '/quran', '/friends', '/cycle'] as const;

export function demoTarget(to: string | null): string {
  return (DEMO_TARGETS as readonly string[]).includes(to ?? '') ? (to as string) : '/';
}
