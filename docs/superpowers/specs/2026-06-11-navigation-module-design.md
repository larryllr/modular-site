# Navigation Module Design

## Goal

Add a dedicated navigation module for curated groups of website links. A full
administrator sets the module title and manages link names and URLs. Public
visitors open a target by clicking its icon or name.

## Data Model

Add a `navigation` page section with:

- Stable section `id`
- Module `title`
- Ordered `items` array
- Existing section `layout`

Each item contains:

- Stable item `id`
- Display `name`
- Normalized HTTP, HTTPS, or internal target `url`

The module supports up to 100 items. The administrator can add, remove, and
move items up or down. No manual icon or description fields are included.

## Administration

- Add a `导航模块` button to the page insertion bar.
- The editor exposes the module title.
- Each link row exposes only `名称` and `网址`.
- Link rows include move up, move down, and delete controls.
- Adding or deleting rows may rebuild the structural editor.
- Typing in names and URLs updates in-memory configuration directly and marks
  the save bar dirty without rerendering the full administrator editor.
- Limited administrators follow the existing page and module lock rules.

## Public Rendering

Each item is an anchor opened in a new tab with safe `rel` attributes. The
favicon and name are both inside the anchor, so either is clickable.

The icon attempts the target origin's `/favicon.ico`. If it fails or the URL is
an internal path, the UI displays a generated initial badge.

### One Navigation Module

When the page's only visible content is one navigation module:

- Reuse the existing single-module immersive shell.
- Hide the public sidebar, page header, and status strip.
- Remove the navigation module's outer card frame.
- Fill the viewport with a responsive multi-column directory.
- Keep the module title visible at the top.
- Let long lists flow into balanced columns on wide screens.

### Multiple Modules

When a page contains multiple visible modules:

- Render each navigation module as an independent category card.
- Respect the existing page column layout.
- Display a vertical numbered link list.
- Allow the list area to scroll when it exceeds the card height.

### Responsive Behavior

- Desktop immersive mode uses multiple columns based on available width.
- Tablet reduces column count naturally.
- Mobile uses one column with large touch targets.
- Multi-module cards remain one column at the existing mobile breakpoint.

## Compatibility and Validation

- Worker sanitization and client hydration accept legacy configurations that
  do not contain navigation modules.
- Invalid items are removed only when both name and URL are empty.
- Names and URLs are length-limited using existing helpers.
- Existing website modules remain unchanged.
- The removed transfer module is not restored.

## Testing

- Verify normalization preserves ordered valid items and caps them at 100.
- Verify the editor avoids full rerenders while typing.
- Verify item add, delete, and ordering behavior.
- Verify all public item anchors use `_blank` and safe `rel`.
- Verify favicon failure falls back to the initial badge.
- Verify immersive single-navigation layout and multi-module card layout.
- Verify desktop and mobile CSS.
- Run the required JavaScript, TypeScript, diff, Cloudflare deployment, and
  proxied GitHub push workflow.
