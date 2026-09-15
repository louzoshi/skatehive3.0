'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useComments } from '@/hooks/useComments';
import { usePoidhBounties } from '@/hooks/usePoidhBounties';
import HiveClient from '@/lib/hive/hiveclient';
import { normalizeHiveBounty, normalizePoidhBounty } from '@/lib/bounty-normalizers';
import type { UnifiedBounty } from '@/types/unified-bounty';
import type { Discussion } from '@hiveio/dhive';

interface HiveBountyMeta {
  submissionCount: number;
  isRewarded: boolean;
  winner: string | null;
}

/**
 * Submission counts come from one `get_content_replies` call per bounty, so a
 * re-render of the board would otherwise re-hit the API dozens of times. Cache
 * them for a few minutes; `refreshTrigger` busts the cache.
 */
const META_TTL_MS = 3 * 60_000;
const metaCache = new Map<string, { at: number; meta: HiveBountyMeta }>();

async function fetchHiveMeta(bounty: Discussion): Promise<HiveBountyMeta> {
  const empty: HiveBountyMeta = { submissionCount: 0, isRewarded: false, winner: null };
  try {
    const replies = await HiveClient.database.call('get_content_replies', [
      bounty.author,
      bounty.permlink,
    ]);
    if (!replies || !Array.isArray(replies)) return empty;

    let isRewarded = false;
    let winner: string | null = null;
    const rewardReply = replies.find(
      (r: any) =>
        r.author === bounty.author && r.body.includes('\u{1F3C6} Bounty Winners! \u{1F3C6}'),
    );
    if (rewardReply) {
      isRewarded = true;
      // First mention in the announcement is the 1st place: "🥇 @username - 5.000 HBD"
      const winnerMatch = (rewardReply as any).body.match(/@(\w[\w.-]*)/);
      if (winnerMatch) winner = winnerMatch[1];
    }

    const deadlineMatch = bounty.body.match(/Deadline:\s*(\d{2}-\d{2}-\d{4})/);
    let deadline: Date | null = null;
    if (deadlineMatch) {
      const [mm, dd, yyyy] = deadlineMatch[1].split('-');
      deadline = new Date(`${yyyy}-${mm}-${dd}T23:59:59`);
    }

    let submissionCount = 0;
    replies.forEach((r: any) => {
      if (r.author && deadline && r.created && new Date(r.created) < deadline) {
        submissionCount++;
      }
    });

    return { submissionCount, isRewarded, winner };
  } catch {
    return empty;
  }
}

interface UseUnifiedBountiesOptions {
  /** Optimistically prepended bounty, straight out of the composer. */
  newBounty?: Partial<Discussion> | null;
  refreshTrigger?: number;
}

export interface UseUnifiedBountiesResult {
  bounties: UnifiedBounty[];
  isLoading: boolean;
  /** True while more pages are streaming in but something is already on screen. */
  isFetchingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

/**
 * Loads the bounty board: Hive bounties (with submission counts and winners)
 * merged with skate-filtered POIDH bounties from Base and Arbitrum.
 */
export function useUnifiedBounties({
  newBounty,
  refreshTrigger,
}: UseUnifiedBountiesOptions = {}): UseUnifiedBountiesResult {
  // ── Hive ──────────────────────────────────────────────────
  const { comments, isLoading: hiveLoading, updateComments } = useComments(
    'skatehive',
    'skatehive-bounties',
    false,
  );

  const [hiveMeta, setHiveMeta] = useState<Record<string, HiveBountyMeta>>({});

  const hiveDiscussions = useMemo(() => {
    let bounties = [...comments];
    if (newBounty) {
      const exists = bounties.some((c) => c.permlink === newBounty.permlink);
      if (!exists) bounties = [newBounty as Discussion, ...bounties];
    }
    return bounties;
  }, [comments, newBounty]);

  useEffect(() => {
    if (refreshTrigger === undefined) return;
    if (refreshTrigger > 0) metaCache.clear();
    updateComments();
  }, [refreshTrigger, updateComments]);

  useEffect(() => {
    if (hiveDiscussions.length === 0) return;
    let cancelled = false;

    (async () => {
      const now = Date.now();
      const entries = await Promise.all(
        hiveDiscussions.map(async (bounty) => {
          const key = `${bounty.author}-${bounty.permlink}`;
          const cached = metaCache.get(key);
          if (cached && now - cached.at < META_TTL_MS) {
            return [key, cached.meta] as const;
          }
          const meta = await fetchHiveMeta(bounty);
          metaCache.set(key, { at: Date.now(), meta });
          return [key, meta] as const;
        }),
      );
      if (!cancelled) setHiveMeta(Object.fromEntries(entries));
    })();

    return () => {
      cancelled = true;
    };
  }, [hiveDiscussions]);

  const hiveBounties: UnifiedBounty[] = useMemo(
    () =>
      hiveDiscussions
        .map((d) => {
          const meta = hiveMeta[`${d.author}-${d.permlink}`];
          return normalizeHiveBounty(
            d,
            meta?.submissionCount ?? 0,
            meta?.isRewarded ?? false,
            meta?.winner ?? null,
          );
        })
        // Placeholder/test posts with no real reward would just be noise.
        .filter((b) => b.rewardAmount >= 1),
    [hiveDiscussions, hiveMeta],
  );

  // ── POIDH ─────────────────────────────────────────────────
  const {
    bounties: poidhOpenRaw,
    loading: poidhOpenLoading,
    hasMore: poidhOpenHasMore,
    loadMore: poidhOpenLoadMore,
  } = usePoidhBounties({ status: 'open', filterSkate: true });

  const {
    bounties: poidhPastRaw,
    loading: poidhPastLoading,
    hasMore: poidhPastHasMore,
    loadMore: poidhPastLoadMore,
  } = usePoidhBounties({ status: 'past', filterSkate: true });

  const poidhBounties: UnifiedBounty[] = useMemo(() => {
    const seen = new Set<string>();
    return [...poidhOpenRaw, ...poidhPastRaw]
      .filter((b) => {
        const key = `${b.chainId}-${b.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(normalizePoidhBounty);
  }, [poidhOpenRaw, poidhPastRaw]);

  const bounties = useMemo(
    () => [...hiveBounties, ...poidhBounties],
    [hiveBounties, poidhBounties],
  );

  const isBusy = hiveLoading || poidhOpenLoading || poidhPastLoading;
  const hasMore = poidhOpenHasMore || poidhPastHasMore;

  const loadMore = useCallback(() => {
    if (poidhOpenHasMore) poidhOpenLoadMore();
    if (poidhPastHasMore) poidhPastLoadMore();
  }, [poidhOpenHasMore, poidhOpenLoadMore, poidhPastHasMore, poidhPastLoadMore]);

  return {
    bounties,
    isLoading: isBusy && bounties.length === 0,
    isFetchingMore: isBusy && bounties.length > 0,
    hasMore,
    loadMore,
  };
}

export default useUnifiedBounties;
