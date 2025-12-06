interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  isValid: boolean;
}

// 네트워크별 API 엔드포인트 매핑
const EXPLORER_API_ENDPOINTS: Record<number, string> = {
  1: "https://api.etherscan.io/api", // Ethereum Mainnet
  4352: "https://api.memecorescan.io/api", // Memecore
  43521: "https://api.formicarium.memecore.net/api", // Formicarium
};

const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY || "";

export class EtherscanService {
  private getApiUrl(chainId: number): string {
    return EXPLORER_API_ENDPOINTS[chainId] || EXPLORER_API_ENDPOINTS[1];
  }

  // ERC-20 토큰 정보 조회
  async getTokenInfo(
    tokenAddress: string,
    chainId: number
  ): Promise<TokenInfo> {
    const apiUrl = this.getApiUrl(chainId);

    try {
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
}

export const etherscanService = new EtherscanService();
