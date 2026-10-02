import type { ConnectionStatus } from '@et-chess/config';
import type { PlayerColor } from '@et-chess/types';
import { Bot, Crown, Globe, User } from 'lucide-react';
import { ClockDisplay } from './ClockDisplay';

export interface PlayerCardProps {
  color: PlayerColor;
  displayName: string;
  rating?: number;
  title?: string;
  isTurn: boolean;
  isGameOver?: boolean;
  isBot?: boolean;
  botLevelSpec?: string;
  isBotThinking?: boolean;
  connection?: ConnectionStatus;
  timeMs: number;
}

export function PlayerCard({
  color,
  displayName,
  rating,
  title,
  isTurn,
  isGameOver = false,
  isBot = false,
  botLevelSpec,
  isBotThinking = false,
  connection,
  timeMs,
}: PlayerCardProps) {
  const isWhite = color === 'white';
  const active = isTurn && !isGameOver;

  return (
    <div
      data-testid={`player-card-${color}`}
      className={`w-full max-w-[560px] rounded-xl px-4 py-2.5 flex items-center justify-between shadow-sm transition-all border ${
        active
          ? 'bg-surface-card border-brand-green/60 shadow-brand-green/10 ring-1 ring-brand-green/20'
          : 'bg-surface-card border-surface-border'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border shadow-sm ${
            isBot
              ? isBotThinking
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/70 animate-pulse'
                : 'bg-surface-accent text-text-primary border-surface-border'
              : isWhite
                ? 'bg-board-light text-board-dark border-board-light/60 font-serif'
                : 'bg-board-dark text-board-light border-board-dark/60 font-serif'
          }`}
        >
          {isBot ? (
            <Bot className="w-5 h-5" />
          ) : isWhite ? (
            <Crown className="w-5 h-5" />
          ) : (
            <User className="w-5 h-5" />
          )}
        </div>

        {/* Name and Rating */}
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {title && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {title}
              </span>
            )}
            <span className="text-sm font-bold text-text-primary">{displayName}</span>
            {rating !== undefined ? (
              <span className="text-xs text-text-muted font-mono font-medium">({rating})</span>
            ) : botLevelSpec ? (
              <span className="text-[10px] font-mono text-text-muted px-1.5 py-0.5 rounded bg-surface-accent border border-surface-border">
                {botLevelSpec}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            {isBot && isBotThinking ? (
              <span className="text-xs text-emerald-400 font-medium animate-pulse">
                Thinking...
              </span>
            ) : (
              <span
                className={`text-[11px] font-medium flex items-center gap-1 ${
                  active ? 'text-brand-green' : 'text-text-muted'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    active ? 'bg-brand-green animate-pulse' : 'bg-surface-border'
                  }`}
                />
                <span>{active ? 'Turn to move' : 'Waiting'}</span>
              </span>
            )}

            {connection && connection !== 'offline' && (
              <span
                className={`text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded ${
                  connection === 'connected'
                    ? 'text-emerald-400 bg-emerald-950/30'
                    : 'text-amber-400 bg-amber-950/30'
                }`}
              >
                <Globe className="w-2.5 h-2.5" />
                <span className="capitalize">{connection}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Clock */}
      <ClockDisplay timeMs={timeMs} isActive={active} color={color} />
    </div>
  );
}

export default PlayerCard;
