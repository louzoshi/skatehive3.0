'use client';

import { useMemo, useState } from 'react';
import { Box, Text, HStack, VStack, Icon, Avatar, Image } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import NextLink from 'next/link';
import { FaHive, FaEthereum, FaBolt, FaFolder, FaTrophy } from 'react-icons/fa';
import { useTranslations } from '@/contexts/LocaleContext';
import useNow from '@/hooks/useNow';
import { buildCountdown, urgencyColor } from '@/lib/bounty-countdown';
import { formatTokenAmount } from './board-filters';
import type { UnifiedBounty } from '@/types/unified-bounty';

interface UnifiedBountyCardProps {
  bounty: UnifiedBounty;
  hivePrice?: number | null;
  hbdPrice?: number | null;
  ethPrice?: number | null;
  /** Staggers the entry animation so the grid deals itself out like cards. */
  index?: number;
}

const dealIn = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const urgentPulse = keyframes`
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.35; }
`;

const drift = keyframes`
  from { background-position: 0 0; }
  to   { background-position: 56px 56px; }
`;

const alpha = (token: string, pct: number) =>
  `color-mix(in srgb, var(--chakra-colors-${token}) ${pct}%, transparent)`;

export function UnifiedBountyCard({
  bounty,
  hivePrice,
  hbdPrice,
  ethPrice,
  index = 0,
}: UnifiedBountyCardProps) {
  const t = useTranslations('bounties');
  const now = useNow();
  const [imageFailed, setImageFailed] = useState(false);

  const countdown = useMemo(
    () => buildCountdown(bounty.deadline, bounty.createdAt, now),
    [bounty.deadline, bounty.createdAt, now],
  );

  const usdValue = useMemo(() => {
    const price =
      bounty.rewardCurrency === 'ETH'
        ? ethPrice
        : bounty.rewardCurrency === 'HBD'
          ? hbdPrice
          : bounty.rewardCurrency === 'HIVE'
            ? hivePrice
            : null;
    if (price == null) return null;
    const val = bounty.rewardAmount * price;
    return val < 0.01 ? `~$${val.toFixed(4)}` : `~$${val.toFixed(2)}`;
  }, [bounty.rewardAmount, bounty.rewardCurrency, hivePrice, hbdPrice, ethPrice]);

  const sourceIcon = bounty.source === 'hive' ? FaHive : FaEthereum;
  const hasCover = Boolean(bounty.imageUrl) && !imageFailed;
  const hasWinner = !bounty.isActive && Boolean(bounty.winnerDisplay);

  const proofLabel =
    bounty.submissionCount === 0
      ? t('cardNoProofs')
      : `${bounty.submissionCount} ${bounty.submissionCount === 1 ? t('cardProof_one') : t('cardProofs')}`;

  const deadlineColor = countdown ? urgencyColor(countdown.urgency) : 'dim';
  const isCritical = countdown?.urgency === 'critical' || countdown?.urgency === 'urgent';

  return (
    <Box
      as={NextLink}
      href={bounty.detailHref}
      display="flex"
      flexDirection="column"
      position="relative"
      border="1px solid"
      borderColor={bounty.isActive ? 'primary' : 'border'}
      bg="background"
      h="100%"
      overflow="hidden"
      animation={`${dealIn} 0.4s ease-out ${Math.min(index, 11) * 45}ms both`}
      transition="transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease"
      _hover={{
        textDecoration: 'none',
        transform: 'translateY(-4px)',
        borderColor: 'primary',
        boxShadow: `0 10px 28px rgba(0,0,0,0.45), 0 0 0 1px ${alpha('primary', 45)}, 0 0 26px ${alpha('primary', 22)}`,
      }}
      _focusVisible={{
        outline: '2px solid',
        outlineColor: 'primary',
        outlineOffset: '2px',
      }}
      sx={{
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        '&:hover .bounty-cover': { transform: 'scale(1.07)', filter: 'none' },
        '&:hover .bounty-title': { color: 'var(--chakra-colors-primary)' },
        '&:hover .bounty-cta': { background: 'var(--chakra-colors-primary)' },
        '&:hover .bounty-cta, &:hover .bounty-cta *': {
          color: 'var(--chakra-colors-background)',
        },
      }}
    >
      {/* ── Cover ──────────────────────────────── */}
      <Box position="relative" h={{ base: '150px', md: '160px' }} overflow="hidden" flexShrink={0}>
        {hasCover ? (
          <Image
            className="bounty-cover"
            src={bounty.imageUrl!}
            alt=""
            w="100%"
            h="100%"
            objectFit="cover"
            loading="lazy"
            onError={() => setImageFailed(true)}
            filter={bounty.isActive ? 'none' : 'grayscale(0.8)'}
            transition="transform 0.45s ease, filter 0.3s ease"
          />
        ) : (
          /* No image on the post — draw something rather than leave a hole. */
          <Box
            w="100%"
            h="100%"
            bg="muted"
            backgroundImage={`repeating-linear-gradient(45deg, ${alpha('primary', 8)} 0 2px, transparent 2px 14px)`}
            backgroundSize="56px 56px"
            animation={`${drift} 2.5s linear infinite`}
            display="flex"
            alignItems="center"
            justifyContent="center"
            sx={{ '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}
          >
            <Icon as={sourceIcon} boxSize="44px" color="primary" opacity={0.18} />
          </Box>
        )}

        {/* Scrim so the overlays stay readable on any photo */}
        <Box
          position="absolute"
          inset={0}
          pointerEvents="none"
          bg={`linear-gradient(180deg, ${alpha('background', 10)} 0%, ${alpha('background', 45)} 55%, var(--chakra-colors-background) 100%)`}
        />

        {/* Status / winner, top-left */}
        <HStack position="absolute" top={2} left={2} spacing={1.5} align="center">
          {hasWinner ? (
            <HStack
              spacing={1.5}
              px={2}
              py={1}
              bg={alpha('background', 88)}
              border="1px solid"
              borderColor="warning"
            >
              <Icon as={FaTrophy} boxSize="9px" color="warning" />
              <Text fontSize="2xs" fontFamily="mono" fontWeight="bold" color="warning" noOfLines={1} maxW="110px">
                {bounty.winnerDisplay}
              </Text>
            </HStack>
          ) : (
            <HStack
              spacing={1.5}
              px={2}
              py={1}
              bg={alpha('background', 88)}
              border="1px solid"
              borderColor={bounty.isActive ? 'success' : 'dim'}
            >
              {bounty.isActive && (
                <Box
                  w="5px"
                  h="5px"
                  borderRadius="full"
                  bg="success"
                  animation={`${urgentPulse} 1.6s ease-in-out infinite`}
                  sx={{ '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}
                />
              )}
              <Text
                fontSize="2xs"
                fontFamily="mono"
                fontWeight="bold"
                color={bounty.isActive ? 'success' : 'dim'}
                letterSpacing="wider"
              >
                {bounty.statusLabel}
              </Text>
            </HStack>
          )}
        </HStack>

        {/* Chain badge, top-right */}
        <HStack
          position="absolute"
          top={2}
          right={2}
          spacing={1.5}
          px={2}
          py={1}
          bg={alpha('background', 88)}
          border="1px solid"
          borderColor="border"
        >
          <Icon as={sourceIcon} boxSize="10px" color="primary" />
          <Text fontSize="2xs" fontFamily="mono" fontWeight="bold" color="text" letterSpacing="wider">
            {bounty.chainLabel ?? 'HIVE'}
          </Text>
        </HStack>

        {/* Reward slab, riding the bottom edge of the cover */}
        <HStack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          px={3}
          py={2}
          align="baseline"
          justify="space-between"
          spacing={2}
        >
          <HStack align="baseline" spacing={1.5} minW={0}>
            <Text
              fontWeight="900"
              fontSize={{ base: 'xl', md: '2xl' }}
              fontFamily="mono"
              color="primary"
              lineHeight="1"
              noOfLines={1}
              textShadow={`0 0 12px ${alpha('primary', 40)}`}
            >
              {formatTokenAmount(bounty.rewardAmount)}
            </Text>
            <Text fontSize="xs" fontFamily="mono" fontWeight="bold" color="text">
              {bounty.rewardCurrency}
            </Text>
          </HStack>
          {usdValue && (
            <Text fontSize="2xs" fontFamily="mono" color="dim" whiteSpace="nowrap">
              {usdValue}
            </Text>
          )}
        </HStack>
      </Box>

      {/* ── Body ───────────────────────────────── */}
      <VStack align="stretch" spacing={1} px={3} pt={2.5} pb={3} flex={1}>
        <Text
          className="bounty-title"
          fontWeight="bold"
          fontSize="sm"
          color="text"
          noOfLines={2}
          minH="36px"
          lineHeight="short"
          textTransform="uppercase"
          transition="color 0.2s"
        >
          {bounty.title}
        </Text>
        <Text fontSize="xs" color="dim" noOfLines={2} minH="32px" fontFamily="mono" lineHeight="tall">
          {bounty.description}
        </Text>
      </VStack>

      {/* ── Live deadline bar ──────────────────── */}
      {countdown && (
        <Box px={3} pb={2}>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="2xs" fontFamily="mono" color="dim" letterSpacing="wider">
              {countdown.urgency === 'ended' ? t('cardEnded') : t('cardEndsIn')}
            </Text>
            {countdown.urgency !== 'ended' && (
              <Text
                fontSize="2xs"
                fontFamily="mono"
                fontWeight="bold"
                color={deadlineColor}
                animation={isCritical ? `${urgentPulse} 1.4s ease-in-out infinite` : undefined}
                sx={{
                  fontVariantNumeric: 'tabular-nums',
                  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                }}
              >
                {countdown.label}
              </Text>
            )}
          </HStack>
          {countdown.progress !== null && (
            <Box h="3px" bg="muted" overflow="hidden">
              <Box
                h="100%"
                w={`${Math.round(countdown.progress * 100)}%`}
                bg={deadlineColor}
                transition="width 1s linear"
              />
            </Box>
          )}
        </Box>
      )}

      {/* ── Footer ─────────────────────────────── */}
      <HStack
        px={3}
        py={2}
        justify="space-between"
        align="center"
        borderTop="1px solid"
        borderColor="border"
        mt="auto"
        spacing={2}
      >
        <HStack spacing={1.5} minW={0} flex={1}>
          {bounty.authorAvatar ? (
            <Avatar
              src={bounty.authorAvatar}
              name={bounty.authorDisplay}
              size="2xs"
              borderRadius="none"
              border="1px solid"
              borderColor="border"
            />
          ) : (
            <Box w="16px" h="16px" border="1px solid" borderColor="border" bg="muted" />
          )}
          <Text fontSize="2xs" fontFamily="mono" color="dim" noOfLines={1}>
            {bounty.authorDisplay}
          </Text>
        </HStack>

        <Text fontSize="2xs" fontFamily="mono" color="dim" whiteSpace="nowrap" display={{ base: 'none', sm: 'block' }}>
          {proofLabel}
        </Text>

        <HStack
          className="bounty-cta"
          spacing={1.5}
          align="center"
          border="1px solid"
          borderColor="primary"
          px={2}
          py={1}
          flexShrink={0}
          transition="background 0.2s, color 0.2s"
        >
          <Icon as={bounty.isActive ? FaBolt : FaFolder} boxSize="9px" color="primary" />
          <Text
            fontSize="2xs"
            fontFamily="mono"
            fontWeight="bold"
            color="primary"
            letterSpacing="wider"
          >
            {bounty.isActive ? t('cardClaim') : t('cardProof')}
          </Text>
        </HStack>
      </HStack>
    </Box>
  );
}

export default UnifiedBountyCard;
