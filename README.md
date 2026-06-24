# Birthday Starlight

[![Deploy static site](https://github.com/Starkxim/birthday-starlight-lab/actions/workflows/pages.yml/badge.svg)](https://github.com/Starkxim/birthday-starlight-lab/actions/workflows/pages.yml)

Birthday Starlight is a browser-only astronomy web app. Enter a birth date, time, observing location, and equipment level; the app searches a precomputed Gaia DR3 nearby-star catalog for stars whose light left around the birth moment and arrives near future birthdays.

中文说明见下方：[中文](#生日星光)

## Features

- Finds future birthday-year targets from a static Gaia DR3 nearby-star catalog.
- Provides two candidates per year when available: best timing accuracy and easiest imaging target.
- Estimates arrival time, distance uncertainty, apparent brightness, altitude, azimuth, and observing window.
- Uses IANA time zones for birth and observing locations.
- Lets users pick an observing coordinate on an OpenStreetMap map or enter coordinates manually.
- Offers equipment levels from naked-eye dark-sky observing to advanced civilian imaging setups.
- Exports selected targets as `.ics` calendar reminders for personal calendar apps.
- Runs fully in the browser with no account system, no backend, and no visitor data upload.
- Includes a GitHub Actions workflow for publishing the static site to GitHub Pages.
- Includes a Python script and manual workflow for rebuilding the star catalog from the ESA Gaia Archive.

## Quick Start

Clone the repository and serve it with any static file server:

```bash
git clone https://github.com/Starkxim/birthday-starlight-lab.git
cd birthday-starlight-lab
python -m http.server 8787 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:8787/
```

Do not open `index.html` directly from the file system. Modern browsers may block `fetch()` requests for the local catalog file.

## Development

The app is intentionally small and framework-free:

```text
index.html                 Page structure
assets/styles.css          Visual design and responsive layout
assets/app.js              Browser-side birthday-light calculations
data/star-catalog.json     Precomputed Gaia DR3 nearby-star catalog
data/star-crossids.json    Compact SIMBAD/HIP/HD/common-name alias overlay
scripts/build_catalog.py   Gaia Archive TAP catalog builder
scripts/build_cross_identifications.py
                            SIMBAD TAP alias overlay builder
.github/workflows/         GitHub Pages and catalog rebuild workflows
```

Run a JavaScript syntax check:

```bash
node --check assets/app.js
```

Rebuild the catalog:

```bash
python scripts/build_catalog.py \
  --max-distance-ly 150 \
  --max-g-mag 14 \
  --min-parallax-over-error 20 \
  --output data/star-catalog.json
```

The catalog builder uses only the Python standard library, so it can run locally or on GitHub Actions without additional dependencies.

Rebuild the optional SIMBAD cross-identification overlay:

```bash
python scripts/build_cross_identifications.py \
  --catalog data/star-catalog.json \
  --max-g-mag 8.5 \
  --output data/star-crossids.json
```

The alias builder also uses only the Python standard library. It queries SIMBAD during preprocessing so visitors do not make per-page-load SIMBAD requests.

The catalog rebuild workflow is manual and uploads the rebuilt JSON as an artifact. It does not commit directly to `main`.

## Data Model

The public site does not query Gaia for every visitor. Instead, the Gaia Archive is queried during preprocessing, and the result is stored as `data/star-catalog.json`.

Friendly names are stored separately in `data/star-crossids.json`. The current overlay is built from SIMBAD TAP `basic` and `ident` tables for stars with Gaia G magnitude `<= 8.5`, and includes common names, Bayer/Flamsteed-style names, HIP, HD, HR, GJ, and SIMBAD main identifiers when available.

Each catalog entry includes:

- Gaia DR3 source identifier
- Right ascension and declination
- Parallax and parallax uncertainty
- Estimated distance in light-years
- Distance range implied by parallax uncertainty
- Gaia G magnitude and BP/RP color
- Proper motion when available

Distance is computed as:

```text
distance_ly = 3261.563777 / parallax_mas
```

## Deployment

This repository is ready for GitHub Pages. The workflow at `.github/workflows/pages.yml` publishes the static files using GitHub Actions.

For a public repository, GitHub Pages is available on GitHub Free. For a private repository, GitHub Pages availability depends on the GitHub plan.

The repository is intended to be maintained through issues and pull requests. Direct changes to `main` should be protected through GitHub branch protection rules.

## Limitations

- Weather cannot be forecast reliably years in advance. The app can optionally query Open-Meteo when a target night is within the 16-day forecast window, but observers should still recheck cloud cover, transparency, moon phase, and local conditions shortly before observing.
- Map search uses OpenStreetMap Nominatim and map tiles use OpenStreetMap. Users can avoid search by entering coordinates manually.
- Light pollution is not computed from the map coordinate yet. A future version could use an offline light-pollution raster or a dedicated API.
- Cross-identifications currently cover the generated SIMBAD overlay, defaulting to stars with Gaia G magnitude `<= 8.5`. Fainter candidates may still show Gaia DR3 designations.
- Time zone conversion uses browser `Intl` support for IANA time zones. Very old browsers may need a manual fallback.
- This is an educational and planning tool, not an astrometric authority.

## Completed Foundations

- Static GitHub Pages app with a precomputed Gaia DR3 nearby-star catalog and browser-only birthday matching.
- Mission and Fieldbook visual themes for different presentation styles.
- Moon phase, twilight, and altitude-window overlays for candidate targets.
- SIMBAD, HIP, and common-name overlay for the bright catalog layer, currently generated for stars with Gaia G magnitude `<= 8.5`.
- Shareable result links that encode selected settings only, without accounts or server storage.
- Optional Open-Meteo forecast checks when a target night falls inside the reliable forecast window.
- `.ics` calendar reminder export for selected birthday targets.

## Roadmap

The roadmap is prioritized by user pain and reviewability. Each item should land as its own pull request.

| Priority | Feature | Why it matters |
| --- | --- | --- |
| P1 | Offline light-pollution lookup | Location selection is already coordinate-based, but the app still cannot estimate sky quality from that coordinate. This is a major observing-difficulty gap. |
| P2 | Optional email reminders or richer reminder scheduling | Calendar export now stays static-site friendly. Email reminders would introduce backend, abuse-prevention, and privacy work. |
| P2 | Weather quality scoring refinements | Open-Meteo gives convenient forecast-window data; astronomy-specific transparency and seeing sources would make observing guidance sharper. |
| P2 | Broader cross-identification coverage | The current alias layer keeps the static payload small by defaulting to Gaia G magnitude `<= 8.5`; fainter targets need a larger offline file or a lazy lookup strategy. |
| P2 | Pull-request based catalog update workflow | The catalog rebuild workflow should produce reviewable changes through PRs, never write directly to `main`. The current manual artifact workflow is a safe baseline. |

## Contributing

Issues and pull requests are welcome. Useful areas include:

- Better star names and cross-identifications
- Improved equipment difficulty scoring
- Offline light-pollution lookup
- Moon phase and twilight calculations
- More observing-location presets
- Interface localization

Please keep the project static-site friendly and avoid adding a backend unless the feature truly needs one.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

## Acknowledgements

- ESA Gaia mission and the Gaia Archive for Gaia DR3 astrometric and photometric data
- CDS services such as SIMBAD and Aladin for astronomical identification and visualization tools
- Open-Meteo for optional forecast-window weather data
- GitHub Pages and GitHub Actions for free static-site publishing infrastructure

This project is not affiliated with or endorsed by ESA, CDS, Open-Meteo, or GitHub.

---

# 生日星光

生日星光是一个纯浏览器运行的天文网页应用。输入出生日期、时间、观测地点和设备档位后，它会在预计算的 Gaia DR3 近邻恒星星表中寻找候选恒星：这些恒星在你出生那一刻发出的光，可能会在未来某个生日附近抵达地球。

English version: [English](#birthday-starlight)

## 功能

- 从静态 Gaia DR3 近邻恒星星表中寻找未来生日年份的目标星。
- 每年尽量给出两类候选：时间最准、拍摄最稳。
- 估算抵达时刻、距离不确定范围、亮度、高度角、方位角和推荐观测窗口。
- 使用 IANA 时区分别表示出生地和观测地时区。
- 可以在 OpenStreetMap 地图上选择观测坐标，也可以手动输入经纬度。
- 设备档位从肉眼暗空到进阶民用拍摄设备，按亮度极限和操作难度分级。
- 可以把选中的目标导出为 `.ics` 日历提醒，导入个人日历应用。
- 完全在浏览器中运行，没有账号系统、没有后端、不会上传访客输入。
- 自带 GitHub Actions 工作流，可发布到 GitHub Pages。
- 自带 Python 脚本和手动工作流，可从 ESA Gaia Archive 重建恒星星表。

## 快速开始

克隆仓库并用任意静态文件服务器打开：

```bash
git clone https://github.com/Starkxim/birthday-starlight-lab.git
cd birthday-starlight-lab
python -m http.server 8787 --bind 127.0.0.1
```

打开：

```text
http://127.0.0.1:8787/
```

不要直接双击 `index.html`。浏览器可能会阻止页面读取本地的 `data/star-catalog.json`。

## 开发指南

项目刻意保持轻量，不依赖前端框架：

```text
index.html                 页面结构
assets/styles.css          视觉设计和响应式布局
assets/app.js              浏览器端生日光计算逻辑
data/star-catalog.json     预计算的 Gaia DR3 近邻恒星星表
data/star-crossids.json    精简的 SIMBAD/HIP/HD/常用名别名层
scripts/build_catalog.py   Gaia Archive TAP 星表构建脚本
scripts/build_cross_identifications.py
                            SIMBAD TAP 别名层构建脚本
.github/workflows/         GitHub Pages 与星表重建工作流
```

检查 JavaScript 语法：

```bash
node --check assets/app.js
```

重建星表：

```bash
python scripts/build_catalog.py \
  --max-distance-ly 150 \
  --max-g-mag 14 \
  --min-parallax-over-error 20 \
  --output data/star-catalog.json
```

星表构建脚本只使用 Python 标准库，因此可以在本地或 GitHub Actions 中直接运行。

重建可选的 SIMBAD 交叉标识层：

```bash
python scripts/build_cross_identifications.py \
  --catalog data/star-catalog.json \
  --max-g-mag 8.5 \
  --output data/star-crossids.json
```

别名构建脚本同样只使用 Python 标准库。它只在预处理阶段查询 SIMBAD，网页访问者不会在每次打开页面时请求 SIMBAD。

星表重建工作流需要手动触发，并把新的 JSON 作为 artifact 上传。它不会直接提交到 `main`。

## 数据模型

公开网页不会在每次访问时实时查询 Gaia。Gaia Archive 只在预处理阶段查询一次，结果保存为 `data/star-catalog.json`。

友好名称单独保存在 `data/star-crossids.json`。当前别名层来自 SIMBAD TAP 的 `basic` 和 `ident` 表，覆盖 Gaia G 星等 `<= 8.5` 的恒星；可用时包含常用名、Bayer/Flamsteed 风格名称、HIP、HD、HR、GJ 和 SIMBAD 主标识。

每条恒星记录包含：

- Gaia DR3 source id
- 赤经和赤纬
- 视差和视差不确定性
- 估算光年距离
- 由视差不确定性推导出的距离范围
- Gaia G 星等和 BP/RP 颜色
- 可用时的自行数据

距离计算公式：

```text
distance_ly = 3261.563777 / parallax_mas
```

## 部署

仓库已经可以直接部署到 GitHub Pages。`.github/workflows/pages.yml` 会通过 GitHub Actions 发布静态文件。

公开仓库可以在 GitHub Free 中使用 GitHub Pages。私有仓库是否可用取决于 GitHub 账号计划。

本仓库适合通过 issue 和 pull request 维护。`main` 分支应通过 GitHub branch protection 保护，避免直接推送。

## 限制

- 天气无法提前多年可靠预测。目标夜进入 16 天预报窗口后，页面可以选择性查询 Open-Meteo；实际观测前仍需再次检查云量、透明度、月相和本地天气。
- 地图搜索使用 OpenStreetMap Nominatim，地图瓦片使用 OpenStreetMap。用户也可以不搜索地点，直接手动输入坐标。
- 当前还没有根据地图坐标计算光污染。后续可以接入离线光污染栅格或专用 API。
- 交叉标识目前覆盖生成的 SIMBAD 别名层，默认到 Gaia G 星等 `<= 8.5`。更暗的候选目标可能仍显示 Gaia DR3 designation。
- 时区换算依赖浏览器 `Intl` 对 IANA 时区的支持。非常旧的浏览器可能需要降级方案。
- 本项目适合教育、计划和观测灵感，不应视为权威天体测量工具。

## 已完成基础能力

- 可以部署到 GitHub Pages 的纯静态网页，使用预计算 Gaia DR3 近邻恒星星表，并在浏览器本地完成生日匹配。
- 提供 Mission 与 Fieldbook 两套视觉主题。
- 为候选目标叠加月相、天文晨昏和高度窗口。
- 为亮星表层加入 SIMBAD、HIP 和常用名别名，当前默认覆盖 Gaia G 星等 `<= 8.5` 的目标。
- 生成只编码用户选择、不需要账号和服务器存储的分享链接。
- 当目标夜进入可靠预报窗口后，可选择查询 Open-Meteo 天气预报。
- 把选中的生日目标导出为 `.ics` 日历提醒文件。

## 未来路线

路线图按用户痛点和代码 review 粒度排序。每一项都应该单独开 pull request。

| 优先级 | 功能 | 为什么重要 |
| --- | --- | --- |
| P1 | 使用离线光污染数据按坐标估算天空质量 | 现在已经支持地图选点，但还不能根据坐标判断光污染，这是拍摄难度判断里的明显缺口。 |
| P2 | 可选邮件提醒或更丰富的提醒计划 | 现在已经有适合静态网站的日历导出；邮件提醒会引入后端、防滥用和隐私问题。 |
| P2 | 改进天气质量评分 | Open-Meteo 已能提供预报窗口内的天气数据；如果加入更贴近天文观测的透明度和视宁度来源，建议会更准确。 |
| P2 | 扩展更暗目标的交叉标识覆盖 | 当前别名层为了控制静态文件体积，默认覆盖 Gaia G 星等 `<= 8.5`；更暗目标需要更大的离线文件或按需查询策略。 |
| P2 | 用 pull request 更新星表 | 星表重建应产生可 review 的变更，而不是直接写入 `main`。当前手动 artifact 工作流已经是安全基线。 |

## 参与贡献

欢迎提交 issue 和 pull request。比较适合改进的方向包括：

- 更友好的恒星名称和交叉编号
- 更准确的设备难度评分
- 离线光污染查询
- 月相和天文晨昏计算
- 更多观测地点预设
- 多语言界面

请尽量保持项目对静态托管友好；除非功能确实需要，不建议引入后端服务。

## 开源协议

本项目使用 MIT License。详见 [LICENSE](LICENSE)。

## 致谢

- ESA Gaia mission 与 Gaia Archive 提供 Gaia DR3 天体测量和测光数据
- CDS 的 SIMBAD、Aladin 等服务提供天体识别和可视化工具
- Open-Meteo 提供可选的预报窗口天气数据
- GitHub Pages 与 GitHub Actions 提供静态网站发布基础设施

本项目与 ESA、CDS、Open-Meteo、GitHub 无隶属或背书关系。
