#!/usr/bin/env python3
"""
部署脚本 - 本地构建后同步到 VPS
"""

import argparse
import os
import re
import subprocess
import tarfile
import urllib.request
from pathlib import Path

import paramiko


def load_env_file(env_path: Path) -> None:
    """Load key=value pairs from a local env file without overwriting existing env."""
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def download_text(url: str, timeout: int = 30) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="ignore")


def yaml_quote(value: str) -> str:
    escaped = value.replace('"', '\\"')
    return f"\"{escaped}\""


def ensure_config_keys(config_text: str, updates: dict[str, str]) -> str:
    lines = config_text.splitlines()
    for key, value in updates.items():
        pattern = re.compile(rf"^\s*{re.escape(key)}\s*:")
        replaced = False
        for index, line in enumerate(lines):
            if pattern.match(line):
                lines[index] = f"{key}: {value}"
                replaced = True
                break
        if not replaced:
            lines.append(f"{key}: {value}")
    return "\n".join(lines).rstrip() + "\n"


def run_remote(ssh: paramiko.SSHClient, command: str, label: str | None = None) -> tuple[str, str]:
    if label:
        print(label)
    stdin, stdout, stderr = ssh.exec_command(command)
    out = stdout.read().decode("utf-8", errors="ignore")
    err = stderr.read().decode("utf-8", errors="ignore")
    return out, err


# Load optional deployment env file (ignored by git via .env*)
load_env_file(Path(__file__).parent / ".env.deploy")

# VPS config from environment
VPS_HOST = os.getenv("VPS_HOST")
VPS_USER = os.getenv("VPS_USER")
VPS_PASS = os.getenv("VPS_PASS")
VPS_PORT = int(os.getenv("VPS_PORT", "22"))
REMOTE_PATH = os.getenv("VPS_PATH", "/www/wwwroot/2025-blog-public")
APP_PORT = os.getenv("APP_PORT", "2025")

CLASH_CONFIG_URL = os.getenv("CLASH_CONFIG_URL")
CLASH_SECRET = os.getenv("CLASH_SECRET")
CLASH_DIR = os.getenv("CLASH_DIR", "/etc/mihomo")
CLASH_UI_DIR = os.getenv("CLASH_UI_DIR", f"{CLASH_DIR}/metacubexd")
CLASH_CONTROLLER_PORT = int(os.getenv("CLASH_CONTROLLER_PORT", "9090"))
CLASH_PROXY_PORT = int(os.getenv("CLASH_PROXY_PORT", "7890"))
CLASH_ALLOW_LAN = os.getenv("CLASH_ALLOW_LAN", "false").lower()

# 要排除的文件/文件夹
EXCLUDES = {
    "node_modules",
    ".git",
    ".open-next",
    "__pycache__",
    ".cache",
    "deploy.py",
    ".env.local",
    ".env.deploy",
    "clash",
    ".deploy",
}

# 要同步的文件扩展名（如果为空则同步所有）
INCLUDE_EXTENSIONS = set()


def should_sync(path: Path, base_path: Path) -> bool:
    """判断文件是否需要同步"""
    rel_path = path.relative_to(base_path)
    parts = rel_path.parts
    
    # 检查是否在排除列表中
    for part in parts:
        if part in EXCLUDES:
            return False
    
    return True


def sync_directory(sftp: paramiko.SFTPClient, local_path: Path, remote_path: str):
    """递归同步目录"""
    # 确保远程目录存在
    try:
        sftp.stat(remote_path)
    except FileNotFoundError:
        print(f"创建目录: {remote_path}")
        sftp.mkdir(remote_path)
    
    for item in local_path.iterdir():
        if not should_sync(item, local_path.parent):
            continue
        
        remote_item = f"{remote_path}/{item.name}"
        
        if item.is_dir():
            sync_directory(sftp, item, remote_item)
        else:
            print(f"上传: {item.name}")
            sftp.put(str(item), remote_item)


def sync_files(sftp: paramiko.SFTPClient, local_base: Path, remote_base: str):
    """同步所有文件"""
    for item in local_base.iterdir():
        if not should_sync(item, local_base):
            continue
        
        remote_item = f"{remote_base}/{item.name}"
        
        if item.is_dir():
            # 确保远程目录存在
            try:
                sftp.stat(remote_item)
            except FileNotFoundError:
                print(f"创建目录: {remote_item}")
                sftp.mkdir(remote_item)
            sync_files(sftp, item, remote_item)
        else:
            print(f"上传: {item.relative_to(local_base)}")
            sftp.put(str(item), remote_item)


def create_deploy_archive(local_path: Path) -> Path:
    """Create a tar.gz archive with only the runtime-required files."""
    archive_dir = local_path / ".deploy"
    archive_dir.mkdir(exist_ok=True)
    archive_path = archive_dir / "deploy.tar.gz"
    if archive_path.exists():
        archive_path.unlink()

    include_items = [
        ".next",
        "public",
        "package.json",
        "pnpm-lock.yaml",
        "next.config.ts",
        "open-next.config.ts",
        "tsconfig.json",
        "next-env.d.ts",
        "wrangler.toml",
    ]

    with tarfile.open(archive_path, "w:gz") as tar:
        for item in include_items:
            target = local_path / item
            if target.exists():
                tar.add(target, arcname=item)

    return archive_path


def connect_ssh() -> paramiko.SSHClient | None:
    missing = [name for name, value in [("VPS_HOST", VPS_HOST), ("VPS_USER", VPS_USER), ("VPS_PASS", VPS_PASS)] if not value]
    if missing:
        print(f"Missing deployment env vars: {', '.join(missing)}")
        print("Provide them via .env.deploy or environment variables.")
        return None

    print("\n" + "=" * 50)
    print(f"Connecting to {VPS_HOST}...")
    print("=" * 50)

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, port=VPS_PORT)
    print("SSH connected.")
    return ssh


def resolve_mihomo_asset(arch: str) -> str | None:
    arch = arch.strip().lower()
    if arch in {"x86_64", "amd64"}:
        return "mihomo-linux-amd64"
    if arch in {"aarch64", "arm64"}:
        return "mihomo-linux-arm64"
    if arch.startswith("armv7"):
        return "mihomo-linux-armv7"
    return None


def local_build():
    """本地构建项目"""
    print("=" * 50)
    print("开始本地构建...")
    print("=" * 50)
    
    local_path = Path(__file__).parent
    result = subprocess.run(
        ["pnpm", "build"],
        cwd=local_path,
        shell=True
    )
    
    if result.returncode != 0:
        print("构建失败!")
        return False
    
    print("本地构建完成!")
    return True


def check_env_file(ssh: paramiko.SSHClient) -> bool:
    """检查 VPS 上是否存在 .env 文件"""
    stdin, stdout, stderr = ssh.exec_command(f"test -f {REMOTE_PATH}/.env && echo 'exists'")
    result = stdout.read().decode().strip()
    return result == "exists"


def clean_remote_directory(ssh: paramiko.SSHClient):
    """清理远程目录，保留 .env 文件"""
    print("\n清理云端文件（保留 .env）...")
    
    # 备份 .env，清理目录，恢复 .env
    commands = f"""
    if [ -f {REMOTE_PATH}/.env ]; then
        cp {REMOTE_PATH}/.env /tmp/.env.backup
    fi
    rm -rf {REMOTE_PATH}/*
    rm -rf {REMOTE_PATH}/.[!.]*
    mkdir -p {REMOTE_PATH}
    if [ -f /tmp/.env.backup ]; then
        mv /tmp/.env.backup {REMOTE_PATH}/.env
    fi
    """
    
    stdin, stdout, stderr = ssh.exec_command(commands)
    stdout.read()
    err = stderr.read().decode()
    if err and "No such file" not in err:
        print(f"清理警告: {err}")
    print("云端文件清理完成!")



def deploy_blog():
    local_path = Path(__file__).parent

    if not local_build():
        return

    print("\nPreparing deployment package...")
    archive_path = create_deploy_archive(local_path)

    ssh = connect_ssh()
    if not ssh:
        return

    try:
        run_remote(ssh, f"mkdir -p {REMOTE_PATH}")

        if not check_env_file(ssh):
            print("\nVPS missing .env, uploading from local .env.local...")
            local_env = local_path / ".env.local"
            if local_env.exists():
                sftp = ssh.open_sftp()
                sftp.put(str(local_env), f"{REMOTE_PATH}/.env")
                sftp.close()
                print(".env uploaded.")
            else:
                print("Warning: local .env.local not found.")
                return

        clean_remote_directory(ssh)

        sftp = ssh.open_sftp()
        print(f"\nUploading deploy package to {REMOTE_PATH}...")
        remote_archive = f"{REMOTE_PATH}/.deploy.tar.gz"
        sftp.put(str(archive_path), remote_archive)
        sftp.close()

        print("\nExtracting deploy package...")
        run_remote(ssh, f"tar -xzf {remote_archive} -C {REMOTE_PATH} && rm -f {remote_archive}")

        print("\nInstalling dependencies and restarting app...")
        stdin, stdout, stderr = ssh.exec_command(
            f"cd {REMOTE_PATH} && pnpm install --frozen-lockfile && (pm2 delete 2025-blog || true) && pm2 start 'pnpm exec next start -p {APP_PORT}' --name 2025-blog"
        )
        out = stdout.read().decode("utf-8", errors="ignore")
        if out:
            print(out.encode("gbk", errors="ignore").decode("gbk"))
        err = stderr.read().decode("utf-8", errors="ignore")
        if err:
            msg = f"Warning: {err}"
            print(msg.encode("gbk", errors="ignore").decode("gbk"))

        print("\n" + "=" * 50)
        print("Deploy complete.")
        print("=" * 50)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        ssh.close()


def deploy_clash():
    missing = []
    if not CLASH_CONFIG_URL:
        missing.append("CLASH_CONFIG_URL")
    if not CLASH_SECRET:
        missing.append("CLASH_SECRET")
    if missing:
        print(f"Missing clash env vars: {', '.join(missing)}")
        print("Provide them via .env.deploy or environment variables.")
        return

    try:
        config_text = download_text(CLASH_CONFIG_URL)
    except Exception as exc:
        print(f"Failed to download clash config: {exc}")
        return

    if not config_text.strip():
        print("Downloaded clash config is empty.")
        return

    updates = {
        "external-controller": f"0.0.0.0:{CLASH_CONTROLLER_PORT}",
        "secret": yaml_quote(CLASH_SECRET),
        "external-ui": yaml_quote(CLASH_UI_DIR),
        "mixed-port": str(CLASH_PROXY_PORT),
        "allow-lan": "false" if CLASH_ALLOW_LAN != "true" else "true",
    }
    config_text = ensure_config_keys(config_text, updates)

    ssh = connect_ssh()
    if not ssh:
        return

    try:
        arch_out, _ = run_remote(ssh, "uname -m")
        asset = resolve_mihomo_asset(arch_out)
        if not asset:
            print(f"Unsupported architecture: {arch_out.strip()}")
            return

        install_cmd = '''
        set -e
        if ! command -v curl >/dev/null 2>&1; then
          if command -v apt-get >/dev/null 2>&1; then apt-get update -y && apt-get install -y curl;
          elif command -v yum >/dev/null 2>&1; then yum install -y curl;
          elif command -v dnf >/dev/null 2>&1; then dnf install -y curl;
          fi
        fi
        if ! command -v unzip >/dev/null 2>&1; then
          if command -v apt-get >/dev/null 2>&1; then apt-get install -y unzip;
          elif command -v yum >/dev/null 2>&1; then yum install -y unzip;
          elif command -v dnf >/dev/null 2>&1; then dnf install -y unzip;
          fi
        fi
        '''
        run_remote(ssh, install_cmd, label="\nInstalling dependencies...")

        mihomo_url = f"https://github.com/MetaCubeX/mihomo/releases/latest/download/{asset}"
        run_remote(
            ssh,
            f"curl -fsSL '{mihomo_url}' -o /usr/local/bin/mihomo && chmod +x /usr/local/bin/mihomo",
            label="Downloading mihomo...",
        )

        run_remote(ssh, f"mkdir -p '{CLASH_DIR}' '{CLASH_UI_DIR}'")

        ui_download = f'''
        set -e
        rm -f /tmp/metacubexd.zip
        for url in           https://github.com/MetaCubeX/metacubexd/releases/latest/download/metacubexd.zip           https://github.com/MetaCubeX/metacubexd/releases/latest/download/dist.zip; do
          if curl -fsSL "$url" -o /tmp/metacubexd.zip; then
            break
          fi
        done
        if [ ! -s /tmp/metacubexd.zip ]; then
          echo "MetaCubeXD download failed."
          exit 1
        fi
        if [ -n '{CLASH_UI_DIR}' ]; then rm -rf '{CLASH_UI_DIR}'/*; fi
        unzip -o /tmp/metacubexd.zip -d '{CLASH_UI_DIR}'
        rm -f /tmp/metacubexd.zip
        '''
        run_remote(ssh, ui_download, label="Downloading MetaCubeXD UI...")

        sftp = ssh.open_sftp()
        config_path = f"{CLASH_DIR}/config.yaml"
        with sftp.open(config_path, "wb") as remote_file:
            remote_file.write(config_text.encode("utf-8"))

        service_content = f'''[Unit]
Description=Mihomo (Clash Meta) Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/mihomo -d {CLASH_DIR} -f {CLASH_DIR}/config.yaml
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
'''
        with sftp.open("/etc/systemd/system/mihomo.service", "wb") as remote_file:
            remote_file.write(service_content.encode("utf-8"))
        sftp.close()

        run_remote(ssh, "systemctl daemon-reload")
        run_remote(ssh, "systemctl enable --now mihomo")
        run_remote(ssh, "systemctl restart mihomo")

        firewall_cmd = f'''
        if command -v ufw >/dev/null 2>&1; then
          ufw allow {CLASH_CONTROLLER_PORT}/tcp || true
          ufw reload || true
        elif command -v firewall-cmd >/dev/null 2>&1; then
          firewall-cmd --permanent --add-port={CLASH_CONTROLLER_PORT}/tcp || true
          firewall-cmd --reload || true
        fi
        '''
        run_remote(ssh, firewall_cmd)

        proxy_line = f"GITHUB_PROXY_URL=http://127.0.0.1:{CLASH_PROXY_PORT}"
        env_cmd = f'''
        if [ -f {REMOTE_PATH}/.env ]; then
          if grep -q '^GITHUB_PROXY_URL=' {REMOTE_PATH}/.env; then
            sed -i 's|^GITHUB_PROXY_URL=.*|{proxy_line}|' {REMOTE_PATH}/.env
          else
            echo '{proxy_line}' >> {REMOTE_PATH}/.env
          fi
        else
          echo '{proxy_line}' > {REMOTE_PATH}/.env
        fi
        '''
        run_remote(ssh, env_cmd)

        run_remote(ssh, "command -v pm2 >/dev/null 2>&1 && pm2 restart 2025-blog || true")

        print("\n" + "=" * 50)
        print("Clash deployment complete.")
        print("=" * 50)
    except Exception as exc:
        print(f"Error: {exc}")
    finally:
        ssh.close()


def main():
    parser = argparse.ArgumentParser(description="Deploy blog or Clash (mihomo + MetaCubeXD).")
    parser.add_argument("--target", choices=["blog", "clash"], default="blog")
    args = parser.parse_args()

    if args.target == "clash":
        deploy_clash()
    else:
        deploy_blog()


if __name__ == "__main__":
    main()
