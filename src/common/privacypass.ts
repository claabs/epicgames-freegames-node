import { PrivacyPassToken } from 'privacy-pass-redeemer';
import fs from 'fs-extra';
import path from 'path';
import { CONFIG_DIR } from './config';
import L from './logger';

export const getHcaptchaPrivacyPassToken = (): PrivacyPassToken | undefined => {
  const passFilename = path.join(CONFIG_DIR, `hcaptcha-tokens.json`);
  const fileExists = fs.existsSync(passFilename);
  if (!fileExists) {
    L.warn(
      'No hCaptcha privacy pass tokens available. Follow the documentation to add tokens to hcaptcha-tokens.json'
    );
    return undefined;
  }
  try {
    const passData = fs.readFileSync(passFilename, 'utf8');
    const stringTokens: string[] = JSON.parse(passData);
    const oneToken = stringTokens.shift();
    if (!oneToken) {
      throw new Error(
        'No hCaptcha privacy pass tokens left to use. Add more tokens to hcaptcha-tokens.json'
      );
    }
    const parsedToken: PrivacyPassToken = JSON.parse(oneToken);
    fs.writeFileSync(passFilename, JSON.stringify(stringTokens, null, 2), 'utf-8');
    return parsedToken;
  } catch (err) {
    L.warn(err);
  }
  return undefined;
};
