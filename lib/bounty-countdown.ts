export type CountdownUrgency = 'ended' | 'critical' | 'urgent' | 'soon' | 'calm';

export interface Countdown {
  /** Short label, e.g. "2D 07H", "07H 42M" or "42:07" under the last hour. */
  label: string;
  urgency: CountdownUrgency;
  /** 0 → just opened, 1 → deadline reached. Null when there is nothing to fill. */
  progress: number | null;
  msLeft: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Build the live countdown for a bounty.
 *
 * `now` comes from the shared ticker so every card on the page agrees on the
 * time; pass 0 (the pre-hydration value) to get `null` back and render nothing.
 */
export function buildCountdown(
  deadlineUnix: number | null,
  createdAtUnix: number,
  now: number,
): Countdown | null {
  if (!deadlineUnix || !now) return null;

  const deadlineMs = deadlineUnix * 1000;
  const msLeft = deadlineMs - now;

  if (msLeft <= 0) {
    return { label: 'ENDED', urgency: 'ended', progress: 1, msLeft: 0 };
  }

  const startMs = createdAtUnix > 0 ? createdAtUnix * 1000 : null;
  const span = startMs !== null ? deadlineMs - startMs : null;
  const progress =
    span !== null && span > 0
      ? Math.min(1, Math.max(0, (now - startMs!) / span))
      : null;

  let label: string;
  if (msLeft >= DAY) {
    label = `${Math.floor(msLeft / DAY)}D ${pad(Math.floor((msLeft % DAY) / HOUR))}H`;
  } else if (msLeft >= HOUR) {
    label = `${pad(Math.floor(msLeft / HOUR))}H ${pad(Math.floor((msLeft % HOUR) / MINUTE))}M`;
  } else {
    label = `${pad(Math.floor(msLeft / MINUTE))}:${pad(Math.floor((msLeft % MINUTE) / 1000))}`;
  }

  let urgency: CountdownUrgency = 'calm';
  if (msLeft < HOUR) urgency = 'critical';
  else if (msLeft < DAY) urgency = 'urgent';
  else if (msLeft < 3 * DAY) urgency = 'soon';

  return { label, urgency, progress, msLeft };
}

/** Semantic theme token to paint a countdown at a given urgency. */
export function urgencyColor(urgency: CountdownUrgency): string {
  switch (urgency) {
    case 'critical':
      return 'error';
    case 'urgent':
      return 'error';
    case 'soon':
      return 'warning';
    case 'ended':
      return 'dim';
    default:
      return 'success';
  }
}
