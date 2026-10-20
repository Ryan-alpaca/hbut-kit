# 脚本清单

本目录放**可直接安装**的用户脚本，每个脚本一个子目录。

| # | 目录 | 脚本 | 版本 | 适配域名 |
|---|---|---|---|---|
| 01 | [`course-helper/`](course-helper/) | 湖工大选课助手 | v4.0.4 | `jwxt.hbut.edu.cn` |
| 02 | [`sso-login/`](sso-login/) | 湖工大统一认证 · 自动登录 | v3.1.1 | `auth.hbut.edu.cn` |

## 目录约定

每个脚本目录固定包含：

- `README.md` —— 安装、功能、实现要点、已知限制
- `<脚本名>.user.js` —— 脚本本体

## 安装方式

1. 浏览器装 [Tampermonkey](https://www.tampermonkey.net/)
2. 打开 Tampermonkey 面板 → 添加新脚本
3. 粘贴对应 `.user.js` 的全部内容 → 保存
4. 打开目标页面，右下角出现小圆钮即生效

## 新增脚本

1. 在 `dist/` 下建目录 `<脚本名>/`
2. 放 `<脚本名>.user.js` + `README.md`
3. 在上表补一行
4. 在根 `../README.md` 的脚本列表补一行

## 与 dev/ 的关系

`dist/` 只放**能直接用的东西**。构建脚本、抓包数据、测试都在 `../dev/`，
不进仓库。
