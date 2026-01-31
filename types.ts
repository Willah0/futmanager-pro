export type Position = 'Goleiro' | 'Defensor' | 'Lateral' | 'Meio' | 'Atacante';
export type PlayerType = 'Mensalista' | 'Diarista';

export interface Player {
  id: string;
  name: string;
  positions: Position[];
  type: PlayerType;
  stats: {
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    points: number;
    goals?: number; // Optional: future feature
  };
}

export interface AttendanceRecord {
  playerId: string;
  arrivalTime: number; // Timestamp
}

export interface Team {
  id: 'A' | 'B';
  name: string;
  players: Player[];
  score: number;
}

export interface MatchResult {
  id: string;
  date: string;
  teamA: Player[];
  teamB: Player[];
  scoreA: number;
  scoreB: number;
  winner: 'A' | 'B' | 'Draw';
  subbedOut?: string[]; // IDs of players who were subbed out
}

export interface CurrentMatchState {
  teamA: Player[];
  teamB: Player[];
  scoreA: number;
  scoreB: number;
  starters: string[]; // IDs dos jogadores que iniciaram (para indicar rotação)
  subbedOut?: string[]; // IDs dos jogadores que já saíram nesta partida
  startTime: string;
  reasoning?: string | null;
}

export interface AppSettings {
  playersPerTeam: number;
  theme: 'light' | 'dark';
  autoBalance: boolean;
  tacticalSchema: string; // Format: "Def-Lat-Mid-Att" e.g. "2-2-3-1"
}