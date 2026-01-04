# VPS Clash (Mihomo + MetaCubeXD)

This deploys Mihomo and MetaCubeXD on your VPS and wires the blog to use the local proxy for GitHub API calls.

## 1) Fill in deployment env
Update `.env.deploy` (this file is gitignored):
- `CLASH_CONFIG_URL` = your Clash subscription URL
- `CLASH_SECRET` = controller secret for the UI

Optional:
- `CLASH_DIR` (default `/etc/mihomo`)
- `CLASH_UI_DIR` (default `/etc/mihomo/metacubexd`)
- `CLASH_CONTROLLER_PORT` (default `9090`)
- `CLASH_PROXY_PORT` (default `7890`)
- `CLASH_ALLOW_LAN` (default `false`)

## 2) Run deploy
```
python deploy.py --target clash
```

## 3) Open the UI
Visit `http://<vps-ip>:9090/ui` and enter the secret when prompted.

## 4) Subscription import frontend
The blog now exposes a lightweight importer UI at:
`https://<your-domain>/clashsetup`

Required `.env` values on the VPS:
- `CLASH_SECRET` (same as mihomo secret)
- `CLASH_IMPORT_TOKEN` (token accepted by the importer; defaults to `CLASH_SECRET`)
- `CLASH_CONFIG_PATH` (default `/etc/mihomo/config.yaml`)

## Notes
- The script updates the VPS blog `.env` with `GITHUB_PROXY_URL=http://127.0.0.1:7890`.
- If you expose `9090`, keep a strong `CLASH_SECRET` or firewall it to your IP.
