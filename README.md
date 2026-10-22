# hbut-kit

湖北工业大学校园系统的浏览器用户脚本（Tampermonkey）。

> 仅供个人学习与自用，与学校无关。使用前请自行确认是否符合学校相关规定。

---

## 一键安装

先装好 [Tampermonkey](https://www.tampermonkey.net/)，然后点下面的「install」——
篡改猴会自动接管，弹出安装页。

| 脚本 | 版本 | 适配域名 | 安装 |
|---|---|---|---|
| 湖工大选课助手 | v4.1.0 | `jwxt.hbut.edu.cn` | [![install](https://img.shields.io/badge/install-userscript-2ea44f)](https://raw.githubusercontent.com/Ryan-alpaca/hbut-kit/main/dist/course-helper/%E6%B9%96%E5%B7%A5%E5%A4%A7%E9%80%89%E8%AF%BE%E5%8A%A9%E6%89%8B.user.js) |
| 统一认证 · 自动登录 | v3.6.0 | `auth.hbut.edu.cn`<br>`epay.hbut.edu.cn` | [![install](https://img.shields.io/badge/install-userscript-2ea44f)](https://raw.githubusercontent.com/Ryan-alpaca/hbut-kit/main/dist/auto-login/hbut-auto-login.user.js) |

> **国内打不开 `raw.githubusercontent.com`？** 用下面的 jsDelivr 镜像，效果一样。

| 脚本 | 镜像安装 |
|---|---|
| 湖工大选课助手 | [jsDelivr](https://cdn.jsdelivr.net/gh/Ryan-alpaca/hbut-kit@main/dist/course-helper/%E6%B9%96%E5%B7%A5%E5%A4%A7%E9%80%89%E8%AF%BE%E5%8A%A9%E6%89%8B.user.js) |
| 统一认证 · 自动登录 | [jsDelivr](https://cdn.jsdelivr.net/gh/Ryan-alpaca/hbut-kit@main/dist/auto-login/hbut-auto-login.user.js) |

### 手动安装（链接都失效时）

1. 打开 Tampermonkey → 添加新脚本
2. 粘贴对应 `.user.js` 全文 → 保存

详细说明见各目录下的 `README.md`。

### 自动更新

两个脚本都带 `@updateURL` / `@downloadURL`，指向本仓库的 raw 地址 ——
篡改猴会自动检查新版本，**装一次就行，之后不用手动更新**。

> 在 v3.6.0 / v4.1.0 之前装的版本没有这两个字段，需要手动重装一次才会进入自动更新。

### 版本与更新日志

| 脚本 | 当前版本 | 变更记录 |
|---|---|---|
| 湖工大选课助手 | v4.1.0 | [`dist/course-helper/CHANGELOG.md`](dist/course-helper/CHANGELOG.md) |
| 统一认证 · 自动登录 | v3.6.0 | [`dist/auto-login/CHANGELOG.md`](dist/auto-login/CHANGELOG.md) |

版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)，
日志格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。
每个版本另有 [Releases](https://github.com/Ryan-alpaca/hbut-kit/releases) 说明。

---

## 它们解决什么问题

### 选课助手

选课页原生的 19 列表格在 1100px 宽的容器里每列只有 68px，信息严重拥挤；
而且**每次切换分类都会重新请求一次课程数据**（实测无缓存），反复切会加重拥堵。

脚本做了两件事：

- **压缩信息密度**：19 列 → 5 列，固定列宽 605px，多列从上到下填充
- **消除重复请求**：所有分类一次拉齐后同时显示，之后筛选全在本地做，**筛选期间零网络请求**

另外还有网课平台标签、批次区分（公选课 / 思政课两套策略）、跨分类跳转、自动降级提交。

### 统一认证自动登录

登录页的图形验证码由浏览器内的 ONNX 模型识别，填完自动提交。

- **不需要后台程序**：onnxruntime-web + 5 MB 裁剪模型，全跑在浏览器里
- **两种密码模式**：浏览器密码管理器（默认，更安全）/ 脚本明文保存（全自动）
- **失败分级处理**：验证码错就换图重试（不消耗失败次数），密码错立刻停手
- **模型五路兜底**：npm 镜像 → jsDelivr 的 GitHub 通道 → GitHub raw → unpkg → jsDelivr

---

## 目录

```
.
├── README.md
├── LICENSE
├── .gitignore
│
├── dist/                     ← ★ 发布目录（可直接安装的脚本）
│   ├── README.md
│   ├── course-helper/
│   │   ├── README.md
│   │   └── 湖工大选课助手.user.js
│   └── auto-login/
│       ├── README.md
│       ├── hbut-auto-login.user.js
│       └── models/
│           └── captcha_cropped.onnx      5 MB，自动下载的兜底
│
└── dev/                      ← 开发目录（不提交，见 .gitignore）
    ├── build/  tools/  tests/  debug/  docs/  data/     选课助手的开发文件
    └── auto-login/                                       自动登录的开发文件
```

**`dist/` 是给使用者的，`dev/` 是给开发者的。** 前者进仓库，后者不进。

---

## 许可

本仓库以 **MIT** 许可发布，见 [`LICENSE`](LICENSE)。

脚本用到的第三方作品（ddddocr 的 OCR 模型、onnxruntime-web）各自的版权声明
保留在 [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md) 里。
其中 `dist/auto-login/models/captcha_cropped.onnx` 是 ddddocr 模型的**裁剪版本**，
同为 MIT，按许可要求附上了原始声明与改动说明。

---

## 免责

仅供个人学习自用，与学校无关。使用前请自行确认是否符合学校相关规定。

