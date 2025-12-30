#!/usr/bin/env python3
"""
部署脚本 - 本地构建后同步到 VPS
"""

import os
import subprocess
import paramiko
from pathlib import Path

# VPS 配置
VPS_HOST = "8.134.33.19"
VPS_USER = "root"
VPS_PASS = "Qq159741"
REMOTE_PATH = "/www/wwwroot/2025-blog-public"

# 要排除的文件/文件夹
EXCLUDES = {
    "node_modules",
    ".git",
    ".open-next",
    "__pycache__",
    ".cache",
    "deploy.py",
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


def main():
    local_path = Path(__file__).parent

    # 先本地构建
    if not local_build():
        return
    
    print("\n" + "=" * 50)
    print(f"连接到 {VPS_HOST}...")
    print("=" * 50)
    
    # 创建 SSH 客户端
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
        print("SSH 连接成功!")

        # 确保远程目录存在
        stdin, stdout, stderr = ssh.exec_command(f"mkdir -p {REMOTE_PATH}")
        stdout.read()

        # 检查并上传 .env 文件
        if not check_env_file(ssh):
            print("\n VPS 上未找到 .env 文件，正在从本地上传...")
            local_env = local_path / ".env.local"
            if local_env.exists():
                sftp = ssh.open_sftp()
                sftp.put(str(local_env), f"{REMOTE_PATH}/.env")
                sftp.close()
                print(".env 文件上传成功!")
            else:
                print("警告: 本地 .env.local 文件不存在!")
                return

        # 清理云端旧文件（保留 .env）
        clean_remote_directory(ssh)
        
        # 创建 SFTP 客户端
        sftp = ssh.open_sftp()
        
        print(f"\n开始同步文件到 {REMOTE_PATH}...")
        sync_files(sftp, local_path, REMOTE_PATH)
        
        print("\n文件同步完成!")
        
        # 在远程服务器上安装依赖并重启
        print("\n在 VPS 上安装依赖并重启服务...")
        stdin, stdout, stderr = ssh.exec_command(
            f"cd {REMOTE_PATH} && pnpm install --frozen-lockfile && pm2 restart 2025-blog || pm2 start 'pnpm start' --name 2025-blog"
        )
        print(stdout.read().decode())
        err = stderr.read().decode()
        if err:
            print(f"警告: {err}")
        
        sftp.close()
        print("\n" + "=" * 50)
        print("部署完成!")
        print("=" * 50)
        
    except Exception as e:
        print(f"错误: {e}")
    finally:
        ssh.close()


if __name__ == "__main__":
    main()
