import { Server, Country, KeychainConfig } from "./types";

export const fetchNordCountries = async (): Promise<Country[]> => {
  const res = await fetch(`https://api.nordvpn.com/v1/countries`);
  return (await res.json()) as any as Country[];
};

export const fetchRecommendedServers = async (
  countryId: string,
  amount: number = 1
): Promise<Server[]> => {
  const res = await fetch(
    `https://api.nordvpn.com/v1/servers/recommendations?&limit=${amount}&filters[country_id]=${countryId}&filters[servers_technologies][identifier]=wireguard_udp`
  );
  const servers = ((await res.json()) as any as Server[]) || [];
  if (servers.length === 0) {
    throw new Error("No server found");
  }

  return servers;
};

export const getCountryByCode = async (code: string): Promise<Country> => {
  const countries = await fetchNordCountries();
  const country = countries.find(
    (c) => c.code.toLowerCase() === code.toLowerCase()
  );
  if (!country) {
    throw new Error(`Country with code ${code} not found.`);
  }
  return country;
};
