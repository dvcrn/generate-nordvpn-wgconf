import { KeychainConfig } from "./types";
import keychain from "keychain";

export const extractNordConfig = (
  accountId: string
): Promise<KeychainConfig> => {
  return new Promise((resolve, reject) => {
    keychain.getPassword(
      {
        account: `${accountId}: Configuration`,
        service: "com.nordvpn.NordVPN",
      },
      (err, pass) => {
        if (err) {
          console.log(err);
          reject(err);
        }

        const parsedPass = JSON.parse(pass);
        resolve(parsedPass);
      }
    );
  });
};
