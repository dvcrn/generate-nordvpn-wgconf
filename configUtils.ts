import { ExtractedWireguardConfig, Server } from "./types";

export const generateWireguardConfig = (
  privateKey: string,
  publicKey: string,
  dnsServer: string,
  endpoint: string
) => {
  return `[Interface]
PrivateKey = ${privateKey}
Address = 10.5.0.2/16
DNS = ${dnsServer}

[Peer]
PublicKey = ${publicKey}
AllowedIPs = 0.0.0.0/0, ::/0
Endpoint = ${endpoint}
PersistentKeepalive = 25`;
};

export const extractWireguardConfig = (
  server: Server
): ExtractedWireguardConfig => {
  const found = server.technologies.find(
    (t) => t.identifier === "wireguard_udp"
  );
  const pk = found?.metadata.find((m) => m.name === "public_key")?.value;
  return {
    endpoint: server.station,
    publicKey: pk || "",
  };
};
