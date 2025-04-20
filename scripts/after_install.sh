#!/bin/bash
cd /home/ubuntu/photocomp-backend
npm ci --production=true

touch .env
aws ssm get-parameters-by-path \
  --path "/photocomp/" \
  --with-decryption \
  --region us-east-2 \
  --query "Parameters[*].{Name:Name,Value:Value}" \
  --output text | \
  while read -r line; do
    param_name=$(echo "$line" | awk '{print $1}')
    param_value=$(echo "$line" | cut -f2-)

    env_name=$(echo "$param_name" | awk -F/ '{print $1}')

    echo "$env_name=$param_value" >> .env
  done
