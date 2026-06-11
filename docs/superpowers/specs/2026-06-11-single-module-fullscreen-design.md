# Single Module Fullscreen Design

Normal public subpages enter an immersive layout when exactly one visible
content module is rendered.

- Hide the public sidebar, page header, and page status strip.
- Let the page workspace and module grid fill the viewport.
- Remove the sole module's border, radius, shadow, and outer spacing.
- Preserve the page background behind transparent module content.
- Count enabled module comments and bottom comments as visible content.
- Do not affect home, blog, article, password, not-found, admin, or multi-module
  views.
- Determine eligibility from successfully rendered DOM nodes so unavailable
  system modules do not prevent fullscreen mode.
