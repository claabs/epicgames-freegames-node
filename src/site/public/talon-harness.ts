/* eslint-disable import/prefer-default-export */
/* eslint-disable no-bitwise */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-void */
/* eslint-disable no-cond-assign */
/* eslint-disable @typescript-eslint/camelcase */

import md5 from 'md5';
import tlsh from 'tlsh';

// ==================================
// EPIC GAMES talon_harness.js CODE
// ==================================

const HASHKEY_STRING = 'B8lpKXL3eSq3FXr4Di4V7RJNaA3vtPIu9yl8w8DU';

const createXal = (fingerprintData: Record<string, any>): string => {
  const hashkey = atob(HASHKEY_STRING);
  const fingerprintString = JSON.stringify(fingerprintData);
  let ret = '';
  let i = 0;
  for (; i < fingerprintString.length; i += 1) {
    const offset = fingerprintString.charCodeAt(i) ^ hashkey.charCodeAt(i % hashkey.length);
    ret += '0'.concat((255 & offset).toString(16)).slice(-2);
  }
  return ret;
};

const getIsoString = () => {
  return new Date().toISOString();
};

const generateRandomHash = () => {
  // eslint-disable-next-line no-restricted-properties
  return Math.floor(Math.pow(10, 16) * Math.random()).toString(16);
};

const getDocumentHeadData = () => {
  return {
    title: document.title,
    referer: document.referer, // lmao typo???
  };
};

const objectToArray = (type: Record<string, any>) => {
  const result = [];
  let t;
  // eslint-disable-next-line no-restricted-syntax, guard-for-in
  for (t in type) {
    result.push(t);
  }
  return result;
};

const getBrowserFingerprint = () => {
  return {
    user_agent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    languages: navigator.languages,
    hardware_concurrency: navigator.hardwareConcurrency,
    device_memory: navigator.deviceMemory,
    product: navigator.product,
    product_sub: navigator.productSub,
    vendor: navigator.vendor,
    vendor_sub: navigator.vendorSub,
    webdriver: navigator.webdriver,
    max_touch_points: navigator.maxTouchPoints,
    cookie_enabled: navigator.cookieEnabled,
    property_list: objectToArray(navigator),
  };
};

const draw = () => {
  const canvasDrawBG = document.createElement("canvas");
  canvasDrawBG.width = 600;
  canvasDrawBG.height = 50;
  const ctx = canvasDrawBG.getContext("2d") as CanvasRenderingContext2D;
  const mass = "\ud83d\udc7e https://www.epicgames.com/site/en-US/careers \ud83d\udd12 https://hackerone.com/epicgames \ud83d\udd79\ufe0f";
  ctx.font = "14px 'Arial'";
  ctx.fillStyle = "#333";
  ctx.fillRect(30, 0, 183, 90);
  ctx.fillStyle = "#4287f5";
  ctx.fillRect(450, 1, 200, 90);
  const gradient = ctx.createLinearGradient(250, 0, 600, 50);
  gradient.addColorStop(0, "black");
  gradient.addColorStop(.5, "cyan");
  gradient.addColorStop(1, "yellow");
  ctx.fillStyle = gradient;
  ctx.fillRect(300, 7, 200, 100);
  ctx.fillStyle = "#42f584";
  ctx.fillText(mass, 0, 15);
  ctx.strokeStyle = "rgba(255, 0, 50, 0.7)";
  ctx.strokeText(mass, 20, 20);
  ctx.fillStyle = "rgba(245, 66, 66, 0.5)";
  ctx.fillRect(100, 10, 50, 50);
  const word = canvasDrawBG.toDataURL();
  const $scope = ctx.getImageData(0, 0, 600, 50);
  const b: Record<string, any> = {};
  let i = 0;
  for (; i < $scope.data.length; i = i + 4) {
    const $orderCol = $scope.data[i].toString(16) + $scope.data[i + 1].toString(16) + $scope.data[i + 2].toString(16) + $scope.data[i + 3].toString(16);
    if (b[$orderCol]) {
      b[$orderCol]++;
    } else {

      b[$orderCol] = 1;
    }
  }
  let tic;
  for (tic in $scope.data) {
    var $orderCol = $scope.data[tic];
    if (b[$orderCol]) {
      b[$orderCol]++;
    } else {

      b[$orderCol] = 1;
    }
  }
  return {
    length: word.length,
    num_colors: Object.keys(b).length,
    md5: md5(word),
    tlsh: tlsh(word)
  };
};

const getWebGLFingerprint = () => {
  const canvas = document.createElement('canvas');
  const gl =
    canvas.getContext('webgl2') ||
    canvas.getContext('webgl') ||
    canvas.getContext('experimental-webgl2') ||
    canvas.getContext('experimental-webgl');
  if (!gl) {
    return;
  }
  const extensionDebugRendererInfo = (gl as WebGLRenderingContext).getExtension(
    'WEBGL_debug_renderer_info'
  );
  // eslint-disable-next-line consistent-return
  return {
    canvas_fingerprint: draw(),
    parameters: {
      renderer:
        extensionDebugRendererInfo &&
        (gl as WebGLRenderingContext).getParameter(
          extensionDebugRendererInfo.UNMASKED_RENDERER_WEBGL
        ),
      vendor:
        extensionDebugRendererInfo &&
        (gl as WebGLRenderingContext).getParameter(
          extensionDebugRendererInfo.UNMASKED_VENDOR_WEBGL
        ),
    },
  };
};

const getWindowLocation = () => {
  return {
    origin: window.location.origin,
    pathname: window.location.pathname,
  };
};

const getWindowHistory = () => {
  return {
    length: window.history.length,
  };
};

const getScreenFingerprint = () => {
  return {
    avail_height: window.screen.availHeight,
    avail_width: window.screen.availWidth,
    height: window.screen.height,
    width: window.screen.width,
    color_depth: window.screen.colorDepth,
  };
};

const getMemoryFingerprint = () => {
  let pm;
  let mem;
  let memory;
  // eslint-disable-next-line no-return-assign
  return {
    memory: {
      js_heap_size_limit:
        (pm = window.performance.memory) === null || void 0 === pm ? void 0 : pm.jsHeapSizeLimit,
      total_js_heap_size:
        (mem = window.performance.memory) === null || void 0 === mem ? void 0 : mem.totalJSHeapSize,
      used_js_heap_size:
        (memory = window.performance.memory) === null || void 0 === memory
          ? void 0
          : memory.usedJSHeapSize,
    },
  };
};

export const getInitData = () => {
  return {
    v: 1,
    xal: createXal({
      timestamp: getIsoString(),
      math_rand: generateRandomHash(),
      document: getDocumentHeadData(),
      navigator: getBrowserFingerprint(),
      web_gl: getWebGLFingerprint(),
      window: {
        location: getWindowLocation(),
        history: getWindowHistory(),
        screen: getScreenFingerprint(),
        performance: getMemoryFingerprint(),
        device_pixel_ratio: window.devicePixelRatio,
      },
    }),
    ewa: 'b',
    kid: 'sk29dsv',
  };
};

// function parse(o: any, stack?: boolean) {
//   const r = Object.keys(o);
//   if (Object.getOwnPropertySymbols) {
//     let neighbors = Object.getOwnPropertySymbols(o);
//     if (stack) {
//       neighbors = neighbors.filter(key => {
//         // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//         return Object.getOwnPropertyDescriptor(o, key)!.enumerable;
//       });
//     }
//     // eslint-disable-next-line prefer-spread
//     r.push.apply(r, (neighbors as unknown) as string[]);
//   }
//   return r;
// }

// function filter() {
//   return (obj: Record<string, any>, key: string, value: any) => {
//     // eslint-disable-next-line no-return-assign
//     return (
//       key in obj
//         ? Object.defineProperty(obj, key, {
//             value,
//             enumerable: true,
//             configurable: true,
//             writable: true,
//           })
//         : // eslint-disable-next-line no-param-reassign
//           (obj[key] = value),
//       obj
//     );
//   };
// }

// export function extend(obj: Record<string, any>) {
//   let i = 1;
//   for (; i < arguments.length; i += 1) {
//     // eslint-disable-next-line prefer-rest-params
//     const properties = arguments[i] != null ? arguments[i] : {};
//     if (i % 2) {
//       parse(Object(properties), true).forEach(tempLocation => {
//         filter()(obj, tempLocation, properties[tempLocation]);
//       });
//     } else if (Object.getOwnPropertyDescriptors) {
//       Object.defineProperties(obj, Object.getOwnPropertyDescriptors(properties));
//     } else {
//       parse(Object(properties)).forEach(prop => {
//         // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//         Object.defineProperty(obj, prop, Object.getOwnPropertyDescriptor(properties, prop)!);
//       });
//     }
//   }
//   return obj;
// }
