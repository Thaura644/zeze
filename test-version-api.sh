#!/bin/bash

# Test script for version check API

echo "Testing version check API..."

# Test version check endpoint
curl -X POST \
  http://localhost:3001/api/version/check \
  -H "Content-Type: application/json" \
  -H "platform: ios" \
  -H "app_version: 1.0.0" \
  -d '{}' \
  --max-time 10 \
  2>/dev/null

echo ""
echo "API test completed."