import { ethers } from "ethers";
import { formatUnits, type Address, type WalletClient } from "viem";
import { etherscanService } from "./etherscanService";

import ERC20_ABI from "../abis/ERC20.json";
import WormGame_ABI from "../abis/WormGame.json";

interface MRC20TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  isValid: boolean;
}

export class Web3Service {
  private BASE_ENTRY_FEE_M = 1;

  // MRC-20 토큰 검증 (Etherscan API 또는 직접 컨트랙트 호출)
  async verifyMRC20Token(
    tokenAddress: string,
    chainId: number,
    publicClient?: any
  ): Promise<MRC20TokenInfo> {
    // console.log(
    //   `🔍 Verifying MRC-20 token: ${tokenAddress} on chain ${chainId}`
    // );

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

  // MRC-20 토큰 잔액 조회
  async getMRC20Balance(
    walletAddress: string,
    tokenAddress: string,
    chainId: number,
    decimals: number,
    publicClient?: any
  ): Promise<number> {
    // console.log(
    //   `💰 Getting MRC-20 balance for ${walletAddress} on chain ${chainId}`
    // );

    try {
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

  // 토큰 가격 조회 ($M 기준)
  async getTokenPrice(tokenAddress: string, chainId?: number): Promise<number> {
    // console.log(`💵 Getting token price for ${tokenAddress} (${chainId})`);

    // 네이티브 토큰 (M)의 경우
    if (tokenAddress === "$M" || !tokenAddress) {
      return 1;
    }
    // MRC-20 의 경우
    try {
      // MemeX API 호출
      const chainIdNum = chainId ? chainId : 4352;
      const url = `http://localhost:3333/api/price/${chainIdNum}/${tokenAddress}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.warn(
          `Failed to fetch price from MemeX API: ${response.status}`
        );
        return 0; // 실패 시
      }

      const data = await response.json();

      // chainToken.priceNow 값 추출
      const priceNow = data?.chainToken?.priceNow;

      if (priceNow && !isNaN(parseFloat(priceNow))) {
        const price = parseFloat(priceNow);
        // console.log(`💵 Token price: ${price} M`);
        return price;
      }

      console.warn(`Invalid price data from MemeX API:`, data);
      return 0; // 유효하지 않은 데이터 시
    } catch (error) {
      console.error("Error fetching token price from MemeX API:", error);
      return 0; // 에러 시
    }
  }

  // 입장료 계산 (해당 토큰으로 $M 1개 상응하는 수량)
  async calculateEntryFee(tokenAddress: string): Promise<number> {
    const priceInM = await this.getTokenPrice(tokenAddress);

    if (tokenAddress === "$M" || !tokenAddress) {
      return this.BASE_ENTRY_FEE_M;
    }

    // $M 1개를 해당 토큰으로 환산
    return this.BASE_ENTRY_FEE_M / (priceInM > 0 ? priceInM : 0.1);
  }

  getBaseEntryFee(): number {
    return this.BASE_ENTRY_FEE_M;
  }

  walletClientToSigner(walletClient: WalletClient) {
    const { account, chain, transport } = walletClient;
    if (!account || !chain) return;
    const network = {
      chainId: chain.id,
      name: chain.name,
      ensAddress: chain.contracts?.ensRegistry?.address,
    };
    const provider = new ethers.BrowserProvider(transport, network);
    const signer = provider.getSigner(account.address);
    return signer;
  }

  async enterGame(
    walletClient: WalletClient,
    publicClient: any,
    gameContractAddress: string,
    tokenAddress: string,
    amount: string, // wei 단위 string
    isNativeToken: boolean
  ): Promise<string> {
    if (!walletClient || !walletClient.account) {
      throw new Error("Wallet not connected");
    }
    // console.log("✍️ Preparing transaction...");

    const { writeContract } = await import("viem/actions");

    const hash = await writeContract(walletClient, {
      account: walletClient.account,
      chain: walletClient.chain,
      address: gameContractAddress as `0x${string}`,
      abi: WormGame_ABI,
      functionName: "enterGame",
      args: [tokenAddress as `0x${string}`, BigInt(amount)],
      value: isNativeToken ? BigInt(amount) : 0n,
    });

    // console.log("📤 Transaction sent:", hash);
    await publicClient.waitForTransactionReceipt({ hash });
    // console.log("✅ Transaction confirmed!");

    return hash;
  }

  async approveToken(
    walletClient: WalletClient,
    publicClient: any,
    tokenAddress: string,
    spenderAddress: string,
    amount: string // wei 단위
  ): Promise<string> {
    if (!walletClient || !walletClient.account) {
      throw new Error("Wallet not connected");
    }

    // console.log("💳 Approving token...");

    const { writeContract } = await import("viem/actions");

    const hash = await writeContract(walletClient, {
      account: walletClient.account,
      chain: walletClient.chain,
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spenderAddress as `0x${string}`, BigInt(amount)],
    });

    // console.log(`⏳ Approving... TX: ${hash}`);

    await publicClient.waitForTransactionReceipt({ hash });

    return hash;
  }

  async checkAllowance(
    publicClient: any, // viem PublicClient
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string
  ): Promise<bigint> {
    const allowance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [ownerAddress, spenderAddress],
    });
    return allowance as bigint;
  }

  async claimReward(
    walletClient: WalletClient,
    publicClient: any,
    gameContractAddress: string
  ): Promise<string> {
    if (!walletClient || !walletClient.account) {
      throw new Error("Wallet not connected");
    }

    // console.log("💰 Claiming reward...");

    const { writeContract } = await import("viem/actions");

    const hash = await writeContract(walletClient, {
      account: walletClient.account,
      chain: walletClient.chain,
      address: gameContractAddress as `0x${string}`,
      abi: WormGame_ABI,
      functionName: "claimReward",
      args: [],
    });

    // console.log("📤 Claim transaction sent:", hash);

    // 트랜잭션 완료 대기
    // console.log("⏳ Waiting for claim confirmation...");
    await publicClient.waitForTransactionReceipt({ hash });
    // console.log("✅ Claim confirmed!");

    return hash;
  }
}

export const web3Service = new Web3Service();
