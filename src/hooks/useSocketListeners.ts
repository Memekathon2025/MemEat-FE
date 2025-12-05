import { useEffect } from "react";
import { socketService } from "../services/socket";
import { useGameStore } from "../store/gameStore";
import type { Player } from "../types";

export const useSocketListeners = (
  onPlayerDied: (canEscape: boolean, deadPlayer?: Player) => void
) => {
  const { setPlayers, setFoods, setLeaderboard, canEscape, setCanEscape } =
    useGameStore();

  useEffect(() => {
    socketService.onPlayerJoined((player) => {
      console.log("Player joined:", player);
    });

    socketService.onGameState((state) => {
      setPlayers(state.players);
      setFoods(state.foods);
      setLeaderboard(state.leaderboard);
    });

    socketService.onGameStateUpdate((data) => {
      setLeaderboard(data.leaderboard);
    });

    socketService.onPlayerDiedCollision((deadPlayer) => {
      onPlayerDied(canEscape, deadPlayer);
    });

    socketService.onCanEscape((can) => {
      setCanEscape(can);
    });

    socketService.onEscapeSuccess(() => {
      // Handle escape success
    });

    socketService.onEscapeFailed((data) => {
      alert(data.message);
    });

    socketService.onError((error) => {
      console.error("Socket error:", error);
      alert(error.message);
    });

    return () => {
      // Cleanup if needed
    };
  }, [
    canEscape,
    onPlayerDied,
    setPlayers,
    setFoods,
    setLeaderboard,
    setCanEscape,
  ]);
};
