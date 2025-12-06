import { useCallback, useEffect, useState } from "react";

import { socketService } from "./services/socket";
import { useGameStore } from "./store/gameStore";
import { useSocketListeners } from "./hooks/useSocketListeners";

import { StartScreen } from "./components/ui/StartScreen";
import { GameCanvas } from "./components/game/GameCanvas";
import { Leaderboard } from "./components/ui/Leaderboard";
import { GameOverlay } from "./components/ui/GameOverlay";
import { GameOver } from "./components/ui/GameOver";
import { NavBar } from "./components/ui/NavBar";
import { MapTokens } from "./components/ui/MapTokens";

import type { Player, TokenBalance } from "./types";
import "./App.css";

type GamePhase = "start" | "playing" | "gameover" | "pending-claim";

function App() {
  const {
    currentPlayer,
    setCurrentPlayer,
    setGameStarted,
    leaderboard,
    setLeaderboard,
    setPlayers,
    setFoods,
    canEscape,
    setCanEscape,
    reset,
    mapTokens,
  } = useGameStore();
  const [gamePhase, setGamePhase] = useState<GamePhase>("start");
  const [gameOverSuccess, setGameOverSuccess] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalTokens, setFinalTokens] = useState<TokenBalance[]>([]);
  const [pendingClaimData, setPendingClaimData] = useState<{
    score: number;
    tokens: TokenBalance[];
    survivalTime: number;
  } | null>(null);

  const handleGameOver = useCallback(
    (success: boolean, player?: Player) => {
      const playerToUse = player || currentPlayer;

      if (playerToUse) {
        setFinalScore(playerToUse.score);
        setFinalTokens(playerToUse.collectedTokens);
        setGameOverSuccess(success);
        setGamePhase("gameover");
      }
    },
    [currentPlayer]
  );

  const handlePendingClaim = useCallback(
    (claimData: {
      score: number;
      tokens: TokenBalance[];
      survivalTime: number;
    }) => {
      setPendingClaimData(claimData);
      setFinalScore(claimData.score);
      setFinalTokens(claimData.tokens);
      setGameOverSuccess(true); // claim 가능한 상태
      setGamePhase("pending-claim");
    },
    []
  );

  // ✨ success 업데이트 함수 추가
  const updateGameOverSuccess = useCallback((success: boolean) => {
    console.log(`🎯 Final success status: ${success}`);
    setGameOverSuccess(success);
  }, []);

  // useSocketListeners에 업데이트 함수 전달
  const { isBlockchainUpdating } = useSocketListeners(
    handleGameOver,
    updateGameOverSuccess
  );

  // 리스너 등록 함수를 분리
  const setupSocketListeners = () => {
    socketService.onPlayerJoined((player) => {
      console.log("Player joined:", player);
    });

    socketService.onGameState((state) => {
      // console.log("Game state received:", state);
      setPlayers(state.players);
      setFoods(state.foods);
      setLeaderboard(state.leaderboard);
    });

    socketService.onGameStateUpdate((data) => {
      // console.log("Game state update received:", data);
      setLeaderboard(data.leaderboard);
    });

    socketService.onCanEscape((can) => {
      setCanEscape(can);
    });

    socketService.onEscapeSuccess(() => {
      handleGameOver(true);
    });

    socketService.onEscapeFailed((data) => {
      alert(data.message);
    });

    socketService.onError((error) => {
      console.error("Socket error:", error);
      alert(error.message);
    });
  };

  useEffect(() => {
    socketService.connect();
    setupSocketListeners();
    return () => {
      socketService.disconnect();
    };
  }, []);

  const handleStartGame = (playerData: {
    name: string;
    walletAddress: string;
    stakedTokens: TokenBalance[];
  }) => {
    // console.log("Starting game with:", playerData);

    socketService.joinGame(playerData);

    // Wait for player-joined event
    socketService.onPlayerJoined((player) => {
      if (player.walletAddress === playerData.walletAddress) {
        setCurrentPlayer(player);
        setGameStarted(true);
        setGamePhase("playing");
      }
    });
  };

  const handlePlayAgain = async () => {
    reset();
    setGamePhase("start");
    socketService.disconnect();

    setTimeout(() => {
      socketService.connect();
      setupSocketListeners(); // 리스너 재등록
    }, 500);
  };

  return (
    <div className="app">
      <NavBar />

      {gamePhase === "start" && (
        <StartScreen
          onStart={handleStartGame}
          onPendingClaim={handlePendingClaim}
        />
      )}

      {gamePhase === "pending-claim" && (
        <>
          <GameOver
            success={true}
            score={finalScore}
            collectedTokens={finalTokens}
            onPlayAgain={handlePlayAgain}
            isBlockchainUpdating={false}
          />
        </>
      )}

      {gamePhase === "playing" && (
        <>
          <Leaderboard leaderboard={leaderboard} />
          <MapTokens mapTokens={mapTokens} />
          <GameOverlay currentPlayer={currentPlayer} canEscape={canEscape} />
          <GameCanvas />
        </>
      )}
      {gamePhase === "gameover" && (
        <>
          <Leaderboard leaderboard={leaderboard} />
          <MapTokens mapTokens={mapTokens} />
          <GameOverlay currentPlayer={currentPlayer} canEscape={canEscape} />
          <GameOver
            success={gameOverSuccess}
            score={finalScore}
            collectedTokens={finalTokens}
            onPlayAgain={handlePlayAgain}
            isBlockchainUpdating={isBlockchainUpdating}
          />
          <GameCanvas />
        </>
      )}
    </div>
  );
}

export default App;
