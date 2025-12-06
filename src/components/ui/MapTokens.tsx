import React from "react";
import "../../styles/GameOverlay.css";
import "../../styles/Leaderboard.css";

interface GameOverlayProps {
  mapTokens: Array<{
    symbol: string;
    amount: number;
    count: number;
    color: string;
  }>;
}

export const MapTokens: React.FC<GameOverlayProps> = ({ mapTokens }) => {
  return (
    <div className="tokenboard">
      <h3 className="leaderboard-title">🪙 Map Tokens</h3>

      {mapTokens.length > 0 && (
        <div className="leaderboard-content">
          <div className="token-list">
            {mapTokens.map((token, idx) => (
              <div
                key={idx}
                className="token-item"
                style={{ color: token.color }}
              >
                <span className="token-symbol">{token.symbol}</span>
                <span className="token-amount">
                  {token.amount.toFixed(2)} ({token.count} foods)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
