# Umbrel Host Management Agent

`svc-umbrel-host-agent` is an Umbrel Community App Store containing one generic
host-management integration for an Umbrel Home.
Umbrel owns the app lifecycle; Portainer Agent is only the v1 backend.

```text
Portainer Server
  -> HTTPS agent protocol on <umbrel-lan-address>:29001
  -> Umbrel-managed app: svc-umbrel-host-agent
  -> Portainer Agent 2.45.1
  -> Umbrel host Docker socket

Umbrel's own app-launch page is separate, on port 29002. It only shows status
and is not the Portainer protocol.
```

## Scope and ownership

- Umbrel-owned apps remain **observe-only** from Portainer. Do not redeploy,
  remove, rename, reconfigure, update, or adopt them in Portainer.
- Only workloads explicitly declared homelab-owned may be managed externally.
- This repository changes no umbrelOS packages, services, or appliance-managed
  files. Reinstalling the Umbrel app is the recovery path.
- The repository and app identity stay generic so the backend can be replaced
  without redesigning the integration.

## Important security boundary

The app mounts `/var/run/docker.sock`. Access to that socket is effectively
root-equivalent control of the Umbrel host: the agent can create privileged
containers and mount arbitrary host paths. The additional Docker volumes mount
also exposes all Docker-managed named-volume data read/write.

The package therefore:

- is a self-hosted community app, not a candidate for the official Umbrel App Store;
- publishes TCP port `29001` on the Umbrel host so the management plane can reach it;
- must never be port-forwarded or exposed to the public Internet;
- uses no `privileged: true`, added capabilities, host namespaces, or `/` mount;
- contains no credentials or mutable runtime data.

Portainer's standard agent protocol uses HTTPS and a claim handshake. A claimed
agent accepts only the Portainer instance that claimed it. `AGENT_SECRET` is not
set in v1 because it must match the Portainer Server setting and is a coordinated
secret change across that server and its agents. If that hardening is adopted,
provide it through runtime secret management on both sides; never commit it.

See [Security and ownership](docs/security.md) for the complete boundary.

## Version policy

v1 pins the official multi-platform image exactly:

```text
portainer/agent:2.45.1@sha256:38bc1dc7b8470eecbd979d444aa5d0a187dacf1245f2b54466f0f25f4c6d9a7c
```

This matches the currently targeted Portainer Server version (`2.45.1`). Update
the server and agent deliberately and compatibly; never change the tag without
also resolving and reviewing the new multi-platform digest.

## Pre-install gate

The committed mounts describe the contract observed in official Portainer and
umbrelOS sources, but they must be confirmed on the live Umbrel before install:

```sh
test -S /var/run/docker.sock
sudo docker info --format 'DockerRootDir={{.DockerRootDir}} Architecture={{.Architecture}}'
sudo test -d /var/lib/docker/volumes
sudo ss -lnt sport = :29001
sudo ss -lnt sport = :29002
```

Expected results are a socket at `/var/run/docker.sock`, Docker root
`/var/lib/docker`, an existing `/var/lib/docker/volumes` directory, architecture
`x86_64` or `aarch64`, and no listeners on TCP ports 29001 or 29002. Check the
volume directory with sudo: it is not traversable by the normal SSH user, so an
unprivileged `test -d` is a false failure. If any path differs, stop and update
the compose bind source only after reviewing the live host. Do not create paths
or edit the host to make this package fit.

## Install

1. Run the pre-install gate above over the approved read-only administrative
   SSH path.
2. In Umbrel, open **App Store -> Community App Stores** and add:
   `https://github.com/thomasknielsen/svc-umbrel-host-agent-public`.
3. Install **Umbrel Host Management Agent** from the community store.
4. Open the Umbrel app page and confirm it states that the management
   endpoint is the Umbrel host's LAN address on TCP port `29001`.
5. Promptly, in Portainer open the existing `umbrel` environment or
   add a Docker Standalone **Agent** environment with address
   `<umbrel-lan-address>:29001` (no URL scheme).
6. Confirm Portainer reports the endpoint up and that the agent image, mounts,
   and published address match the committed definition.
7. Confirm Umbrel-owned containers are visible, then perform only read-only
   inspection of those workloads.

Connect or reopen the environment promptly after an install or recreation. If
an unclaimed agent stops accepting connections, restart the app in Umbrel and
connect again.

## Recovery and lifecycle validation

No application state is intentionally persisted on the Umbrel side. Portainer
Server owns the endpoint record. Recovery is therefore stop/start or reinstall
of this app from its Git-owned definition, followed by reconnect verification.

Follow [Installation, recovery, and upgrade validation](docs/validation.md) for
fresh install, recreation, reboot, and umbrelOS upgrade checks. Record evidence
there without tokens, cookies, credentials, or private keys.

## Local validation

```sh
npm ci
npm test
```

If Docker Compose is installed, `npm test` also runs `docker compose config`.
Static validation is not runtime Umbrel proof; the validation document keeps
those results separate.

## Repository layout

```text
umbrel-app-store.yml
svc-umbrel-host-agent/
  umbrel-app.yml
  docker-compose.yml
docs/
  security.md
  validation.md
scripts/
  validate.mjs
```
