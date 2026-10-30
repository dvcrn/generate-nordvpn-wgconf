#!/usr/bin/env node

import fs from "fs";
import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { Country } from "./types";
import { extractWireguardConfig, generateWireguardConfig } from "./configUtils";
import {
  fetchNordCountries,
  fetchRecommendedServers,
  getCountryByCode,
} from "./api";
import {
  extractPrivateKey,
  findNordKeychainEntries,
  KeychainEntry,
} from "./utils";
import { fetchServiceCredentials } from "./nordvpn";

const argv = yargs(hideBin(process.argv))
  .scriptName("generate-nordvpn-wgconf")
  .usage("Usage: $0 --country <codes> [options]")
  .example(
    "$0 --outdir . --country TH,JP --amount 2",
    "Generate 2 configs each for Thailand and Japan",
  )
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
      "Account ID of the NordVPN keychain entry, only needed if the keychain has multiple NordVPN accounts",
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
  .check((args) => {
    if (!args.country && !args.allCountries) {
      throw new Error(
        "Please provide a country code or use the --all-countries flag.",
      );
    }
    return true;
  })
  .help()
  .alias("help", "h")
  .wrap(Math.min(120, yargs().terminalWidth()))
  .parseSync();

const resolveKeychainEntry = async (): Promise<KeychainEntry> => {
  const accountId = argv.nordvpnAccountid;
  if (!accountId) {
    console.log(
      "no --pk, --token or --id specified, searching keychain for NordVPN account",
    );
  }

  let entries: KeychainEntry[];
  try {
    entries = await findNordKeychainEntries();
  } catch (err) {
    throw new Error(`Failed to search keychain: ${err}`);
  }

  if (accountId) {
    entries = entries.filter((e) => e.id === accountId);
    if (entries.length === 0) {
      throw new Error(
        `No NordVPN configuration found in keychain for account ${accountId}.`,
      );
    }
  }

  if (entries.length === 0) {
    throw new Error(
      "No NordVPN configuration found in keychain. Provide --wireguard-privatekey, --token or --nordvpn-accountid.",
    );
  }

  const ids = [...new Set(entries.map((e) => e.id))];
  if (ids.length > 1) {
    throw new Error(
      `Multiple NordVPN accounts found in keychain (${ids.join(", ")}). Pick one with --nordvpn-accountid.`,
    );
  }

  return entries.find((e) => e.format === "nordlynx") || entries[0];
};

const resolvePrivateKey = async (): Promise<string> => {
  if (argv.wireguardPrivatekey) {
    return argv.wireguardPrivatekey;
  }

  const token = argv.token || process.env.NORDVPN_TOKEN;
  if (token) {
    console.log("fetching private key from NordVPN API with access token");
    const credentials = await fetchServiceCredentials(token);
    return credentials.nordlynx_private_key;
  }

  const entry = await resolveKeychainEntry();
  console.log("extracting private key from keychain for account", entry.id);
  return extractPrivateKey(entry);
};

const main = async () => {
  const a = argv;

  let privateKey: string;
  try {
    privateKey = await resolvePrivateKey();
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  if (a.allCountries) {
    const countries = await fetchNordCountries();
    for (const country of countries) {
      try {
        await generateConfigsForCountry(country, privateKey, argv);
      } catch (err) {
        console.error(err);
      }
    }
  } else if (a.country && a.country.length) {
    for (const countryCode of a.country) {
      // Iterate over each country code
      try {
        const country = await getCountryByCode(countryCode);
        await generateConfigsForCountry(country, privateKey, argv);
      } catch (err) {
        console.error(err);
      }
    }
  }
};

export const generateConfigsForCountry = async (
  country: Country,
  privateKey: string,
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
        privateKey,
        extractedWgConfig.publicKey,
        argv.dnsServer,
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
