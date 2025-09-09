import { ConnectButton } from "thirdweb/react";
import { darkTheme } from "thirdweb/react";
import { createWallet } from "thirdweb/wallets";
import { client } from "@/lib/thirdweb";

const wallets = [
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("walletConnect"),
];

export default function ConnectWalletButton() {
  return (
    <ConnectButton
      client={client}
      connectButton={{ 
        label: "CONNECT",
        className: "!rounded"
      }}
      connectModal={{
        privacyPolicyUrl:
          "https://retinaldelights.io/privacy",
        size: "compact",
        termsOfServiceUrl:
          "https://retinaldelights.io/terms",
      }}
      theme={darkTheme({
        colors: {
          accentText: "hsl(324, 100%, 50%)",
          accentButtonBg: "hsl(324, 100%, 50%)",
          primaryButtonBg: "hsl(324, 100%, 50%)",
          primaryButtonText: "hsl(0, 0%, 100%)",
          modalBg: "hsl(0, 0%, 9%)",
          borderColor: "hsl(0, 0%, 40%)",
          separatorLine: "hsl(0, 0%, 14%)",
          tertiaryBg: "hsl(0, 0%, 7%)",
          skeletonBg: "hsl(0, 0%, 13%)",
          secondaryButtonBg: "hsl(0, 0%, 13%)",
          secondaryIconHoverBg: "hsl(0, 0%, 9%)",
          tooltipText: "hsl(0, 0%, 9%)",
          inputAutofillBg: "hsl(0, 0%, 9%)",
          scrollbarBg: "hsl(0, 0%, 9%)",
          secondaryIconColor: "hsl(0, 0%, 40%)",
          connectedButtonBg: "hsl(0, 0%, 9%)",
          connectedButtonBgHover: "hsl(0, 0%, 2%)",
          secondaryButtonHoverBg: "hsl(0, 0%, 9%)",
          selectedTextColor: "hsl(0, 0%, 9%)",
          secondaryText: "hsl(0, 0%, 82%)",
          primaryText: "hsl(0, 0%, 100%)",
        },
      })}
      wallets={wallets}
    />
  );
}
