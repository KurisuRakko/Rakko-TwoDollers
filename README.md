# Rakko-TwoDollars

简体中文 | [English](./README_EN.md)

> 基于 Cent 二次开发的个人记账 PWA。

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-green.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![PWA](https://img.shields.io/badge/PWA-supported-blue.svg)](https://Rakko.cn)
[![GitHub Repo](https://img.shields.io/badge/GitHub-KurisuRakko%2FRakko--TwoDollers-black?logo=github)](https://github.com/KurisuRakko/Rakko-TwoDollers)

Rakko-TwoDollars 是一个开源记账 Web App，保留了 Cent「纯前端、数据自持、通过 GitHub 同步」的核心思路，并围绕我自己的使用习惯做了较大幅度的界面与交互改造。

- 官网：[https://Rakko.cn](https://Rakko.cn)
- 当前仓库：[https://github.com/KurisuRakko/Rakko-TwoDollers](https://github.com/KurisuRakko/Rakko-TwoDollers)
- 上游项目 Cent：[https://github.com/glink25/Cent](https://github.com/glink25/Cent)

## 项目说明

- 本项目是基于 Cent 修改而来的派生作品，不是原项目官方分支。
- 我重做了大量前端界面、交互流程和视觉表现。
- 移除了部分我不需要的功能，也增加了适合当前使用场景的功能。
- 针对启动流程、页面切换和局部交互补充了新的动画与过渡效果。
- 当前功能与行为以本仓库代码和发布版本为准，不代表上游项目现状。

## 当前特性

- 纯前端 PWA，可安装到桌面或移动设备使用
- 支持本地离线使用，以及基于 GitHub Token 的数据同步
- 支持多账本、分类、标签、预算、周期账单、多币种等记账能力
- 提供搜索、统计分析、数据导入导出等常用工具
- 针对移动端和桌面端都做了界面与动画体验优化

## 本地开发

```bash
pnpm install
pnpm dev
pnpm lint
```

## 署名与许可

Rakko-TwoDollars 包含并改编自以下开源项目：

- **Cent**
- 原作者：**glink25**
- 原仓库：[https://github.com/glink25/Cent](https://github.com/glink25/Cent)
- 原始许可：**Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**

为满足 CC BY-NC-SA 4.0 的署名与改动说明要求，这里明确说明：

- 本仓库是基于 Cent 修改而来的派生作品
- 我对原项目进行了实质性修改，包括但不限于前端重构、功能删改、视觉更新与动画优化
- 本仓库继续以 **CC BY-NC-SA 4.0** 协议发布
- 原作者与上游项目不对本仓库中的改动、功能或发布内容作任何背书

你可以在遵守原协议的前提下分享和改编本项目，但需要：

- 保留对原项目和当前派生项目的署名
- 标明你做过的修改
- 不得用于商业用途
- 派生作品继续使用相同许可协议

完整许可文本见 [LICENSE](./LICENSE) 或 [CC BY-NC-SA 4.0 官方说明](https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode)。
