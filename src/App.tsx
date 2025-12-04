import { useEffect, useState } from "react";
import { StartScreen } from "./components/ui/StartScreen";
import { GameCanvas } from "./components/game/GameCanvas";
import { Leaderboard } from "./components/ui/Leaderboard";
import { GameOverlay } from "./components/ui/GameOverlay";
import { GameOver } from "./components/ui/GameOver";
import { socketService } from "./services/socket";
import { useGameStore } from "./store/gameStore";
import { mockWeb3 } from "./services/mockWeb3";
import type { TokenBalance } from "./types";
import "./App.css";
import { NavBar } from "./components/ui/NavBar";

type GamePhase = "start" | "playing" | "gameover";

function App() {
  const {
    currentPlayer,
    setCurrentPlayer,
    gameStarted,
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

  useEffect(() => {
    // Connect to server
    socketService.connect();

    // Setup socket listeners
    socketService.onPlayerJoined((player) => {
      console.log("Player joined:", player);
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
      handleGameOver(true);
    });

    socketService.onEscapeFailed((data) => {
      alert(data.message);
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
      socketService.playerEscape();
    }
  };

  const handleGameOver = (success: boolean) => {
    if (currentPlayer) {
      setFinalScore(currentPlayer.score);
      setFinalTokens(currentPlayer.collectedTokens);
      setGameOverSuccess(success);
      setGamePhase("gameover");

      if (!success) {
        socketService.playerDied();
      }
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
