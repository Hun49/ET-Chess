export type PlayerColor = 'white' | 'black';

export type GameStatus = 'ongoing' | 'check' | 'checkmate' | 'stalemate' | 'draw';

export interface Move {
  from: string; // e.g. "e2" — algebraic square notation
  to: string; // e.g. "e4"
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export interface GameState {
  fen: string; // current position, FEN notation
  turn: PlayerColor;
  status: GameStatus;
  moveHistory: Move[];
}
