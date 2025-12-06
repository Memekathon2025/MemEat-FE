import React, { useState } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { web3Service } from "../../services/web3Service";
import type { TokenBalance } from "../../types";
import "../../styles/GameOver.css";

const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  "0x04686e9284B54d8719A5a4DecaBE82158316C8f0";

interface GameOverProps {
  success: boolean;
  score: number;
  collectedTokens: TokenBalance[];
  onPlayAgain: () => void;
  isBlockchainUpdating?: boolean;
}

export const GameOver: React.FC<GameOverProps> = ({
  success,
  score,
  collectedTokens,
  onPlayAgain,
  isBlockchainUpdating = false,
}) => {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isClaiming, setIsClaiming] = useState<boolean>(false);

  const handleClaim = async () => {
    if (!walletClient || !publicClient) {
      alert("Wallet not connected");
      return;
    }
    try {
      setIsClaiming(true);

      const txHash = await web3Service.claimReward(
        walletClient,
        publicClient,
        CONTRACT_ADDRESS
      );

      alert(`🎉 Rewards claimed! TX: ${txHash}`);

      onPlayAgain();
    } catch (error: any) {
      console.error("Claim error:", error);
      alert(`Failed to claim: ${error.message}`);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="game-over-overlay">
      <div className="game-over-modal">
        {success ? (
          <>
            <h1 className="game-over-title success">Game Over</h1>
            <p className="game-over-message">
              You collided with another snake. <br />
              You can claim the tokens you collected!
            </p>
          </>
        ) : (
          <>
            <h1 className="game-over-title failure">Game Over</h1>
            <p className="game-over-message">
              You collided with another snake. <br />
              The tokens you collected have been returned to the map.
            </p>
          </>
        )}

        <div className="final-stats">
          <div className="stat">
            <span className="stat-label">SCORE</span>
            <span className="stat-value">{score.toFixed(2)}</span>
          </div>
        </div>

        {collectedTokens.length > 0 && (
          <div className="final-tokens">
            <div>Collected Tokens</div>
            <div className="token-grid">
              {collectedTokens.map((token, idx) => (
                <div
                  key={idx}
                  className="token-card"
                  style={{ borderColor: token.color }}
                >
                  <span className="token-amount">
                    {token.amount.toFixed(2)}
                  </span>
                  <span className="token-symbol" style={{ color: token.color }}>
                    {token.symbol}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {success ? (
          <button
            className="play-again-button"
            onClick={handleClaim}
            disabled={isBlockchainUpdating}
          >
            {isClaiming
              ? "Claiming..."
              : isBlockchainUpdating
              ? "Processing..."
              : "Claim"}
          </button>
        ) : (
          <button
            className="play-again-button"
            onClick={onPlayAgain}
            disabled={isBlockchainUpdating}
          >
            {isBlockchainUpdating ? "Processing..." : "Retry"}
          </button>
        )}
      </div>
    </div>
  );
};
