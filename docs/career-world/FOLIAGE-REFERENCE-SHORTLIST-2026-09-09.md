# Foliage references and asset leads

Researched 9 September 2026 after Steve explicitly reopened changing tree art provided it fits the world, and welcomed fantasy foliage. This supersedes treating exact preservation of the current tree as the only possible future route. The rejected generated kit remains rejected.

[Visual board with publisher previews](http://localhost:3240/). Public pages and preview images/video were inspected; licensed source assets were not acquired, tested, or integrated. Alpha/loop claims below are publisher metadata, not validation of the downloadable files.

## Recommendation

My strongest visual lead is **TriForge's Top Down: Fantasy Forest**. Its scene already demonstrates plants, undergrowth, rocks and ground transitions together, from a strategy-game viewpoint. This is a better basis for an in-world art test than assembling unrelated trees and decorative shrubs. It is a visual judgment from the publisher's preview, not proof that the assets match our terrain.

Use the Envato loops as motion references and possible source-media leads. A stock video's camera and lighting are baked in; a model-based set offers more control over matching the existing camera and light. Neither route has been validated in this renderer.

## Shortlist

| Reference | Verified listing information | Intended use / assessment |
|---|---|---|
| [Top Down: Fantasy Forest — TriForge](https://www.fab.com/listings/911cdd66-2a64-4497-a511-80d4bb79dd0e) | Unreal Engine format; seven trees and a shared set of grass, flowers, bushes and reeds; mushrooms and crystals also listed. | First art-direction lead. Inspect a small cluster at the world's actual view and scale before any commitment. |
| [Stylized Magical Forest — Sunbox](https://www.sunbox.games/asset/stylized-magical-forest-pack/) | Unity URP, animated foliage shader; firs, broadleaf trees, bushes, mushrooms and pixie ferns; coordinated colour variants. | Fantasy-understory and palette reference. Its night preview shows luminous fern forms; use those ideas as localized accents. |
| [Full conifer loop — boltiongraphics](https://elements.envato.com/pine-in-the-wind-loopable-alpha-channel-A72CG47) | 8 s, 3840x2160, 30 fps, alpha Yes, loop Yes, ProRes; source listed as 1.11 GB. | First Envato conifer motion comparison. Fuller silhouette than the sparse pine alternatives. Public preview playback verified on the board. |
| [Jeffrey pine loop — Badhn](https://elements.envato.com/pinus-jeffreyi-tree-blowing-in-the-wind-wind-blows-T34FXZU) | 8 s, 3840x2160, 25 fps, alpha Yes, loop Yes, ProRes. | Sparse crown and exposed branch-structure reference; frontal viewpoint may be a fit limitation. |
| [Common boxwood — Badhn](https://elements.envato.com/common-boxwood-blowing-in-the-wind-loop-animation--SZGKSB2) | 8 s, 3840x2160, 25 fps, alpha Yes, loop Yes, ProRes. | Compact shrub motion reference for the understory. |
| [Great Basin sagebrush — Badhn](https://elements.envato.com/great-basin-sagebrush-blowing-in-the-wind-loop-ani-PK9J65T) | 8 s, 3840x2160, 25 fps, alpha Yes, loop Yes, ProRes. | A looser shrub growth habit to compare with boxwood. |
| [Swaying pine — animix](https://elements.envato.com/pine-tree-TEM5Z36) | 30 s, 1920x1080, 29.97 fps, alpha Yes, loop No. | Secondary motion reference. Long exposed trunk; not a ready seamless-loop choice. |
| [Fairy forest with mushrooms — animix](https://elements.envato.com/fairy-forest-with-mushrooms-ZJYDNGR) | 35 s, 2560x1440, alpha No, loop No. | Fantasy composition reference only: large fungal canopies, curled plants, dense ground cover. The camera moves through a complete scene. |

Also inspected [Holotna's Forest — Stylized Fantasy Environment](https://www.artstation.com/marketplace/p/yAwnD/forest-stylized-fantasy-environment). Blender/FBX/textures and Unity packages are listed, with foliage wind support. Editable source is attractive, but its saturated, round-canopy preview is a larger visual departure from the current painting than the TriForge lead.

## Fantasy direction to test

Keep an earthy, readable main canopy and introduce distinctive growth forms: gnarled hero trees, fern clusters, larger mushrooms and a few luminous understory plants. The Sunbox night reference and Envato mushroom scene demonstrate different degrees of fantasy. These are proposed directions, not a new owner-approved palette or biome specification.

## Next useful proof

Choose a foliage family and evaluate one grounded cluster in a still image first: compatible tree, shrub, fern and optional fantasy accent, at the existing projection, light and native scale. Only after that fits should motion be assessed. The previous prototypes established neither asset-family cohesion nor production-ready artwork.

If an Envato clip is selected for actual use, test its licensed source frame, alpha and loop seam; the public watermarked preview is not the production asset. Large ProRes source files need a measured, appropriately sized runtime representation. This research does not authorize purchases or world edits.

## Board and evidence

- Build: `node docs/career-world/session3-tools/build-foliage-reference-board.mjs`.
- Serve: `python -m http.server 3240 --bind 127.0.0.1 --directory .codex-tmp/qa/foliage-reference-board`.
- Tracked board/data: `session3-tools/foliage-reference-board.html`, `session3-tools/foliage-reference-board.json`.
- Media URLs were read from the public publisher pages. The board streams those previews directly, preserves their presentation/watermarks, and links each source. It does not download or rehost source media.
- Scope: research and comparison only. The experimental renderer and all world assets remain unchanged.


## Owner response

Steve endorsed the mushroom direction: "thats a great idea for the mushrooms btw didnt even think about that". Include mushrooms in further visual exploration; no particular pack, asset, palette or placement was approved. Suggested mix is small root/rock clusters with a few larger or softly luminous forms in fantasy areas, keeping shading and palette related to the surrounding foliage.

The TriForge listing marks its AI-use flag as No. This research inspected its public presentation as an art/asset lead and did not submit its images to an image generator.
