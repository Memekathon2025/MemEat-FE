import { io, Socket } from "socket.io-client";
import type { GameState, Player, TokenBalance } from "../types";

class SocketService {
  private socket: Socket | null = null;
  private serverUrl: string = "http://localhost:3333";

  connect() {
    if (this.socket?.connected) {
      console.log("Already connected to server");
      return this.socket;
    }

    this.socket = io(this.serverUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("✅ Connected to game server:", this.socket?.id);
    });

    this.socket.on("disconnect", () => {
      console.log("❌ Disconnected from server");
    });

    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });

    return this.socket;
  }

  joinGame(playerData: {
    name: string;
    walletAddress: string;
    stakedTokens: TokenBalance[];
  }) {
    if (!this.socket?.connected) {
      console.error("Socket not connected");
      return;
    }
    console.log("Joining game with:", playerData);
    this.socket.emit("join-game", playerData);
  }

  updatePosition(position: { x: number; y: number; angle: number }) {
    if (!this.socket?.connected) return;
    this.socket.emit("player-move", position);
  }

  eatFood(foodId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit("eat-food", foodId);
  }

  playerDied() {
    if (!this.socket?.connected) return;
    this.socket.emit("player-died");
  }

  playerEscape() {
    if (!this.socket?.connected) return;
    this.socket.emit("player-escape");
  }

  // Event listeners
  onPlayerJoined(callback: (player: Player) => void) {
    this.socket?.on("player-joined", callback);
  }

  onPlayerLeft(callback: (playerId: string) => void) {
    this.socket?.on("player-left", callback);
  }

  onPlayerMoved(callback: (data: { socketId: string; position: any }) => void) {
    this.socket?.on("player-moved", callback);
  }

  onGameState(callback: (state: GameState) => void) {
    this.socket?.on("game-state", callback);
  }

  onGameStateUpdate(callback: (data: any) => void) {
    this.socket?.on("game-state-update", callback);
  }

  onFoodEaten(callback: (data: { foodId: string; playerId: string }) => void) {
    this.socket?.on("food-eaten", callback);
  }

  onPlayerUpdated(callback: (player: Player) => void) {
    this.socket?.on("player-updated", callback);
  }

  onPlayerDiedCollision(callback: () => void) {
    this.socket?.on("player-died-collision", callback);
  }

  onCanEscape(callback: (canEscape: boolean) => void) {
    this.socket?.on("can-escape", callback);
  }

  onEscapeSuccess(callback: () => void) {
    this.socket?.on("escape-success", callback);
  }

  onEscapeFailed(callback: (data: { message: string }) => void) {
    this.socket?.on("escape-failed", callback);
  }

  onError(callback: (error: { message: string }) => void) {
    this.socket?.on("error", callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

export const socketService = new SocketService();
