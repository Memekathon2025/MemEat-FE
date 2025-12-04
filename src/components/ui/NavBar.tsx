import React from "react";
import { AppKitAccountButton, AppKitNetworkButton } from "@reown/appkit/react";
import "../../styles/NavBar.css";
import { useAccount, useBalance } from "wagmi";
import { formatUnits } from "viem";

export const NavBar: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address: address,
  });

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-brand">
          <h1 className="navbar-title">MemEat</h1>
        </div>
        <div className="navbar-actions">
          {isConnected && balance && (
            <div className="balance-display">
              {parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(
                2
              )}{" "}
              {balance.symbol}
            </div>
          )}
          <AppKitAccountButton />
          <AppKitNetworkButton />
        </div>
      </div>
    </nav>
  );
};
