import React, { useState, useEffect } from "react";
import { useAppKit } from "@reown/appkit/react";
import {
  useAccount,
  useBalance,
  useChainId,
  usePublicClient,
  useWalletClient,
} from "wagmi";
import { formatUnits } from "viem";
import { ethers } from "ethers";

import { web3Service } from "../../services/web3Service";

import type { TokenBalance } from "../../types";
import "../../styles/StartScreen.css";
import coin from "../../assets/coin.gif";

const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  "0x04686e9284B54d8719A5a4DecaBE82158316C8f0";

interface StartScreenProps {
  onStart: (playerData: {
    name: string;
    walletAddress: string;
    stakedTokens: TokenBalance[];
  }) => void;
  onPendingClaim?: (claimData: {
    score: number;
    tokens: TokenBalance[];
    survivalTime: number;
  }) => void;
}

type TokenType = "M" | "MRC20";

export const StartScreen: React.FC<StartScreenProps> = ({
  onStart,
  onPendingClaim,
}) => {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: balance } = useBalance({
    address: address,
  });
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    if (address) {
      checkActiveSession();
      checkPendingClaim();
      setWalletAddress(address);
    } else {
      setWalletAddress("");
    }
  }, [address]);

  const [name, setName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [showStaking, setShowStaking] = useState(false);

  // 토큰 타입 선택
  const [tokenType, setTokenType] = useState<TokenType>("M");

  // MRC-20 토큰 관련
  const [mrc20Address, setMrc20Address] = useState("");
  const [mrc20Info, setMrc20Info] = useState<{
    name: string;
    symbol: string;
    balance: number;
  } | null>(null);
  const [mrc20Error, setMrc20Error] = useState("");
  const [verifying, setVerifying] = useState(false);

  // 가격 및 입장료
  const [entryFee, setEntryFee] = useState(1); // 기본 M 1개
  const [tokenPrice, setTokenPrice] = useState(1);

  const [loading, setLoading] = useState(false);

  const handleConnectWallet = async () => {
    setLoading(true);
    try {
      if (!isConnected) {
        await open();
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkActiveSession = async () => {
    console.log("?");
    try {
      const response = await fetch(
        `http://localhost:3333/api/check-session?walletAddress=${address}`
      );
      const result = await response.json();
      console.log(result);

      if (result.success && result.hasActiveSession) {
        // Active 세션이 있으면 재입장 여부 물어보기
        if (confirm("Active session found! Do you want to rejoin?")) {
          await handleRejoin();
        }
      }
    } catch (error) {
      console.error("Error checking session:", error);
    }
  };

  const handleRejoin = async () => {
    try {
      const response = await fetch(`http://localhost:3333/api/rejoin-game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
        }),
      });

      const result = await response.json();
      console.log(result);
      if (result.success) {
        // 바로 게임 시작
        onStart({
          name: result.playerName,
          walletAddress: address!,
          stakedTokens: [],
        });
      }
    } catch (error) {
      console.error("Error rejoining:", error);
    }
  };

  const checkPendingClaim = async () => {
    try {
      // 1. Pending Claim 먼저 체크
      const claimResponse = await fetch(
        `http://localhost:3333/api/check-pending-claim?walletAddress=${address}`
      );
      const claimResult = await claimResponse.json();

      if (claimResult.success && claimResult.hasPendingClaim) {
        // ✨ Claim 화면으로 바로 이동
        const session = claimResult.session;

        // 토큰 정보 변환
        const tokens = session.rewardTokens.map(
          (addr: string, idx: number) => ({
            address: addr,
            symbol:
              addr === "0x0000000000000000000000000000000000000000"
                ? "M"
                : "Token",
            amount: parseFloat(ethers.formatEther(session.rewardAmounts[idx])),
            color:
              addr === "0x0000000000000000000000000000000000000000"
                ? "#FFD700"
                : "#00FF00",
          })
        );

        // GameOver 화면으로 이동 (success=true, claim 가능)
        if (onPendingClaim) {
          onPendingClaim({
            score: session.finalScore,
            tokens: tokens,
            survivalTime: session.survivalTime,
          });
          return;
        }
      }

      // 2. Active 세션 체크
      const response = await fetch(
        `http://localhost:3333/api/check-session?walletAddress=${address}`
      );
      const result = await response.json();

      if (result.success && result.hasActiveSession) {
        if (confirm("Active session found! Do you want to rejoin?")) {
          await handleRejoin();
        }
      }
    } catch (error) {
      console.error("Error checking session:", error);
    }
  };

  // MRC-20 토큰 검증
  const handleVerifyMRC20 = async () => {
    if (!mrc20Address.trim()) return;

    setVerifying(true);
    setMrc20Error("");
    setMrc20Info(null);

    try {
      // 1. 토큰 검증
      const tokenInfo = await web3Service.verifyMRC20Token(
        mrc20Address,
        chainId,
        publicClient
      );

      if (!tokenInfo.isValid) {
        setMrc20Error("❌ Invalid MRC-20 token address.");
        return;
      }

      // 2. 잔액 조회
      const balance = await web3Service.getMRC20Balance(
        walletAddress,
        mrc20Address,
        chainId,
        tokenInfo.decimals,
        publicClient
      );

      // 3. 가격 조회 및 입장료 계산
      const price = await web3Service.getTokenPrice(mrc20Address, chainId);
      const fee = await web3Service.calculateEntryFee(mrc20Address);

      setMrc20Info({
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        balance: balance,
      });
      setTokenPrice(price);
      setEntryFee(fee);
    } catch (error) {
      console.error("Failed to verify MRC-20 token:", error);
      setMrc20Error("❌ An error occurred during token verification.");
    } finally {
      setVerifying(false);
    }
  };

  // 토큰 타입 변경 시 입장료 재계산
  useEffect(() => {
    if (tokenType === "M") {
      setEntryFee(web3Service.getBaseEntryFee());
      setTokenPrice(1);
      setMrc20Info(null);
      setMrc20Error("");
    }
  }, [tokenType]);

  const handleStake = async () => {
    if (!name || !walletClient) {
      alert("지갑을 연결해주세요.");
      return;
    }

    setLoading(true);
    try {
      let tokenAddress: string;
      let amount: string;
      let isNativeToken: boolean;

      if (tokenType === "M") {
        // Native M 토큰
        tokenAddress = "0x0000000000000000000000000000000000000000"; // ethers.ZeroAddress
        amount = BigInt(entryFee * 1e18).toString(); // parseEther 대체
        isNativeToken = true;
      } else {
        // MRC-20 토큰
        if (!mrc20Info) {
          alert("토큰 정보가 없습니다.");
          return;
        }

        tokenAddress = mrc20Address;
        amount = BigInt(entryFee * 1e18).toString();
        isNativeToken = false;

        // Approve 확인 및 실행
        const allowance = await web3Service.checkAllowance(
          publicClient,
          tokenAddress,
          address!,
          CONTRACT_ADDRESS
        );

        if (allowance < BigInt(amount)) {
          console.log("💳 Approving token...");
          await web3Service.approveToken(
            walletClient,
            publicClient,
            tokenAddress,
            CONTRACT_ADDRESS,
            amount
          );
        }
      }

      // 트랜잭션 전송
      console.log("✍️ Sending transaction...");
      const txHash = await web3Service.enterGame(
        walletClient,
        publicClient,
        CONTRACT_ADDRESS,
        tokenAddress,
        amount,
        isNativeToken
      );

      // 백엔드로 전송
      const response = await fetch(`http://localhost:3333/api/enter-game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          walletAddress: address,
          txHash,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      console.log("✅ Game entered! TX:", result.txHash);

      // 게임 시작
      onStart({
        name,
        walletAddress: address!,
        stakedTokens: [
          {
            address: tokenAddress,
            symbol: tokenType === "M" ? "M" : mrc20Info!.symbol,
            amount: entryFee,
            color: tokenType === "M" ? "#FFD700" : getRandomColor(),
          },
        ],
      });
    } catch (error: any) {
      console.error("Failed to enter game:", error);
      alert(`입장 실패: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  const getRandomColor = (): string => {
    const colors = ["#FFD700", "#00FF00", "#FF1493", "#00CED1", "#FF4500"];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const canStartGame = () => {
    if (tokenType === "M") {
      return balance
        ? parseFloat(formatUnits(balance.value, balance.decimals)) >= entryFee
        : false;
    } else {
      return mrc20Info && mrc20Info.balance >= entryFee;
    }
  };

  return (
    <div className="start-screen">
      <div className="" />
      <div className="start-screen-content">
        <div className="game-header">
          <h1 className="game-title">
            <img src={coin} className="" />
            MemEat
            <img src={coin} className="" />
          </h1>
          <p className="game-subtitle">Eat as many memes as you can!</p>
        </div>

        {!walletAddress ? (
          <>
            <div className="wallet-section">
              <button
                className="connect-button"
                onClick={handleConnectWallet}
                disabled={loading}
              >
                {loading ? "Connecting..." : "Connect Wallet"}
              </button>
            </div>

            <div className="game-info">
              <h3>Game Rules</h3>
              <ul>
                <li>💰 Entry Fee: M (Native Token) or MRC-20 Token</li>
                <li>🎯 Earn tokens on the map</li>
                <li>💀 Game over if you collide with another!</li>
                <li>🚀 Escape is possible once you eat tokens worth 1M</li>
                <li>📊 Real-time ranking based on survival time and score</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="game-setup">
            {!showStaking ? (
              <>
                <input
                  type="text"
                  className="name-input"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={20}
                />

                <button
                  className="stake-button"
                  onClick={() => setShowStaking(true)}
                  disabled={!name.trim()}
                >
                  GO TO STAKE
                </button>
              </>
            ) : (
              <div className="staking-modal">
                <h2>TOKEN STAKING</h2>

                {/* 토큰 타입 선택 */}
                <div className="token-type-selection">
                  {/* <label>토큰 선택:</label> */}
                  <div className="radio-group">
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="tokenType"
                        value="M"
                        checked={tokenType === "M"}
                        onChange={(e) =>
                          setTokenType(e.target.value as TokenType)
                        }
                      />
                      <span>M (Native Token)</span>
                    </label>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="tokenType"
                        value="MRC20"
                        checked={tokenType === "MRC20"}
                        onChange={(e) =>
                          setTokenType(e.target.value as TokenType)
                        }
                      />
                      <span>MRC-20 Token</span>
                    </label>
                  </div>
                </div>

                {/* M 토큰 선택 시 */}
                {tokenType === "M" && (
                  <div className="token-info-box">
                    <h3>M Token</h3>
                    <p>
                      Balance:{" "}
                      <strong>
                        {balance ? (
                          <>
                            {parseFloat(
                              formatUnits(balance.value, balance.decimals)
                            ).toFixed(2)}{" "}
                            {balance.symbol}
                          </>
                        ) : (
                          "0 M"
                        )}
                      </strong>
                    </p>
                    <p>
                      Entry Fee: <strong>{entryFee} M</strong>
                    </p>
                  </div>
                )}

                {/* MRC-20 토큰 선택 시 */}
                {tokenType === "MRC20" && (
                  <div className="token-info-box">
                    <div className="address-input-group">
                      <label>MRC-20 Token Address:</label>
                      <input
                        type="text"
                        className="name-input"
                        placeholder="0x..."
                        value={mrc20Address}
                        onChange={(e) => setMrc20Address(e.target.value)}
                      />
                      <button
                        className="verify-button"
                        onClick={handleVerifyMRC20}
                        disabled={!mrc20Address.trim() || verifying}
                      >
                        {verifying ? "Verifying..." : "Verify"}
                      </button>
                    </div>

                    {mrc20Error && (
                      <p className="error-message">{mrc20Error}</p>
                    )}

                    {mrc20Info && (
                      <div className="token-info-box success">
                        <h3>
                          ✅ {mrc20Info.name} ({mrc20Info.symbol})
                        </h3>
                        <p>
                          Balance:{" "}
                          <strong>
                            {mrc20Info.balance} {mrc20Info.symbol}
                          </strong>
                        </p>
                        <p>
                          Current Price:{" "}
                          <strong>
                            1 M = {tokenPrice.toFixed(8)} {mrc20Info.symbol}
                          </strong>
                        </p>
                        <p>
                          Entry Fee:{" "}
                          <strong>
                            {entryFee.toFixed(2)} {mrc20Info.symbol}
                          </strong>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="button-group">
                  {/* <button
                    className="back-button"
                    onClick={() => setShowStaking(false)}
                  >
                    뒤로
                  </button> */}
                  <button
                    className="start-button"
                    onClick={handleStake}
                    disabled={!canStartGame() || loading}
                  >
                    {loading ? "LOADING..." : "GAME START!"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
