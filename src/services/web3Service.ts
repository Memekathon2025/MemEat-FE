import { useAppKit } from "@reown/appkit/react";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { formatUnits, parseUnits, type Address } from "viem";
import { etherscanService } from "./etherscanService";

import { abi as ERC20_ABI } from "../abis/ERC20.json";

interface MRC20TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  isValid: boolean;
}

export class Web3Service {
  private BASE_ENTRY_FEE_M = 1;

  /**
   * MRC-20 토큰 검증 (Etherscan API 또는 직접 컨트랙트 호출)
   */
  async verifyMRC20Token(
    tokenAddress: string,
    chainId: number,
    publicClient?: any // viem PublicClient
  ): Promise<MRC20TokenInfo> {
    console.log(
      `🔍 Verifying MRC-20 token: ${tokenAddress} on chain ${chainId}`
    );

    try {
      // 1. Etherscan API로 시도
      const tokenInfo = await etherscanService.getTokenInfo(
        tokenAddress,
        chainId
      );

      if (tokenInfo.isValid) {
        return tokenInfo;
      }

      // 2. Etherscan이 실패하면 직접 컨트랙트 호출
      if (publicClient) {
        try {
          const [name, symbol, decimals] = await Promise.all([
            publicClient.readContract({
              address: tokenAddress as Address,
              abi: ERC20_ABI,
              functionName: "name",
            }),
            publicClient.readContract({
              address: tokenAddress as Address,
              abi: ERC20_ABI,
              functionName: "symbol",
            }),
            publicClient.readContract({
              address: tokenAddress as Address,
              abi: ERC20_ABI,
              functionName: "decimals",
            }),
          ]);

          return {
            address: tokenAddress,
            name: name as string,
            symbol: symbol as string,
            decimals: decimals as number,
            isValid: true,
          };
        } catch (contractError) {
          console.error("Contract call failed:", contractError);
        }
      }

      return {
        address: tokenAddress,
        name: "",
        symbol: "",
        decimals: 18,
        isValid: false,
      };
    } catch (error) {
      console.error("Error verifying token:", error);
      return {
        address: tokenAddress,
        name: "",
        symbol: "",
        decimals: 18,
        isValid: false,
      };
    }
  }

  /**
   * MRC-20 토큰 잔액 조회
   */
  async getMRC20Balance(
    walletAddress: string,
    tokenAddress: string,
    chainId: number,
    decimals: number,
    publicClient?: any
  ): Promise<number> {
    console.log(
      `💰 Getting MRC-20 balance for ${walletAddress} on chain ${chainId}`
    );

    try {
      // 1. Etherscan API로 시도
      const balance = await etherscanService.getTokenBalance(
        walletAddress,
        tokenAddress,
        chainId
      );

      if (balance && balance !== "0") {
        return parseFloat(formatUnits(BigInt(balance), decimals));
      }

      // 2. Etherscan이 실패하면 직접 컨트랙트 호출
      if (publicClient) {
        try {
          const balance = await publicClient.readContract({
            address: tokenAddress as Address,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [walletAddress as Address],
          });

          return parseFloat(formatUnits(balance as bigint, decimals));
        } catch (contractError) {
          console.error("Contract call failed:", contractError);
        }
      }

      return 0;
    } catch (error) {
      console.error("Error getting token balance:", error);
      return 0;
    }
  }

  /**
   * 토큰 가격 조회 ($M 기준)
   * TODO: 실제 가격 오라클 연동 (MemeX Price Fetcher 등)
   */
  async getTokenPrice(tokenAddress: string, chainId?: number): Promise<number> {
    console.log(`💵 Getting token price for ${tokenAddress}`);

    // 네이티브 토큰 (M)의 경우
    if (tokenAddress === "$M" || !tokenAddress) {
      return 1;
    }

    // TODO: 실제 가격 오라클에서 조회
    // MemeX Price Fetcher 컨트랙트 호출 또는 DEX API 사용
    // 현재는 기본값 반환
    return 1; // 임시로 1:1 비율
  }

  /**
   * 입장료 계산 (해당 토큰으로 $M 1개 상응하는 수량)
   */
  async calculateEntryFee(tokenAddress: string): Promise<number> {
    const priceInM = await this.getTokenPrice(tokenAddress);

    if (tokenAddress === "$M" || !tokenAddress) {
      return this.BASE_ENTRY_FEE_M;
    }

    // $M 1개를 해당 토큰으로 환산
    return this.BASE_ENTRY_FEE_M * priceInM;
  }

  getBaseEntryFee(): number {
    return this.BASE_ENTRY_FEE_M;
  }
}

export const web3Service = new Web3Service();
