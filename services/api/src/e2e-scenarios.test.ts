import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app, errorHandler } from './app';
import { resetRoomsStore } from './data/rooms-store';
import { resetStore } from './data/store';
import { GameRoomDO } from './durable-objects/GameRoomDO';
import { MatchmakerDO } from './durable-objects/MatchmakerDO';
import { TournamentDO } from './durable-objects/TournamentDO';

class MockWebSocket {
  public sentMessages: string[] = [];
  public attachment: any = null;
  public tags: string[] = [];
  public readyState = 1;

  serializeAttachment(attachment: any) {
    this.attachment = attachment;
  }

  deserializeAttachment() {
    return this.attachment;
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = 3;
  }

  get parsedMessages() {
    return this.sentMessages.map((m) => {
      try {
        return JSON.parse(m);
      } catch {
        return m;
      }
    });
  }
}

class MockWebSocketPair {
  0: MockWebSocket;
  1: MockWebSocket;
  constructor() {
    this[0] = new MockWebSocket();
    this[1] = new MockWebSocket();
  }
}

(globalThis as unknown as Record<string, unknown>).WebSocketPair = MockWebSocketPair;

const OriginalResponse = (globalThis as any).__OriginalResponse || globalThis.Response;
(globalThis as any).__OriginalResponse = OriginalResponse;

class MockResponse extends OriginalResponse {
  constructor(body?: any, init?: ResponseInit & { webSocket?: any }) {
    if (init && init.status === 101) {
      super(body, { ...init, status: 200 });
      Object.defineProperty(this, 'status', { value: 101, configurable: true });
      if (init.webSocket) {
        Object.defineProperty(this, 'webSocket', { value: init.webSocket, configurable: true });
      }
      return;
    }
    super(body, init);
    if (init && (init as any).webSocket) {
      Object.defineProperty(this, 'webSocket', {
        value: (init as any).webSocket,
        configurable: true,
      });
    }
  }
}
(globalThis as unknown as Record<string, unknown>).Response = MockResponse;

function createMockDOContext(sharedStorage = new Map<string, any>()) {
  let scheduledAlarm: number | null = null;
  const webSockets: MockWebSocket[] = [];

  const ctx: any = {
    storage: {
      get: vi.fn(async <T>(key: string): Promise<T | undefined> => sharedStorage.get(key)),
      put: vi.fn(async (key: string, val: any): Promise<void> => {
        sharedStorage.set(key, val);
      }),
      delete: vi.fn(async (key: string): Promise<boolean> => sharedStorage.delete(key)),
      setAlarm: vi.fn(async (time: number) => {
        scheduledAlarm = time;
      }),
      deleteAlarm: vi.fn(async () => {
        scheduledAlarm = null;
      }),
      getAlarm: vi.fn(async () => scheduledAlarm),
    },
    acceptWebSocket: vi.fn((ws: any, tags: string[] = []) => {
      ws.tags = tags;
      webSockets.push(ws);
    }),
    getWebSockets: vi.fn((tag?: string) => {
      if (!tag) return webSockets;
      return webSockets.filter(
        (ws) => ws.tags?.includes(tag) || ws.deserializeAttachment()?.userId === tag,
      );
    }),
  };

  return { ctx, storage: sharedStorage, webSockets, getScheduledAlarm: () => scheduledAlarm };
}

describe('Phase 4 Deliverable D4.2 — Cross-Boundary Integration & E2E Scenarios', () => {
  const secretKey = 'test-secret-at-least-32-characters-long!';
  let gameRoomInstances: Map<
    string,
    { do: GameRoomDO; mockCtx: ReturnType<typeof createMockDOContext> }
  >;
  let tournamentInstances: Map<
    string,
    { do: TournamentDO; mockCtx: ReturnType<typeof createMockDOContext> }
  >;
  let matchmakerInstance: { do: MatchmakerDO; mockCtx: ReturnType<typeof createMockDOContext> };
  let mockEnv: any;

  beforeEach(() => {
    resetStore();
    resetRoomsStore();

    gameRoomInstances = new Map();
    tournamentInstances = new Map();

    const getOrCreateGameRoom = (name: string) => {
      if (!gameRoomInstances.has(name)) {
        const mockCtx = createMockDOContext();
        const instance = new GameRoomDO(mockCtx.ctx, mockEnv);
        gameRoomInstances.set(name, { do: instance, mockCtx });
      }
      return gameRoomInstances.get(name)!;
    };

    const getOrCreateTournament = (name: string) => {
      if (!tournamentInstances.has(name)) {
        const mockCtx = createMockDOContext();
        const instance = new TournamentDO(mockCtx.ctx, mockEnv);
        tournamentInstances.set(name, { do: instance, mockCtx });
      }
      return tournamentInstances.get(name)!;
    };

    const mmCtx = createMockDOContext();

    mockEnv = {
      BETTER_AUTH_SECRET: secretKey,
      GAME_ROOM: {
        idFromName: (name: string) => ({ toString: () => name, name }),
        get: (id: any) => ({
          fetch: async (req: Request) => {
            const instance = getOrCreateGameRoom(id.name || id.toString());
            return instance.do.fetch(req);
          },
        }),
      },
      TOURNAMENT: {
        idFromName: (name: string) => ({ toString: () => name, name }),
        get: (id: any) => ({
          fetch: async (req: Request) => {
            const instance = getOrCreateTournament(id.name || id.toString());
            return instance.do.fetch(req);
          },
        }),
      },
      MATCHMAKER: {
        idFromName: (name: string) => ({ toString: () => name, name }),
        get: (_id: any) => ({
          fetch: async (req: Request) => matchmakerInstance.do.fetch(req),
        }),
      },
    };

    matchmakerInstance = {
      mockCtx: mmCtx,
      do: new MatchmakerDO(mmCtx.ctx, mockEnv),
    };
  });

  describe("Scenario 1: Friend Game End-to-End (Creation -> Join -> Start -> Ticket -> Scholar's Mate Checkmate)", () => {
    it('executes full authoritative friend game to checkmate settlement', async () => {
      // 1. Alice creates a friend challenge room (hostColor: 'white')
      const createRes = await app.request(
        '/rooms',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-test-user-id': 'alice-id',
            'x-test-user-name': 'Alice',
          },
          body: JSON.stringify({
            timeControlMinutes: 5,
            timeControlIncrement: 0,
            hostColor: 'white',
          }),
        },
        mockEnv,
      );
      expect(createRes.status).toBe(201);
      const { room } = (await createRes.json()) as any;
      expect(room.id).toBeDefined();
      expect(room.code).toBeDefined();
      expect(room.hostUserId).toBe('alice-id');
      expect(room.status).toBe('waiting');

      // 2. Bob joins the room using the 6-character room code
      const joinRes = await app.request(
        `/rooms/${room.code}/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-test-user-id': 'bob-id',
            'x-test-user-name': 'Bob',
          },
        },
        mockEnv,
      );
      expect(joinRes.status).toBe(200);
      const joinedRoom = ((await joinRes.json()) as any).room;
      expect(joinedRoom.guestUserId).toBe('bob-id');
      expect(joinedRoom.status).toBe('ready');

      // 3. Alice starts the game (provisions GameRoomDO)
      const startRes = await app.request(
        `/rooms/${room.id}/start`,
        {
          method: 'POST',
          headers: {
            'x-test-user-id': 'alice-id',
          },
        },
        mockEnv,
      );
      expect(startRes.status).toBe(200);
      expect(((await startRes.json()) as any).room.status).toBe('active');

      // 4. Both players request single-use game tickets for WebSocket authorization
      const aliceTicketRes = await app.request(
        `/rooms/${room.id}/ticket`,
        {
          method: 'POST',
          headers: { 'x-test-user-id': 'alice-id', 'x-test-user-name': 'Alice' },
        },
        mockEnv,
      );
      expect(aliceTicketRes.status).toBe(200);
      const { ticket: aliceTicket } = (await aliceTicketRes.json()) as any;

      const bobTicketRes = await app.request(
        `/rooms/${room.id}/ticket`,
        {
          method: 'POST',
          headers: { 'x-test-user-id': 'bob-id', 'x-test-user-name': 'Bob' },
        },
        mockEnv,
      );
      expect(bobTicketRes.status).toBe(200);
      const { ticket: bobTicket } = (await bobTicketRes.json()) as any;

      // 5. Connect both players to GameRoomDO via WebSocket upgrade
      const roomDO = gameRoomInstances.get(room.id)!.do;

      const aliceWsReq = new Request(`https://do/ws?ticket=${aliceTicket}`, {
        headers: { Upgrade: 'websocket' },
      });
      const aliceUpgradeRes = await roomDO.fetch(aliceWsReq);
      expect(aliceUpgradeRes.status).toBe(101);

      const bobWsReq = new Request(`https://do/ws?ticket=${bobTicket}`, {
        headers: { Upgrade: 'websocket' },
      });
      const bobUpgradeRes = await roomDO.fetch(bobWsReq);
      expect(bobUpgradeRes.status).toBe(101);

      const serverSockets = gameRoomInstances.get(room.id)!.mockCtx.webSockets;
      expect(serverSockets.length).toBe(2);
      const aliceServerWs = serverSockets[0]!;
      const bobServerWs = serverSockets[1]!;

      // Initial state sync verified
      const aliceSync = aliceServerWs.parsedMessages.find((m) => m.type === 'state-sync');
      expect(aliceSync).toBeDefined();
      expect(aliceSync.lifecycleState).toBe('ACTIVE');
      expect(aliceSync.yourColor).toBe('white');
      expect(aliceSync.whiteRemainingMs).toBe(300000);
      expect(aliceSync.blackRemainingMs).toBe(300000);

      const bobSync = bobServerWs.parsedMessages.find((m) => m.type === 'state-sync');
      expect(bobSync).toBeDefined();
      expect(bobSync.yourColor).toBe('black');

      // 6. Play moves: Scholar's Mate (1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#)
      // Move 1: Alice plays e2 -> e4
      await roomDO.webSocketMessage(
        aliceServerWs as any,
        JSON.stringify({ type: 'move', move: { from: 'e2', to: 'e4' } }),
      );
      // Move 2: Bob plays e7 -> e5
      await roomDO.webSocketMessage(
        bobServerWs as any,
        JSON.stringify({ type: 'move', move: { from: 'e7', to: 'e5' } }),
      );
      // Move 3: Alice plays d1 -> h5 (Qh5)
      await roomDO.webSocketMessage(
        aliceServerWs as any,
        JSON.stringify({ type: 'move', move: { from: 'd1', to: 'h5' } }),
      );
      // Move 4: Bob plays b8 -> c6 (Nc6)
      await roomDO.webSocketMessage(
        bobServerWs as any,
        JSON.stringify({ type: 'move', move: { from: 'b8', to: 'c6' } }),
      );
      // Move 5: Alice plays f1 -> c4 (Bc4)
      await roomDO.webSocketMessage(
        aliceServerWs as any,
        JSON.stringify({ type: 'move', move: { from: 'f1', to: 'c4' } }),
      );
      // Move 6: Bob plays g8 -> f6 (Nf6)
      await roomDO.webSocketMessage(
        bobServerWs as any,
        JSON.stringify({ type: 'move', move: { from: 'g8', to: 'f6' } }),
      );
      // Move 7: Alice plays h5 -> f7 (Qxf7# CHECKMATE!)
      await roomDO.webSocketMessage(
        aliceServerWs as any,
        JSON.stringify({ type: 'move', move: { from: 'h5', to: 'f7' } }),
      );

      // 7. Verification: Game is authoritatively concluded by checkmate
      const gameOverMsg = aliceServerWs.parsedMessages.find((m) => m.type === 'game-over');
      expect(gameOverMsg).toBeDefined();
      expect(gameOverMsg.result).toBe('white');
      expect(gameOverMsg.reason).toContain('Checkmate');

      const gameStateRes = await roomDO.fetch(new Request('https://do/state'));
      const finalState = (await gameStateRes.json()) as any;
      expect(finalState.status).toBe('finished');
      expect(finalState.lifecycleState).toBe('COMPLETED');
      expect(finalState.result).toBe('white');
      expect(finalState.terminationReason).toContain('Checkmate');

      // 8. Security verification: Any further moves are rejected
      await roomDO.webSocketMessage(
        bobServerWs as any,
        JSON.stringify({ type: 'move', move: { from: 'f6', to: 'e4' } }),
      );
      const postGameError = bobServerWs.parsedMessages[bobServerWs.parsedMessages.length - 1];
      expect(postGameError.type).toBe('error');
      expect(postGameError.message).toBe('Game has already concluded');
    });
  });

  describe('Scenario 2: Ranked Matchmaking End-to-End (Queue -> Auto-Pair -> Provision -> Resignation)', () => {
    it('pairs queued players within rating window, provisions GameRoomDO, and handles resignation', async () => {
      // 1. Connect Player 1 (Rating 1200) to MatchmakerDO queue
      const p1Req = new Request(
        'https://matchmaker/queue?userId=user-p1&displayName=Player1&rating=1200',
        {
          headers: { Upgrade: 'websocket' },
        },
      );
      const p1Res = await matchmakerInstance.do.fetch(p1Req);
      expect(p1Res.status).toBe(101);

      // Verify Player 1 received queued confirmation
      const p1ServerWs = matchmakerInstance.mockCtx.webSockets[0]!;
      const p1QueuedMsg = p1ServerWs.parsedMessages.find((m) => m.type === 'queued');
      expect(p1QueuedMsg).toBeDefined();
      expect(p1QueuedMsg.rating).toBe(1200);

      // 2. Connect Player 2 (Rating 1250) to MatchmakerDO queue
      const p2Req = new Request(
        'https://matchmaker/queue?userId=user-p2&displayName=Player2&rating=1250',
        {
          headers: { Upgrade: 'websocket' },
        },
      );
      const p2Res = await matchmakerInstance.do.fetch(p2Req);
      expect(p2Res.status).toBe(101);

      const p2ServerWs = matchmakerInstance.mockCtx.webSockets[1]!;

      // 3. Verify match was immediately found and dispatched
      const p1MatchMsg = p1ServerWs.parsedMessages.find((m) => m.type === 'match-found');
      const p2MatchMsg = p2ServerWs.parsedMessages.find((m) => m.type === 'match-found');
      expect(p1MatchMsg).toBeDefined();
      expect(p2MatchMsg).toBeDefined();
      expect(p1MatchMsg.gameId).toBe(p2MatchMsg.gameId);
      expect(p1MatchMsg.yourColor).not.toBe(p2MatchMsg.yourColor);

      const gameId = p1MatchMsg.gameId;

      // 4. Verify GameRoomDO was provisioned with the players
      const gameRoom = gameRoomInstances.get(gameId)!.do;
      const gameInfoRes = await gameRoom.fetch(new Request('https://do/state'));
      expect(gameInfoRes.status).toBe(200);
      const gameInfo = (await gameInfoRes.json()) as any;
      expect([gameInfo.whiteUserId, gameInfo.blackUserId]).toContain('user-p1');
      expect([gameInfo.whiteUserId, gameInfo.blackUserId]).toContain('user-p2');

      // 5. Connect both players to the provisioned GameRoomDO via tickets
      const whiteUserId = gameInfo.whiteUserId;
      const blackUserId = gameInfo.blackUserId;

      const whiteTicketRes = await app.request(
        `/rooms/${gameId}/ticket`,
        {
          method: 'POST',
          headers: { 'x-test-user-id': whiteUserId, 'x-test-user-name': 'WhitePlayer' },
        },
        mockEnv,
      );
      const { ticket: whiteTicket } = (await whiteTicketRes.json()) as any;

      const blackTicketRes = await app.request(
        `/rooms/${gameId}/ticket`,
        {
          method: 'POST',
          headers: { 'x-test-user-id': blackUserId, 'x-test-user-name': 'BlackPlayer' },
        },
        mockEnv,
      );
      const { ticket: blackTicket } = (await blackTicketRes.json()) as any;

      await gameRoom.fetch(
        new Request(`https://do/ws?ticket=${whiteTicket}`, { headers: { Upgrade: 'websocket' } }),
      );
      await gameRoom.fetch(
        new Request(`https://do/ws?ticket=${blackTicket}`, { headers: { Upgrade: 'websocket' } }),
      );

      const gameSockets = gameRoomInstances.get(gameId)!.mockCtx.webSockets;
      const whiteSocket = gameSockets[0]!;
      const blackSocket = gameSockets[1]!;

      // 6. Black resigns
      await gameRoom.webSocketMessage(blackSocket as any, JSON.stringify({ type: 'resign' }));

      // 7. Verify White wins by resignation
      const gameOverBroadcast = whiteSocket.parsedMessages.find((m) => m.type === 'game-over');
      expect(gameOverBroadcast).toBeDefined();
      expect(gameOverBroadcast.result).toBe('white');
      expect(gameOverBroadcast.reason).toContain('resigned');

      const finalState = (await (
        await gameRoom.fetch(new Request('https://do/state'))
      ).json()) as any;
      expect(finalState.lifecycleState).toBe('COMPLETED');
      expect(finalState.result).toBe('white');
      expect(finalState.terminationReason).toContain('resigned');
    });
  });

  describe('Scenario 3: Tournament End-to-End (4 Players -> R1 Provisioning -> Tiebreak -> Finals -> Champion)', () => {
    it('executes full tournament bracket, handles draw tiebreak by seed, and crowns champion', async () => {
      // 1. Alice creates a 4-player tournament (Alice is automatically registered as host participant)
      const createRes = await app.request(
        '/tournaments',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-test-user-id': 'p1-alice',
            'x-test-user-name': 'Alice',
          },
          body: JSON.stringify({
            name: 'Grand Prix 2026',
            format: 'single-elimination',
            maxParticipants: 4,
          }),
        },
        mockEnv,
      );
      expect(createRes.status).toBe(201);
      const { tournament } = (await createRes.json()) as any;
      const tournamentId = tournament.id;

      // 2. Remaining 3 Players join (Seed 2: Bob, Seed 3: Charlie, Seed 4: Dave)
      const players = [
        { id: 'p2-bob', name: 'Bob', rating: 1800 },
        { id: 'p3-charlie', name: 'Charlie', rating: 1600 },
        { id: 'p4-dave', name: 'Dave', rating: 1400 },
      ];

      for (const p of players) {
        const joinRes = await app.request(
          `/tournaments/${tournamentId}/join`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-test-user-id': p.id,
              'x-test-user-name': p.name,
            },
          },
          mockEnv,
        );
        expect(joinRes.status).toBe(200);
      }

      // 3. Host starts tournament
      const startRes = await app.request(
        `/tournaments/${tournamentId}/start`,
        {
          method: 'POST',
          headers: { 'x-test-user-id': 'p1-alice' },
        },
        mockEnv,
      );
      expect(startRes.status).toBe(200);

      // Verify Round 1 matches generated:
      // Exactly 2 matches for 4 players:
      // Match 1: Seed 1 (Alice) vs Seed 4 (Dave)
      // Match 2: Seed 2 (Bob) vs Seed 3 (Charlie)
      const tourneyDO = tournamentInstances.get(tournamentId)!.do;
      const stateRes = await tourneyDO.fetch(new Request('https://tournament/state'));
      const { tournament: state } = (await stateRes.json()) as any;
      expect(state.status).toBe('in-progress');
      expect(state.matches.length).toBe(2);

      const match1 = state.matches[0];
      const match2 = state.matches[1];
      expect(match1.player1.userId).toBe('p1-alice');
      expect(match1.player2.userId).toBe('p4-dave');
      expect(match2.player1.userId).toBe('p2-bob');
      expect(match2.player2.userId).toBe('p3-charlie');

      // Both matches must have GameRoomDO provisioned
      expect(match1.gameId).toBeDefined();
      expect(match2.gameId).toBeDefined();
      expect(gameRoomInstances.has(match1.gameId)).toBe(true);
      expect(gameRoomInstances.has(match2.gameId)).toBe(true);

      // 4. Play Match 1: Alice wins against Dave
      const gameRoom1 = gameRoomInstances.get(match1.gameId)!.do;
      await gameRoom1.fetch(
        new Request('https://do/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'finished',
            lifecycleState: 'COMPLETED',
            result: 'white', // Alice is white
            terminationReason: 'checkmate',
          }),
        }),
      );

      // Notify TournamentDO of Match 1 result
      await tourneyDO.fetch(
        new Request('https://tournament/match-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: match1.id,
            gameId: match1.gameId,
            winnerUserId: 'p1-alice',
            result: 'white',
          }),
        }),
      );

      // 5. Play Match 2: Bob and Charlie draw -> Seed tiebreaker applies!
      // In tiebreak, seed 2 (Bob) must advance over seed 3 (Charlie)
      const match2ResultRes = await tourneyDO.fetch(
        new Request('https://tournament/match-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: match2.id,
            gameId: match2.gameId,
            winnerUserId: null,
            result: 'draw',
          }),
        }),
      );
      expect(match2ResultRes.status).toBe(200);

      // 6. Round progression to Finals (Round 2)
      const { tournament: finalsState } = (await (
        await tourneyDO.fetch(new Request('https://tournament/state'))
      ).json()) as any;
      expect(finalsState.matches.length).toBe(3); // Match 1, Match 2, plus Finals Match 3!

      const finalsMatch = finalsState.matches[2];
      expect(finalsMatch.round).toBe(2);
      expect(finalsMatch.player1.userId).toBe('p1-alice');
      expect(finalsMatch.player2.userId).toBe('p2-bob');
      expect(finalsMatch.gameId).toBeDefined();

      // 7. Play Finals: Alice defeats Bob
      await tourneyDO.fetch(
        new Request('https://tournament/match-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: finalsMatch.id,
            gameId: finalsMatch.gameId,
            winnerUserId: 'p1-alice',
            result: 'white',
          }),
        }),
      );

      // 8. Verify Tournament completed and Alice crowned Champion
      const { tournament: completedTournament } = (await (
        await tourneyDO.fetch(new Request('https://tournament/state'))
      ).json()) as any;
      expect(completedTournament.status).toBe('finished');
      expect(completedTournament.winner.userId).toBe('p1-alice');
    });
  });

  describe('Scenario 4: Cross-Layer Schema, Boundary & Abuse Protection', () => {
    it('rejects oversized WebSocket payload (>16KB) with safe error message', async () => {
      const mockCtx = createMockDOContext();
      const room = new GameRoomDO(mockCtx.ctx, mockEnv);
      const ws = new MockWebSocket();
      ws.serializeAttachment({ userId: 'u1', displayName: 'Player 1', color: 'white' });

      // Generate a 20KB oversized payload
      const hugePayload = JSON.stringify({
        type: 'move',
        move: { from: 'e2', to: 'e4' },
        data: 'X'.repeat(20000),
      });
      await room.webSocketMessage(ws as any, hugePayload);

      expect(ws.parsedMessages.length).toBe(1);
      expect(ws.parsedMessages[0]).toEqual({
        type: 'error',
        message: 'Payload too large (max 16KB)',
      });
    });

    it('rejects malformed non-JSON WebSocket frame with safe error', async () => {
      const mockCtx = createMockDOContext();
      const room = new GameRoomDO(mockCtx.ctx, mockEnv);
      const ws = new MockWebSocket();
      ws.serializeAttachment({ userId: 'u1', displayName: 'Player 1', color: 'white' });

      await room.webSocketMessage(ws as any, 'NOT_VALID_JSON{{{}}}');

      expect(ws.parsedMessages.length).toBe(1);
      expect(ws.parsedMessages[0]).toEqual({
        type: 'error',
        message: 'Invalid or malformed client message',
      });
    });

    it('rejects illegal move or out-of-turn move authoritatively', async () => {
      const mockCtx = createMockDOContext();
      const room = new GameRoomDO(mockCtx.ctx, mockEnv);
      await room.fetch(
        new Request('https://do/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: 'g_turn_test',
            whiteUserId: 'u_white',
            blackUserId: 'u_black',
          }),
        }),
      );

      const blackWs = new MockWebSocket();
      blackWs.serializeAttachment({
        userId: 'u_black',
        displayName: 'Black Player',
        color: 'black',
      });

      // Black tries to move first (it is White's turn)
      await room.webSocketMessage(
        blackWs as any,
        JSON.stringify({ type: 'move', move: { from: 'e7', to: 'e5' } }),
      );
      expect(blackWs.parsedMessages[0]).toEqual({
        type: 'error',
        message: 'It is not your turn',
      });

      const whiteWs = new MockWebSocket();
      whiteWs.serializeAttachment({
        userId: 'u_white',
        displayName: 'White Player',
        color: 'white',
      });

      // White tries an illegal move: Pawn moving diagonally to empty square
      await room.webSocketMessage(
        whiteWs as any,
        JSON.stringify({ type: 'move', move: { from: 'e2', to: 'd3' } }),
      );
      expect(whiteWs.parsedMessages[0].type).toBe('error');
      expect(whiteWs.parsedMessages[0].message).toContain('Invalid move');
    });

    it('rejects unauthorized ticket requests for non-participants with 403', async () => {
      const createRes = await app.request(
        '/rooms',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-test-user-id': 'alice-id',
          },
          body: JSON.stringify({
            timeControlMinutes: 10,
            timeControlIncrement: 0,
            hostColor: 'white',
          }),
        },
        mockEnv,
      );
      const { room } = (await createRes.json()) as any;

      // Eve attempts to get a ticket for Alice's room
      const ticketRes = await app.request(
        `/rooms/${room.id}/ticket`,
        {
          method: 'POST',
          headers: { 'x-test-user-id': 'eve-hacker-id' },
        },
        mockEnv,
      );
      expect(ticketRes.status).toBe(403);
      expect(((await ticketRes.json()) as any).error).toContain('Forbidden');
    });

    it('ensures unhandled errors in production never leak stack traces', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const mockError = new Error(
          'Sensitive database connection string postgres://secret:password@db',
        );
        const mockContext: any = {
          json: (body: any, status: number) => ({ body, status }),
        };

        const response: any = errorHandler(mockError, mockContext);
        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Internal Server Error');
        expect(JSON.stringify(response.body)).not.toContain('postgres');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});
