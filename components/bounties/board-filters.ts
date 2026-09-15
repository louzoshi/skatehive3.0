export type SourceFilter = 'all' | 'hive' | 'poidh';
export type StatusFilter = 'all' | 'open' | 'closed';
export type SortKey = 'reward' | 'newest' | 'ending';

export const DEFAULT_FILTERS = {
  source: 'all' as SourceFilter,
  status: 'all' as StatusFilter,
  sort: 'reward' as SortKey,
  query: '',
};

/** Compact money label for the stat tiles: $12.4k, $980, $0.42. */
export function formatUsd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '$0';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  if (value >= 1) return `$${value.toFixed(0)}`;
  return `$${value.toFixed(2)}`;
}

/** Trim a token amount without showing ".0000" on round numbers. */
export function formatTokenAmount(amount: number): string {
  if (amount > 0 && amount < 0.001) return amount.toFixed(6);
  if (amount % 1 === 0) return amount.toString();
  return amount.toFixed(amount < 1 ? 4 : 2);
}
