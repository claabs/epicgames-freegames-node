import http from "http";

export function getGCPExternalIP() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "metadata.google.internal",
      path: "/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip",
      headers: {
        "Metadata-Flavor": "Google",
      },
    };

    http.get(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data.trim()));
    }).on("error", reject);
  });
}


