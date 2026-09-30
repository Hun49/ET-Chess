import { describe, expect, it } from 'vitest';
import { parseOnlineSearchParams } from '../../routes/online';

describe('Online Router & Search Params (Web)', () => {
  it('parses valid roomId and join code', () => {
    const params = parseOnlineSearchParams({
      roomId: 'room-12345',
      join: 'ABCDEF',
    });

    expect(params.roomId).toBe('room-12345');
    expect(params.join).toBe('ABCDEF');
  });

  it('handles empty or undefined search params gracefully', () => {
    const params = parseOnlineSearchParams({});
    expect(params.roomId).toBeUndefined();
    expect(params.join).toBeUndefined();
  });

  it('ignores invalid non-string search params', () => {
    const params = parseOnlineSearchParams({
      roomId: 12345 as any,
      join: ['ABC'] as any,
    });
    expect(params.roomId).toBeUndefined();
    expect(params.join).toBeUndefined();
  });
});
