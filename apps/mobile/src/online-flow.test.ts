import { describe, expect, it } from 'vitest';
import { computeMobileOnlineFlowState } from './features/online/onlineFlowState';

describe('Phase 3 Deliverables D3.19 & D3.20 — Mobile Online Flow State Machine', () => {
  it('returns IDLE when not queueing and no active game or room', () => {
    const state = computeMobileOnlineFlowState({
      isGameActive: false,
      isQueueing: false,
      roomStatus: null,
      hasMatchFound: false,
      hasTicket: false,
      isConnected: false,
      hasGameState: false,
    });
    expect(state).toBe('IDLE');
  });

  it('transitions to QUEUEING when isQueueing is true', () => {
    const state = computeMobileOnlineFlowState({
      isGameActive: false,
      isQueueing: true,
      hasMatchFound: false,
      hasTicket: false,
      isConnected: false,
      hasGameState: false,
    });
    expect(state).toBe('QUEUEING');
  });

  it('transitions to ROOM_READY when roomStatus is ready', () => {
    const state = computeMobileOnlineFlowState({
      isGameActive: false,
      isQueueing: false,
      roomStatus: 'ready',
      hasMatchFound: false,
      hasTicket: false,
      isConnected: false,
      hasGameState: false,
    });
    expect(state).toBe('ROOM_READY');
  });

  it('transitions to MATCH_FOUND when match is found before ticket is acquired', () => {
    const state = computeMobileOnlineFlowState({
      isGameActive: true,
      isQueueing: false,
      hasMatchFound: true,
      hasTicket: false,
      isConnected: false,
      hasGameState: false,
    });
    expect(state).toBe('MATCH_FOUND');
  });

  it('transitions to CONNECTING when ticket is acquired but socket not yet connected', () => {
    const state = computeMobileOnlineFlowState({
      isGameActive: true,
      isQueueing: false,
      hasMatchFound: true,
      hasTicket: true,
      isConnected: false,
      hasGameState: false,
    });
    expect(state).toBe('CONNECTING');
  });

  it('transitions to IN_GAME when socket is connected and initial gameState is loaded', () => {
    const state = computeMobileOnlineFlowState({
      isGameActive: true,
      isQueueing: false,
      hasMatchFound: true,
      hasTicket: true,
      isConnected: true,
      hasGameState: true,
    });
    expect(state).toBe('IN_GAME');
  });

  it('transitions to ERROR when any error is present, regardless of state', () => {
    const state = computeMobileOnlineFlowState({
      error: 'Failed to connect to room',
      isGameActive: true,
      isQueueing: false,
      hasMatchFound: true,
      hasTicket: true,
      isConnected: false,
      hasGameState: false,
    });
    expect(state).toBe('ERROR');
  });
});
