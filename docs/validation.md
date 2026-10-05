# Installation, recovery, and upgrade validation

Keep static, live-host, and lifecycle evidence separate. Never record secrets,
tokens, cookies, private keys, full environment dumps, or private container
configuration in this file.

## Current evidence

| Check | Status | Evidence |
| --- | --- | --- |
| Public repository identity | verified | `thomasknielsen/svc-umbrel-host-agent-public`, default branch `master` |
| Portainer Server version | verified | upgraded from `2.39.0` to `2.45.1`; `/api/system/status` and authenticated `/api/users/me` returned HTTP 200 |
| Umbrel LAN reachability | verified privately | Live host and address details are intentionally not published |
| Selected host endpoint | verified live | Portainer endpoint proxy returned Docker `/info` HTTP 200 after the Agent upgrade |
| Agent image index | verified | Docker Registry v2 resolved `portainer/agent:2.45.1` to the committed digest with `linux/amd64` and `linux/arm64` images |
| Live Docker socket/root path | verified privately | Required socket and Docker volume paths were confirmed without publishing host details |
| Live direct Compose deployment | verified privately | Agent backend was recreated on `2.45.1`; private runtime details are retained outside this public package |
| Fresh install | pending | No Umbrel mutation was authorized during repository bootstrap |
| Stop/start and reinstall | pending | Run after reviewed deployment |
| Umbrel reboot | pending | Run after reviewed deployment |
| umbrelOS upgrade survival | pending | Run at the next suitable upgrade window |

## 1. Read-only pre-install validation

Run on Umbrel using the approved `homelab-agent-admin` SSH identity:

```sh
set -eu
sudo test -S /var/run/docker.sock
sudo docker version
sudo docker info --format 'DockerRootDir={{.DockerRootDir}} Architecture={{.Architecture}}'
sudo test -d /var/lib/docker/volumes
sudo ss -lnt sport = :29001
sudo ss -lnt sport = :29002
```

Pass criteria:

- the Docker socket exists at the committed source path;
- Docker root is exactly `/var/lib/docker`;
- architecture is `x86_64` or `aarch64`;
- `/var/lib/docker/volumes` exists when tested as root;
- TCP 29001 and 29002 have no current listeners;
- no host file or setting needs to be created or changed.

If a path differs, update and review the app definition. Do not symlink, copy,
install, or patch the host to satisfy it.

## 2. Fresh install

1. Add this repository as a Community App Store in the Umbrel UI.
2. Confirm the manifest renders with app ID `svc-umbrel-host-agent`, version
   `1.2.0`, and launch port `29002`.
3. Install through Umbrel.
4. Promptly connect or reopen the Portainer environment at
   `<umbrel-lan-address>:29001`.
5. Confirm the Umbrel app reports ready and the Portainer endpoint reports up.
6. Inspect the running agent without printing environment values:

   ```sh
   sudo docker ps --filter label=com.docker.compose.project=svc-umbrel-host-agent
   sudo docker inspect svc-umbrel-host-agent_portainer-agent_1 \
     --format 'image={{.Config.Image}} privileged={{.HostConfig.Privileged}} ports={{json .HostConfig.PortBindings}} mounts={{range .Mounts}}{{.Source}}:{{.Destination}};{{end}}'
   ```

7. Confirm the exact pinned image, `privileged=false`, the two documented mounts,
   and the documented host-port binding.
8. In Portainer, view Umbrel containers, networks, and volumes without changing
   anything. Record that no Umbrel workload was adopted or modified.

## 3. Stop/start

1. Stop the app in Umbrel and confirm Portainer marks the endpoint down.
2. Start the app in Umbrel.
3. Confirm the endpoint reconnects without SSH or host repair.
4. Confirm Umbrel-owned applications continue running normally.

## 4. Reinstall recovery

1. Record the reviewed Git revision and current Portainer endpoint status.
2. Uninstall only `svc-umbrel-host-agent` through Umbrel. Do not remove or alter
   any other Umbrel app.
3. Reinstall version `1.2.0` from this community store.
4. Confirm the existing Portainer environment reconnects. If it misses the
   claim window, restart this app once through Umbrel and reconnect promptly.
5. Verify the image, port binding, mounts, and ownership policy again.
6. Confirm no host package, service, or filesystem repair was needed.

## 5. Umbrel reboot

1. Confirm Portainer endpoint health before the approved reboot.
2. Reboot through the normal Umbrel administrative workflow.
3. Wait for Umbrel and installed apps to settle.
4. Confirm the app automatically starts and Portainer reconnects.
5. Re-run the non-secret `docker inspect` check from the fresh-install section.
6. Confirm normal Umbrel app lifecycle operations still work.

## 6. umbrelOS upgrade

At the next suitable upgrade window:

1. Record umbrelOS version, app version, pinned Agent image, endpoint status,
   socket path, and Docker root before the upgrade.
2. Upgrade only through Umbrel's supported mechanism.
3. Repeat the reboot checks after the upgrade.
4. Re-run the read-only socket/root validation.
5. Confirm no SSH repair, package install, custom service recreation, or host
   filesystem patch was required.
6. If the app does not survive, stop and fix the Git-owned app declaration; do
   not add an appliance-OS workaround.

## Evidence record template

```text
Date/time (UTC):
Operator:
Git revision:
umbrelOS version:
Umbrel architecture:
Portainer Server version:
Agent image and digest:
Test: fresh install | stop/start | reinstall | reboot | OS upgrade
Result: pass | fail
Endpoint up after lifecycle event:
Umbrel-owned workloads changed: no
Host repair required: no
Notes (non-secret):
```
