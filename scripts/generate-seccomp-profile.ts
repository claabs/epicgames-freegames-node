import { writeJSON } from 'fs-extra/esm';

export interface SecCompProfile {
  defaultAction: Action;
  defaultErrnoRet: number;
  archMap: ArchMap[];
  syscalls: Syscall[];
}

export interface ArchMap {
  architecture: string;
  subArchitectures: string[] | null;
}

export type Action = 'SCMP_ACT_ALLOW' | 'SCMP_ACT_ERRNO';

export interface Syscall {
  comment?: string;
  names: string[];
  action: Action;
  args?: Arg[];
  includes?: Includes;
  excludes?: Excludes;
  errnoRet?: number;
}

export interface Arg {
  index: number;
  value: number;
  op: Op;
}

export type Op = 'SCMP_CMP_EQ' | 'SCMP_CMP_LT' | 'SCMP_CMP_MASKED_EQ';

export interface Excludes {
  caps?: string[];
  arches?: string[];
}

export interface Includes {
  minKernel?: string;
  arches?: string[];
  caps?: string[];
}

/**
 * https://playwright.dev/docs/docker#crawling-and-scraping
 */
const namespaces: Syscall = {
  comment: 'Allow create user namespaces',
  names: ['clone', 'setns', 'unshare'],
  action: 'SCMP_ACT_ALLOW',
  args: [],
  includes: {},
  excludes: {},
};

/**
 * https://github.com/microsoft/playwright/issues/30738#issuecomment-2108946980
 */
const memoryProtection: Syscall = {
  comment:
    'Allow pkey_mprotect for memory protection key operations. This is required for versions of chromium targeted with playwright from v.1.39.0',
  names: ['pkey_mprotect'],
  action: 'SCMP_ACT_ALLOW',
  args: [],
  includes: {},
  excludes: {},
};

const defaultResp = await fetch(
  'https://raw.githubusercontent.com/moby/profiles/refs/heads/main/seccomp/default.json',
);

const defaultSecCompProfile = (await defaultResp.json()) as SecCompProfile;

defaultSecCompProfile.syscalls.unshift(namespaces, memoryProtection);

await writeJSON('examples/seccomp_profile.json', defaultSecCompProfile, { spaces: 2 });
