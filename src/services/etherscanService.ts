interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  isValid: boolean;
}

interface TokenBalanceResponse {
  balance: string;
  decimals: number;
}

// 네트워크별 API 엔드포인트 매핑
const EXPLORER_API_ENDPOINTS: Record<number, string> = {
  1: "https://api.etherscan.io/api", // Ethereum Mainnet
  4352: "https://api.memecorescan.io/api", // Memecore (확인 필요)
  43521: "https://api.formicarium.memecore.net/api", // Formicarium (확인 필요)
};

const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY || "";

export class EtherscanService {
  private getApiUrl(chainId: number): string {
    return EXPLORER_API_ENDPOINTS[chainId] || EXPLORER_API_ENDPOINTS[1];
  }

  /**
   * ERC-20 토큰 정보 조회
   */
  async getTokenInfo(
    tokenAddress: string,
    chainId: number
  ): Promise<TokenInfo> {
    const apiUrl = this.getApiUrl(chainId);

    try {
      // Etherscan API 형식
      const url = `${apiUrl}?module=token&action=tokeninfo&contractaddress=${tokenAddress}&apikey=${apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      console.log(data);

      if (data.status === "1" && data.result && data.result.length > 0) {
        const token = data.result[0];
        return {
          address: tokenAddress,
          name: token.name || "",
          symbol: token.symbol || "",
          decimals: parseInt(token.decimals || "18", 10),
          isValid: true,
        };
      }

      // Memecore/Formicarium는 다른 형식일 수 있으므로 직접 컨트랙트 호출 시도
      // 또는 다른 API 엔드포인트 사용
      return {
        address: tokenAddress,
        name: "",
        symbol: "",
        decimals: 18,
        isValid: false,
      };
    } catch (error) {
      console.error("Error fetching token info:", error);
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
   * 지갑의 ERC-20 토큰 잔액 조회
   */
  async getTokenBalance(
    walletAddress: string,
    tokenAddress: string,
    chainId: number
  ): Promise<string> {
    const apiUrl = this.getApiUrl(chainId);

    try {
      const url = `${apiUrl}?module=account&action=tokenbalance&contractaddress=${tokenAddress}&address=${walletAddress}&tag=latest&apikey=${apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      console.log(data);

      if (data.status === "1" && data.result) {
        return data.result;
      }

      return "0";
    } catch (error) {
      console.error("Error fetching token balance:", error);
      return "0";
    }
  }
}

export const etherscanService = new EtherscanService();
