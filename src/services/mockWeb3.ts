import type { MockToken, TokenBalance } from "../types";

interface MRC20TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  isValid: boolean;
}

interface TokenPrice {
  token: string;
  priceInM: number; // $M 토큰 기준 가격
}

// Mock Web3 서비스 - 나중에 실제 Web3로 교체
export class MockWeb3Service {
  private BASE_ENTRY_FEE_M = 1;

  private mockTokens: MockToken[] = [
    { symbol: "M", name: "Meme Coin", balance: 1000 },
    { symbol: "MEME1", name: "Doge Coin", balance: 1000 },
    { symbol: "MEME2", name: "Pepe Token", balance: 500 },
    { symbol: "MEME3", name: "Shiba Inu", balance: 2000 },
    { symbol: "MEME4", name: "Moon Token", balance: 750 },
    { symbol: "MEME5", name: "Rocket Coin", balance: 1500 },
  ];

  async connectWallet(): Promise<string> {
    // Mock 지갑 주소 생성
    await new Promise((resolve) => setTimeout(resolve, 500)); // 연결 시뮬레이션
    return "0x" + Math.random().toString(36).substring(2, 15).padEnd(40, "0");
  }

  async getTokenBalances(address: string): Promise<MockToken[]> {
    // Mock 토큰 잔액 반환
    console.log("Getting token balances for", address);
    await new Promise((resolve) => setTimeout(resolve, 300));
    return this.mockTokens;
  }

  // MRC-20 토큰 검증 (Memecorescan API)
  async verifyMRC20Token(tokenAddress: string): Promise<MRC20TokenInfo> {
    console.log(`🔍 Verifying MRC-20 token: ${tokenAddress}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // TODO: 실제 Memecorescan API 호출
    // const response = await fetch(`https://memecorescan.io/api/token/${tokenAddress}`);
    // const data = await response.json();

    // Mock 응답
    const mockValidToken = tokenAddress.toLowerCase().startsWith("0x1");

    if (mockValidToken) {
      return {
        address: tokenAddress,
        name: "Mock MRC Token",
        symbol: "MMRC",
        decimals: 18,
        isValid: true,
      };
    } else {
      return {
        address: tokenAddress,
        name: "",
        symbol: "",
        decimals: 0,
        isValid: false,
      };
    }
  }

  // MRC-20 토큰 잔액 조회
  async getMRC20Balance(
    walletAddress: string,
    tokenAddress: string
  ): Promise<number> {
    console.log(`💰 Getting MRC-20 balance for ${walletAddress}`);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // TODO: 실제 블록체인 조회
    // const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    // const balance = await contract.balanceOf(walletAddress);
    // return ethers.utils.formatUnits(balance, decimals);

    // Mock 잔액
    return Math.floor(Math.random() * 10000) + 100;
  }

  // 토큰 가격 조회 ($M 기준)
  async getTokenPrice(tokenAddress: string): Promise<number> {
    console.log(`💵 Getting token price for ${tokenAddress}`);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // TODO: 실제 DEX 또는 Oracle에서 가격 조회
    // const price = await fetchPriceFromDEX(tokenAddress);

    // Mock 가격 (1 $M = X 토큰)
    if (tokenAddress === "$M") {
      return 1;
    }

    // MRC-20 토큰의 경우 랜덤 가격 (예: 1 $M = 0.1~10 MRC토큰)
    return Math.random() * 10 + 0.1;
  }

  // 입장료 계산 (해당 토큰으로 $M 1개 상응하는 수량)
  async calculateEntryFee(tokenAddress: string): Promise<number> {
    const priceInM = await this.getTokenPrice(tokenAddress);

    if (tokenAddress === "$M") {
      return this.BASE_ENTRY_FEE_M;
    }

    // $M 1개를 해당 토큰으로 환산
    return this.BASE_ENTRY_FEE_M * priceInM;
  }

  async stakeTokens(tokenSymbol: string, amount: number): Promise<boolean> {
    // Mock 스테이킹 (실제로는 컨트랙트 호출)
    console.log(`💰 Staking ${amount} ${tokenSymbol}`);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 트랜잭션 시뮬레이션

    // 잔액 차감
    const token = this.mockTokens.find((t) => t.symbol === tokenSymbol);
    if (token && token.balance >= amount) {
      token.balance -= amount;
      return true;
    }
    return false;
  }

  async withdrawTokens(tokens: TokenBalance[]): Promise<boolean> {
    // Mock 출금
    console.log("💸 Withdrawing tokens:", tokens);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 잔액 추가
    tokens.forEach((token) => {
      const mockToken = this.mockTokens.find((t) => t.symbol === token.symbol);
      if (mockToken) {
        mockToken.balance += token.amount;
      }
    });

    return true;
  }

  getBaseEntryFee(): number {
    return this.BASE_ENTRY_FEE_M;
  }

  isConnected(): boolean {
    return true; // Mock이므로 항상 연결됨
  }
}

export const mockWeb3 = new MockWeb3Service();
