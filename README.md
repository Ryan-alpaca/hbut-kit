# hbut-kit

湖北工业大学教务系统（`jwxt.hbut.edu.cn`）选课页的浏览器用户脚本。

> 仅供个人学习与自用，与学校无关。使用前请自行确认是否符合学校相关规定。

---

## 脚本

| 脚本 | 版本 | 适配域名 |
|---|---|---|
| [湖工大选课助手](dist/course-helper/) | v4.0.4 | `jwxt.hbut.edu.cn` |

---

## 安装

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/)
2. 打开 Tampermonkey → 添加新脚本
3. 粘贴 [`dist/course-helper/湖工大选课助手.user.js`](dist/course-helper/湖工大选课助手.user.js) 全文 → 保存
4. 打开选课页，右下角出现小圆钮即生效

详细说明见 [`dist/course-helper/README.md`](dist/course-helper/README.md)。

---

## 它解决什么问题

选课页原生的 19 列表格在 1100px 宽的容器里每列只有 68px，信息严重拥挤；
而且**每次切换分类都会重新请求一次课程数据**（实测无缓存），反复切会加重拥堵。

脚本做了两件事：

- **压缩信息密度**：19 列 → 5 列，固定列宽 605px，多列从上到下填充
- **消除重复请求**：所有分类一次拉齐后同时显示，之后筛选全在本地做，**筛选期间零网络请求**

另外还有网课平台标签、批次区分（公选课 / 思政课两套策略）、跨分类跳转、自动降级提交。

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
│   └── course-helper/
│       ├── README.md
│       └── 湖工大选课助手.user.js
│
└── dev/                      ← 开发目录（不提交，见 .gitignore）
    ├── build/                构建脚本
    ├── tools/                抓数据、浏览器会话等工具
    ├── tests/                真机回归测试
    ├── debug/                一次性诊断探针
    ├── docs/                 说明文档、分析报告
    └── data/                 抓取到的原始数据快照
```

**`dist/` 是给使用者的，`dev/` 是给开发者的。** 前者进仓库，后者不进。

---

## 免责

仅供个人学习自用，与学校无关。使用前请自行确认是否符合学校相关规定。
