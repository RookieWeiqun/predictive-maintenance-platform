#!/usr/bin/env bash

# 后端一键部署脚本。
#
# 用法：
#   bash deploy/deploy-backend-oneclick.sh
#   bash deploy/deploy-backend-oneclick.sh "你的提交说明"
#
# 部署流程：
# 1. 检查当前本地分支是否为 master。
# 2. 使用 git add -A 暂存所有本地变更。
# 3. 如果存在需要提交的改动，提示输入 commit message。
#    直接回车时，默认使用带时间戳的提交说明。
# 4. 拉取 origin/master 的最新状态。
# 5. 如果远端有新提交，先执行 git pull origin master。
#    如果 pull 过程中出现合并冲突，脚本会退出，等待手动解决。
# 6. 如果本地存在领先于 origin/master 的提交，则执行 git push origin master。
#    如果本地已经和远端一致，则跳过 git push。
# 7. 通过 ezan@36.110.89.30:2201 连接远端服务器。
# 8. 远端进入 /home/ezan/envapp/PredictiveMaintenancePlatform/code，
#    先执行 git pull origin master，然后进入 deploy 目录执行：
#    docker compose -f docker-compose.backend.yml up -d --build
#
# 说明：
# - 远端部署目录：/home/ezan/envapp/PredictiveMaintenancePlatform/code/deploy
# - 如果已安装 sshpass，则会使用非交互方式输入密码；否则会回退到 ssh 手动输入。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

REMOTE_HOST="36.110.89.30"
REMOTE_PORT="2201"
REMOTE_USER="ezan"
REMOTE_PASSWORD="psmdig"
REMOTE_REPO_DIR="/home/ezan/envapp/PredictiveMaintenancePlatform/code"
REMOTE_DEPLOY_DIR="/home/ezan/envapp/PredictiveMaintenancePlatform/code/deploy"
TARGET_BRANCH="master"
DEFAULT_COMMIT_MESSAGE="deploy: $(date '+%Y-%m-%d %H:%M:%S')"
COMMIT_MESSAGE="${1:-}"

CURRENT_BRANCH="$(git -C "${REPO_ROOT}" branch --show-current)"

if [[ "${CURRENT_BRANCH}" != "${TARGET_BRANCH}" ]]; then
  echo "Current branch is '${CURRENT_BRANCH}'. Switch to '${TARGET_BRANCH}' before running this script." >&2
  exit 1
fi

echo "==> Checking local changes"
git -C "${REPO_ROOT}" add -A

created_commit=false

if git -C "${REPO_ROOT}" diff --cached --quiet; then
  echo "No local changes to commit."
else
  if [[ -z "${COMMIT_MESSAGE}" ]]; then
    read -r -p "Enter commit message [${DEFAULT_COMMIT_MESSAGE}]: " COMMIT_MESSAGE
    COMMIT_MESSAGE="${COMMIT_MESSAGE:-${DEFAULT_COMMIT_MESSAGE}}"
  fi

  echo "==> Creating commit: ${COMMIT_MESSAGE}"
  git -C "${REPO_ROOT}" commit -m "${COMMIT_MESSAGE}"
  created_commit=true
fi

echo "==> Fetching origin/${TARGET_BRANCH} state"
git -C "${REPO_ROOT}" fetch origin "${TARGET_BRANCH}"

read -r behind_count ahead_count < <(git -C "${REPO_ROOT}" rev-list --left-right --count "origin/${TARGET_BRANCH}...HEAD")

if [[ "${behind_count}" -gt 0 ]]; then
  echo "==> Pulling origin/${TARGET_BRANCH} into local ${TARGET_BRANCH}"
  if ! git -C "${REPO_ROOT}" pull --no-rebase origin "${TARGET_BRANCH}"; then
    echo "git pull failed, likely due to merge conflicts. Resolve conflicts locally before deploying." >&2
    exit 1
  fi

  read -r behind_count ahead_count < <(git -C "${REPO_ROOT}" rev-list --left-right --count "origin/${TARGET_BRANCH}...HEAD")

  if [[ "${behind_count}" -gt 0 ]]; then
    echo "Local branch is still behind origin/${TARGET_BRANCH} after pull. Resolve it manually before deploying." >&2
    exit 1
  fi
fi

if [[ "${ahead_count}" -eq 0 ]]; then
  if [[ "${created_commit}" == true ]]; then
    echo "No new commits to push after reconciliation check. Skipping git push."
  else
    echo "Local branch is already up to date with origin/${TARGET_BRANCH}. Skipping git push."
  fi
else
  echo "==> Pushing ${TARGET_BRANCH} to origin"
  git -C "${REPO_ROOT}" push origin "${TARGET_BRANCH}"
fi

read -r -d '' REMOTE_COMMAND <<'EOF' || true
set -euo pipefail
cd /home/ezan/envapp/PredictiveMaintenancePlatform/code
git pull origin master
cd /home/ezan/envapp/PredictiveMaintenancePlatform/code/deploy
docker compose -f docker-compose.backend.yml up -d --build
EOF

echo "==> Deploying on ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PORT}"

if command -v sshpass >/dev/null 2>&1; then
  sshpass -p "${REMOTE_PASSWORD}" ssh -p "${REMOTE_PORT}" -o StrictHostKeyChecking=no "${REMOTE_USER}@${REMOTE_HOST}" "${REMOTE_COMMAND}"
else
  echo "sshpass is not installed. Falling back to interactive ssh login." >&2
  ssh -p "${REMOTE_PORT}" -o StrictHostKeyChecking=no "${REMOTE_USER}@${REMOTE_HOST}" "${REMOTE_COMMAND}"
fi

echo "==> Deployment completed"