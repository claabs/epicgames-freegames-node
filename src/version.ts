import { promises as fsPromises } from 'node:fs';

import axios from './axios-base.ts';
import { config } from './common/config/index.ts';
// eslint-disable-next-line import-x/no-rename-default
import L from './common/logger.ts';

interface CommitsResp {
  sha?: string;
}

const PROJECT_NAME = 'epicgames-freegames-node';
let { COMMIT_SHA, BRANCH } = process.env;
try {
  const rawSha = await fsPromises.readFile('./commit-sha.txt', { encoding: 'utf8' });
  COMMIT_SHA = rawSha.trim();
} catch {
  L.debug('Fallback to environment variable commit SHA');
}
try {
  const rawBranch = await fsPromises.readFile('./branch.txt', { encoding: 'utf8' });
  BRANCH = rawBranch.trim();
} catch {
  L.debug('Fallback to environment variable branch');
}

export async function checkForUpdate(): Promise<void> {
  L.info({ COMMIT_SHA, BRANCH }, `Started ${PROJECT_NAME}`);
  if (!(COMMIT_SHA && BRANCH) || config.skipVersionCheck) {
    L.debug(
      { COMMIT_SHA, BRANCH, skipVersionCheck: config.skipVersionCheck },
      'Skipping version check',
    );
    return;
  }
  L.debug({ PROJECT_NAME, BRANCH, COMMIT_SHA }, 'Performing version check');
  try {
    const resp = await axios.get<CommitsResp>(
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
  } catch (error) {
    L.warn('Version check API call failed');
    L.debug(error);
  }
}

export const getCommitSha = (): string | undefined => {
  return COMMIT_SHA;
};

export function logVersionOnError(): void {
  if (COMMIT_SHA || BRANCH) {
    L.warn({ COMMIT_SHA, BRANCH }, 'Current version');
  }
}
