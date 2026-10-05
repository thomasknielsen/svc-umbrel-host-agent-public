import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import process from "node:process";
import YAML from "yaml";

const appId = "svc-umbrel-host-agent";
const appDir = new URL(`../${appId}/`, import.meta.url);
const manifestText = readFileSync(new URL("umbrel-app.yml", appDir), "utf8");
const composeText = readFileSync(new URL("docker-compose.yml", appDir), "utf8");
const storeText = readFileSync(new URL("../umbrel-app-store.yml", import.meta.url), "utf8");

const manifest = YAML.parse(manifestText);
const compose = YAML.parse(composeText);
const store = YAML.parse(storeText);
const errors = [];

const requireValue = (condition, message) => {
  if (!condition) errors.push(message);
};

requireValue(store?.id === "svc", "store id must remain svc");
requireValue(manifest?.id === appId, `manifest id must remain ${appId}`);
requireValue(manifest?.id?.startsWith(`${store?.id}-`), "app id must use the community-store prefix");
requireValue(manifest?.manifestVersion === 1, "manifestVersion must remain 1");
requireValue(manifest?.version === "1.2.0", "app version must match the reviewed 1.2.0 package");
requireValue(manifest?.requiresHttps !== true, "requiresHttps is only for a browser UI that needs a secure context");
requireValue(manifest?.port === 29002, "manifest port must remain Umbrel's separate status port 29002");
requireValue(manifest?.path === "", "status page must launch at the app root");

const services = compose?.services ?? {};
requireValue(
  JSON.stringify(Object.keys(services).sort()) === JSON.stringify(["app_proxy", "portainer-agent", "status"]),
  "compose must contain only app_proxy, status, and portainer-agent",
);

const proxy = services.app_proxy ?? {};
requireValue(proxy.environment?.APP_HOST === "svc-umbrel-host-agent_status_1", "app_proxy must target the status container");
requireValue(String(proxy.environment?.APP_PORT) === "8080", "app_proxy must target status port 8080");
requireValue(!proxy.ports, "app_proxy must not publish its own ports");

const status = services.status ?? {};
const expectedStatusImage = "hashicorp/http-echo:1.0.0@sha256:fcb75f691c8b0414d670ae570240cbf95502cc18a9ba57e982ecac589760a186";
requireValue(status.image === expectedStatusImage, "status image tag/digest changed without updating the validation contract");
requireValue(!status.ports, "status page must be reached through Umbrel, not a raw port");
requireValue(status.privileged !== true, "status privileged mode is forbidden");

const agent = services["portainer-agent"] ?? {};
const expectedImage = "portainer/agent:2.45.1@sha256:38bc1dc7b8470eecbd979d444aa5d0a187dacf1245f2b54466f0f25f4c6d9a7c";
requireValue(agent.image === expectedImage, "Portainer Agent image tag/digest changed without updating the validation contract");
requireValue(agent.privileged !== true, "privileged mode is forbidden");
requireValue(agent.network_mode !== "host", "host networking is not justified");
requireValue(!agent.cap_add, "added Linux capabilities are not justified");
requireValue(!agent.devices, "host devices are not justified");

const expectedPorts = ["29001:9001/tcp"];
requireValue(JSON.stringify(agent.ports) === JSON.stringify(expectedPorts), "agent must publish only host TCP 29001 to Agent TCP 9001");

const expectedMounts = [
  "/var/run/docker.sock:/var/run/docker.sock",
  "/var/lib/docker/volumes:/var/lib/docker/volumes",
];
requireValue(JSON.stringify(agent.volumes) === JSON.stringify(expectedMounts), "agent mounts must match the reviewed socket and volume paths exactly");
requireValue(!composeText.includes("- /:/host"), "broad host root mount is forbidden");
requireValue(!composeText.includes(":latest"), "mutable latest image tags are forbidden");
requireValue(!/AGENT_SECRET\s*[:=]\s*\S+/.test(composeText), "AGENT_SECRET must not be committed");

if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exit(1);
}

console.log("PASS: YAML parses and the reviewed manifest, image, port, privilege, and mount contracts match");

try {
  execFileSync("docker", ["compose", "-f", new URL("docker-compose.yml", appDir).pathname, "config", "--quiet"], {
    stdio: "inherit",
  });
  console.log("PASS: docker compose config");
} catch (error) {
  if (error?.code === "ENOENT") {
    console.log("SKIP: docker compose config (docker CLI is not installed)");
  } else {
    console.error("ERROR: docker compose config failed");
    process.exit(1);
  }
}
