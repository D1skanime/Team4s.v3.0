# TODO

## Immediate (Next Session)
- [ ] Handler modularization sweep
  - Identify all handler files >150 lines
  - Create split plan for top 3-5 oversized files
  - Begin refactoring largest handler first
- [ ] Replace img tags with next/image
  - Scan all admin routes for img tag usage
  - Replace with Next.js Image component
  - Clear Next.js build warnings

## Short Term (This Week)
- [ ] Complete handler modularization for all files >150 lines
- [ ] Verify new test suite runs correctly in CI pipeline
- [ ] Add integration tests for complete admin anime workflow
- [ ] Review and rotate any leaked secrets from .env exposure

## Medium Term (This Sprint)
- [ ] Complete P2 hardening closeout
- [ ] Add deterministic test for cropper output parity
- [ ] Consider pg_trgm index for anime search at scale
- [ ] Clean residual %??% placeholder artifacts

## Long Term (Future Sprints)
- [ ] Performance optimization pass
- [ ] Documentation review and update
- [ ] Production deployment preparation
- [ ] Monitoring and observability improvements

## On Hold / Parking Lot
- Legacy parity cosmetics (deprioritized in favor of maintainability)
- Advanced search features (waiting for scale requirements)
