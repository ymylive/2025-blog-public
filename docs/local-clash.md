# Local Clash Proxy (Mihomo + MetaCubeXD)

This setup lets the blog server route GitHub API traffic through a local Clash proxy and manage it via MetaCubeXD.

## 1. Install Mihomo core
- Download a Mihomo release for your OS.
- Place the binary in `clash/` (for example `clash/mihomo.exe`).

## 2. Prepare config
- Copy `clash/config.example.yaml` to `clash/config.yaml`.
- Add your `proxies` or `proxy-providers`.
- Set `secret` and keep it for the UI.
- Make sure `mixed-port` matches your local proxy port.

## 3. MetaCubeXD UI
- Download MetaCubeXD and unzip to `clash/metacubexd/`.
- Keep `external-ui: ./metacubexd` in the config.
- Start Mihomo:
  `mihomo -d clash -f clash/config.yaml`
- Open `http://127.0.0.1:9090/ui` (or the address you set in `external-controller`).

## 4. Route GitHub API via Clash
- Set `GITHUB_PROXY_URL=http://127.0.0.1:7890` in `.env.local`.
- Restart the blog server.

Notes:
- This only affects server-side GitHub API calls (`/api/github/operations`).
- For production, set the same env var in `.env` if you want the VPS to use a proxy.
