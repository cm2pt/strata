#!/usr/bin/env bash
# Generate production-ready secrets for Strata deployment.
# Copy the output into your Vercel environment variables.

set -euo pipefail

echo "# Strata Production Secrets"
echo "# Generated on $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""
echo "JWT_SECRET=$(openssl rand -base64 48)"
echo "ENCRYPTION_KEY=$(openssl rand -base64 24)"
