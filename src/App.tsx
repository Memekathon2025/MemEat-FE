import { useEffect, useState, useRef } from "react";
import { StartScreen } from "./components/ui/StartScreen";
import { GameCanvas } from "./components/game/GameCanvas";
import { Leaderboard } from "./components/ui/Leaderboard";
import { GameOverlay } from "./components/ui/GameOverlay";
import { GameOver } from "./components/ui/GameOver";
import { socketService } from "./services/socket";
import { useGameStore } from "./store/gameStore";
import type { TokenBalance } from "./types";
import "./App.css";
import { NavBar } from "./components/ui/NavBar";

type GamePhase = "start" | "playing" | "gameover";

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
  } = useGameStore();

  const [gamePhase, setGamePhase] = useState<GamePhase>("start");
  const [gameOverSuccess, setGameOverSuccess] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalTokens, setFinalTokens] = useState<TokenBalance[]>([]);

  const lastPlayerStateRef = useRef<{
    score: number;
    collectedTokens: TokenBalance[];
  } | null>(null);

  useEffect(() => {
    // Connect to server
    socketService.connect();

    // Setup socket listeners
    socketService.onPlayerJoined((player) => {
      console.log("Player joined:", player);
      useGameStore.getState().addPlayer(player);
    });

    socketService.onPlayerLeft((playerId) => {
      console.log("Player left:", playerId);
      useGameStore.getState().removePlayer(playerId);
    });

    socketService.onPlayerMoved((data) => {
      useGameStore.getState().updatePlayer(data.socketId, {
        position: data.position,
        angle: data.position.angle,
      });
    });

    socketService.onPlayerUpdated((player) => {
      useGameStore.getState().updatePlayer(player.id, player);
    });

    socketService.onGameState((state) => {
      console.log("Game state received:", state);
      setPlayers(state.players);
      setFoods(state.foods);
      setLeaderboard(state.leaderboard);
    });

    socketService.onGameStateUpdate((data) => {
      setLeaderboard(data.leaderboard);
    });

    socketService.onPlayerDiedCollision(() => {
      console.log("💥 You died from collision!");
      handleGameOver(false);
    });

    socketService.onCanEscape((can) => {
      setCanEscape(can);
    });

    socketService.onEscapeSuccess(() => {
      console.log("🎉 Received escape-success event!");
      handleGameOver(true);
    });

    socketService.onEscapeFailed((data) => {
      console.log("❌ Escape failed:", data.message);
    });

    socketService.onError((error) => {
      console.error("Socket error:", error);
      alert(error.message);
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  const handleStartGame = (playerData: {
    name: string;
    walletAddress: string;
    stakedTokens: TokenBalance[];
  }) => {
    console.log("Starting game with:", playerData);

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

  const handleEscape = () => {
    if (currentPlayer && canEscape) {
      // Save state before escaping (Frontend-only fix for race condition)
      lastPlayerStateRef.current = {
        score: currentPlayer.score,
        collectedTokens: [...currentPlayer.collectedTokens],
      };
      socketService.playerEscape();
    }
  };

  const handleGameOver = (success: boolean) => {
    console.log(
      "Handling Game Over. Success:",
      success,
      "CurrentPlayer:",
      currentPlayer,
      "CachedState:",
      lastPlayerStateRef.current
    );

    // Use current player state OR cached state if player is already removed
    const score = currentPlayer?.score ?? lastPlayerStateRef.current?.score ?? 0;
    const tokens =
      currentPlayer?.collectedTokens ??
      lastPlayerStateRef.current?.collectedTokens ??
      [];

    if (currentPlayer || lastPlayerStateRef.current) {
      setFinalScore(score);
      setFinalTokens(tokens);
      setGameOverSuccess(success);
      setGamePhase("gameover");

      if (!success) {
        socketService.playerDied();
      }
    } else {
      console.error("❌ Current player is missing during game over handling!");
    }
  };

  const handlePlayAgain = async () => {
    reset();
    setGamePhase("start");
    socketService.disconnect();

    // Wait a bit before reconnecting
    setTimeout(() => {
      socketService.connect();
    }, 500);
  };

  return (
    <div className="app">
      <NavBar />

      {gamePhase === "start" && <StartScreen onStart={handleStartGame} />}

      {gamePhase === "playing" && (
        <>
          <Leaderboard leaderboard={leaderboard} />
          <GameOverlay
            currentPlayer={currentPlayer}
            canEscape={canEscape}
            onEscape={handleEscape}
          />
          <GameCanvas onGameOver={handleGameOver} />
        </>
      )}
      {gamePhase === "gameover" && (
        <>
          <Leaderboard leaderboard={leaderboard} />
          <GameOverlay
            currentPlayer={currentPlayer}
            canEscape={canEscape}
            onEscape={handleEscape}
          />
          <GameOver
            success={gameOverSuccess}
            score={finalScore}
            collectedTokens={finalTokens}
            onPlayAgain={handlePlayAgain}
          />
          <GameCanvas onGameOver={handleGameOver} />
        </>
      )}
    </div>
  );
}

export default App;
