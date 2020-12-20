/* eslint-disable @typescript-eslint/no-non-null-assertion */
import axios from 'axios';
// eslint-disable-next-line import/no-unresolved
import { getInitData } from './talon-harness';

const params = new URLSearchParams(document.location.search);
const id = params.get('id');
console.info('id:', id);

const apiRoot = `${window.location.origin}`;

async function sendInit(initData: Record<string, any>): Promise<void> {
  const postPath = `${apiRoot}/init`;
  await axios.post(postPath, { initData, id });
}

window.onload = async (): Promise<void> => {
  console.log('page loaded');
  const initData = getInitData();
  await sendInit(initData);
};
