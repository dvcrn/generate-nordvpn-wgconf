import { ServiceCredentials } from "./types";

const CREDENTIALS_URL = "https://api.nordvpn.com/v1/users/services/credentials";

export const fetchServiceCredentials = async (
  accessToken: string,
): Promise<ServiceCredentials> => {
  const auth = Buffer.from(`token:${accessToken}`).toString("base64");
  const res = await fetch(CREDENTIALS_URL, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!res.ok) {
    throw new Error(
      `NordVPN credentials request failed with HTTP ${res.status}. Check that the access token is valid and not expired.`,
    );
  }

  const credentials = (await res.json()) as ServiceCredentials;
  if (!credentials.nordlynx_private_key) {
    throw new Error("NordVPN credentials response has no nordlynx_private_key");
  }

  return credentials;
};
