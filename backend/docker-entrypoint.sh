#!/bin/sh
set -eu

echo "Applying database migrations..."
./migrate up

echo "Starting server..."
exec ./server
