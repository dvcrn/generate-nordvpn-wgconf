import { execFile } from "child_process";
import { KeychainConfig } from "./types";
import keychain from "keychain";

export type KeychainEntry = {
  id: string;
  service: string;
  account: string;
  format: "nordlynx" | "legacy";
};

const NORDLYNX_SERVICE = "com.nordvpn.macos";
const NORDLYNX_PREFIX = "Password:nordlynxLogin:";
const LEGACY_SERVICE = "com.nordvpn.NordVPN";
const LEGACY_SUFFIX = ": Configuration";

const toEntry = (service: string, account: string): KeychainEntry | null => {
  if (service === NORDLYNX_SERVICE && account.startsWith(NORDLYNX_PREFIX)) {
    return {
      id: account.slice(NORDLYNX_PREFIX.length),
      service,
      account,
      format: "nordlynx",
    };
  }
  if (service === LEGACY_SERVICE && account.endsWith(LEGACY_SUFFIX)) {
    return {
      id: account.slice(0, -LEGACY_SUFFIX.length),
      service,
      account,
      format: "legacy",
    };
  }
  return null;
};

export const findNordKeychainEntries = (): Promise<KeychainEntry[]> => {
  return new Promise((resolve, reject) => {
    execFile(
      "security",
      ["dump-keychain"],
      { maxBuffer: 64 * 1024 * 1024 },
      (err, stdout) => {
        if (err) {
          reject(err);
          return;
        }

        const entries: KeychainEntry[] = [];
        for (const item of stdout.split(/^keychain: /m)) {
          const service = item.match(/"svce"<blob>="([^"]*)"/)?.[1];
          const account = item.match(/"acct"<blob>="([^"]*)"/)?.[1];
          const entry = service && account ? toEntry(service, account) : null;
          if (entry) {
            entries.push(entry);
          }
        }
        resolve(entries);
      },
    );
  });
};

export const extractPrivateKey = (entry: KeychainEntry): Promise<string> => {
  return new Promise((resolve, reject) => {
    keychain.getPassword(
      { account: entry.account, service: entry.service },
      (err, pass) => {
        if (err) {
          reject(err);
          return;
        }

        if (entry.format === "nordlynx") {
          resolve(pass.trim());
          return;
        }

        try {
          resolve((JSON.parse(pass) as KeychainConfig).private_key);
        } catch (parseErr) {
          reject(parseErr);
        }
      },
    );
  });
};
