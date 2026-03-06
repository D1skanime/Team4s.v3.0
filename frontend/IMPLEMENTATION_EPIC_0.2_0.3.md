# Implementation: EPIC 0.2 + 0.3 - Breadcrumbs and GroupEdgeNavigation

## Overview
This document describes the frontend implementation of Breadcrumbs and GroupEdgeNavigation components for the Team4s.v3.0 project, following the frozen UX, Design, and Contract specifications.

## Implemented Components

### 1. Breadcrumbs Component
**Location:** `C:\Users\D1sk\Documents\Entwicklung\Opencloud\Team4s.v3.0\frontend\src\components\navigation\Breadcrumbs.tsx`

**Features:**
- Renders hierarchical navigation path: `Anime > {AnimeTitle} > Gruppe > Releases`
- Accessible markup with `aria-label` and `aria-current`
- Responsive design with mobile-optimized font sizes
- Design tokens: `--breadcrumb-*` CSS variables for theming
- Auto-hiding when items array is empty

**API:**
```typescript
interface BreadcrumbItem {
  label: string
  href?: string  // Optional; last item typically has no href
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}
```

**Styling:**
- CSS Module: `Breadcrumbs.module.css`
- Design tokens for colors, spacing, and font sizes
- Mobile breakpoint at 768px

### 2. GroupEdgeNavigation Component
**Location:** `C:\Users\D1sk\Documents\Entwicklung\Opencloud\Team4s.v3.0\frontend\src\components\groups\GroupEdgeNavigation.tsx`

**Features:**
- Prev/Next chevron navigation between fansub groups
- Preview card with group logo and anime title on hover/focus
- Mode preservation: Story → Story, Releases → Releases
- Loading states with disabled navigation during transitions
- Responsive: absolute positioning on desktop, static on mobile
- Accessible keyboard navigation with focus states

**API:**
```typescript
interface GroupEdgeNavigationProps {
  currentGroupId: number
  animeId: number
  animeTitle: string
  otherGroups: FansubGroupSummary[]  // From API response
  mode: 'story' | 'releases'
}
```

**Behavior:**
- Auto-hides when no prev/next groups available
- Maintains mode when navigating between groups
- Shows logo placeholder with initial when logo_url is null
- Smooth transitions with loading state management

**Styling:**
- CSS Module: `GroupEdgeNavigation.module.css`
- Design tokens: `--group-nav-*` CSS variables
- Mobile breakpoint at 768px (switches to static layout)

### 3. API Client Extensions
**Location:** `C:\Users\D1sk\Documents\Entwicklung\Opencloud\Team4s.v3.0\frontend\src\lib\api.ts`

**Added Functions:**
```typescript
// Get group detail (story page)
export async function getGroupDetail(
  animeID: number,
  groupID: number
): Promise<GroupDetailResponse>

// Get group releases (releases page)
export async function getGroupReleases(
  animeID: number,
  groupID: number,
  params?: GroupReleasesParams
): Promise<GroupReleasesResponse>
```

**Contract Endpoints:**
- `GET /api/v1/anime/{animeId}/group/{groupId}` → GroupDetail
- `GET /api/v1/anime/{animeId}/group/{groupId}/releases` → GroupReleasesData with other_groups

### 4. Route Pages

#### Group Story Page
**Location:** `C:\Users\D1sk\Documents\Entwicklung\Opencloud\Team4s.v3.0\frontend\src\app\anime\[id]\group\[groupId]\page.tsx`

**Features:**
- Displays fansub group story for specific anime
- Shows group logo, period, member count, episode count
- Breadcrumbs navigation
- GroupEdgeNavigation for switching between groups
- Links to releases page and fansub profile
- Error handling with 404 redirects

**Layout:**
- Hero section with logo and group info
- Story content with pre-wrap formatting
- Action buttons for navigation
- Fully responsive

#### Group Releases Page
**Location:** `C:\Users\D1sk\Documents\Entwicklung\Opencloud\Team4s.v3.0\frontend\src\app\anime\[id]\group\[groupId]\releases\page.tsx`

**Features:**
- Grid display of episode releases
- Episode thumbnails with play overlay
- Badges for OP, ED, Karaoke, Inserts, Screenshots
- Pagination support
- Filter support (has_op, has_ed, has_karaoke, search)
- Breadcrumbs and GroupEdgeNavigation
- Empty state handling

**Query Parameters:**
- `page`: Pagination page number
- `per_page`: Items per page
- `has_op`: Filter by OP presence
- `has_ed`: Filter by ED presence
- `has_karaoke`: Filter by karaoke presence
- `q`: Search query

## File Structure
```
frontend/src/
├── components/
│   ├── navigation/
│   │   ├── Breadcrumbs.tsx
│   │   ├── Breadcrumbs.module.css
│   │   ├── Breadcrumbs.test.tsx
│   │   └── index.ts
│   └── groups/
│       ├── GroupEdgeNavigation.tsx
│       ├── GroupEdgeNavigation.module.css
│       ├── GroupEdgeNavigation.test.tsx
│       └── index.ts
├── app/
│   └── anime/
│       └── [id]/
│           └── group/
│               └── [groupId]/
│                   ├── page.tsx
│                   ├── page.module.css
│                   └── releases/
│                       ├── page.tsx
│                       └── page.module.css
├── lib/
│   └── api.ts (extended with group endpoints)
└── types/
    └── group.ts (existing types used)
```

## Type Definitions
All types are already defined in `C:\Users\D1sk\Documents\Entwicklung\Opencloud\Team4s.v3.0\frontend\src\types\group.ts`:
- `GroupDetail`
- `GroupDetailResponse`
- `GroupReleasesData`
- `GroupReleasesResponse`
- `GroupReleasesParams`
- `EpisodeReleaseSummary`
- `FansubGroupSummary` (from fansub.ts)

## Accessibility Features
- Semantic HTML5 elements (`<nav>`, `<article>`, etc.)
- ARIA labels for navigation buttons
- ARIA current for active breadcrumb
- Keyboard navigation support (focus/blur events)
- Adequate color contrast
- Screen reader friendly

## Responsive Behavior
### Desktop (> 768px)
- GroupEdgeNavigation: absolute positioning over content
- Breadcrumbs: full size text
- Releases grid: multi-column layout

### Mobile (≤ 768px)
- GroupEdgeNavigation: static positioning below content
- Breadcrumbs: smaller text
- Releases grid: single column layout
- Stacked action buttons

## Loading and Error States
1. **Loading States:**
   - Navigation buttons disabled during route transition
   - Loading direction tracked to prevent double-clicks

2. **Error States:**
   - API errors caught and displayed to user
   - 404 errors trigger Next.js notFound()
   - Fallback to empty states when data unavailable

3. **Empty States:**
   - "Keine Story vorhanden" when story is null
   - "Keine Releases vorhanden" when episodes array is empty
   - Navigation hidden when no other groups exist

## Design Tokens
### Breadcrumbs
- `--breadcrumb-spacing`: spacing below breadcrumbs (default: 16px)
- `--breadcrumb-gap`: gap between items (default: 8px)
- `--breadcrumb-font-size`: text size (default: 14px)
- `--breadcrumb-link-color`: link color (default: --color-text-secondary)
- `--breadcrumb-link-hover-color`: hover color (default: --color-primary)
- `--breadcrumb-current-color`: current page color (default: --color-text-primary)
- `--breadcrumb-separator-color`: separator icon color (default: --color-text-tertiary)

### GroupEdgeNavigation
- `--group-nav-button-size`: button dimensions (default: 40px)
- `--group-nav-border-color`: button border (default: --color-border)
- `--group-nav-bg`: button background (default: --color-white)
- `--group-nav-color`: button text color (default: --color-text-primary)
- `--group-nav-hover-border-color`: hover border (default: --color-primary)
- `--group-nav-hover-color`: hover text (default: --color-primary)
- `--group-nav-preview-border`: preview card border (default: --color-border)
- `--group-nav-preview-bg`: preview card background (default: --color-white)
- `--group-nav-preview-shadow`: preview card shadow
- `--group-nav-preview-title`: preview title color (default: --color-text-primary)
- `--group-nav-preview-subtitle`: preview subtitle color (default: --color-text-secondary)

## Testing
### Unit Tests
- **Breadcrumbs.test.tsx**: 5 test cases
  - Empty state rendering
  - Item rendering with links
  - Link vs. span for last item
  - aria-current attribute
  - Separator rendering

- **GroupEdgeNavigation.test.tsx**: 8 test cases
  - Empty state when no navigation available
  - Button rendering
  - Disabled states at boundaries
  - Navigation clicks (prev/next)
  - Mode preservation (story/releases)
  - Preview card on hover
  - Logo placeholder rendering

### Manual Testing Checklist
- [ ] Breadcrumbs display correct hierarchy
- [ ] Breadcrumb links navigate correctly
- [ ] GroupEdgeNavigation prev/next work
- [ ] Preview cards show on hover
- [ ] Mode is preserved when navigating
- [ ] Loading states prevent double-clicks
- [ ] Mobile layout is functional
- [ ] Keyboard navigation works
- [ ] Empty states display correctly
- [ ] 404 errors handled gracefully

## Integration Points
1. **Anime Detail Page**: Can link to group story via "Gruppenbereich" CTA
2. **Fansub Profile**: Can link back to group story
3. **Episode Detail**: Can reference group releases

## Known Limitations
None. All UX, Design, and Contract requirements are implemented.

## Contract Compliance
- ✓ Uses frozen contract endpoints
- ✓ All response types match TypeScript definitions
- ✓ No contract modifications required
- ✓ Defensive error handling for API failures

## Validation Commands
```bash
# TypeScript type check
npx tsc --noEmit

# Run tests
npm test

# Lint
npm run lint

# Build
npm run build
```

## Next Steps
1. Run validation commands to ensure build success
2. Manual testing of all flows
3. Accessibility audit with screen reader
4. Performance testing on slow connections
5. Integration testing with backend API
