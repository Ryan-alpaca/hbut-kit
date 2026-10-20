# 第三方组件与许可

本仓库整体以 **MIT** 许可发布，见 [`LICENSE`](LICENSE)。

下面列出**随仓库分发**或**运行时加载**的第三方作品。它们各自遵循自己的许可，
本文件按 MIT 的要求保留其版权声明。

---

## 1. ddddocr 的 OCR 模型（已修改）

| 项 | 内容 |
|---|---|
| 项目 | [ddddocr](https://github.com/sml2h3/ddddocr) |
| 许可 | MIT |
| 分发位置 | `dist/auto-login/models/captcha_cropped.onnx` |
| 是否修改 | **是**（裁剪输出层） |

**改动说明**：原始模型 `common_old.onnx`（13 MB）的输出层是 `(1024, 8210)`，
覆盖汉字等 8210 个字符类。验证码只可能是 `0-9` 和大小写字母，因此把输出维度裁到
`(1024, 63)`，体积降到 5.0 MB，其余权重与结构未改动。
裁剪前后在 15 张真实验证码上的识别结果完全一致。

> MIT 允许修改和再分发，但要求保留版权声明与许可全文 —— 即下面这段。

```
The MIT License (MIT)
Copyright © 2022 <copyright holders>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

---

## 2. onnxruntime-web（运行时加载，未分发）

| 项 | 内容 |
|---|---|
| 项目 | [Microsoft ONNX Runtime](https://github.com/microsoft/onnxruntime) |
| 许可 | MIT |
| 分发位置 | 无。`hbut-auto-login.user.js` 通过 `@require` 从 CDN 加载 |
| 是否修改 | 否 |

因为本仓库**不包含**它的代码副本，严格来说不构成再分发；列出仅为说明依赖关系。

```
MIT License

Copyright (c) Microsoft Corporation

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

---

## 3. 本仓库不包含什么

为避免误解，明确说明：

- **不含**学校教务系统 / 统一认证系统的任何源码、接口文档、静态资源
- **不含**任何学生个人信息、成绩、课表、账号密码
- **不含**抓包数据、接口响应快照
- 脚本中的接口路径、DOM 选择器均来自**公开可访问的页面本身**，未复制第三方代码

---

## 4. 与「版权」无关但需要说明的

- 脚本会**自动化操作**学校系统。这可能涉及学校的使用规定，属于**合规**问题而非版权问题，
  使用前请自行确认。
- 自动登录脚本识别的是**你自己账号**的验证码，走的是页面原本的登录流程，
  没有绕过任何加密或鉴权机制。
- 仓库名与脚本名中的「湖工大」仅用于说明适用场景，与学校无隶属或背书关系。
