import { execFile } from "child_process";
import { KeychainConfig } from "./types";
import keychain from "keychain";

const NORD_SERVICE = "com.nordvpn.NordVPN";
const CONFIG_SUFFIX = ": Configuration";

export const findNordAccountIds = (): Promise<string[]> => {
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

        const ids = new Set<string>();
        for (const item of stdout.split(/^keychain: /m)) {
          const service = item.match(/"svce"<blob>="([^"]*)"/)?.[1];
          const account = item.match(/"acct"<blob>="([^"]*)"/)?.[1];
          if (service === NORD_SERVICE && account?.endsWith(CONFIG_SUFFIX)) {
            ids.add(account.slice(0, -CONFIG_SUFFIX.length));
          }
        }
        resolve([...ids]);
      },
    );
  });
};

export const extractNordConfig = (
  accountId: string
): Promise<KeychainConfig> => {
  return new Promise((resolve, reject) => {
    keychain.getPassword(
      {
        account: `${accountId}${CONFIG_SUFFIX}`,
        service: NORD_SERVICE,
      },
      (err, pass) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          resolve(JSON.parse(pass));
        } catch (parseErr) {
          reject(parseErr);
        }
      }
    );
  });
};
