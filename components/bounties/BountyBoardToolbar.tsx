'use client';

import { useEffect, useRef } from 'react';
import {
  Box,
  Button,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  Flex,
} from '@chakra-ui/react';
import { FaSearch, FaTimes, FaBolt, FaSortAmountDown, FaChevronDown } from 'react-icons/fa';
import { useTranslations } from '@/contexts/LocaleContext';
import type { SortKey, SourceFilter, StatusFilter } from './board-filters';

interface Chip<T extends string> {
  key: T;
  label: string;
  count: number;
}

interface BountyBoardToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  source: SourceFilter;
  onSourceChange: (value: SourceFilter) => void;
  sourceCounts: Record<SourceFilter, number>;
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  statusCounts: Record<StatusFilter, number>;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
  onCreate: () => void;
}

const alpha = (token: string, pct: number) =>
  `color-mix(in srgb, var(--chakra-colors-${token}) ${pct}%, transparent)`;

function ChipGroup<T extends string>({
  chips,
  active,
  onSelect,
  ariaLabel,
}: {
  chips: Chip<T>[];
  active: T;
  onSelect: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <HStack
      role="group"
      aria-label={ariaLabel}
      spacing={0}
      border="1px solid"
      borderColor="border"
      bg="background"
      flexShrink={0}
    >
      {chips.map((chip) => {
        const isActive = chip.key === active;
        return (
          <Box
            key={chip.key}
            as="button"
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(chip.key)}
            px={{ base: 2.5, md: 3 }}
            py={2}
            display="flex"
            alignItems="center"
            gap={1.5}
            borderRight="1px solid"
            borderColor="border"
            _last={{ borderRight: 'none' }}
            bg={isActive ? 'primary' : 'transparent'}
            color={isActive ? 'background' : 'dim'}
            transition="background 0.15s, color 0.15s"
            _hover={{ bg: isActive ? 'primary' : alpha('primary', 12), color: isActive ? 'background' : 'text' }}
            _focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '-2px' }}
            flex={{ base: 1, sm: 'initial' }}
            justifyContent="center"
          >
            <Text fontSize="xs" fontWeight="bold" fontFamily="mono" textTransform="uppercase" letterSpacing="wider">
              {chip.label}
            </Text>
            <Text
              fontSize="2xs"
              fontFamily="mono"
              fontWeight="bold"
              opacity={isActive ? 0.75 : 0.6}
              sx={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {chip.count}
            </Text>
          </Box>
        );
      })}
    </HStack>
  );
}

export default function BountyBoardToolbar({
  query,
  onQueryChange,
  source,
  onSourceChange,
  sourceCounts,
  status,
  onStatusChange,
  statusCounts,
  sort,
  onSortChange,
  onCreate,
}: BountyBoardToolbarProps) {
  const t = useTranslations('bounties');
  const inputRef = useRef<HTMLInputElement | null>(null);

  // "/" jumps to search, Escape clears it — the board is a list you scan.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typingElsewhere =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (event.key === '/' && !typingElsewhere) {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === 'Escape' && target === inputRef.current) {
        onQueryChange('');
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onQueryChange]);

  const sortLabels: Record<SortKey, string> = {
    reward: t('hubSortReward'),
    newest: t('hubSortNewest'),
    ending: t('hubSortEnding'),
  };

  return (
    <Box
      position="sticky"
      top={0}
      zIndex={5}
      bg="background"
      borderBottom="1px solid"
      borderColor="border"
      pb={3}
      mb={5}
    >
      <Flex direction="column" gap={3}>
        <Flex gap={3} direction={{ base: 'column', md: 'row' }} align={{ base: 'stretch', md: 'center' }}>
          <InputGroup size="sm" flex={1}>
            <InputLeftElement pointerEvents="none" h="100%">
              <Icon as={FaSearch} boxSize="11px" color="dim" />
            </InputLeftElement>
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={t('hubSearchPlaceholder')}
              borderRadius="none"
              borderColor="border"
              bg="muted"
              color="text"
              fontFamily="mono"
              fontSize="xs"
              _placeholder={{ color: 'dim' }}
              _hover={{ borderColor: 'primary' }}
              _focusVisible={{ borderColor: 'primary', boxShadow: `0 0 0 1px var(--chakra-colors-primary)` }}
            />
            {query && (
              <InputRightElement h="100%">
                <Box
                  as="button"
                  type="button"
                  aria-label={t('hubSearchClear')}
                  onClick={() => onQueryChange('')}
                  color="dim"
                  _hover={{ color: 'primary' }}
                  display="flex"
                  alignItems="center"
                >
                  <Icon as={FaTimes} boxSize="10px" />
                </Box>
              </InputRightElement>
            )}
          </InputGroup>

          <Menu placement="bottom-end">
            <MenuButton
              as={Button}
              size="sm"
              variant="outline"
              borderRadius="none"
              borderColor="border"
              bg="muted"
              color="text"
              fontFamily="mono"
              fontSize="xs"
              fontWeight="bold"
              textTransform="uppercase"
              letterSpacing="wider"
              leftIcon={<Icon as={FaSortAmountDown} boxSize="10px" color="dim" />}
              rightIcon={<Icon as={FaChevronDown} boxSize="8px" />}
              _hover={{ borderColor: 'primary', color: 'primary' }}
              _active={{ borderColor: 'primary' }}
              flexShrink={0}
            >
              {sortLabels[sort]}
            </MenuButton>
            <MenuList
              bg="background"
              border="1px solid"
              borderColor="primary"
              borderRadius="none"
              py={0}
              minW="180px"
            >
              {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                <MenuItem
                  key={key}
                  onClick={() => onSortChange(key)}
                  bg={sort === key ? alpha('primary', 15) : 'transparent'}
                  color={sort === key ? 'primary' : 'text'}
                  fontFamily="mono"
                  fontSize="xs"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  _hover={{ bg: alpha('primary', 20), color: 'primary' }}
                  _focus={{ bg: alpha('primary', 20) }}
                >
                  {sortLabels[key]}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>

          <Button
            size="sm"
            onClick={onCreate}
            borderRadius="none"
            bg="primary"
            color="background"
            fontFamily="mono"
            fontSize="xs"
            fontWeight="bold"
            textTransform="uppercase"
            letterSpacing="wider"
            leftIcon={<Icon as={FaBolt} boxSize="10px" />}
            flexShrink={0}
            transition="transform 0.15s, box-shadow 0.15s"
            _hover={{
              bg: 'accent',
              transform: 'translateY(-1px)',
              boxShadow: `0 0 16px ${alpha('primary', 45)}`,
            }}
          >
            {t('hubCreate')}
          </Button>
        </Flex>

        <Flex gap={3} direction={{ base: 'column', sm: 'row' }} align={{ base: 'stretch', sm: 'center' }}>
          <ChipGroup
            ariaLabel={t('hubStatusAll')}
            active={status}
            onSelect={onStatusChange}
            chips={[
              { key: 'open', label: t('hubStatusOpen'), count: statusCounts.open },
              { key: 'closed', label: t('hubStatusClosed'), count: statusCounts.closed },
              { key: 'all', label: t('hubStatusAll'), count: statusCounts.all },
            ]}
          />
          <ChipGroup
            ariaLabel={t('hubSourceAll')}
            active={source}
            onSelect={onSourceChange}
            chips={[
              { key: 'all', label: t('hubSourceAll'), count: sourceCounts.all },
              { key: 'hive', label: t('hubSourceHive'), count: sourceCounts.hive },
              { key: 'poidh', label: t('hubSourcePoidh'), count: sourceCounts.poidh },
            ]}
          />
        </Flex>
      </Flex>
    </Box>
  );
}
