// Needed due to https://github.com/alkemics/CancelablePromise/issues/940
declare module 'cancelable-promise/esm/CancelablePromise.mjs' {
  import type * as CancelablePromise from 'cancelable-promise';

  export = CancelablePromise;
}
