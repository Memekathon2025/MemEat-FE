import { create } from "zustand";
import type { Player, Food, LeaderboardEntry } from "../types";

interface GameStore {
  // User state
  walletAddress: string | null;
  playerName: string;
  currentPlayer: Player | null;

  // Game state
  players: Player[];
  foods: Food[];
  leaderboard: LeaderboardEntry[];
  mapTokens: Array<{
    symbol: string;
    address: string;
    amount: number;
    count: number;
    color: string;
  }>;

  gameStarted: boolean;
  canEscape: boolean;

  // Actions
  setWalletAddress: (address: string | null) => void;
  setPlayerName: (name: string) => void;
  setCurrentPlayer: (player: Player | null) => void;
  setPlayers: (players: Player[]) => void;
  setFoods: (foods: Food[]) => void;
  setLeaderboard: (leaderboard: LeaderboardEntry[]) => void;
  setMapTokens: (tokens: any[]) => void;

  setGameStarted: (started: boolean) => void;
  setCanEscape: (canEscape: boolean) => void;

  // Helper actions
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  removeFood: (foodId: string) => void;
  addFoods: (foods: Food[]) => void;

  // Reset
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  // Initial state
  walletAddress: null,
  playerName: "",
  currentPlayer: null,
  players: [],
  foods: [],
  leaderboard: [],
  mapTokens: [],
  gameStarted: false,
  canEscape: false,

  // Actions
  setWalletAddress: (address) => set({ walletAddress: address }),
  setPlayerName: (name) => set({ playerName: name }),
  setCurrentPlayer: (player) => set({ currentPlayer: player }),
  setPlayers: (players) => set({ players }),
  setFoods: (foods) => set({ foods }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setMapTokens: (tokens) => set({ mapTokens: tokens }),
  setGameStarted: (started) => set({ gameStarted: started }),
  setCanEscape: (canEscape) => set({ canEscape }),

  // Helper actions
  addPlayer: (player) =>
    set((state) => ({
      players: [...state.players, player],
    })),

  removePlayer: (playerId) =>
    set((state) => ({
      players: state.players.filter((p) => p.id !== playerId),
    })),

  updatePlayer: (playerId, updates) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, ...updates } : p
      ),
    })),

  removeFood: (foodId) =>
    set((state) => ({
      foods: state.foods.filter((f) => f.id !== foodId),
    })),

  addFoods: (foods) =>
    set((state) => ({
      foods: [...state.foods, ...foods],
    })),

  // Reset
  reset: () =>
    set({
      walletAddress: null,
      playerName: "",
      currentPlayer: null,
      players: [],
      foods: [],
      leaderboard: [],
      gameStarted: false,
      canEscape: false,
    }),
}));
