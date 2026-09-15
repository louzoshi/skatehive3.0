'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Container, Flex, Icon, Text, VStack } from '@chakra-ui/react';
import { FaEthereum, FaHive } from 'react-icons/fa';
import useIsMobile from '@/hooks/useIsMobile';
import useEffectiveHiveUser from '@/hooks/useEffectiveHiveUser';
import { useMarketPrices } from '@/hooks/useMarketPrices';
import useUnifiedBounties from '@/hooks/useUnifiedBounties';
import { useTranslations } from '@/contexts/LocaleContext';
import { tVars } from '@/lib/i18n/format';
import SkateModal from '@/components/shared/SkateModal';
import BountyComposer from '@/components/bounties/BountyComposer';
import PoidhBountyComposer from '@/components/bounties/PoidhBountyComposer';
import UnifiedBountyList from '@/components/bounties/UnifiedBountyList';
import BountyBoardHeader from '@/components/bounties/BountyBoardHeader';
import BountyBoardToolbar from '@/components/bounties/BountyBoardToolbar';
import BountyBoardSidebar from '@/components/bounties/BountyBoardSidebar';
import type { PoolSlice, WinnerRow } from '@/components/bounties/BountyBoardSidebar';
import { DEFAULT_FILTERS } from '@/components/bounties/board-filters';
import type { SortKey, SourceFilter, StatusFilter } from '@/components/bounties/board-filters';
import type { Discussion } from '@hiveio/dhive';
import type { UnifiedBounty } from '@/types/unified-bounty';

type ModalStep = 'choice' | 'hive-form' | 'eth-form';

const CLOSED_PAGE_SIZE = 12;

const alpha = (token: string, pct: number) =>
  `color-mix(in srgb, var(--chakra-colors-${token}) ${pct}%, transparent)`;

export default function BountiesHubClient() {
  const isMobile = useIsMobile();
  const { handle } = useEffectiveHiveUser();
  const t = useTranslations('bounties');
  const { hivePrice, hbdPrice, ethPrice } = useMarketPrices();

  const [newBounty, setNewBounty] = useState<Partial<Discussion> | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>('choice');

  const [queryInput, setQueryInput] = useState(DEFAULT_FILTERS.query);
  const [query, setQuery] = useState(DEFAULT_FILTERS.query);
  const [source, setSource] = useState<SourceFilter>(DEFAULT_FILTERS.source);
  const [status, setStatus] = useState<StatusFilter>(DEFAULT_FILTERS.status);
  const [sort, setSort] = useState<SortKey>(DEFAULT_FILTERS.sort);
  const [closedVisible, setClosedVisible] = useState(CLOSED_PAGE_SIZE);

  const listRef = useRef<HTMLDivElement | null>(null);

  const { bounties, isLoading, isFetchingMore, hasMore, loadMore } = useUnifiedBounties({
    newBounty,
    refreshTrigger,
  });

  // Typing shouldn't re-filter the whole board on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(queryInput.trim().toLowerCase()), 180);
    return () => clearTimeout(timer);
  }, [queryInput]);

  useEffect(() => {
    setClosedVisible(CLOSED_PAGE_SIZE);
  }, [query, source, status, sort]);

  const toUsd = useCallback(
    (b: UnifiedBounty): number => {
      switch (b.rewardCurrency) {
        case 'ETH':
          return b.rewardAmount * (ethPrice ?? 2500);
        case 'HBD':
          return b.rewardAmount * (hbdPrice ?? 1);
        case 'HIVE':
          return b.rewardAmount * (hivePrice ?? 0.21);
        default:
          return b.rewardAmount;
      }
    },
    [hivePrice, hbdPrice, ethPrice],
  );

  // ── Board-wide stats (never narrowed by the filters) ──────
  const stats = useMemo(() => {
    let openCount = 0;
    let openPoolUsd = 0;
    let paidOutUsd = 0;
    const skaters = new Set<string>();

    for (const b of bounties) {
      const usd = toUsd(b);
      if (b.isActive) {
        openCount += 1;
        openPoolUsd += usd;
      } else {
        paidOutUsd += usd;
      }
      if (b.authorDisplay && b.authorDisplay !== '???') skaters.add(b.authorDisplay.toLowerCase());
      if (b.winnerDisplay) skaters.add(b.winnerDisplay.toLowerCase());
    }

    return { openCount, openPoolUsd, paidOutUsd, skaterCount: skaters.size };
  }, [bounties, toUsd]);

  const pool: PoolSlice[] = useMemo(() => {
    const byCurrency = new Map<string, { amount: number; usd: number }>();
    for (const b of bounties) {
      if (!b.isActive) continue;
      const entry = byCurrency.get(b.rewardCurrency) ?? { amount: 0, usd: 0 };
      entry.amount += b.rewardAmount;
      entry.usd += toUsd(b);
      byCurrency.set(b.rewardCurrency, entry);
    }
    return Array.from(byCurrency.entries())
      .map(([currency, v]) => ({ currency, ...v }))
      .sort((a, b) => b.usd - a.usd);
  }, [bounties, toUsd]);

  const winners: WinnerRow[] = useMemo(() => {
    const winMap = new Map<string, WinnerRow>();
    for (const b of bounties) {
      if (!b.winnerDisplay) continue;
      const key = b.winnerDisplay.toLowerCase();
      const existing = winMap.get(key);
      if (existing) {
        existing.wins += 1;
      } else {
        winMap.set(key, { display: b.winnerDisplay, avatar: b.winnerAvatar, wins: 1 });
      }
    }
    return Array.from(winMap.values())
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10);
  }, [bounties]);

  // ── Filtering ─────────────────────────────────────────────
  const searched = useMemo(() => {
    if (!query) return bounties;
    return bounties.filter((b) =>
      `${b.title} ${b.description} ${b.authorDisplay} ${b.winnerDisplay ?? ''}`
        .toLowerCase()
        .includes(query),
    );
  }, [bounties, query]);

  // Each chip group counts against the *other* filters, so the numbers tell you
  // what you'd actually get by clicking.
  const sourceCounts = useMemo(() => {
    const scoped = searched.filter(
      (b) => status === 'all' || (status === 'open' ? b.isActive : !b.isActive),
    );
    return {
      all: scoped.length,
      hive: scoped.filter((b) => b.source === 'hive').length,
      poidh: scoped.filter((b) => b.source === 'poidh').length,
    };
  }, [searched, status]);

  const statusCounts = useMemo(() => {
    const scoped = searched.filter((b) => source === 'all' || b.source === source);
    return {
      all: scoped.length,
      open: scoped.filter((b) => b.isActive).length,
      closed: scoped.filter((b) => !b.isActive).length,
    };
  }, [searched, source]);

  const filtered = useMemo(
    () => searched.filter((b) => source === 'all' || b.source === source),
    [searched, source],
  );

  const sorter = useCallback(
    (a: UnifiedBounty, b: UnifiedBounty) => {
      switch (sort) {
        case 'newest':
          return b.createdAt - a.createdAt;
        case 'ending': {
          // Bounties with a real deadline come first, soonest at the top.
          if (a.deadline && b.deadline) return a.deadline - b.deadline;
          if (a.deadline) return -1;
          if (b.deadline) return 1;
          return b.createdAt - a.createdAt;
        }
        default:
          return toUsd(b) - toUsd(a);
      }
    },
    [sort, toUsd],
  );

  const openBounties = useMemo(
    () => (status === 'closed' ? [] : filtered.filter((b) => b.isActive).sort(sorter)),
    [filtered, status, sorter],
  );

  const closedBounties = useMemo(
    () => (status === 'open' ? [] : filtered.filter((b) => !b.isActive).sort(sorter)),
    [filtered, status, sorter],
  );

  const visibleClosed = useMemo(
    () => closedBounties.slice(0, closedVisible),
    [closedBounties, closedVisible],
  );

  const shownCount = openBounties.length + visibleClosed.length;

  const handleLoadMore = useCallback(() => {
    if (closedVisible < closedBounties.length) {
      setClosedVisible((prev) => prev + CLOSED_PAGE_SIZE);
    }
    if (hasMore) loadMore();
  }, [closedVisible, closedBounties.length, hasMore, loadMore]);

  const listHasMore = closedVisible < closedBounties.length || hasMore;

  const clearFilters = useCallback(() => {
    setQueryInput('');
    setQuery('');
    setSource('all');
    setStatus('all');
  }, []);

  const focusStatus = useCallback((next: StatusFilter) => {
    setStatus(next);
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleOpenModal = useCallback(() => {
    setModalStep('choice');
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setModalStep('choice');
  }, []);

  return (
    <Container maxW="container.xl" px={{ base: 3, md: 4 }} py={{ base: 4, md: 6 }}>
      <BountyBoardHeader
        stats={stats}
        isLoading={isLoading}
        handle={handle}
        onFocusOpen={() => focusStatus('open')}
        onFocusClosed={() => focusStatus('closed')}
      />

      <Flex gap={6} direction={{ base: 'column', lg: 'row' }} align="flex-start">
        <Box flex={1} minW={0} ref={listRef}>
          <BountyBoardToolbar
            query={queryInput}
            onQueryChange={setQueryInput}
            source={source}
            onSourceChange={setSource}
            sourceCounts={sourceCounts}
            status={status}
            onStatusChange={setStatus}
            statusCounts={statusCounts}
            sort={sort}
            onSortChange={setSort}
            onCreate={handleOpenModal}
          />

          {!isLoading && shownCount > 0 && (
            <Text fontSize="2xs" fontFamily="mono" color="dim" mb={4} letterSpacing="wider">
              {tVars(t('hubResults'), { count: shownCount, total: bounties.length })}
            </Text>
          )}

          <UnifiedBountyList
            openBounties={openBounties}
            closedBounties={visibleClosed}
            totalOpen={openBounties.length}
            totalClosed={closedBounties.length}
            isLoading={isLoading}
            isFetchingMore={isFetchingMore}
            hasMore={listHasMore}
            onLoadMore={handleLoadMore}
            prices={{ hivePrice, hbdPrice, ethPrice }}
            boardHasBounties={bounties.length > 0}
            onClearFilters={clearFilters}
            onCreate={handleOpenModal}
          />
        </Box>

        <Box w={{ base: '100%', lg: '300px' }} flexShrink={0}>
          <BountyBoardSidebar
            pool={pool}
            poolTotalUsd={stats.openPoolUsd}
            winners={winners}
            onSourceSelect={setSource}
          />
        </Box>
      </Flex>

      {/* ── Create bounty modal ──────────────────── */}
      <SkateModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={
          modalStep === 'choice'
            ? 'choose-your-chain'
            : modalStep === 'eth-form'
              ? 'create-eth-bounty'
              : 'create-bounty'
        }
        size={modalStep === 'choice' ? 'lg' : isMobile ? 'full' : '2xl'}
      >
        {modalStep === 'eth-form' ? (
          <PoidhBountyComposer
            onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
            onClose={handleCloseModal}
          />
        ) : modalStep === 'choice' ? (
          <VStack spacing={{ base: 4, md: 6 }} py={{ base: 4, md: 6 }} px={{ base: 2, md: 4 }}>
            <Text
              fontSize="sm"
              fontFamily="mono"
              color="dim"
              textAlign="center"
              textTransform="uppercase"
              letterSpacing="wider"
            >
              CHOOSE YOUR BLOCKCHAIN
            </Text>

            <Flex gap={4} w="100%" justify="center" align="center" direction={{ base: 'column', sm: 'row' }}>
              <Box
                as="button"
                onClick={() => setModalStep('hive-form')}
                flex={{ base: 'initial', sm: 1 }}
                w={{ base: '100%', sm: 'auto' }}
                maxW={{ sm: '220px' }}
                border="2px solid"
                borderColor="#E31337"
                bg="background"
                p={{ base: 4, md: 6 }}
                cursor="pointer"
                transition="all 0.2s"
                _hover={{
                  bg: 'rgba(227, 19, 55, 0.1)',
                  boxShadow: '0 0 20px rgba(227, 19, 55, 0.3)',
                  transform: 'translateY(-2px)',
                }}
              >
                <VStack spacing={3}>
                  <Icon as={FaHive} boxSize={{ base: '32px', md: '40px' }} color="#E31337" />
                  <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="900" fontFamily="mono" color="#E31337" textTransform="uppercase">
                    HIVE
                  </Text>
                  <Text fontSize="2xs" fontFamily="mono" color="dim" textAlign="center">
                    PAY IN HBD OR HIVE
                  </Text>
                </VStack>
              </Box>

              <Flex align="center" gap={2} direction={{ base: 'row', sm: 'column' }}>
                <Box w={{ base: '20px', sm: '1px' }} h={{ base: '1px', sm: '20px' }} bg="border" />
                <Text fontSize="xs" fontFamily="mono" color="dim" fontWeight="bold">
                  OR
                </Text>
                <Box w={{ base: '20px', sm: '1px' }} h={{ base: '1px', sm: '20px' }} bg="border" />
              </Flex>

              <Box
                as="button"
                onClick={() => setModalStep('eth-form')}
                flex={{ base: 'initial', sm: 1 }}
                w={{ base: '100%', sm: 'auto' }}
                maxW={{ sm: '220px' }}
                border="2px solid"
                borderColor="#627EEA"
                bg="background"
                p={{ base: 4, md: 6 }}
                cursor="pointer"
                transition="all 0.2s"
                _hover={{
                  bg: 'rgba(98, 126, 234, 0.1)',
                  boxShadow: '0 0 20px rgba(98, 126, 234, 0.3)',
                  transform: 'translateY(-2px)',
                }}
              >
                <VStack spacing={3}>
                  <Icon as={FaEthereum} boxSize={{ base: '32px', md: '40px' }} color="#627EEA" />
                  <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="900" fontFamily="mono" color="#627EEA" textTransform="uppercase">
                    ETH
                  </Text>
                  <Text fontSize="2xs" fontFamily="mono" color="dim" textAlign="center">
                    ONCHAIN VIA POIDH
                  </Text>
                </VStack>
              </Box>
            </Flex>

            <Text fontSize="2xs" fontFamily="mono" color="dim" textAlign="center" maxW="400px">
              HIVE BOUNTIES ARE MANAGED ON-CHAIN VIA SKATEHIVE. ETH BOUNTIES ARE CREATED ON POIDH
              (BASE + ARBITRUM).
            </Text>
          </VStack>
        ) : (
          <BountyComposer
            onNewBounty={(bounty) => {
              setNewBounty(bounty);
              handleCloseModal();
              setRefreshTrigger((prev) => prev + 1);
            }}
            onClose={handleCloseModal}
          />
        )}
      </SkateModal>

      <Box mt={{ base: 6, md: 10 }} mx={2} h="1px" bg={alpha('primary', 25)} />
    </Container>
  );
}
