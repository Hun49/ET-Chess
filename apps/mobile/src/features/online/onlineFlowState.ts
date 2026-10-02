export interface OnlineFlowContext {
  isGameActive?: boolean;
  isQueueing?: boolean;
  roomStatus?: string | null;
  hasMatchFound?: boolean;
  hasTicket?: boolean;
  isConnected?: boolean;
  hasGameState?: boolean;
  error?: string | null;
}

export type OnlineFlowState =
  | 'ERROR'
  | 'IN_GAME'
  | 'CONNECTING'
  | 'MATCH_FOUND'
  | 'ROOM_READY'
  | 'QUEUEING'
  | 'IDLE';

export function computeMobileOnlineFlowState(ctx: OnlineFlowContext): OnlineFlowState {
  if (ctx.error) return 'ERROR';
  if (ctx.isConnected && ctx.hasGameState) return 'IN_GAME';
  if (ctx.hasTicket) return 'CONNECTING';
  if (ctx.hasMatchFound) return 'MATCH_FOUND';
  if (ctx.roomStatus === 'ready') return 'ROOM_READY';
  if (ctx.isQueueing) return 'QUEUEING';
  return 'IDLE';
}
