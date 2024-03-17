#!/usr/bin/env ts-node-script

import fs from "fs";
import path from "path";
import yargs from "yargs";
import {hideBin} from "yargs/helpers";

import {Country, KeychainConfig} from "./types";
import {extractWireguardConfig, generateWireguardConfig} from "./configUtils";
import {fetchNordCountries, fetchRecommendedServers, getCountryByCode,} from "./api";
import {extractNordConfig} from "./utils";

const argv = yargs(hideBin(process.argv))
  .option("country", {
    alias: "c",
    type: "string",
    description:
      "Country code(s) of the countries to generate the config for, e.g., 'US,UK,JP'",
    coerce: (arg: string | string[]) => { // Custom parser for comma-separated values
      if (typeof arg === 'string') {
        return arg.split(',').map(s => s.trim());
      }
      return arg;
    },
  })
  .option("wireguard-privatekey", {
    alias: "pk",
    type: "string",
    description: "WireGuard private key",
  })
  .option("nordvpn-accountid", {
    alias: "id",
    type: "string",
    description: "NordVPN account ID (required if private key is not provided)",
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
  if (!argv.wireguardPrivatekey && !argv.nordvpnAccountid) {
    console.error(
      "Error: A WireGuard private key or a NordVPN account ID is required."
    );
    process.exit(1);
  }

  if (!argv.country && !argv.allCountries) {
    console.error(
      "Error: Please provide a country code or use the --all-countries flag."
    );
    process.exit(1);
  }
};

const main = async () => {
  validateParameters();
  const a = argv;

  if (a.allCountries) {
    const countries = await fetchNordCountries();
    for (const country of countries) {
      try {
        await generateConfigsForCountry(country, argv);
      } catch (err) {
        console.error(err);
      }
    }
  }  else if (a.country && a.country.length) {
    for (const countryCode of a.country) { // Iterate over each country code
      try {
        const country = await getCountryByCode(countryCode);
        await generateConfigsForCountry(country, argv);
      } catch (err) {
        console.error(err);
      }
    }
  }
};

export const generateConfigsForCountry = async (
  country: Country,
  argv: any
) => {
  console.log(`Generating ${argv.amount} configs for ${country.name}`);

  let nordConfig: KeychainConfig;

  if (argv["wireguard-privatekey"]) {
    nordConfig = {
      private_key: argv["wireguard-privatekey"],
      dns_servers: [argv["dns-server"]],
    } as KeychainConfig;
  } else if (argv["nordvpn-accountid"]) {
    console.log(
      "no --pk specified, trying to extract from keychain with id ",
      argv["nordvpn-accountid"]
    );
    nordConfig = await extractNordConfig(argv["nordvpn-accountid"]);
  } else {
    console.log(
      "Please provide either a WireGuard private key or a NordVPN account ID."
    );
    return;
  }

  const recommendedServers = await fetchRecommendedServers(
    country.id.toString(),
    argv.amount
  );

  recommendedServers.forEach((recommendedServer) => {
    try {
      const extractedWgConfig = extractWireguardConfig(recommendedServer);
      const wgConfigString = generateWireguardConfig(
        nordConfig.private_key,
        extractedWgConfig.publicKey,
        nordConfig.dns_servers[0],
        extractedWgConfig.endpoint + ":51820"
      );

      const outputDir = path.resolve(argv.outdir);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, {recursive: true});
      }

      const outPath = path.join(
        outputDir,
        `NordVPN ${recommendedServer.name}.conf`
      );
      fs.writeFileSync(outPath, wgConfigString);

      console.log(`wrote config for ${country.name} at ${outPath}`);
    } catch (err) {
      console.log(err);
    }
  });
};

main().catch(console.error);
