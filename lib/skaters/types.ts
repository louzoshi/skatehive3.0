import type { LatLng } from "./geo";

/** Activity buckets, derived from `lastPost` at render time so they never go stale. */
export type ActivityTier = "active" | "recent" | "quiet" | "dormant";

/**
 * One skater in the directory. Assembled from the Skatehive leaderboard API
 * (on-chain stats) plus the account's Hive profile (identity + location).
 *
 * Optional fields are omitted rather than zero/empty so the RSC payload for
 * ~1700 skaters stays small.
 */
export interface Skater {
  /** Hive username — the identity everything else hangs off. */
  username: string;
  /** profile.name, when they set one. */
  displayName?: string;
  /** profile.about, truncated to a card-sized blurb. */
  about?: string;
  /** Exactly what they typed in profile.location. */
  rawLocation?: string;
  /** Canonical country, when we could resolve one. */
  country?: string;
  /** City / state / province, when we could resolve one. */
  city?: string;
  /** Map position for this skater's place. */
  coords?: LatLng;
  /** True for "Moon", "Metaverse" and other deliberate non-answers. */
  nowhere?: boolean;
  /** ISO timestamp of their most recent post. */
  lastPost?: string;
  points?: number;
  postCount?: number;
  snapsCount?: number;
  postsScore?: number;
  /** Hive Power — the best proxy we have for "has skin in the game". */
  hp?: number;
  /** They have an EVM address on file (Gnars / NFT features). */
  hasEth?: boolean;
  gnars?: number;
  nfts?: number;
  /** They vote for witnesses — a small "understands Hive" signal. */
  witnessVoter?: boolean;
  /** How many spots they have added to the Skatehive spot map. */
  spotCount?: number;
}

/** What the directory page hands to the client. */
export interface DirectoryData {
  skaters: Skater[];
  /** Countries sorted by headcount, so the UI never has to recompute it. */
  countries: { country: string; count: number }[];
  /** When the underlying snapshot was assembled. */
  generatedAt: string;
}
