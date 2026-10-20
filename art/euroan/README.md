# art/euroan — Euroan, red-haired male

Walk sheet and portrait for Euroan. These two PNGs are the only files the game
ships (`scripts/sync-pixel-assets.mjs` copies them into `src/assets/pixel/`).
The character description in `progression.ts` is unchanged.

| File | Layout |
|---|---|
| `char-euroan-walk.png` | 128×128 = 4 columns × 4 rows of 32×32 frames. Columns: down, up, left, right. Rows: walk frames. |
| `char-euroan-face.png` | 38×38 portrait (same size as the other faces). |

Frames come from the official Universal LPC walk sheets (576×256, 9×4 of 64×64).
Walk frames 0, 2, 4, 6 of each direction were nearest-neighbour scaled to 32×32.
Row order on those sheets is up, left, down, right; the game sheet reorders them
to down, up, left, right. `drawUnit` uses the same 1.2 draw scale as Linya so the
padded LPC figure matches the 16px cast.

## What he is

A red-haired man in a dark trench coat and pale boots. Hair is the generator's
bedhead sheet, which is already reddish-orange. No text or stats were changed.

## License — CC BY-SA 3.0

The body, hair, trench coat, and boots are CC BY-SA, so this combined sprite is
**CC BY-SA 3.0**. Same exception as `art/linya/`: the packs already in the repo
have no red-haired male walk cycle.

Say you used Liberated Pixel Cup / Universal LPC art by the people below, and
link the license: https://creativecommons.org/licenses/by-sa/3.0/

| Layer | Author | Their license | Source |
|---|---|---|---|
| Male body (`body/bodies/male/walk.png`) | bluecarrot16, JaidynReiman, Benjamin K. Smith (BenCreating), Evert, Eliza Wyatt (ElizaWy), TheraHedwig, MuffinElZangano, Durrani, Johannes Sjölund (wulax), Stephen Challener (Redshrike) | OGA-BY 3.0, CC BY-SA 3.0, GPL 3.0 | https://opengameart.org/content/lpc-character-bases |
| Male head (`head/heads/human/male/walk.png`) | bluecarrot16, Benjamin K. Smith (BenCreating), Stephen Challener (Redshrike) | OGA-BY 3.0, CC BY-SA 3.0, GPL 3.0 | https://opengameart.org/content/lpc-character-bases |
| Eyes (`eyes/human/adult/default/walk.png`) | Universal LPC default adult eyes | see generator `CREDITS.csv` | https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator |
| Bedhead hair (`hair/bedhead/adult/walk.png`) | JaidynReiman, Manuel Riecke (MrBeast) | CC BY-SA 3.0, GPL 3.0 | Universal LPC spritesheet generator |
| Trench coat, dark gray (`torso/jacket/trench/male/walk/dark_gray.png`) | bluecarrot16 | CC BY-SA 3.0, GPL 3.0 | Universal LPC spritesheet generator |
| Basic boots (`feet/boots/basic/male/walk.png`) | JaidynReiman, bluecarrot16, Nila122 | OGA-BY 3.0, CC BY-SA 3.0, GPL 2.0, GPL 3.0 | Universal LPC spritesheet generator |

Layers were taken from [Universal LPC Spritesheet Character Generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator) (`spritesheets/`). Credits match that repo's `CREDITS.csv`. Where a file is dual-licensed, this project uses CC BY-SA 3.0.
