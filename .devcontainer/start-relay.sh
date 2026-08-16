#!/bin/bash
if ! pgrep -f "node .devcontainer/relay.js" > /dev/null; then
  setsid nohup node .devcontainer/relay.js > /tmp/relay.log 2>&1 < /dev/null &
fi