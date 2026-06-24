# SM63Redux / llr-mariorun integration notes

Date: 2026-06-24

## User intent

Replace the lightweight Canvas `/llr-mariorun` prototype with a richer game based on `https://github.com/Redux-Team/Legacy_SM63Redux`, while keeping the existing site requirement that admins can customize game materials/assets online.

## Upstream inspection

- Repository: `Redux-Team/Legacy_SM63Redux`
- Checked HEAD: `cde0b9e748d3c7c0827eff644120aae027dfb80c`
- Local scratch clone: `vendor/Legacy_SM63Redux/` (ignored; do not commit)
- License file in upstream: MPL-2.0 text in `LICENSE.txt`
- Engine: Godot 4.3 (`project.godot` has `config/features=PackedStringArray("4.3")`)
- Main scene: `res://scenes/menus/title/title.tscn`
- Web export preset exists: preset name `Web`, export path `../Super Mario 63 Redux.html`
- Upstream tree size after shallow clone is large because it includes Android template artifacts and binaries.

## Toolchain proof

Downloaded to temp, not the repo:

- Godot 4.3 stable Windows binary
- Godot 4.3 stable export templates

The Windows Schannel download error `CRYPT_E_REVOCATION_OFFLINE` was resolved with `curl --ssl-no-revoke`, which avoids changing global Windows certificate settings.

Command that produced a Web export:

```powershell
$godot = Join-Path $env:TEMP 'godot-4.3-tools\godot\Godot_v4.3-stable_win64_console.exe'
$out = Join-Path $env:TEMP 'sm63redux-web-export'
& $godot --headless --path 'C:\Users\宽宽\Documents\Codex\2026-05-08\cloudflare\vendor\Legacy_SM63Redux' --export-release 'Web' (Join-Path $out 'index.html')
```

Observed output:

- `index.html`
- `index.js`
- `index.wasm`
- `index.pck`
- icon/splash files

Approximate output size is 45MB.

## Current blockers / constraints

1. The raw upstream Web export packs Mario/Nintendo-themed assets into `index.pck`. Do not publicly deploy that raw asset pack on the site without rights.
2. Export logs show missing upstream resources, including:
   - `res://scenes/levels/tutorial_1/tutorial_1.mp3`
   - `res://scenes/menus/title/title.mp3`
   - `res://scenes/menus/title/main_menu/menu_day.mp3`
   - `res://scenes/menus/level_designer/music/editor1.ogg` and siblings
3. Some Godot resource parsing/script errors appear during headless export; the generated output exists, but runtime QA is required before relying on it.
4. The existing Cloudflare account still has R2 disabled (`10042 Please enable R2 through the Cloudflare Dashboard`), so admin-uploaded assets currently use the existing KV fallback until R2 is enabled.

## Integration direction

Do not replace the site with the raw upstream export. Build a safer compatibility layer:

1. Keep `Legacy_SM63Redux` as an ignored upstream working copy or submodule reference, not a committed asset dump.
2. Patch the Godot project with an `AssetOverride` autoload that:
   - fetches `/api/game/manifest`;
   - reads the selected/admin-default asset pack;
   - loads external images/audio from `/api/game/assets/...`;
   - replaces known Godot textures/sprite sheets at runtime.
3. Add SM63-specific slots to the existing game manifest:
   - `sm63.player.sheet` → replaces `classes/player/mario_sheet.png`
   - `sm63.enemy.goomba.walk`
   - `sm63.enemy.goomba.jump`
   - `sm63.enemy.goomba.squish`
   - `sm63.enemy.koopa.walk`
   - `sm63.pickup.coins`
   - `sm63.terrain.jungle`
   - `sm63.ui.title`
   - `sm63.audio.title`, `sm63.audio.editor.*`
4. Generate and deploy a debranded/customizable Web build only after default visible assets are either admin-provided or replaced by original placeholder art.
5. Keep the existing `/llr-mariorun` Worker/admin APIs so old Canvas prototype data can be migrated rather than discarded.

## First technical patch targets

- `project.godot`: add `AssetOverrides` autoload.
- New Godot script: `classes/global/asset_overrides/asset_overrides.gd`.
- Player sheet path discovered in `classes/player/player.tscn`:
  - `res://classes/player/mario_sheet.png`
- Goomba sheet paths discovered in `classes/entity/enemy/goomba/goomba.tscn`:
  - `goomba_walk.png`
  - `goomba_jump.png`
  - `goomba_squish.png`
- Koopa sheet path discovered in `classes/entity/enemy/koopa/koopa.tscn`:
  - `koopa_walk.png`
- Coin sheet path discovered in `classes/pickup/coin/*.tscn`:
  - `classes/pickup/coin/coins.png`

## Completion criteria for this replacement

- `/llr-mariorun` serves the Godot-based game shell, not the lightweight Canvas prototype.
- Raw upstream copyrighted/branded assets are not the public default.
- Admin can upload/select SM63-specific sheets through the existing backend.
- Runtime visibly applies at least the player and one enemy override.
- Desktop and mobile smoke tests pass.
- Cloudflare deploy succeeds.
- HANDOFF records upstream commit, Godot version, build commands, and R2/KV storage state.
- Git commit/push completes.
