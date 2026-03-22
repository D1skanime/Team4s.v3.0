#!/bin/bash
#
# Test-Script fuer Cover-Migration
# Fuehrt Dry-Run durch und zeigt Ergebnisse
#

set -e

echo "=========================================="
echo "Cover Migration Test (Dry-Run)"
echo "=========================================="
echo

# Check if binary exists
if [ ! -f "./migrate-covers" ]; then
    echo "Building migrate-covers binary..."
    cd ../../
    go build -o migrate-covers ./cmd/migrate-covers/
    cd cmd/migrate-covers
    echo "Build complete."
    echo
fi

# Set test configuration
export DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/team4s?sslmode=disable}"
export COVER_SOURCE_DIR="${COVER_SOURCE_DIR:-../../frontend/public/covers}"
export MEDIA_TARGET_DIR="${MEDIA_TARGET_DIR:-../../media}"
export DRY_RUN="true"
export SKIP_EXISTING="true"

echo "Configuration:"
echo "  DATABASE_URL: $DATABASE_URL"
echo "  COVER_SOURCE_DIR: $COVER_SOURCE_DIR"
echo "  MEDIA_TARGET_DIR: $MEDIA_TARGET_DIR"
echo "  DRY_RUN: $DRY_RUN"
echo "  SKIP_EXISTING: $SKIP_EXISTING"
echo
echo "=========================================="
echo

# Run migration
./migrate-covers

echo
echo "=========================================="
echo "Dry-Run completed successfully!"
echo
echo "Next steps:"
echo "  1. Review the logs above"
echo "  2. If everything looks good, run actual migration:"
echo "     DRY_RUN=false ./migrate-covers"
echo "=========================================="
