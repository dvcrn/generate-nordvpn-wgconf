#!/usr/bin/env node

import fs from "fs";
import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { Country, KeychainConfig } from "./types";
import { extractWireguardConfig, generateWireguardConfig } from "./configUtils";
import {
  fetchNordCountries,
  fetchRecommendedServers,
  getCountryByCode,
} from "./api";
import { extractNordConfig, findNordAccountIds } from "./utils";
import { fetchServiceCredentials } from "./nordvpn";

const argv = yargs(hideBin(process.argv))
  .option("country", {
    alias: "c",
    type: "string",
    description:
      "Country code(s) of the countries to generate the config for, e.g., 'US,UK,JP'",
    coerce: (arg: string | string[]) => {
      // Custom parser for comma-separated values
      if (typeof arg === "string") {
        return arg.split(",").map((s) => s.trim());
      }
      return arg;
    },
  })
  .option("wireguard-privatekey", {
    alias: "pk",
    type: "string",
    description: "WireGuard private key",
  })
  .option("token", {
    alias: "t",
    type: "string",
    description:
      "NordVPN access token used to fetch the private key from the NordVPN API (defaults to $NORDVPN_TOKEN)",
  })
  .option("nordvpn-accountid", {
    alias: "id",
    type: "string",
    description:
      "NordVPN account ID used for the keychain lookup (auto-detected from keychain if omitted)",
  })
  .option("dns-server", {
    alias: "dns",
    type: "string",
    description: "DNS server",
    default: "103.86.96.100",
  })
  .option("amount", {
    alias: "a",
    type: "number",
    description: "Amount of configs to generate for the given country",
    default: 1,
  })
  .option("all-countries", {
    type: "boolean",
    description: "Generate configs for all available countries",
  })
  .option("outdir", {
    alias: "o",
    type: "string",
    description: "Output directory for generated configuration files",
    default: process.cwd(),
  })
  .help()
  .alias("help", "h")
  .parseSync();

const validateParameters = () => {
  if (!argv.country && !argv.allCountries) {
    console.error(
      "Error: Please provide a country code or use the --all-countries flag.",
    );
    process.exit(1);
  }
};

const resolveAccountId = async (): Promise<string> => {
  if (argv.nordvpnAccountid) {
    return argv.nordvpnAccountid;
  }

  console.log(
    "no --pk, --token or --id specified, searching keychain for NordVPN account",
  );
  let ids: string[];
  try {
    ids = await findNordAccountIds();
  } catch (err) {
    throw new Error(`Failed to search keychain: ${err}`);
  }

  if (ids.length === 0) {
    throw new Error(
      "No NordVPN configuration found in keychain. Provide --wireguard-privatekey, --token or --nordvpn-accountid.",
    );
  }
  if (ids.length > 1) {
    throw new Error(
      `Multiple NordVPN accounts found in keychain (${ids.join(", ")}). Pick one with --nordvpn-accountid.`,
    );
  }

  console.log("found NordVPN account", ids[0]);
  return ids[0];
};

const resolveNordConfig = async (): Promise<KeychainConfig> => {
  if (argv.wireguardPrivatekey) {
    return {
      private_key: argv.wireguardPrivatekey,
      dns_servers: [argv.dnsServer],
    } as KeychainConfig;
  }

  const token = argv.token || process.env.NORDVPN_TOKEN;
  if (token) {
    console.log("fetching private key from NordVPN API with access token");
    const credentials = await fetchServiceCredentials(token);
    return {
      private_key: credentials.nordlynx_private_key,
      dns_servers: [argv.dnsServer],
    } as KeychainConfig;
  }

  const accountId = await resolveAccountId();
  console.log("extracting private key from keychain for account", accountId);
  return extractNordConfig(accountId);
};

const main = async () => {
  validateParameters();
  const a = argv;

  let nordConfig: KeychainConfig;
  try {
    nordConfig = await resolveNordConfig();
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  if (a.allCountries) {
    const countries = await fetchNordCountries();
    for (const country of countries) {
      try {
        await generateConfigsForCountry(country, nordConfig, argv);
      } catch (err) {
        console.error(err);
      }
    }
  } else if (a.country && a.country.length) {
    for (const countryCode of a.country) {
      // Iterate over each country code
      try {
        const country = await getCountryByCode(countryCode);
        await generateConfigsForCountry(country, nordConfig, argv);
      } catch (err) {
        console.error(err);
      }
    }
  }
};

export const generateConfigsForCountry = async (
  country: Country,
  nordConfig: KeychainConfig,
  argv: any,
) => {
  console.log(`Generating ${argv.amount} configs for ${country.name}`);

  const recommendedServers = await fetchRecommendedServers(
    country.id.toString(),
    argv.amount,
  );

  recommendedServers.forEach((recommendedServer) => {
    try {
      const extractedWgConfig = extractWireguardConfig(recommendedServer);
      const wgConfigString = generateWireguardConfig(
        nordConfig.private_key,
        extractedWgConfig.publicKey,
        nordConfig.dns_servers[0],
        extractedWgConfig.endpoint + ":51820",
      );

      const outputDir = path.resolve(argv.outdir);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outPath = path.join(
        outputDir,
        `NordVPN ${recommendedServer.name}.conf`,
      );
      fs.writeFileSync(outPath, wgConfigString);

      console.log(`wrote config for ${country.name} at ${outPath}`);
    } catch (err) {
      console.log(err);
    }
  });
};

main().catch(console.error);
