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
export PREDIA_DEMO_PRIVATE_SECURITY_GROUP="sg-0cfbdcb57a224f9a5"
export PREDIA_DEMO_AWS_REGION="us-east-2"
# Configura este valor si quieres que ssh-access-doctor.sh tambien actualice
# automaticamente el Security Group del servidor publico.
export PREDIA_DEMO_PUBLIC_SECURITY_GROUP=""
