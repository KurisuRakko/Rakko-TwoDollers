# Changelog

This project uses one version number per submitted update.

Versioning rule:
- Breaking changes: bump major
- New features or large UI adjustments: bump minor
- Fixes and small polish: bump patch

## v1.4.0 - 2026-03-16

Major updates in this release:
- Rebranded the project to `Rakko-TwoDollars`, updated author to `KurisuRakko`, and changed the homepage to `Rakko.cn`.
- Simplified login to GitHub token mode and local offline mode, with built-in folded instructions for less technical users.
- Added wallpaper support for the login page and main layout, plus wallpaper upload, preview, and crop flow in settings.
- Restored dark mode while keeping the old preset/theme system removed.

Feature removals:
- Removed map-related features and UI.
- Removed AI-related features and UI.
- Removed theme preset/custom preset flows that were not needed anymore.

UI and interaction updates:
- Reworked the home page, search page, stats page, bill editor, and bill detail dialogs multiple times for mobile use and glass-style visuals.
- Added smoother sync success animations on the home page.
- Fixed multiple mobile overlay issues where dialogs, select menus, dropdown menus, and popovers could appear underneath other layers.
- Fixed bottom navigation overlap by adding safer mobile spacing for content and popup flows.

Behavior fixes:
- Stats page no longer crashes from the previous `calendar-detail.tsx` type issue.
- Empty stats states now render as explicit empty cards instead of broken-looking empty charts.
- Bill detail popup now displays above the page correctly and its `More` menu opens in the correct layer.
- Search, stats, and bill editing related popup content no longer gets hidden behind the bottom control bar on mobile.
