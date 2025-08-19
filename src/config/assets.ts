// Central list of approved assets for MVP
// Do not add or remove without approval.

export const APPROVED_PAIRS = [
  'HYPE-kHYPE',
  'uETH-HYPE',
  'uBTC-HYPE',
] as const;

export type ApprovedPair = typeof APPROVED_PAIRS[number];
