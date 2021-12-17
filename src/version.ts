import got from 'got';
import { config } from './common/config';
import L from './common/logger';

const PROJECT_NAME = 'epicgames-freegames-node';
const { COMMIT_SHA, BRANCH } = process.env;

export async function checkForUpdate(): Promise<void> {
  if (!(COMMIT_SHA && BRANCH) || config.skipVersionCheck) {
    L.debug(
      { COMMIT_SHA, BRANCH, skipVersionCheck: config.skipVersionCheck },
      'Skipping version check'
    );
    return;
  }
  L.debug({ PROJECT_NAME, BRANCH, COMMIT_SHA }, 'Performing version check');
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resp = await got.get<any>(
      `https://api.github.com/repos/claabs/${PROJECT_NAME}/commits/${BRANCH}`,
      {
        responseType: 'json',
      }
    );
    const latestSha = resp.body.sha;
    L.trace({ latestSha }, 'Response from GitHub API');
    if (COMMIT_SHA !== latestSha) {
      L.warn(
        `A newer version of ${PROJECT_NAME} is available! \`docker pull\` this image to update.`
      );
    }
  } catch (err) {
    L.warn('Version check API call failed');
    L.debug(err);
  }
}

export function logVersionOnError(): void {
  if (COMMIT_SHA || BRANCH) {
    L.warn({ COMMIT_SHA, BRANCH }, 'Current version');
  }
}
