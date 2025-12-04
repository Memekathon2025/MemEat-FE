export interface Player {
  id: string;
  socketId?: string;
  name: string;
  walletAddress: string;
  position: { x: number; y: number };
  angle?: number;
  score: number;
  length: number;
  alive: boolean;
  collectedTokens: TokenBalance[];
  stakedTokens?: TokenBalance[];
  joinTime?: number;
}

export interface TokenBalance {
  symbol: string;
  amount: number;
  color: string;
}

export interface Food {
  id: string;
  position: { x: number; y: number };
  token: TokenBalance;
}

export interface GameState {
  players: Player[];
  foods: Food[];
  leaderboard: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  survivalTime: number;
}

export interface StakeRequest {
  walletAddress: string;
  tokenSymbol: string;
  amount: number;
}

export interface MockToken {
  symbol: string;
  name: string;
  balance: number;
}

export interface Point {
  x: number;
  y: number;
}
