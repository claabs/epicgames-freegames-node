declare const hcaptcha: {
  render: (container: string, params: Record<string, any>) => string;
  reset: (widgetID?: string) => void;
  getResponse: (widgetID?: string) => string;
  getRespKey: (widgetID?: string) => string;
  execute: (widgetID?: string) => void;
};

interface Navigator {
  deviceMemory: number | undefined;
}

interface Document {
  referer: undefined;
}

interface Performance {
  memory: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
}

interface Window {
  _cf: any;
}

declare function hCaptchaLoaded(): void;
declare function setupArkoseEnforcement(enforcement: any): void;
