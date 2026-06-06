# CubeCity Integration Design

## Goal

Integrate the MIT-licensed `hexianWeb/CubeCity` game into the modular site as a
first-party, full-screen experience at `/llrgamecubecity`.

The public navigation entry is named `放松一下`. It is visible by default and
can be hidden by a full administrator. The entry card background and sidebar
icon use a CubeCity gameplay image by default.

## Architecture

- Vendor the upstream CubeCity source or a reproducible snapshot in the
  repository with its MIT license and source attribution.
- Build CubeCity with Vite using `/llrgamecubecity/` as its base path.
- Copy the generated static assets into the Worker's `public` assets directory.
- Serve both `/llrgamecubecity` and `/llrgamecubecity/` as the game entry point.
- Keep the game independent from the site's SPA. The site sidebar and page
  layout are not rendered inside the game.
- Preserve CubeCity browser storage behavior so game saves remain local to the
  browser.

## Site Entry

- Add a built-in external-style navigation entry targeting
  `/llrgamecubecity`.
- Default public title: `放松一下`.
- Default description: `进入立方城，放松一下`.
- Default card background and sidebar icon use a locally stored CubeCity
  gameplay image.
- The entry appears on the home page and public sidebar in the configured
  navigation order.
- A full administrator can show or hide the entry and can customize its title,
  description, card background, and sidebar icon through the existing link
  editing controls.
- Limited administrators cannot change full-administrator-owned navigation
  configuration beyond their existing permissions.

## Configuration Compatibility

- Existing KV configurations must continue to load without data loss.
- Client hydration and Worker sanitization add the built-in entry only when no
  matching `/llrgamecubecity` entry exists.
- Existing customized values for the entry are retained.
- Hiding the entry persists through the existing `visible` field.
- The integration does not restore the removed transfer module.

## Routing

- `/llrgamecubecity` redirects to `/llrgamecubecity/` so relative game assets
  resolve consistently.
- `/llrgamecubecity/` serves the CubeCity build entry.
- Files below `/llrgamecubecity/assets/` and other generated game paths are
  served as static assets without passing through the main site SPA.
- Existing `/api/*`, `/admin`, page, blog, and article routing behavior remains
  unchanged.

## Attribution

- Retain the upstream MIT `LICENSE`.
- Add a short repository note naming `hexianWeb/CubeCity`, its GitHub URL, the
  vendored revision, and local modifications needed for subpath deployment.
- Do not remove the game's existing upstream attribution link.

## Testing

- Verify the CubeCity build succeeds with the subpath base.
- Verify generated HTML references `/llrgamecubecity/` assets.
- Verify `/llrgamecubecity` redirects and `/llrgamecubecity/` loads the game.
- Verify direct refresh and static asset requests work on Cloudflare.
- Verify the `放松一下` entry appears by default on the home page and sidebar.
- Verify a full administrator can hide and restore the entry.
- Verify default background and sidebar icon assets load.
- Run the project's required JavaScript, TypeScript, diff, deploy, commit, and
  proxied push workflow.

## Non-Goals

- Rewriting CubeCity in the site's native JavaScript.
- Embedding the site navigation inside the full-screen game.
- Adding cloud save, multiplayer, or server-side game state.
- Automatically tracking future upstream CubeCity releases.
