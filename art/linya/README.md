# art/linya — Linya, the cat beastkin

Walk sheet and portrait for Linya. These two PNGs are the only files the game
ships (`scripts/sync-pixel-assets.mjs` copies them into `src/assets/pixel/`).

| File | Layout |
|---|---|
| `char-linya-walk.png` | 128×128 = 4 columns × 4 rows of 32×32 frames. Columns: down, up, left, right. Rows: walk frames. |
| `char-linya-face.png` | 38×38 portrait (same size as the other faces). |

The frames are larger than the Ninja Adventure 16×16 sheets so the ears and tail
stay readable. `drawUnit` scales this sheet so her on-screen height matches the
other characters.

## What she is

A humanoid black cat: cat ears, cat tail, black bob, green eyes, pink kimono,
black boots. Composited from Universal LPC layers (64×64 walk rows, nearest-
neighbour down to 32×32). Not a mask, not a quadruped.

## License — CC BY-SA 3.0

The body and the eyes are CC BY-SA, so this combined sprite is **CC BY-SA 3.0**.
That is the one exception to the CC0 / CC-BY rule in `art/README.md`: the packs
already in the repo have no cat-person walk cycle.

Say you used Liberated Pixel Cup / Universal LPC art by the people below, and
link the license: https://creativecommons.org/licenses/by-sa/3.0/

| Layer | Author | Their license | Source |
|---|---|---|---|
| Female body (`light`) | Benjamin K. Smith (BenCreating), bluecarrot16, TheraHedwig, Evert, MuffinElZangano, Durrani, Pierre Vigier (pvigier), ElizaWy, Matthew Krohn (makrohn), Johannes Sjölund (wulax), Stephen Challener (Redshrike) | CC BY-SA 3.0, GPL 3.0, OGA-BY 3.0 | https://opengameart.org/content/lpc-character-bases |
| Small female head (`light`) | ElizaWy, Stephen Challener (Redshrike) | OGA-BY 3.0, CC BY | https://opengameart.org/content/lpc-character-bases |
| Eyes (`green`) | Stephen Challener (Redshrike), Matthew Krohn (makrohn), JaidynReiman | CC BY-SA 3.0, GPL 3.0, OGA-BY 3.0 | https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles |
| Bob hair (`black`) | bluecarrot16, ElizaWy | CC0 | https://opengameart.org/content/lpc-hair |
| Cat ears, cat tail (`black`) | JaidynReiman | CC BY 3.0, OGA-BY 3.0, GPL 3.0 | https://opengameart.org/content/lpc-furry-ears-tails-for-rpg-sprites |
| Kimono (`pink`) | JaidynReiman | CC BY 3.0, OGA-BY 3.0, GPL 3.0 | Universal LPC spritesheet generator |
| Fold boots (`black`) | JaidynReiman | CC BY 3.0, OGA-BY 3.0, GPL 3.0 | Universal LPC spritesheet generator |

Layers were taken from [Universal LPC Spritesheet Character Generator](https://github.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator) (`spritesheets/`). Where a file is dual-licensed, the license named above is the one this project uses.
