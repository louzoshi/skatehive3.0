'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Box, SimpleGrid, Text, Button, HStack, VStack, Icon } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FaBolt, FaSkull } from 'react-icons/fa';
import { useTranslations } from '@/contexts/LocaleContext';
import { UnifiedBountyCard } from './UnifiedBountyCard';
import type { UnifiedBounty } from '@/types/unified-bounty';

export type { SourceFilter } from './board-filters';

interface Prices {
  hivePrice?: number | null;
  hbdPrice?: number | null;
  ethPrice?: number | null;
}

interface UnifiedBountyListProps {
  openBounties: UnifiedBounty[];
  closedBounties: UnifiedBounty[];
  /** Total before the "show more" slice, for the section headers. */
  totalOpen: number;
  totalClosed: number;
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  prices: Prices;
  /** The board has bounties, they just don't match the filters. */
  boardHasBounties: boolean;
  onClearFilters: () => void;
  onCreate: () => void;
}

const shimmer = keyframes`
  0%   { background-position: -320px 0; }
  100% { background-position: 320px 0; }
`;

const alpha = (token: string, pct: number) =>
  `color-mix(in srgb, var(--chakra-colors-${token}) ${pct}%, transparent)`;

function BountyCardSkeleton() {
  const shimmerBg = {
    bgImage: `linear-gradient(90deg, var(--chakra-colors-muted), ${alpha('primary', 10)}, var(--chakra-colors-muted))`,
    backgroundSize: '320px 100%',
    animation: `${shimmer} 1.4s linear infinite`,
  };
  return (
    <Box border="1px solid" borderColor="border" bg="background" h="100%" aria-hidden>
      <Box h={{ base: '150px', md: '160px' }} {...shimmerBg} />
      <VStack align="stretch" spacing={2} p={3}>
        <Box h="14px" w="80%" {...shimmerBg} />
        <Box h="10px" w="95%" {...shimmerBg} />
        <Box h="10px" w="60%" {...shimmerBg} />
      </VStack>
      <Box borderTop="1px solid" borderColor="border" p={3}>
        <Box h="12px" w="45%" {...shimmerBg} />
      </Box>
    </Box>
  );
}

function SectionHeading({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <HStack spacing={3} mb={3} align="center">
      <Text
        fontSize="xs"
        fontWeight="bold"
        fontFamily="mono"
        color={color}
        textTransform="uppercase"
        letterSpacing="wider"
        whiteSpace="nowrap"
      >
        {label}
      </Text>
      <Box px={1.5} border="1px solid" borderColor={color}>
        <Text fontSize="2xs" fontFamily="mono" fontWeight="bold" color={color}>
          {count}
        </Text>
      </Box>
      <Box flex={1} h="1px" bg={alpha(color, 35)} />
    </HStack>
  );
}

export default function UnifiedBountyList({
  openBounties,
  closedBounties,
  totalOpen,
  totalClosed,
  isLoading,
  isFetchingMore,
  hasMore,
  onLoadMore,
  prices,
  boardHasBounties,
  onClearFilters,
  onCreate,
}: UnifiedBountyListProps) {
  const t = useTranslations('bounties');
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const isEmpty = !isLoading && openBounties.length === 0 && closedBounties.length === 0;

  // Auto-load the next page when the bottom of the list comes into view; the
  // button below stays as the keyboard/no-observer path.
  const loadMoreRef = useRef(onLoadMore);
  loadMoreRef.current = onLoadMore;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreRef.current();
      },
      { rootMargin: '400px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore]);

  const renderGrid = useCallback(
    (bounties: UnifiedBounty[]) => (
      <SimpleGrid columns={{ base: 1, sm: 2, xl: 3 }} gap={4}>
        {bounties.map((bounty, i) => (
          <UnifiedBountyCard key={bounty.id} bounty={bounty} index={i} {...prices} />
        ))}
      </SimpleGrid>
    ),
    [prices],
  );

  return (
    <VStack align="stretch" spacing={8}>
      {isLoading && (
        <SimpleGrid columns={{ base: 1, sm: 2, xl: 3 }} gap={4}>
          {Array.from({ length: 6 }).map((_, i) => (
            <BountyCardSkeleton key={i} />
          ))}
        </SimpleGrid>
      )}

      {isEmpty && (
        <VStack
          spacing={4}
          py={16}
          px={6}
          border="1px dashed"
          borderColor="border"
          bg="muted"
          textAlign="center"
        >
          <Icon as={FaSkull} boxSize="28px" color="dim" opacity={0.5} />
          <VStack spacing={1}>
            <Text fontSize="sm" fontWeight="bold" fontFamily="mono" color="text" textTransform="uppercase">
              {boardHasBounties ? t('hubEmptyFilteredTitle') : t('hubEmptyTitle')}
            </Text>
            <Text fontSize="xs" fontFamily="mono" color="dim" maxW="360px">
              {boardHasBounties ? t('hubEmptyFilteredBody') : t('hubEmptyBody')}
            </Text>
          </VStack>
          {boardHasBounties ? (
            <Button
              size="sm"
              variant="outline"
              borderRadius="none"
              borderColor="primary"
              color="primary"
              fontFamily="mono"
              fontSize="xs"
              textTransform="uppercase"
              letterSpacing="wider"
              _hover={{ bg: 'primary', color: 'background' }}
              onClick={onClearFilters}
            >
              {t('hubClearFilters')}
            </Button>
          ) : (
            <Button
              size="sm"
              borderRadius="none"
              bg="primary"
              color="background"
              fontFamily="mono"
              fontSize="xs"
              textTransform="uppercase"
              letterSpacing="wider"
              leftIcon={<Icon as={FaBolt} boxSize="10px" />}
              _hover={{ bg: 'accent' }}
              onClick={onCreate}
            >
              {t('hubCreate')}
            </Button>
          )}
        </VStack>
      )}

      {openBounties.length > 0 && (
        <Box>
          <SectionHeading label={t('hubOpenSection')} count={totalOpen} color="success" />
          {renderGrid(openBounties)}
        </Box>
      )}

      {closedBounties.length > 0 && (
        <Box>
          <SectionHeading label={t('hubClosedSection')} count={totalClosed} color="dim" />
          {renderGrid(closedBounties)}
        </Box>
      )}

      {/* Infinite-scroll trigger + explicit fallback */}
      {hasMore && !isEmpty && (
        <Box ref={sentinelRef} textAlign="center" py={2}>
          <Button
            onClick={onLoadMore}
            isLoading={isFetchingMore}
            loadingText={t('hubLoadingMore')}
            size="sm"
            variant="unstyled"
            color="dim"
            fontWeight="bold"
            fontFamily="mono"
            textTransform="uppercase"
            letterSpacing="wider"
            fontSize="xs"
            _hover={{ color: 'primary' }}
          >
            + {t('hubLoadMore')}
          </Button>
        </Box>
      )}
    </VStack>
  );
}
