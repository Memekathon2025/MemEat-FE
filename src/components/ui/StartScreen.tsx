import React, { useState, useEffect } from "react";
import { useAppKit } from "@reown/appkit/react";
import { useAccount, useBalance, useChainId, usePublicClient } from "wagmi";
import { formatUnits } from "viem";

import { web3Service } from "../../services/web3Service";
import { mockWeb3 } from "../../services/mockWeb3";

import type { TokenBalance } from "../../types";
import "../../styles/StartScreen.css";
import coin from "../../assets/coin.gif";

interface StartScreenProps {
  onStart: (playerData: {
    name: string;
    walletAddress: string;
    stakedTokens: TokenBalance[];
  }) => void;
}

type TokenType = "M" | "MRC20";

export const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: balance } = useBalance({
    address: address,
  });

  useEffect(() => {
    console.log("Address changed:", address);
    if (address) {
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

  // M 토큰 관련
  const [mTokenBalance, setMTokenBalance] = useState(100); // Mock M 잔액

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

  // MRC-20 토큰 검증
  const handleVerifyMRC20 = async () => {
    if (!mrc20Address.trim()) return;

    setVerifying(true);
    setMrc20Error("");
    setMrc20Info(null);

    try {
      // 1. 토큰 검증
      // const tokenInfo = await mockWeb3.verifyMRC20Token(mrc20Address);
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
      // const balance = await mockWeb3.getMRC20Balance(
      //   walletAddress,
      //   mrc20Address
      // );
      const balance = await web3Service.getMRC20Balance(
        walletAddress,
        mrc20Address,
        chainId,
        tokenInfo.decimals,
        publicClient
      );

      // 3. 가격 조회 및 입장료 계산
      // const price = await mockWeb3.getTokenPrice(mrc20Address);
      // const fee = await mockWeb3.calculateEntryFee(mrc20Address);
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
      // setEntryFee(mockWeb3.getBaseEntryFee());
      setEntryFee(web3Service.getBaseEntryFee());
      setTokenPrice(1);
      setMrc20Info(null);
      setMrc20Error("");
    }
  }, [tokenType]);

  const handleStake = async () => {
    if (!name) return;

    setLoading(true);
    try {
      let stakedToken: TokenBalance;

      if (tokenType === "M") {
        // M 토큰으로 입장
        if (mTokenBalance < entryFee) {
          alert("M 토큰 잔액이 부족합니다.");
          return;
        }

        stakedToken = {
          symbol: "M",
          amount: entryFee,
          color: "#FFD700",
        };
      } else {
        // MRC-20 토큰으로 입장
        if (!mrc20Info || mrc20Info.balance < entryFee) {
          alert("토큰 잔액이 부족합니다.");
          return;
        }

        stakedToken = {
          symbol: mrc20Info.symbol,
          amount: entryFee,
          color: getRandomColor(),
        };
      }

      // 스테이킹 처리
      const success = await mockWeb3.stakeTokens(
        stakedToken.symbol,
        stakedToken.amount
      );
      console.log(success);

      if (success) {
        onStart({
          name,
          walletAddress,
          stakedTokens: [stakedToken],
        });
      }
    } catch (error) {
      console.error("Failed to stake tokens:", error);
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
      return mTokenBalance >= entryFee;
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
                {/* <p className="staking-info">
                  게임 입장료: <strong>M {mockWeb3.getBaseEntryFee()}개</strong>{" "}
                  상응하는 토큰
                  <br />
                  스테이킹한 토큰은 맵에 배치됩니다.
                </p> */}

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
                            1 M = {tokenPrice.toFixed(4)} {mrc20Info.symbol}
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
