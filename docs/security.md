# Security and ownership

## Trust boundary

This app intentionally crosses Umbrel's normal app isolation boundary. It is
private infrastructure and is not suitable for the public Umbrel App Store.
Current official Umbrel packaging guidance forbids public-store apps from
mounting the host Docker socket because the socket grants device-wide control.

| Exposure | Why it exists | Consequence |
| --- | --- | --- |
| `/var/run/docker.sock` read/write | Portainer Agent controls the real Umbrel Docker daemon | Effective root-equivalent host control, including control of every container and the ability to mount host paths |
| `/var/lib/docker/volumes` read/write | Portainer's standard Linux Agent deployment needs the Docker volume path for named-volume operations | Read/write access to data in every Docker-managed named volume |
| Host TCP `29001` -> container `9001/tcp` | Portainer Server connects to the standard Agent without using Umbrel's app-launch port | A privileged management endpoint is reachable on every host interface unless an external firewall restricts it |
| Umbrel app port `29002` | umbrelOS opens a plain status page; it does not proxy the Agent protocol | No management capability is exposed through the Umbrel UI |

No other host mount, capability, device, namespace, or privileged mode is
granted. A read-only socket bind would not make the Docker API read-only, so the
compose file does not use a misleading `:ro` suffix.

## Network and authentication

- The generic package publishes TCP port `29001` on the Umbrel host. Docker
  therefore listens on every host interface unless the host firewall narrows it.
- The network boundary must restrict access to trusted management networks and
  prevent Internet ingress or router port-forwarding.
- Portainer Server connects to `<umbrel-lan-address>:29001` using its HTTPS Agent
  protocol; the environment address must not include a URL scheme.
- On first connection, the standard agent and Portainer Server exchange keys.
  Portainer documents that a claimed agent rejects other Portainer instances.
- An unclaimed Agent may stop accepting connections; claim it promptly or
  restart it from Umbrel.
- `AGENT_SECRET` is optional and must be identical on Server and Agent. Adding
  it is a separate coordinated secret rollout because setting it only here, or
  committing it, would either break connectivity or disclose the secret.

The standard agent is a legacy Portainer connection type and does not provide
Edge Agent features. It remains v1 because the existing environment already
uses the standard endpoint model and direct trusted-LAN reachability exists.

## Lifecycle ownership

Docker API access makes policy technically unenforceable at the socket layer.
The operating boundary is mandatory:

### Umbrel-owned workloads

Observe only from Portainer. Do not use Portainer to:

- start, stop, restart, update, recreate, rename, remove, or redeploy;
- edit environment variables, mounts, networks, ports, labels, or restart policy;
- adopt a container into a Portainer stack;
- delete or modify an Umbrel-managed network, image, or volume.

Use the Umbrel UI or supported Umbrel lifecycle API for these workloads.

### Homelab-owned workloads

Portainer may manage a workload only when its source of truth and ownership are
explicitly homelab-owned and Umbrel does not also own its lifecycle definition.
Never let Umbrel and Portainer both treat the same workload as declarative state.

## Incident response

If the endpoint is unexpectedly exposed, claimed by the wrong server, or shows
unexplained mutations:

1. Stop this app from Umbrel.
2. Remove network exposure or port forwarding outside Umbrel.
3. Review Portainer audit/activity data and Umbrel Docker events/logs.
4. Rotate a configured `AGENT_SECRET` on both sides if one exists.
5. Reinstall the app from a reviewed Git revision and reconnect deliberately.

Do not repair the integration by installing host packages, adding systemd units,
or copying service files into the umbrelOS appliance filesystem.
