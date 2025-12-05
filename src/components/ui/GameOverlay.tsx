import React from "react";
import type { Player, TokenBalance } from "../../types";
import "../../styles/GameOverlay.css";

interface GameOverlayProps {
  currentPlayer: Player | null;
  canEscape: boolean;
  onEscape: () => void;
}

export const GameOverlay: React.FC<GameOverlayProps> = ({
  currentPlayer,
  canEscape,
  onEscape,
}) => {
  if (!currentPlayer) return null;

  const getTotalTokenAmount = (): number => {
    return currentPlayer.collectedTokens.reduce(
      (sum, token) => sum + token.amount,
      0
    );
  };

  return (
    <div className="game-overlay">
      <div className="player-stats">
        <div className="stat-item">
          <span className="stat-label">Player:</span>
          <span className="stat-value">
            {currentPlayer.name.length > 15
              ? currentPlayer.name.slice(0, 15) + "..."
              : currentPlayer.name}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Score:</span>
          <span className="stat-value score">{currentPlayer.score}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Length:</span>
          <span className="stat-value">{currentPlayer.length}</span>
        </div>
      </div>

      {currentPlayer.collectedTokens.length > 0 && (
        <div className="collected-tokens">
          <h4>Collected Tokens:</h4>
          <div className="token-list">
            {currentPlayer.collectedTokens.map((token, idx) => (
              <div
                key={idx}
                className="token-item"
                style={{ color: token.color }}
              >
                <span className="token-symbol">{token.symbol}</span>
                <span className="token-amount">{token.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="escape-section">
        <button
          className={`escape-button ${canEscape ? "pulse" : "disabled"}`}
          onClick={onEscape}
          disabled={!canEscape}
        >
          {canEscape ? "ESCAPE NOW!" : `ESCAPE (Need ${100 - currentPlayer.score} more score)`}
        </button>
        {canEscape && (
          <p className="escape-hint">
            Escape unlocked! Click the button to escape safely.
          </p>
        )}
      </div>

      <div className="controls-hint">
        <p>🖱️ Control direction with your mouse</p>
      </div>
    </div>
  );
};
