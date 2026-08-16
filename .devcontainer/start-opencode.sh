#!/bin/bash
# .devcontainer/start-opencode.sh

# 強制載入環境變數
source ~/.bashrc
export PATH="$HOME/.local/bin:$PATH"
export PROJECT_DIR="/workspaces/TestGithubCodespaces"

# 啟動 OpenCode Web，將所有輸出導向 log，並放到背景執行
echo "Starting OpenCode Web on port 4096..."
# export OPENCODE_SERVER_PASSWORD=changeme
# export OPENCODE_SERVER_USERNAME=opencode
cd "$PROJECT_DIR" || { echo "Failed to cd into $PROJECT_DIR"; exit 1; }
nohup opencode web --port 4096 --hostname 0.0.0.0 --cors "https://*.github.dev" > /tmp/opencode-web.log 2>&1 &