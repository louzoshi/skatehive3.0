'use client';

import { Box, Text, HStack, VStack, Icon, SimpleGrid } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FaBolt, FaCoins, FaTrophy, FaUsers } from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { useTranslations } from '@/contexts/LocaleContext';
import AnimatedNumber from './AnimatedNumber';
import { formatUsd } from './board-filters';

export interface BoardStats {
  openCount: number;
  openPoolUsd: number;
  paidOutUsd: number;
  skaterCount: number;
}

interface BountyBoardHeaderProps {
  stats: BoardStats;
  isLoading: boolean;
  /** Signed-in Hive handle, greeted in the corner. Null when logged out. */
  handle?: string | null;
  /** Tiles double as filters — clicking "Open now" narrows the board. */
  onFocusOpen: () => void;
  onFocusClosed: () => void;
}

const blink = keyframes`
  0%, 49%  { opacity: 1; }
  50%, 100% { opacity: 0; }
`;

const sweep = keyframes`
  from { transform: translateX(-100%); }
  to   { transform: translateX(300%); }
`;

const alpha = (token: string, pct: number) =>
  `color-mix(in srgb, var(--chakra-colors-${token}) ${pct}%, transparent)`;

interface StatTileProps {
  icon: IconType;
  label: string;
  value: number;
  format?: (n: number) => string;
  color: string;
  onClick?: () => void;
  isLoading: boolean;
}

function StatTile({ icon, label, value, format, color, onClick, isLoading }: StatTileProps) {
  const interactive = Boolean(onClick);

  const frame = {
    textAlign: 'left' as const,
    position: 'relative' as const,
    overflow: 'hidden',
    border: '1px solid',
    borderColor: 'border',
    bg: 'muted',
    px: 3,
    py: 2.5,
    transition: 'border-color 0.2s, background 0.2s, transform 0.2s',
  };

  const body = (
    <>
      <HStack spacing={1.5} mb={1.5} align="center">
        <Icon as={icon} boxSize="10px" color={color} />
        <Text
          fontSize="2xs"
          fontFamily="mono"
          color="dim"
          textTransform="uppercase"
          letterSpacing="wider"
          noOfLines={1}
        >
          {label}
        </Text>
      </HStack>

      {isLoading ? (
        <Box h="20px" w="60%" bg={alpha('primary', 12)} position="relative" overflow="hidden">
          <Box
            position="absolute"
            inset={0}
            w="40%"
            bg={`linear-gradient(90deg, transparent, ${alpha('primary', 30)}, transparent)`}
            animation={`${sweep} 1.2s linear infinite`}
          />
        </Box>
      ) : (
        <AnimatedNumber
          value={value}
          format={format}
          fontFamily="mono"
          fontWeight="900"
          fontSize={{ base: 'lg', md: 'xl' }}
          lineHeight="1"
          color={color}
          display="block"
        />
      )}
    </>
  );

  if (!interactive) return <Box {...frame}>{body}</Box>;

  return (
    <Box
      as="button"
      type="button"
      onClick={onClick}
      cursor="pointer"
      {...frame}
      _hover={{ borderColor: color, bg: alpha(color, 8), transform: 'translateY(-2px)' }}
      _focusVisible={{ outline: '2px solid', outlineColor: color, outlineOffset: '2px' }}
    >
      {body}
    </Box>
  );
}

export default function BountyBoardHeader({
  stats,
  isLoading,
  handle,
  onFocusOpen,
  onFocusClosed,
}: BountyBoardHeaderProps) {
  const t = useTranslations('bounties');

  return (
    <VStack align="stretch" spacing={4} mb={{ base: 5, md: 6 }}>
      <Box
        position="relative"
        overflow="hidden"
        border="1px solid"
        borderColor="primary"
        bg="muted"
        px={{ base: 4, md: 6 }}
        py={{ base: 4, md: 5 }}
      >
        {/* Faint diagonal hatch — keeps the slab from reading as a blank panel */}
        <Box
          position="absolute"
          inset={0}
          pointerEvents="none"
          opacity={0.5}
          backgroundImage={`repeating-linear-gradient(45deg, ${alpha('primary', 6)} 0 1px, transparent 1px 12px)`}
        />

        <VStack align="flex-start" spacing={1} position="relative">
          <HStack spacing={2} align="center" w="100%">
            <Box w="6px" h="6px" bg="success" borderRadius="full" />
            <Text
              fontSize="2xs"
              fontFamily="mono"
              color="success"
              textTransform="uppercase"
              letterSpacing="widest"
            >
              {t('hubLiveBoard')}
            </Text>
            {handle && (
              <Text
                fontSize="2xs"
                fontFamily="mono"
                color="dim"
                ml="auto"
                display={{ base: 'none', md: 'block' }}
                noOfLines={1}
              >
                @
                <Text as="span" color="primary" fontWeight="bold">
                  {handle}
                </Text>
              </Text>
            )}
          </HStack>

          <HStack spacing={2} align="baseline" flexWrap="wrap">
            <Text
              as="h1"
              fontWeight="900"
              fontFamily="mono"
              color="primary"
              textTransform="uppercase"
              letterSpacing="wider"
              fontSize={{ base: 'xl', md: '3xl' }}
              lineHeight="1.1"
            >
              {t('title')}
            </Text>
            <Box
              w="10px"
              h={{ base: '18px', md: '24px' }}
              bg="primary"
              animation={`${blink} 1.1s step-end infinite`}
              sx={{ '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}
            />
          </HStack>

          <Text fontSize={{ base: 'xs', md: 'sm' }} fontFamily="mono" color="dim">
            {t('hubTagline')}
          </Text>
        </VStack>
      </Box>

      <SimpleGrid columns={{ base: 2, md: 4 }} gap={{ base: 2, md: 3 }}>
        <StatTile
          icon={FaBolt}
          label={t('hubStatOpen')}
          value={stats.openCount}
          color="success"
          onClick={onFocusOpen}
          isLoading={isLoading}
        />
        <StatTile
          icon={FaCoins}
          label={t('hubStatPool')}
          value={stats.openPoolUsd}
          format={formatUsd}
          color="primary"
          isLoading={isLoading}
        />
        <StatTile
          icon={FaTrophy}
          label={t('hubStatPaidOut')}
          value={stats.paidOutUsd}
          format={formatUsd}
          color="warning"
          onClick={onFocusClosed}
          isLoading={isLoading}
        />
        <StatTile
          icon={FaUsers}
          label={t('hubStatSkaters')}
          value={stats.skaterCount}
          color="text"
          isLoading={isLoading}
        />
      </SimpleGrid>
    </VStack>
  );
}
