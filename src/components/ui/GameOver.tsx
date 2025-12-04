import React from "react";
import type { TokenBalance } from "../../types";
import "../../styles/GameOver.css";

interface GameOverProps {
  success: boolean;
  score: number;
  collectedTokens: TokenBalance[];
  onPlayAgain: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({
  success,
  score,
  collectedTokens,
  onPlayAgain,
}) => {
  const handleClaim = async () => {
    // TODO: claim
    onPlayAgain();
  };

  return (
    <div className="game-over-overlay">
      <div className="game-over-modal">
        {success ? (
          <>
            <h1 className="game-over-title success">🎉 Escape Successful!</h1>
            <p className="game-over-message">
              Congratulations! Claim the tokens you collected.
            </p>
          </>
        ) : (
          <>
            <h1 className="game-over-title failure">💀 Game Over</h1>
            <p className="game-over-message">
              You collided with another snake. <br />
              The tokens you collected have been returned to the map.
            </p>
          </>
        )}

        <div className="final-stats">
          <div className="stat">
            <span className="stat-label">SCORE</span>
            <span className="stat-value">{score}</span>
          </div>
        </div>

        {collectedTokens.length > 0 && (
          <div className="final-tokens">
            {/* <h3>{success ? "출금한 토큰:" : "잃어버린 토큰:"}</h3> */}
            <div className="token-grid">
              {collectedTokens.map((token, idx) => (
                <div
                  key={idx}
                  className="token-card"
                  style={{ borderColor: token.color }}
                >
                  <span className="token-symbol" style={{ color: token.color }}>
                    {token.symbol}
                  </span>
                  <span className="token-amount">{token.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {success ? (
          <button className="play-again-button" onClick={handleClaim}>
            Claim
          </button>
        ) : (
          <button className="play-again-button" onClick={onPlayAgain}>
            Retry
          </button>
        )}
      </div>
    </div>
  );
};
