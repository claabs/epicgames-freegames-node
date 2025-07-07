import axios from 'axios';
import { promises as fsPromises } from 'node:fs';
import { config } from './common/config/index.js';
// eslint-disable-next-line import-x/no-rename-default
import L from './common/logger.js';

const PROJECT_NAME = 'epicgames-freegames-node';
const { DISTRO } = process.env;
let { COMMIT_SHA, BRANCH } = process.env;
try {
  COMMIT_SHA = (await fsPromises.readFile('./commit-sha.txt', { encoding: 'utf-8' })).trim();
} catch {
  L.debug('Fallback to environment variable commit SHA');
}
try {
  BRANCH = (await fsPromises.readFile('./branch.txt', { encoding: 'utf-8' })).trim();
} catch {
  L.debug('Fallback to environment variable branch');
}

export async function checkForUpdate(): Promise<void> {
  L.info({ COMMIT_SHA, BRANCH, DISTRO }, `Started ${PROJECT_NAME}`);
  if (!(COMMIT_SHA && BRANCH) || config.skipVersionCheck) {
    L.debug(
      { COMMIT_SHA, BRANCH, skipVersionCheck: config.skipVersionCheck },
      'Skipping version check',
    );
    return;
  }
  L.debug({ PROJECT_NAME, BRANCH, COMMIT_SHA }, 'Performing version check');
  try {
    const resp = await axios.get(
      `https://api.github.com/repos/claabs/${PROJECT_NAME}/commits/${BRANCH}`,
      {
        responseType: 'json',
      },
    );
    const latestSha = resp.data.sha;
    L.trace({ latestSha }, 'Response from GitHub API');
    if (COMMIT_SHA !== latestSha) {
      L.warn(
        `A newer version of ${PROJECT_NAME} is available! \`docker pull\` this image to update.`,
      );
    }
  } catch (err) {
    L.warn('Version check API call failed');
    L.debug(err);
  }
}

export const getCommitSha = (): string | undefined => {
  return COMMIT_SHA;
};

export function logVersionOnError(): void {
  if (COMMIT_SHA || BRANCH || DISTRO) {
    L.warn({ COMMIT_SHA, BRANCH, DISTRO }, 'Current version');
  }
}
