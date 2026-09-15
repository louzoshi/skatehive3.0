'use client';

import { useState } from 'react';
import { Avatar, Box, Collapse, HStack, Icon, Text, VStack } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FaChevronRight, FaEthereum, FaHive, FaTrophy } from 'react-icons/fa';
import { useTranslations } from '@/contexts/LocaleContext';
import { formatTokenAmount, formatUsd } from './board-filters';
import type { SourceFilter } from './board-filters';

export interface PoolSlice {
  currency: string;
  amount: number;
  usd: number;
}

export interface WinnerRow {
  display: string;
  avatar: string | null;
  wins: number;
}

interface BountyBoardSidebarProps {
  pool: PoolSlice[];
  poolTotalUsd: number;
  winners: WinnerRow[];
  onSourceSelect: (source: SourceFilter) => void;
}

const grow = keyframes`
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
`;

const alpha = (token: string, pct: number) =>
  `color-mix(in srgb, var(--chakra-colors-${token}) ${pct}%, transparent)`;

const MEDALS = ['warning', 'text', 'secondary'];

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: typeof FaTrophy;
  children: React.ReactNode;
}) {
  return (
    <Box border="1px solid" borderColor="border" bg="muted">
      <HStack borderBottom="1px solid" borderColor="primary" px={4} py={2} spacing={2}>
        {icon && <Icon as={icon} boxSize="11px" color="primary" />}
        <Text
          fontSize="xs"
          fontWeight="bold"
          fontFamily="mono"
          color="text"
          textTransform="uppercase"
          letterSpacing="wider"
        >
          {title}
        </Text>
      </HStack>
      {children}
    </Box>
  );
}

function HowItWorks() {
  const t = useTranslations('bounties');
  const [openStep, setOpenStep] = useState(0);

  const steps = [
    { title: t('hubStep1Title'), body: t('hubStep1Body') },
    { title: t('hubStep2Title'), body: t('hubStep2Body') },
    { title: t('hubStep3Title'), body: t('hubStep3Body') },
  ];

  return (
    <Panel title={t('hubHowItWorks')}>
      <VStack align="stretch" spacing={0}>
        {steps.map((step, idx) => {
          const isOpen = openStep === idx;
          return (
            <Box
              key={step.title}
              borderBottom={idx < steps.length - 1 ? '1px solid' : 'none'}
              borderColor="border"
            >
              <HStack
                as="button"
                type="button"
                w="100%"
                px={4}
                py={2.5}
                spacing={2.5}
                align="center"
                textAlign="left"
                aria-expanded={isOpen}
                onClick={() => setOpenStep(isOpen ? -1 : idx)}
                transition="background 0.15s"
                _hover={{ bg: alpha('primary', 8) }}
                _focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '-2px' }}
              >
                <Box
                  w="18px"
                  h="18px"
                  flexShrink={0}
                  border="1px solid"
                  borderColor={isOpen ? 'primary' : 'border'}
                  bg={isOpen ? 'primary' : 'transparent'}
                  color={isOpen ? 'background' : 'dim'}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  transition="all 0.2s"
                >
                  <Text fontSize="2xs" fontFamily="mono" fontWeight="bold">
                    {idx + 1}
                  </Text>
                </Box>
                <Text
                  flex={1}
                  fontSize="xs"
                  fontFamily="mono"
                  fontWeight="bold"
                  color={isOpen ? 'primary' : 'text'}
                  textTransform="uppercase"
                >
                  {step.title}
                </Text>
                <Icon
                  as={FaChevronRight}
                  boxSize="8px"
                  color="dim"
                  transform={isOpen ? 'rotate(90deg)' : 'none'}
                  transition="transform 0.2s"
                />
              </HStack>
              <Collapse in={isOpen} animateOpacity>
                <Text fontSize="2xs" fontFamily="mono" color="dim" lineHeight="tall" px={4} pb={3} pl="52px">
                  {step.body}
                </Text>
              </Collapse>
            </Box>
          );
        })}
      </VStack>
    </Panel>
  );
}

export default function BountyBoardSidebar({
  pool,
  poolTotalUsd,
  winners,
  onSourceSelect,
}: BountyBoardSidebarProps) {
  const t = useTranslations('bounties');

  return (
    <VStack spacing={4} align="stretch">
      {/* ── Reward pool ───────────────────────── */}
      <Panel title={t('hubRewardPool')}>
        {pool.length === 0 ? (
          <Text fontSize="2xs" fontFamily="mono" color="dim" px={4} py={4}>
            {t('hubPoolEmpty')}
          </Text>
        ) : (
          <VStack align="stretch" spacing={2.5} px={4} py={3}>
            {pool.map((slice) => {
              const share = poolTotalUsd > 0 ? slice.usd / poolTotalUsd : 0;
              return (
                <Box key={slice.currency}>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="2xs" fontFamily="mono" fontWeight="bold" color="text">
                      {formatTokenAmount(slice.amount)} {slice.currency}
                    </Text>
                    <Text fontSize="2xs" fontFamily="mono" color="dim">
                      {formatUsd(slice.usd)}
                    </Text>
                  </HStack>
                  <Box h="4px" bg="background" overflow="hidden">
                    <Box
                      h="100%"
                      w={`${Math.max(2, Math.round(share * 100))}%`}
                      bg="primary"
                      transformOrigin="left"
                      animation={`${grow} 0.7s ease-out both`}
                      sx={{ '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}
                    />
                  </Box>
                </Box>
              );
            })}
          </VStack>
        )}
      </Panel>

      {/* ── How it works ──────────────────────── */}
      <HowItWorks />

      {/* ── Leaderboard ───────────────────────── */}
      {winners.length > 0 && (
        <Panel title={t('hubTopWinners')} icon={FaTrophy}>
          <VStack align="stretch" spacing={0} px={2} py={1}>
            {winners.map((winner, idx) => (
              <HStack
                key={winner.display}
                spacing={2}
                px={2}
                py={1.5}
                borderBottom={idx < winners.length - 1 ? '1px solid' : 'none'}
                borderColor="border"
                transition="background 0.15s"
                _hover={{ bg: alpha('primary', 10) }}
              >
                <Text
                  fontSize="2xs"
                  fontFamily="mono"
                  fontWeight="bold"
                  color={idx < 3 ? MEDALS[idx] : 'dim'}
                  w="16px"
                  textAlign="right"
                >
                  {idx + 1}
                </Text>
                {winner.avatar ? (
                  <Avatar
                    src={winner.avatar}
                    name={winner.display}
                    size="2xs"
                    borderRadius="none"
                    border="1px solid"
                    borderColor={idx < 3 ? MEDALS[idx] : 'border'}
                  />
                ) : (
                  <Box
                    w="20px"
                    h="20px"
                    bg="background"
                    border="1px solid"
                    borderColor={idx < 3 ? MEDALS[idx] : 'border'}
                  />
                )}
                <Text fontSize="xs" fontFamily="mono" fontWeight="bold" color="text" noOfLines={1} flex={1}>
                  {winner.display}
                </Text>
                <HStack spacing={1} align="center" flexShrink={0}>
                  <Icon as={FaTrophy} boxSize="8px" color="warning" />
                  <Text fontSize="2xs" fontFamily="mono" fontWeight="bold" color="warning">
                    {winner.wins}
                  </Text>
                </HStack>
              </HStack>
            ))}
          </VStack>
        </Panel>
      )}

      {/* ── Networks (each row filters the board) ─ */}
      <Panel title={t('hubNetworks')}>
        <VStack align="stretch" spacing={0} px={2} py={1}>
          {[
            { source: 'hive' as SourceFilter, icon: FaHive, name: 'HIVE', meta: 'BLOCKCHAIN' },
            { source: 'poidh' as SourceFilter, icon: FaEthereum, name: 'BASE', meta: 'CHAIN 8453' },
            { source: 'poidh' as SourceFilter, icon: FaEthereum, name: 'ARBITRUM', meta: 'CHAIN 42161' },
          ].map((net, idx, arr) => (
            <HStack
              key={net.name}
              as="button"
              type="button"
              onClick={() => onSourceSelect(net.source)}
              spacing={2}
              px={2}
              py={2}
              borderBottom={idx < arr.length - 1 ? '1px solid' : 'none'}
              borderColor="border"
              transition="background 0.15s"
              _hover={{ bg: alpha('primary', 10) }}
              _focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '-2px' }}
            >
              <Icon as={net.icon} boxSize="13px" color="primary" />
              <Text fontSize="xs" fontFamily="mono" color="text" fontWeight="bold">
                {net.name}
              </Text>
              <Text fontSize="2xs" fontFamily="mono" color="dim" ml="auto">
                {net.meta}
              </Text>
            </HStack>
          ))}
        </VStack>
      </Panel>
    </VStack>
  );
}
