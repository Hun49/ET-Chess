export interface TimeControlPreset {
  id: string;
  name: string;
  minutes: number;
  incrementSeconds: number;
  category: 'bullet' | 'blitz' | 'rapid' | 'classical';
}

export const SUPPORTED_TIME_CONTROLS: readonly TimeControlPreset[] = [
  { id: 'blitz-3-0', name: '3 min', minutes: 3, incrementSeconds: 0, category: 'blitz' },
  { id: 'blitz-3-2', name: '3 + 2s', minutes: 3, incrementSeconds: 2, category: 'blitz' },
  { id: 'blitz-5-0', name: '5 min', minutes: 5, incrementSeconds: 0, category: 'blitz' },
  { id: 'blitz-5-3', name: '5 + 3s', minutes: 5, incrementSeconds: 3, category: 'blitz' },
  { id: 'rapid-10-0', name: '10 min', minutes: 10, incrementSeconds: 0, category: 'rapid' },
  { id: 'rapid-10-5', name: '10 + 5s', minutes: 10, incrementSeconds: 5, category: 'rapid' },
  { id: 'rapid-15-10', name: '15 + 10s', minutes: 15, incrementSeconds: 10, category: 'rapid' },
] as const;

export const DEFAULT_TIME_CONTROL = SUPPORTED_TIME_CONTROLS[4]; // 10 min (10+0)

export function isValidTimeControl(minutes: number, incrementSeconds: number): boolean {
  return SUPPORTED_TIME_CONTROLS.some(
    (tc) => tc.minutes === minutes && tc.incrementSeconds === incrementSeconds,
  );
}

export function findTimeControlPreset(
  minutes: number,
  incrementSeconds: number,
): TimeControlPreset | undefined {
  return SUPPORTED_TIME_CONTROLS.find(
    (tc) => tc.minutes === minutes && tc.incrementSeconds === incrementSeconds,
  );
}
