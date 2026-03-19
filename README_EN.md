# Rakko-TwoDollars

[简体中文](./README.md) | English

> A personal bookkeeping PWA derived from Cent.

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-green.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![PWA](https://img.shields.io/badge/PWA-supported-blue.svg)](https://Rakko.cn)
[![GitHub Repo](https://img.shields.io/badge/GitHub-KurisuRakko%2FRakko--TwoDollers-black?logo=github)](https://github.com/KurisuRakko/Rakko-TwoDollers)

Rakko-TwoDollars is an open-source bookkeeping web app derived from Cent. It keeps the original frontend-only, self-owned-data, GitHub-sync model while substantially reworking the UI and interaction flow for my own use.

- Website: [https://Rakko.cn](https://Rakko.cn)
- Repository: [https://github.com/KurisuRakko/Rakko-TwoDollers](https://github.com/KurisuRakko/Rakko-TwoDollers)
- Upstream project Cent: [https://github.com/glink25/Cent](https://github.com/glink25/Cent)

## Project Notes

- This repository is a derivative work modified from Cent, not an official upstream branch.
- The frontend UI, interaction flow, and visual presentation were heavily reworked.
- Some upstream features were removed, and some features were added for my own use case.
- Startup flow, page transitions, and local interactions were further refined with additional animation and motion polish.
- The current behavior and feature set are defined by this repository, not by the upstream project.

## Current Features

- Frontend-only PWA that can be installed on desktop or mobile
- Local offline usage plus GitHub Token based sync
- Multi-book support, categories, tags, budgets, scheduled entries, and multi-currency bookkeeping
- Search, statistics, import, and export tools
- Refined UI and motion experience for both mobile and desktop

## Local Development

```bash
pnpm install
pnpm dev
pnpm lint
```

## Attribution and License

Rakko-TwoDollars includes and adapts material from:

- **Cent**
- Original author: **glink25**
- Original repository: [https://github.com/glink25/Cent](https://github.com/glink25/Cent)
- Original license: **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**

To satisfy the attribution and modification notice requirements of CC BY-NC-SA 4.0:

- This repository is explicitly identified as a modified derivative of Cent
- Substantial changes have been made, including frontend redesign, feature removals and additions, visual updates, and animation improvements
- This repository is distributed under the same **CC BY-NC-SA 4.0** license
- No endorsement by the original author or upstream project is implied

You may share and adapt this project under the license terms, provided that you:

- keep attribution to both the original project and this derivative project
- indicate the changes you made
- do not use it for commercial purposes
- distribute derivatives under the same license

See [LICENSE](./LICENSE) or the [official CC BY-NC-SA 4.0 legal code](https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode) for the full license text.
