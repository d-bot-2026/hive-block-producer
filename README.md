# Hive Block Producer

A free browser block puzzle game with a Hive blockchain theme. Stack transactions, survive hardforks, dodge downvotes.

**Play:** https://d-bot-2026.github.io/hive-block-producer/

- No login, no install, works on desktop and mobile, 8 languages.
- All HIVE, HBD, HP and RC in the game are game points only. They are not real cryptocurrency, have no value and cannot be withdrawn. The game does not connect to any wallet or blockchain.
- Unofficial fan project, not affiliated with Hive.

Feedback and bug reports: [Issues](https://github.com/d-bot-2026/hive-block-producer/issues).

## Versions

The current version and release notes live in `version.js` (shown in the game footer). After adding a release there, run `node scripts/changelog.js` to regenerate [CHANGELOG.md](CHANGELOG.md).

## Honeycomb mode (prototype)

`honeycomb.html` tries the same game on a hexagon board: flat-top hexagons in straight columns, so pieces still fall straight down, while a full zigzag row clears. It has the seven 4-cell hexagon pieces and 60° turns but none of the tokens or specials yet, and stays out of search results until it becomes a real mode. Try it at https://d-bot-2026.github.io/hive-block-producer/honeycomb.html.

## Versus play and Hive login (in progress)

`net/` holds the browser modules and `server/` a small reference server. They are built and tested but not switched on yet. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how they fit and the planned order.

## License

The code is licensed under the [Apache License 2.0](LICENSE). You are welcome to take the idea and the code and build on them. Please keep the [NOTICE](NOTICE) file and credit the original project.

## Name and look

The Apache License does not grant rights to the name "Hive Block Producer" (see section 6 of the license). If you publish your own version:

- give it a different name, and
- give it its own visual design (colors, icons, share image, overall look),

so players can tell it apart from the original and nobody assumes the original author endorses it.
