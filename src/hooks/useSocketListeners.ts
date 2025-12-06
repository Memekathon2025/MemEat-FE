import { useEffect, useState } from "react";
import { socketService } from "../services/socket";
import { useGameStore } from "../store/gameStore";
import type { Player } from "../types";

export const useSocketListeners = (
  onPlayerDied: (canEscape: boolean, deadPlayer?: Player) => void
) => {
  const [isBlockchainUpdating, setIsBlockchainUpdating] = useState(false);
  const {
    setPlayers,
    setFoods,
    setLeaderboard,
    canEscape,
    setCanEscape,
    setMapTokens,
  } = useGameStore();

  useEffect(() => {
    socketService.onPlayerJoined((player) => {
      console.log("Player joined:", player);
    });

    socketService.onGameState((state) => {
      setPlayers(state.players);
      setFoods(state.foods);
      setLeaderboard(state.leaderboard);
      if (state.mapTokens) {
        setMapTokens(state.mapTokens);
      }
    });

    socketService.onGameStateUpdate((data) => {
      setLeaderboard(data.leaderboard);
    });

    socketService.onPlayerDiedCollision((deadPlayer) => {
      // 즉시 게임오버 표시
      setIsBlockchainUpdating(true); // 블록체인 업데이트 중
      onPlayerDied(canEscape, deadPlayer);
    });

    socketService.onBlockchainUpdateComplete((data) => {
      console.log("✅ Blockchain state updated:", data.success);

      if (!data.success) {
        alert("Warning: Blockchain update failed. Please contact support.");
      }

      // DB 업데이트가 완전히 반영될 때까지 대기
      setTimeout(() => {
        setIsBlockchainUpdating(false);
      }, 1000);
    });

    socketService.onCanEscape((can) => {
      setCanEscape(can);
    });

    socketService.onEscapeSuccess(() => {
      setIsBlockchainUpdating(true);
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
    setMapTokens,
  ]);

  return { isBlockchainUpdating };
};
