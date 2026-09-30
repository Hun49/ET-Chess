import type { Move, PlayerColor } from '@et-chess/types';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  Flag,
  Handshake,
  Play,
  Share2,
  Sparkles,
  Swords,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chessboard } from '../src/components/Chessboard';
import { useGameSocket } from '../src/features/game/useGameSocket';
import { apiFetch, WS_BASE_URL } from '../src/lib/api-client';
import { useSession } from '../src/lib/auth-client';
import { borderRadius, spacing, themeColors } from '../src/theme';

export interface RoomData {
  id: string;
  code: string;
  hostUserId: string;
  guestUserId: string | null;
  timeControlMinutes: number;
  timeControlIncrement: number;
  hostColor: 'white' | 'black' | 'random';
  status: 'waiting' | 'ready' | 'active' | 'finished';
  whiteUserId?: string;
  blackUserId?: string;
}

export default function OnlineScreen() {
  const router = useRouter();
  const { data: session } = useSession();

  const [activeRoom, setActiveRoom] = useState<RoomData | null>(null);
  const [activeMatch, setActiveMatch] = useState<{
    gameId: string;
    yourColor: PlayerColor;
  } | null>(null);
  const [isQueueing, setIsQueueing] = useState(false);
  const [queueElapsed, setQueueElapsed] = useState(0);
  const [queueError, setQueueError] = useState<string | null>(null);
  const queueWsRef = useRef<WebSocket | null>(null);

  const [timeControlMinutes, setTimeControlMinutes] = useState(10);
  const [timeControlIncrement, setTimeControlIncrement] = useState(0);
  const [hostColor, setHostColor] = useState<'white' | 'black' | 'random'>('random');
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tournament states
  const [showTourneyModal, setShowTourneyModal] = useState(false);
  const [tourneyList, setTourneyList] = useState<any[]>([]);
  const [activeTourney, setActiveTourney] = useState<any | null>(null);
  const [newTourneyName, setNewTourneyName] = useState('');
  const [isTourneyLoading, setIsTourneyLoading] = useState(false);

  const currentUserId = session?.user?.id || 'mobile-user';
  const displayName = session?.user?.name || 'Mobile Player';

  // Poll room while in waiting or ready status
  useEffect(() => {
    if (!activeRoom || activeRoom.status === 'active' || activeRoom.status === 'finished') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const data = await apiFetch<{ room: RoomData }>(`/rooms/${activeRoom.id}`);
        setActiveRoom(data.room);
      } catch {
        // Silently retry
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeRoom]);

  const handleCreateRoom = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ room: RoomData }>('/rooms', {
        method: 'POST',
        body: JSON.stringify({
          timeControlMinutes,
          timeControlIncrement,
          hostColor,
        }),
      });
      setActiveRoom(data.room);
    } catch (err: any) {
      setError(err?.message || 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    const trimmed = joinCode.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError('Room code must be 6 characters');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ room: RoomData }>(`/rooms/${trimmed}/join`, {
        method: 'POST',
      });
      setActiveRoom(data.room);
    } catch (err: any) {
      setError(err?.message || 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartMatch = async () => {
    if (!activeRoom) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ success: boolean; room: RoomData }>(
        `/rooms/${activeRoom.id}/start`,
        { method: 'POST' },
      );
      if (data.room) {
        setActiveRoom(data.room);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to start match');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareCode = async () => {
    if (!activeRoom) return;
    try {
      await Share.share({
        message: `Join my ET Chess match! Room Code: ${activeRoom.code}`,
      });
    } catch {
      // Ignored
    }
  };

  const loadTournaments = async () => {
    setIsTourneyLoading(true);
    try {
      const data = await apiFetch<{ tournaments: any[] }>('/tournaments');
      setTourneyList(data.tournaments);
    } catch {
      // Ignored
    } finally {
      setIsTourneyLoading(false);
    }
  };

  const handleOpenTournaments = () => {
    setShowTourneyModal(true);
    loadTournaments();
  };

  const handleCreateTournament = async () => {
    if (!newTourneyName.trim()) return;
    setIsTourneyLoading(true);
    try {
      const data = await apiFetch<{ tournament: any }>('/tournaments', {
        method: 'POST',
        body: JSON.stringify({ name: newTourneyName.trim() }),
      });
      setActiveTourney(data.tournament);
      setNewTourneyName('');
      loadTournaments();
    } catch (err: any) {
      setError(err?.message || 'Failed to create tournament');
    } finally {
      setIsTourneyLoading(false);
    }
  };

  const handleSelectTournament = async (id: string) => {
    setIsTourneyLoading(true);
    try {
      const data = await apiFetch<{ tournament: any }>(`/tournaments/${id}`);
      setActiveTourney(data.tournament);
    } catch (err: any) {
      setError(err?.message || 'Failed to load tournament');
    } finally {
      setIsTourneyLoading(false);
    }
  };

  const handleJoinTournament = async (id: string) => {
    setIsTourneyLoading(true);
    try {
      const data = await apiFetch<{ tournament: any }>(`/tournaments/${id}/join`, {
        method: 'POST',
      });
      setActiveTourney(data.tournament);
      loadTournaments();
    } catch (err: any) {
      setError(err?.message || 'Failed to join tournament');
    } finally {
      setIsTourneyLoading(false);
    }
  };

  const handleStartTournament = async (id: string) => {
    setIsTourneyLoading(true);
    try {
      const data = await apiFetch<{ tournament: any }>(`/tournaments/${id}/start`, {
        method: 'POST',
      });
      setActiveTourney(data.tournament);
      loadTournaments();
    } catch (err: any) {
      setError(err?.message || 'Failed to start tournament');
    } finally {
      setIsTourneyLoading(false);
    }
  };

  const handlePlayTournamentMatch = (match: any) => {
    const assignedColor: PlayerColor = match.player1?.userId === currentUserId ? 'white' : 'black';
    setShowTourneyModal(false);
    setActiveMatch({
      gameId: match.gameId || match.id,
      yourColor: assignedColor,
    });
  };

  // Handle matchmaking queue
  useEffect(() => {
    if (!isQueueing) {
      if (queueWsRef.current) {
        queueWsRef.current.close();
        queueWsRef.current = null;
      }
      return;
    }

    setQueueElapsed(0);
    setQueueError(null);

    const wsUrl = `${WS_BASE_URL}/matchmaking/queue?userId=${encodeURIComponent(
      currentUserId,
    )}&displayName=${encodeURIComponent(displayName)}&rating=1200`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      queueWsRef.current = ws;
    } catch (err: any) {
      setQueueError(err?.message || 'Failed to connect to matchmaking');
      setIsQueueing(false);
      return;
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'match-found') {
          setActiveMatch({
            gameId: msg.gameId,
            yourColor: msg.yourColor,
          });
          setIsQueueing(false);
        } else if (msg.type === 'error') {
          setQueueError(msg.message || 'Matchmaking error');
        }
      } catch {
        // Ignored
      }
    };

    ws.onerror = () => {
      setQueueError('Matchmaking connection error');
    };

    const timer = setInterval(() => {
      setQueueElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
      if (queueWsRef.current) {
        queueWsRef.current.close();
        queueWsRef.current = null;
      }
      apiFetch('/matchmaking/leave', {
        method: 'POST',
        body: JSON.stringify({ userId: currentUserId }),
      }).catch(() => {});
    };
  }, [isQueueing, currentUserId, displayName]);

  const handleCancelQueue = () => {
    setIsQueueing(false);
    if (queueWsRef.current) {
      queueWsRef.current.close();
      queueWsRef.current = null;
    }
    apiFetch('/matchmaking/leave', {
      method: 'POST',
      body: JSON.stringify({ userId: currentUserId }),
    }).catch(() => {});
  };

  // Color & Role Calculations
  const isHost = activeRoom?.hostUserId === currentUserId;
  const isGameActive = (activeRoom && activeRoom.status === 'active') || !!activeMatch;
  const targetGameId = activeMatch ? activeMatch.gameId : activeRoom?.id;
  const myColor: PlayerColor = activeMatch
    ? activeMatch.yourColor
    : activeRoom?.whiteUserId === currentUserId
      ? 'white'
      : activeRoom?.blackUserId === currentUserId
        ? 'black'
        : 'white';

  const wsUrl =
    targetGameId && isGameActive
      ? `${WS_BASE_URL}/rooms/${targetGameId}/websocket?userId=${encodeURIComponent(
          currentUserId,
        )}&displayName=${encodeURIComponent(displayName)}`
      : null;

  const {
    isConnected,
    gameState,
    gameOver,
    lastError,
    opponentDisconnected,
    gracePeriodSeconds,
    sendMove,
    resign,
    offerDraw,
  } = useGameSocket({
    url: activeRoom?.status === 'active' ? wsUrl : null,
  });

  const activeGameState = gameState || {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    turn: 'white' as const,
    status: 'ongoing' as const,
    moveHistory: [],
  };

  const isMyTurn = isConnected && activeGameState.turn === myColor;

  const handleMove = useCallback(
    (move: Move) => {
      if (!isMyTurn) return;
      sendMove(move);
    },
    [isMyTurn, sendMove],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              if (activeRoom || activeMatch) {
                setActiveRoom(null);
                setActiveMatch(null);
              } else {
                router.back();
              }
            }}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <ArrowLeft size={16} color={themeColors.text.primary} />
            <Text style={styles.backButtonText}>
              {activeRoom || activeMatch ? 'Lobby' : 'Home'}
            </Text>
          </Pressable>

          <View style={styles.badge}>
            <Sparkles size={12} color={themeColors.board.light} />
            <Text style={styles.badgeText}>Online 2.0</Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* VIEW 1: LOBBY */}
        {!activeRoom && !activeMatch && (
          <View style={styles.lobbyContainer}>
            <View style={styles.heroSection}>
              <Text style={styles.heroTitle}>Multiplayer Arena</Text>
              <Text style={styles.heroSubtitle}>
                Challenge friends directly or jump into ranked matchmaking.
              </Text>
            </View>

            {/* Ranked Matchmaking Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <Zap size={20} color={themeColors.board.light} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Ranked Matchmaking</Text>
                  <Text style={styles.cardDesc}>Global rated pool (10+0 Rapid, K=32)</Text>
                </View>
              </View>

              {isQueueing ? (
                <View style={styles.queueBox}>
                  <Text style={styles.queueTitle}>Searching for Opponent...</Text>
                  <Text style={styles.queueTimer}>
                    {Math.floor(queueElapsed / 60)
                      .toString()
                      .padStart(2, '0')}
                    :{(queueElapsed % 60).toString().padStart(2, '0')}
                  </Text>
                  <Text style={styles.queueWindow}>
                    Rating Window: ±{200 + Math.floor(queueElapsed / 15) * 50} pts
                  </Text>
                  {queueError && <Text style={styles.errorText}>{queueError}</Text>}
                  <Pressable
                    onPress={handleCancelQueue}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed && styles.secondaryButtonPressed,
                      { marginTop: spacing.md, width: '100%' },
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>Cancel Search</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setIsQueueing(true)}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryButtonPressed,
                    { marginTop: spacing.sm },
                  ]}
                >
                  <Zap size={16} color={themeColors.surface.base} fill={themeColors.surface.base} />
                  <Text style={styles.primaryButtonText}>Find Ranked Match</Text>
                </Pressable>
              )}
            </View>

            {/* Create Room Box */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <Users size={20} color={themeColors.board.light} />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Create Friend Challenge</Text>
                  <Text style={styles.cardDesc}>Generate a 6-character room code</Text>
                </View>
              </View>

              <Text style={styles.sectionLabel}>Time Control</Text>
              <View style={styles.presetGrid}>
                {[
                  { label: '3 min', min: 3, inc: 0 },
                  { label: '5 min', min: 5, inc: 0 },
                  { label: '10 min', min: 10, inc: 0 },
                  { label: '3 + 2s', min: 3, inc: 2 },
                  { label: '15 + 10s', min: 15, inc: 10 },
                ].map((preset) => {
                  const selected =
                    timeControlMinutes === preset.min && timeControlIncrement === preset.inc;
                  return (
                    <Pressable
                      key={preset.label}
                      onPress={() => {
                        setTimeControlMinutes(preset.min);
                        setTimeControlIncrement(preset.inc);
                      }}
                      style={[styles.presetButton, selected && styles.presetButtonSelected]}
                    >
                      <Text style={[styles.presetText, selected && styles.presetTextSelected]}>
                        {preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.sectionLabel}>Color Preference</Text>
              <View style={styles.presetGrid}>
                {(['white', 'random', 'black'] as const).map((color) => (
                  <Pressable
                    key={color}
                    onPress={() => setHostColor(color)}
                    style={[
                      styles.presetButton,
                      hostColor === color && styles.presetButtonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        hostColor === color && styles.presetTextSelected,
                        { textTransform: 'capitalize' },
                      ]}
                    >
                      {color}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                disabled={isLoading}
                onPress={handleCreateRoom}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                  isLoading && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {isLoading ? 'Creating Room...' : 'Create Room'}
                </Text>
              </Pressable>
            </View>

            {/* Join Room Box */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <Swords size={20} color={themeColors.text.primary} />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Join With Code</Text>
                  <Text style={styles.cardDesc}>Enter a friend's 6-character room code</Text>
                </View>
              </View>

              <TextInput
                value={joinCode}
                onChangeText={(text) => setJoinCode(text.toUpperCase())}
                placeholder="e.g. ABCXYZ"
                placeholderTextColor={themeColors.text.muted}
                maxLength={6}
                autoCapitalize="characters"
                style={styles.codeInput}
              />

              <Pressable
                disabled={isLoading || joinCode.trim().length !== 6}
                onPress={handleJoinRoom}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.secondaryButtonPressed,
                  (isLoading || joinCode.trim().length !== 6) && { opacity: 0.5 },
                ]}
              >
                <Text style={styles.secondaryButtonText}>
                  {isLoading ? 'Joining...' : 'Join Match'}
                </Text>
              </Pressable>
            </View>

            {/* Tournaments Box */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <Trophy size={20} color={themeColors.board.light} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Tournament Brackets</Text>
                  <Text style={styles.cardDesc}>Single-elimination championship cups</Text>
                </View>
              </View>

              <Pressable
                onPress={handleOpenTournaments}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.secondaryButtonPressed,
                  { marginTop: spacing.sm },
                ]}
              >
                <Trophy size={16} color={themeColors.text.primary} />
                <Text style={styles.secondaryButtonText}>Browse Tournaments</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* VIEW 2: WAITING ROOM */}
        {activeRoom && (activeRoom.status === 'waiting' || activeRoom.status === 'ready') && (
          <View style={styles.waitingContainer}>
            <Text style={styles.heroTitle}>Waiting Room</Text>
            <Text style={styles.heroSubtitle}>Share the code below with your opponent.</Text>

            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>ROOM CODE</Text>
              <Text style={styles.codeText}>{activeRoom.code}</Text>

              <Pressable
                onPress={handleShareCode}
                style={({ pressed }) => [styles.shareButton, pressed && styles.shareButtonPressed]}
              >
                <Share2 size={16} color={themeColors.board.light} />
                <Text style={styles.shareButtonText}>Share Room Code</Text>
              </Pressable>
            </View>

            <View style={styles.statusBox}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      activeRoom.status === 'ready'
                        ? themeColors.status.active
                        : themeColors.status.warning,
                  },
                ]}
              />
              <Text style={styles.statusText}>
                {activeRoom.guestUserId
                  ? 'Friend joined! Ready to start.'
                  : 'Waiting for friend to join...'}
              </Text>
            </View>

            {isHost ? (
              <Pressable
                disabled={!activeRoom.guestUserId || isLoading}
                onPress={handleStartMatch}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                  (!activeRoom.guestUserId || isLoading) && { opacity: 0.5 },
                ]}
              >
                <Play size={16} color={themeColors.surface.base} fill={themeColors.surface.base} />
                <Text style={styles.primaryButtonText}>
                  {isLoading ? 'Starting Match...' : 'Launch Match'}
                </Text>
              </Pressable>
            ) : (
              <Text style={styles.waitingNotice}>Waiting for host to launch the match...</Text>
            )}
          </View>
        )}

        {/* VIEW 3: LIVE ONLINE GAME */}
        {isGameActive && (
          <View style={styles.gameContainer}>
            {/* Status bar */}
            <View style={styles.matchBar}>
              <View style={styles.matchSide}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: isConnected
                        ? themeColors.status.active
                        : themeColors.status.danger,
                    },
                  ]}
                />
                <Text style={styles.matchRoleText}>Playing as {myColor.toUpperCase()}</Text>
              </View>

              <View style={styles.turnBadge}>
                <Text style={styles.turnBadgeText}>
                  {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
                </Text>
              </View>
            </View>

            {/* Disconnect Warning */}
            {opponentDisconnected && (
              <View style={styles.disconnectBanner}>
                <AlertTriangle size={16} color={themeColors.status.warning} />
                <Text style={styles.disconnectText}>
                  Opponent disconnected. Grace period: {gracePeriodSeconds ?? 60}s
                </Text>
              </View>
            )}

            {/* Chessboard */}
            <View style={styles.boardWrapper}>
              <Chessboard
                game={activeGameState}
                orientation={myColor}
                onMove={handleMove}
                disabled={!isMyTurn || !isConnected}
              />
            </View>

            {/* In-Game Actions */}
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => offerDraw()}
                style={({ pressed }) => [
                  styles.gameActionButton,
                  pressed && styles.gameActionButtonPressed,
                ]}
              >
                <Handshake size={16} color={themeColors.text.primary} />
                <Text style={styles.gameActionText}>Offer Draw</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  Alert.alert('Resign Match', 'Are you sure you want to resign?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Resign', style: 'destructive', onPress: () => resign() },
                  ]);
                }}
                style={({ pressed }) => [
                  styles.gameActionDangerButton,
                  pressed && styles.gameActionDangerButtonPressed,
                ]}
              >
                <Flag size={16} color={themeColors.status.danger} />
                <Text style={styles.gameActionDangerText}>Resign</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Game Over Modal */}
        <Modal visible={!!gameOver} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Trophy size={36} color={themeColors.board.light} />
              <Text style={styles.modalTitle}>
                {gameOver?.result === 'draw'
                  ? 'Game Drawn'
                  : gameOver?.result === myColor
                    ? 'Victory!'
                    : 'Defeat'}
              </Text>
              <Text style={styles.modalSubtitle}>{gameOver?.reason}</Text>

              <Pressable
                onPress={() => {
                  setActiveRoom(null);
                  setActiveMatch(null);
                }}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                  { marginTop: spacing.md, width: '100%' },
                ]}
              >
                <Text style={styles.primaryButtonText}>Return to Lobby</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Tournament Modal */}
        <Modal visible={showTourneyModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxWidth: 420, maxHeight: '90%' }]}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  marginBottom: spacing.md,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Trophy size={20} color={themeColors.board.light} />
                  <Text style={[styles.cardTitle, { marginBottom: 0 }]}>
                    {activeTourney ? activeTourney.name : 'Tournaments'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    if (activeTourney) {
                      setActiveTourney(null);
                    } else {
                      setShowTourneyModal(false);
                    }
                  }}
                  style={{ padding: spacing.xs }}
                >
                  <X size={20} color={themeColors.text.muted} />
                </Pressable>
              </View>

              <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
                {activeTourney ? (
                  /* Active Tournament Details / Bracket */
                  <View style={{ gap: spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Text style={[styles.badgeText, { textTransform: 'uppercase' }]}>
                        Status: {activeTourney.status}
                      </Text>
                      <Text style={[styles.badgeText, { color: themeColors.text.muted }]}>
                        {activeTourney.participants.length} Players
                      </Text>
                    </View>

                    {activeTourney.status === 'registering' && (
                      <View style={{ gap: spacing.sm }}>
                        <Text style={styles.sectionLabel}>Registered Players</Text>
                        {activeTourney.participants.map((p: any) => (
                          <View
                            key={p.userId}
                            style={[styles.matchBar, { paddingVertical: spacing.xs }]}
                          >
                            <Text style={styles.matchRoleText}>
                              #{p.seed} {p.displayName}
                            </Text>
                            <Text style={styles.presetText}>{p.rating} pts</Text>
                          </View>
                        ))}

                        {activeTourney.participants[0]?.userId === currentUserId && (
                          <Pressable
                            disabled={activeTourney.participants.length < 2 || isTourneyLoading}
                            onPress={() => handleStartTournament(activeTourney.id)}
                            style={({ pressed }) => [
                              styles.primaryButton,
                              pressed && styles.primaryButtonPressed,
                              activeTourney.participants.length < 2 && { opacity: 0.5 },
                              { marginTop: spacing.sm },
                            ]}
                          >
                            <Play
                              size={16}
                              color={themeColors.surface.base}
                              fill={themeColors.surface.base}
                            />
                            <Text style={styles.primaryButtonText}>Start Tournament</Text>
                          </Pressable>
                        )}
                      </View>
                    )}

                    {activeTourney.status !== 'registering' && (
                      <View style={{ gap: spacing.sm }}>
                        <Text style={styles.sectionLabel}>Bracket Matches</Text>
                        {activeTourney.matches.map((m: any) => {
                          const isMyMatch =
                            (m.player1?.userId === currentUserId ||
                              m.player2?.userId === currentUserId) &&
                            m.status !== 'finished' &&
                            m.player1 &&
                            m.player2;

                          return (
                            <View key={m.id} style={[styles.card, { padding: spacing.sm, gap: 4 }]}>
                              <View
                                style={{
                                  flexDirection: 'row',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <Text style={[styles.badgeText, { color: themeColors.text.muted }]}>
                                  Round {m.round} · Match #{m.matchNumber}
                                </Text>
                                <Text
                                  style={[
                                    styles.badgeText,
                                    {
                                      color:
                                        m.status === 'finished'
                                          ? themeColors.text.muted
                                          : themeColors.status.active,
                                    },
                                  ]}
                                >
                                  {m.status}
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.matchRoleText,
                                  m.winner?.userId === m.player1?.userId && {
                                    color: themeColors.board.light,
                                    fontWeight: '800',
                                  },
                                ]}
                              >
                                {m.player1
                                  ? `${m.player1.displayName} (${m.player1.rating})`
                                  : 'TBD'}
                              </Text>
                              <Text
                                style={[
                                  styles.matchRoleText,
                                  m.winner?.userId === m.player2?.userId && {
                                    color: themeColors.board.light,
                                    fontWeight: '800',
                                  },
                                ]}
                              >
                                {m.player2
                                  ? `${m.player2.displayName} (${m.player2.rating})`
                                  : m.round === 1
                                    ? 'BYE (Auto-advanced)'
                                    : 'TBD'}
                              </Text>

                              {isMyMatch && (
                                <Pressable
                                  onPress={() => handlePlayTournamentMatch(m)}
                                  style={({ pressed }) => [
                                    styles.primaryButton,
                                    pressed && styles.primaryButtonPressed,
                                    { marginTop: 4, paddingVertical: spacing.xs },
                                  ]}
                                >
                                  <Play
                                    size={14}
                                    color={themeColors.surface.base}
                                    fill={themeColors.surface.base}
                                  />
                                  <Text style={[styles.primaryButtonText, { fontSize: 12 }]}>
                                    Play Your Match
                                  </Text>
                                </Pressable>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                ) : (
                  /* Tournaments List & Creation Form */
                  <View style={{ gap: spacing.md }}>
                    <View style={{ gap: spacing.xs }}>
                      <Text style={styles.sectionLabel}>Create Tournament</Text>
                      <TextInput
                        value={newTourneyName}
                        onChangeText={setNewTourneyName}
                        placeholder="e.g. Rapid Cup 2026"
                        placeholderTextColor={themeColors.text.muted}
                        style={styles.codeInput}
                      />
                      <Pressable
                        disabled={isTourneyLoading || !newTourneyName.trim()}
                        onPress={handleCreateTournament}
                        style={({ pressed }) => [
                          styles.primaryButton,
                          pressed && styles.primaryButtonPressed,
                          (!newTourneyName.trim() || isTourneyLoading) && { opacity: 0.5 },
                          { marginTop: spacing.xs },
                        ]}
                      >
                        <Text style={styles.primaryButtonText}>Create Tournament</Text>
                      </Pressable>
                    </View>

                    <Text style={styles.sectionLabel}>Open Tournaments</Text>
                    {tourneyList.length === 0 ? (
                      <Text
                        style={[
                          styles.cardDesc,
                          { textAlign: 'center', paddingVertical: spacing.md },
                        ]}
                      >
                        No open tournaments. Create one above!
                      </Text>
                    ) : (
                      tourneyList.map((t) => (
                        <View
                          key={t.id}
                          style={[styles.card, { padding: spacing.sm, gap: spacing.xs }]}
                        >
                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <Text style={styles.cardTitle}>{t.name}</Text>
                            <Text style={[styles.badgeText, { textTransform: 'uppercase' }]}>
                              {t.status}
                            </Text>
                          </View>
                          <View
                            style={{
                              flexDirection: 'row',
                              gap: spacing.sm,
                              marginTop: spacing.xs,
                            }}
                          >
                            <Pressable
                              onPress={() => handleSelectTournament(t.id)}
                              style={({ pressed }) => [
                                styles.secondaryButton,
                                pressed && styles.secondaryButtonPressed,
                                { flex: 1 },
                              ]}
                            >
                              <Text style={styles.secondaryButtonText}>Bracket</Text>
                            </Pressable>
                            {t.status === 'registering' && (
                              <Pressable
                                onPress={() => handleJoinTournament(t.id)}
                                style={({ pressed }) => [
                                  styles.primaryButton,
                                  pressed && styles.primaryButtonPressed,
                                  { flex: 1 },
                                ]}
                              >
                                <Text style={styles.primaryButtonText}>Join</Text>
                              </Pressable>
                            )}
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.surface.base,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: themeColors.surface.card,
    borderWidth: 1,
    borderColor: themeColors.surface.border,
  },
  backButtonPressed: {
    opacity: 0.8,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(235, 236, 208, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(235, 236, 208, 0.3)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: themeColors.board.light,
  },
  heroSection: {
    alignItems: 'center',
    gap: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: themeColors.text.primary,
  },
  heroSubtitle: {
    fontSize: 13,
    color: themeColors.text.muted,
    textAlign: 'center',
  },
  lobbyContainer: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: themeColors.surface.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: themeColors.surface.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.lg,
    backgroundColor: themeColors.surface.accent,
    borderWidth: 1,
    borderColor: themeColors.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.text.primary,
  },
  cardDesc: {
    fontSize: 12,
    color: themeColors.text.muted,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.text.secondary,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  presetButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: themeColors.surface.accent,
    borderWidth: 1,
    borderColor: themeColors.surface.border,
  },
  presetButtonSelected: {
    borderColor: themeColors.board.light,
    backgroundColor: 'rgba(235, 236, 208, 0.1)',
  },
  presetText: {
    fontSize: 12,
    color: themeColors.text.secondary,
  },
  presetTextSelected: {
    color: themeColors.board.light,
    fontWeight: '700',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: themeColors.board.light,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: themeColors.surface.base,
  },
  codeInput: {
    backgroundColor: themeColors.surface.base,
    borderWidth: 1,
    borderColor: themeColors.surface.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: themeColors.text.primary,
    letterSpacing: 4,
  },
  secondaryButton: {
    backgroundColor: themeColors.surface.accent,
    borderWidth: 1,
    borderColor: themeColors.surface.border,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  secondaryButtonPressed: {
    backgroundColor: themeColors.surface.border,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  waitingContainer: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  codeCard: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: themeColors.surface.card,
    borderWidth: 1,
    borderColor: themeColors.surface.border,
    width: '100%',
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.text.muted,
    letterSpacing: 2,
  },
  codeText: {
    fontSize: 40,
    fontWeight: '900',
    color: themeColors.board.light,
    letterSpacing: 6,
    marginVertical: spacing.xs,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: themeColors.surface.accent,
  },
  shareButtonPressed: {
    opacity: 0.8,
  },
  shareButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.board.light,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    color: themeColors.text.secondary,
  },
  waitingNotice: {
    fontSize: 12,
    color: themeColors.text.muted,
    fontStyle: 'italic',
  },
  gameContainer: {
    gap: spacing.md,
    alignItems: 'center',
  },
  matchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: themeColors.surface.card,
    borderWidth: 1,
    borderColor: themeColors.surface.border,
  },
  matchSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  matchRoleText: {
    fontSize: 12,
    fontWeight: '700',
    color: themeColors.text.primary,
  },
  turnBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
    backgroundColor: themeColors.surface.accent,
  },
  turnBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: themeColors.board.light,
  },
  disconnectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    width: '100%',
  },
  disconnectText: {
    fontSize: 12,
    color: themeColors.status.warning,
    fontWeight: '600',
  },
  boardWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  gameActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: themeColors.surface.accent,
    borderWidth: 1,
    borderColor: themeColors.surface.border,
  },
  gameActionButtonPressed: {
    backgroundColor: themeColors.surface.border,
  },
  gameActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.text.primary,
  },
  gameActionDangerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  gameActionDangerButtonPressed: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  gameActionDangerText: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.status.danger,
  },
  errorBanner: {
    padding: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    fontSize: 12,
    color: themeColors.status.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: themeColors.surface.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: themeColors.surface.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: themeColors.text.primary,
    marginTop: spacing.xs,
  },
  modalSubtitle: {
    fontSize: 13,
    color: themeColors.text.muted,
    textTransform: 'capitalize',
  },
  queueBox: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  queueTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.text.primary,
  },
  queueTimer: {
    fontSize: 32,
    fontWeight: '800',
    color: themeColors.board.light,
    marginVertical: spacing.xs,
  },
  queueWindow: {
    fontSize: 12,
    color: themeColors.text.muted,
  },
});
