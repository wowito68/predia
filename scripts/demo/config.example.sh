#!/usr/bin/env bash

# Configuracion no sensible para la demostracion. No agregues contrasenas,
# tokens, cookies ni contenido de archivos .env.
export PREDIA_DEMO_DOMAIN="prediaa.duckdns.org"
export PREDIA_DEMO_SSH_HOST="ec2-18-222-145-243.us-east-2.compute.amazonaws.com"
export PREDIA_DEMO_SSH_USER="ubuntu"
export PREDIA_DEMO_SSH_KEY="${HOME}/Descargas/PREDIA.pem"
export PREDIA_DEMO_REMOTE_DIR="/home/ubuntu/predia-private"
export PREDIA_DEMO_GRAFANA_PORT="3001"
export PREDIA_DEMO_PROMETHEUS_PORT="9090"
export PREDIA_DEMO_TMUX_SESSION="predia-demo"
