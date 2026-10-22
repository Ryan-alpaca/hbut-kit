// ==UserScript==
// @name         湖工大统一认证 · 自动登录
// @namespace    local.hbut.autologin
// @version      3.7.0
// @description  自动识别图形验证码完成登录，OCR 跑在浏览器里，带常驻控制面板
// @author       Ryan-alpaca
// @match        https://auth.hbut.edu.cn/authserver/login*
// @match        http://epay.hbut.edu.cn/*
// @updateURL    https://raw.githubusercontent.com/Ryan-alpaca/hbut-kit/main/dist/auto-login/hbut-auto-login.user.js
// @downloadURL  https://raw.githubusercontent.com/Ryan-alpaca/hbut-kit/main/dist/auto-login/hbut-auto-login.user.js
// @require      https://registry.npmmirror.com/onnxruntime-web/1.20.0/files/dist/ort.min.js
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      registry.npmmirror.com
// @connect      unpkg.com
// @connect      cdn.jsdelivr.net
// @connect      raw.githubusercontent.com
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  // =========================================================================
  // 配置
  // =========================================================================
  const ORT_BASE = 'https://registry.npmmirror.com/onnxruntime-web/1.20.0/files/dist/';
  const CHARSET = ['', ...'0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'];

  const DB_NAME = 'hbut_ocr';
  const DB_STORE = 'models';
  const DB_KEY = 'captcha_v1';

  // 模型下载源，按顺序尝试，前一个失败才试下一个。
  //
  // 顺序是按「国内可达性 + 速度」排的，不是随手排的：
  //
  // ① npmmirror 的 tarball —— 它的 /files/ 路径对新包有白名单限制（403），
  //    但标准 tarball 路径不受限，而且是 gzip 压缩过的（5.0MB -> 3.6MB），
  //    实测 1.4 秒。浏览器用 DecompressionStream 解开就行。国内最快。
  //
  // ② jsDelivr 的 GitHub 通道 —— 直接从本仓库取模型，不依赖 npm 包是否还在。
  //    jsDelivr 在国内多数网络能通，是「npm 包被删 / 被墙」时的第一道兜底。
  //
  // ③ GitHub raw —— 最原始也最可靠（只要仓库还在），但国内常被 RST，
  //    所以给了短超时（20s），不通就快速放弃，不拖住整个流程。
  //
  // ④⑤ 另外两个 npm 裸文件源，实测 13~36 秒，慢但能兜底。
  //
  // 全部挂掉就回落到「手动选本地 models/captcha_cropped.onnx」。
  const GH_RAW_BASE = 'https://raw.githubusercontent.com/Ryan-alpaca/hbut-kit/main/dist/auto-login/models/';
  const GH_JSD_BASE = 'https://cdn.jsdelivr.net/gh/Ryan-alpaca/hbut-kit@main/dist/auto-login/models/';

  const MODEL_SOURCES = [
    {
      url: 'https://registry.npmmirror.com/captcha-ocr-model/-/captcha-ocr-model-1.0.1.tgz',
      tgz: true,
      tag: '①',
      name: 'npmmirror（最快）',
    },
    {
      url: GH_JSD_BASE + 'captcha_cropped.onnx',
      tgz: false,
      timeout: 120000,
      tag: '②',
      name: 'jsDelivr·GitHub',
    },
    {
      url: GH_RAW_BASE + 'captcha_cropped.onnx',
      tgz: false,
      timeout: 20000,
      tag: '③',
      name: 'GitHub raw',
    },
    {
      url: 'https://unpkg.com/captcha-ocr-model@latest/models/captcha_cropped.onnx',
      tgz: false,
      tag: '④',
      name: 'unpkg',
    },
    {
      url: 'https://cdn.jsdelivr.net/npm/captcha-ocr-model@latest/models/captcha_cropped.onnx',
      tgz: false,
      tag: '⑤',
      name: 'jsDelivr·npm',
    },
  ];

  const MAX_CAPTCHA_TRY = 6;
  const MAX_SUBMIT = 3;
  const WAIT_CRED_MS = 60000;

  const K_MODE = 'hbut_mode';       // 'edge' | 'stored'
  const K_USER = 'hbut_user';
  const K_PASS = 'hbut_pwd';
  const K_STATE = 'hbut_auto_state';
  const K_SKIP = 'hbut_auto_skip';
  const K_SRC = 'hbut_src';         // 模型线路：'' 自动 | '0'..'4' 指定 | 'manual' 手动导入
  const K_ANIM = 'hbut_anim';       // 验证码动画：'1' 开（默认）| '0' 关
  const K_EPAY = 'hbut_epay_state'; // epay 自动重试计数（sessionStorage）
  const K_MODEL_B64 = 'hbut_model_b64'; // 模型字节的 base64 镜像，跨站点共享

  const F = '#pwdFromId';           // 页面有 4 个 form，id 重复，必须限定作用域

  // =========================================================================
  // 沙箱兼容
  // ---------------------------------------------------------------------------
  // 声明了 @grant 之后，脚本跑在篡改猴的沙箱里，这里的 window 是一个隔离代理，
  // 页面上定义的全局函数（encryptPassword、needCaptcha 等）在它上面看不见。
  // 必须通过 unsafeWindow 拿真正的页面 window。
  // =========================================================================
  const W = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;

  // 两个站点的登录机制完全不同：
  //   cas  —— auth.hbut.edu.cn，表单 #pwdFromId，走 CAS 票据
  //   epay —— http://epay.hbut.edu.cn/，ASP.NET 表单，自带验证码（只开 80 端口）
  const SITE = (W.location && W.location.hostname === 'epay.hbut.edu.cn') ? 'epay' : 'cas';

  // 页面自己的 AES 加密函数，可能挂在任一个 window 上，都找一遍
  function getEncryptFn() {
    if (W && typeof W.encryptPassword === 'function') return W.encryptPassword.bind(W);
    if (typeof window.encryptPassword === 'function') return window.encryptPassword.bind(window);
    return null;
  }

  // =========================================================================
  // 基础工具
  // =========================================================================
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (sel, root) => (root || document).querySelector(sel);

  function waitFor(fn, timeout = 8000, step = 120) {
    return new Promise((resolve) => {
      const t0 = Date.now();
      (function poll() {
        let v = null;
        try { v = fn(); } catch (e) { v = null; }
        if (v) return resolve(v);
        if (Date.now() - t0 > timeout) return resolve(null);
        setTimeout(poll, step);
      })();
    });
  }

  // =========================================================================
  // 全屏成功层
  // ---------------------------------------------------------------------------
  // ⚠️ 这是「乐观播放」：在提交之前播完。因为 CAS 登录成功后浏览器会立刻 302
  //   跳转、页面被销毁，任何"提交后再播"的动画都会被掐断。
  //   代价：验证码错时也会先播一遍，随后页面跳到错误页。
  //   动画播完（约 0.72s）才真正提交；层本身不主动移除，让跳转自然带它走，
  //   另设 3s 兜底移除，避免提交失败时糊住页面。
  // =========================================================================
  function playSuccessOverlay() {
    if (!animOn() || !UI.root) return Promise.resolve();

    return new Promise((resolve) => {
      let layer = null;
      try {
        layer = document.createElement('div');
        layer.className = 'ok-layer';
        layer.innerHTML =
          '<svg class="ok-ck" viewBox="0 0 120 120">' +
            '<path d="M28 62l22 22 42-44"/></svg>';
        UI.root.appendChild(layer);
        setTimeout(() => { try { if (layer && layer.parentNode) layer.parentNode.removeChild(layer); } catch (e) {} }, 3000);
      } catch (e) {
        return resolve();
      }
      setTimeout(resolve, 860);
    });
  }

  // =========================================================================
  // 控制面板（常驻，shadow DOM 隔离样式，避免被页面 CSS 污染）
  // =========================================================================
  const UI = {
    host: null,
    root: null,
    statusEl: null,
    accountEl: null,
    collapsed: false,
  };

  // 模型下载的运行时状态（面板按钮、状态行、进度条都读这几个）
  let dlState = 'idle';        // idle | downloading | aborted | failed
  let dlAborted = false;       // 本轮下载是否被用户中断
  let restartAfterAbort = false; // 中断是为了换线路 -> 结束后自动按新线路重来
  let activeReq = null;        // 当前 GM_xmlhttpRequest 句柄，用于 abort()
  let activeReject = null;     // 当前下载的 reject，abort 时手动结算，避免 Promise 悬着
  let ocrLoading = null;       // 防止 initOcr 被并发调用（换线路 / 手动重试可能撞上）

  const PANEL_CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .wrap {
      position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
      width: 288px; font: 13px/1.6 -apple-system, "Microsoft YaHei", sans-serif;
      color: #1e293b; background: #fff; border-radius: 10px;
      box-shadow: 0 8px 28px rgba(15,23,42,.18); border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .hdr {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
      cursor: pointer; user-select: none;
    }
    .hdr b { font-size: 13px; font-weight: 600; }
    .dot { display:inline-block; width:7px; height:7px; border-radius:50%; margin-right:6px; }
    .body { padding: 10px 12px 12px; }
    .status {
      font-size: 12.5px; line-height: 1.55; padding: 8px 10px; border-radius: 6px;
      background: #f1f5f9; color: #334155; overflow-wrap: anywhere; min-height: 34px;
      white-space: pre-line;   /* 只在 
 处换行，别把「1.5s」拆成两半 */
    }
    .status.err { background: #fef2f2; color: #b91c1c; }
    .status.ok  { background: #f0fdf4; color: #15803d; }
    .status.warn{ background: #fffbeb; color: #b45309; }
    .row { margin-top: 8px; font-size: 12px; color: #64748b;
      display: flex; align-items: center; gap: 6px; }
    .row b { color: #334155; font-weight: 500; }
    .row select {
      flex: 1; min-width: 0; font: inherit; font-size: 12px; padding: 2px 4px;
      border: 1px solid #cbd5e1; border-radius: 5px; background: #fff;
      color: #334155; cursor: pointer;
    }
    .bar { height: 3px; background: #e2e8f0; border-radius: 2px; margin-top: 6px;
      overflow: hidden; display: none; }
    .bar.on { display: block; }
    .bar > i { display: block; height: 100%; width: 0; background: #2563eb;
      transition: width .15s linear; }
    .acts { display: flex; gap: 6px; margin-top: 10px; }
    button {
      flex: 1; padding: 6px 4px; border-radius: 6px; border: 1px solid #cbd5e1;
      background: #fff; color: #334155; font-size: 12px; cursor: pointer;
      font-family: inherit; transition: background .15s;
    }
    button:hover:not(:disabled) { background: #f1f5f9; }
    button:disabled { color: #cbd5e1; cursor: default; }
    button.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
    button.primary:hover:not(:disabled) { background: #1d4ed8; }
    button.primary:disabled { background: #94a3b8; border-color: #94a3b8; cursor: default; }
    .collapsed .body { display: none; }

    /* ---- 验证码落入动画（覆盖在页面输入框上方，纯装饰）---- */
    .cap-anim {
      position: fixed; pointer-events: none; z-index: 2147483645;
      display: flex; align-items: center; justify-content: center; gap: 4px;
      background: #fff; border: 1px solid #93c5fd; border-radius: 7px;
      overflow: hidden;
      font: 16px/1 ui-monospace, Consolas, monospace; color: #0f172a;
      animation: capIn .26s cubic-bezier(.2,.8,.3,1) both,
                 capGlow 1.15s ease-out both;
    }
    .cap-anim span {
      width: 1ch; text-align: center;
      opacity: 0;
      animation: capDrop .44s cubic-bezier(.16,1.05,.3,1) forwards;
    }
    .cap-anim .cap-bar {
      display: block; position: absolute; left: 0; bottom: 0; height: 3px; width: 0;
      background: linear-gradient(90deg, #6ee7b7 0%, #34d399 35%, #16a34a 65%, #34d399 100%);
      background-size: 220% 100%;
      animation: capFill .54s cubic-bezier(.4,0,.2,1) forwards,
                 capFlow 1.6s linear infinite;
    }
    .cap-anim .ck {
      position: absolute; right: 8px; top: 50%; width: 15px; height: 15px;
      margin-top: -7.5px; opacity: 0;
      animation: capCheckIn .36s cubic-bezier(.2,1.3,.4,1) forwards;
    }
    .cap-anim .ck path {
      stroke: #16a34a; stroke-width: 2.4; fill: none;
      stroke-linecap: round; stroke-linejoin: round;
      stroke-dasharray: 26; stroke-dashoffset: 26;
      animation: capCheck .36s cubic-bezier(.6,0,.4,1) forwards;
    }
    @keyframes capIn {
      from { opacity: 0; transform: scale(.94); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes capGlow {
      0%   { box-shadow: 0 0 0 3px rgba(37,99,235,.16); }
      65%  { box-shadow: 0 0 0 4px rgba(34,197,94,.16); }
      100% { box-shadow: 0 0 0 5px rgba(22,163,74,.10); }
    }
    @keyframes capDrop {
      0%   { transform: translateY(-24px) scale(.55); opacity: 0; filter: blur(3px); }
      55%  { transform: translateY(4px) scale(1.10); opacity: 1; filter: blur(0); }
      78%  { transform: translateY(-1.5px) scale(.97); }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }
    @keyframes capFill  { to { width: 100%; } }
    @keyframes capFlow  { from { background-position: 0% 0; } to { background-position: 220% 0; } }
    @keyframes capCheckIn {
      0%   { opacity: 0; transform: scale(.4); }
      60%  { opacity: 1; transform: scale(1.15); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes capCheck { to { stroke-dashoffset: 0; } }

    @media (prefers-reduced-motion: reduce) {
      .cap-anim, .cap-anim span, .cap-anim .cap-bar,
      .cap-anim .ck, .cap-anim .ck path { animation: none; opacity: 1; }
      .cap-anim { box-shadow: 0 0 0 3px rgba(37,99,235,.14); }
      .cap-anim .cap-bar { width: 100%; }
      .cap-anim .ck path { stroke-dashoffset: 0; }
    }

    /* ---- 全屏成功层：绿色从中心铺满 + 对勾画出 ---- */
    .ok-layer {
      position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(160deg, #34d399 0%, #16a34a 100%);
      clip-path: circle(0% at 50% 50%);
      animation: okSweep .46s cubic-bezier(.4,0,.2,1) forwards;
    }
    .ok-ck { width: 160px; height: 160px; }
    .ok-ck path {
      fill: none; stroke: #fff; stroke-width: 9;
      stroke-linecap: round; stroke-linejoin: round;
      stroke-dasharray: 100; stroke-dashoffset: 100;
      animation: okCheck .34s cubic-bezier(.6,0,.4,1) .34s forwards;
    }
    @keyframes okSweep { to { clip-path: circle(150% at 50% 50%); } }
    @keyframes okCheck { to { stroke-dashoffset: 0; } }

    @media (prefers-reduced-motion: reduce) {
      .ok-layer { animation: none; clip-path: circle(150% at 50% 50%); }
      .ok-ck path { animation: none; stroke-dashoffset: 0; }
    }
  `;

  function buildPanel() {
    if (UI.host) return;
    UI.host = document.createElement('div');
    UI.host.id = 'hbut-panel-host';
    // 做成 0 尺寸的 fixed 容器：不占页面布局，里面的 .wrap 自己 fixed 定位
    UI.host.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;';
    UI.root = UI.host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = PANEL_CSS;

    const wrap = document.createElement('div');
    wrap.className = 'wrap';
    wrap.innerHTML = `
      <div class="hdr" id="hdr">
        <b><span class="dot" id="dot" style="background:#94a3b8"></span>湖工大自动登录</b>
        <span id="toggle" style="color:#94a3b8;font-size:14px;">—</span>
      </div>
      <div class="body">
        <div class="status" id="status">正在初始化…</div>
        <div class="bar" id="bar"><i id="barfill"></i></div>
        <div class="row">账号：<b id="account">—</b></div>
        <div class="row">线路：<select id="src" title="模型下载线路"></select></div>
        <div class="acts">
          <button id="btn-set">设置</button>
          <button id="btn-login" style="display:none">登录</button>
          <button id="btn-abort" disabled>中断</button>
          <button id="btn-skip">跳过</button>
        </div>
      </div>
    `;

    UI.root.appendChild(style);
    UI.root.appendChild(wrap);
    document.body.appendChild(UI.host);

    UI.statusEl = UI.root.getElementById('status');
    UI.accountEl = UI.root.getElementById('account');
    UI.dotEl = UI.root.getElementById('dot');
    UI.barEl = UI.root.getElementById('bar');
    UI.barFillEl = UI.root.getElementById('barfill');
    UI.abortBtn = UI.root.getElementById('btn-abort');

    UI.root.getElementById('hdr').onclick = () => {
      UI.collapsed = !UI.collapsed;
      wrap.classList.toggle('collapsed', UI.collapsed);
      UI.root.getElementById('toggle').textContent = UI.collapsed ? '+' : '—';
    };
    UI.root.getElementById('btn-set').onclick = (e) => { e.stopPropagation(); openSettings(); };

    // epay 页面上没有 #login_submit 可以挂绿色按钮，所以把手动入口放面板里
    const loginBtn = UI.root.getElementById('btn-login');
    if (SITE === 'epay' && loginBtn) {
      loginBtn.style.display = '';
      loginBtn.onclick = (e) => {
        e.stopPropagation();
        // 手动触发不受重试计数限制
        runFlow({ manual: true });
      };
    }
    UI.root.getElementById('btn-skip').onclick = (e) => { e.stopPropagation(); skipOnce(); };
    UI.abortBtn.onclick = (e) => {
      e.stopPropagation();
      if (dlState === 'downloading') {
        abortDownload();
        setStatus('正在中断…', 'warn');
      } else {
        // 已经中断 / 失败过，这个按钮变成「重试」
        retryDownload('重新下载模型…');
      }
    };

    buildSrcSelect();
    setDlState('idle');
  }

  // 线路下拉：自动 / 五条线路 / 手动导入
  function buildSrcSelect() {
    const sel = UI.root && UI.root.getElementById('src');
    if (!sel) return;
    sel.innerHTML =
      '<option value="">自动（推荐）</option>' +
      MODEL_SOURCES.map((s, i) => `<option value="${i}">${s.tag} ${s.name}</option>`).join('') +
      '<option value="manual">手动导入文件</option>';
    sel.value = GM_getValue(K_SRC, '');

    sel.onchange = () => {
      const v = sel.value;
      GM_setValue(K_SRC, v);
      const label = v === '' ? '自动' : (v === 'manual' ? '手动导入文件' : srcLabel(+v));
      console.log('[湖工大自动登录] 线路切换为', label);

      if (dlState === 'downloading') {
        // 正在下载时换线路：中断当前这条，然后按新线路重来
        restartAfterAbort = true;
        setStatus('正在切换到「' + label + '」…', 'busy');
        abortDownload();
      } else if (dlState === 'aborted' || dlState === 'failed') {
        retryDownload('已切换到「' + label + '」，重新下载…');
      } else {
        setStatus('线路已设为「' + label + '」，下次下载生效', 'ok');
      }
    };
  }

  function srcLabel(i) {
    const s = MODEL_SOURCES[i];
    return s ? s.tag + ' ' + s.name : '未知线路';
  }

  function setProgress(ratio) {
    if (!UI.barFillEl) return;
    UI.barFillEl.style.width = Math.max(0, Math.min(1, ratio || 0)) * 100 + '%';
  }

  // 下载状态机：idle / downloading / aborted / failed
  // 按钮文案与进度条显隐都挂在这里，避免散落各处改不同步。
  // 统一的重试入口：换线路 / 点「重试」都走这里。
  // ★ 关键：上一轮可能还挂在「手动导入」对话框上（ocrLoading 未结算），
  //   直接调 initOcr 只会拿到那个还挂着的 Promise，等于点了没反应。
  //   所以先关对话框、等上一轮收尾，再重新开始。
  function retryDownload(msg) {
    const pending = ocrLoading;
    if (modelDialogCancel) {
      const cancel = modelDialogCancel;
      modelDialogCancel = null;
      try { cancel(); } catch (e) { /* 已经关了 */ }
    }
    setStatus(msg, 'busy');
    Promise.resolve(pending).catch(() => {}).then(() => {
      initOcr().then((sess) => {
        if (sess) setStatus('模型已就绪，点「一键登录」继续', 'ok');
      });
    });
  }

  function setDlState(st) {
    dlState = st;
    if (UI.barEl) UI.barEl.classList.toggle('on', st === 'downloading');
    if (st !== 'downloading') setProgress(0);
    if (!UI.abortBtn) return;
    if (st === 'downloading') { UI.abortBtn.disabled = false; UI.abortBtn.textContent = '中断'; }
    else if (st === 'aborted' || st === 'failed') { UI.abortBtn.disabled = false; UI.abortBtn.textContent = '重试'; }
    else { UI.abortBtn.disabled = true; UI.abortBtn.textContent = '中断'; }
  }

  // 在页面原生的「登录」按钮下方插一个绿色的「一键登录」，
  // 复用原生按钮的 class 保持尺寸一致，只把背景色覆盖成绿色。
  function injectQuickButton() {
    const nativeBtn = $(F + ' #login_submit');
    if (!nativeBtn || !nativeBtn.parentNode) return;
    if (document.getElementById('hbut-quick-login')) return;

    const btn = document.createElement('a');
    btn.id = 'hbut-quick-login';
    btn.href = 'javascript:void(0);';
    btn.textContent = '一键登录';
    btn.className = nativeBtn.className;
    btn.style.cssText = [
      'background:#16a34a !important',
      'border-color:#16a34a !important',
      'color:#fff !important',
      'display:block',
      'margin-top:12px',
      'text-align:center',
      'cursor:pointer',
    ].join(';');

    // 原生按钮是 letter-spacing:12px（"登录"两个字正好视觉居中），
    // 四个字沿用就散架了。单独用 setProperty 覆盖，优先级更可靠。
    btn.style.setProperty('letter-spacing', '1px', 'important');
    btn.style.setProperty('word-spacing', 'normal', 'important');
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      manualLogin();
    });
    nativeBtn.parentNode.insertBefore(btn, nativeBtn.nextSibling);
  }

  const DOTS = { idle: '#94a3b8', busy: '#2563eb', ok: '#16a34a', warn: '#d97706', err: '#dc2626' };

  function setStatus(text, kind) {
    if (!UI.statusEl) return;
    UI.statusEl.textContent = text;
    UI.statusEl.className = 'status' + (kind && kind !== 'busy' && kind !== 'idle' ? ' ' + kind : '');
    if (UI.dotEl) UI.dotEl.style.background = DOTS[kind || 'busy'];
    console.log('[湖工大自动登录]', text);
  }

  function setAccount(text) {
    if (UI.accountEl) UI.accountEl.textContent = text || '—';
  }

  // =========================================================================
  // 验证码动画：逐字落入 → 绿色进度条填满 → 打勾
  // ---------------------------------------------------------------------------
  // 纯装饰。任何异常、任何"输入框看不见"的情况都直接跳过并立刻返回，
  // 绝不能因为它拖住登录。动画结束时把真实值写进 input。
  // =========================================================================
  // 节奏（与 CSS 里的 delay 一一对应）。放慢一倍，让每个字符都看得清。
  const ANIM_STAGGER = 90;    // 字符之间的间隔
  const ANIM_BAR_DELAY = 430; // 进度条开始填充
  const ANIM_CHECK_DELAY = 900; // 对勾开始画
  const ANIM_TOTAL = 1400;    // 整段结束（含 0.16s 余韵）

  function animOn() {
    try {
      if (GM_getValue(K_ANIM, '1') === '0') return false;
      if (W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      return true;
    } catch (e) { return true; }
  }

  function animateCaptcha(text, inputEl) {
    if (!animOn() || !UI.root || !text) return Promise.resolve();

    const input = inputEl || $(F + ' #captcha');
    if (!input) return Promise.resolve();
    const r = input.getBoundingClientRect();
    // 看不见就别演了（滚出视口 / 隐藏）
    if (r.width < 40 || r.height < 14 || r.bottom < 0 || r.top > (W.innerHeight || 0)) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      let layer = null;
      const done = () => {
        try { if (layer && layer.parentNode) layer.parentNode.removeChild(layer); } catch (e) {}
        try { input.value = text; } catch (e) {}
        resolve();
      };

      try {
        layer = document.createElement('div');
        layer.className = 'cap-anim';
        layer.style.left = r.left + 'px';
        layer.style.top = r.top + 'px';
        layer.style.width = r.width + 'px';
        layer.style.height = r.height + 'px';

        const chars = text.split('').map((ch, i) =>
          '<span style="animation-delay:' + (i * ANIM_STAGGER) + 'ms">' + ch + '</span>').join('');

        layer.innerHTML = chars +
          '<i class="cap-bar" style="animation-delay:' + ANIM_BAR_DELAY + 'ms"></i>' +
          '<svg class="ck" viewBox="0 0 24 24" style="animation-delay:' + ANIM_CHECK_DELAY + 'ms">' +
            '<path d="M4 12.5l5 5 11-11"/></svg>';

        UI.root.appendChild(layer);
        setTimeout(done, ANIM_TOTAL);
      } catch (e) {
        done();
      }
    });
  }

  // =========================================================================
  // 设置面板
  // =========================================================================
  function openSettings() {
    if (!UI.root) return;
    if (UI.root.getElementById('hbut-settings')) return;

    const mode = GM_getValue(K_MODE, 'edge');
    const user = GM_getValue(K_USER, '');

    const box = document.createElement('div');
    box.id = 'hbut-settings';
    box.style.cssText = `
      position: fixed; inset: 0; z-index: 2147483646; display: flex;
      align-items: center; justify-content: center; background: rgba(15,23,42,.45);
    `;
    box.innerHTML = `
      <div style="background:#fff;border-radius:12px;padding:20px 22px;width:360px;
                  box-shadow:0 20px 50px rgba(0,0,0,.25);color:#1e293b;
                  font:13px/1.6 -apple-system,'Microsoft YaHei',sans-serif;">
        <div style="font-size:15px;font-weight:600;margin-bottom:14px;">登录设置</div>

        <div style="font-size:12px;color:#64748b;margin-bottom:6px;">账号密码来源</div>
        <label style="display:flex;gap:8px;align-items:flex-start;padding:8px;border:1px solid #e2e8f0;
                      border-radius:6px;margin-bottom:8px;cursor:pointer;">
          <input type="radio" name="hbut-mode" value="edge" ${mode === 'edge' ? 'checked' : ''}
                 style="margin-top:2px;">
          <span><b style="font-weight:600;">用 Edge 已保存的密码</b><br>
            <span style="font-size:11.5px;color:#64748b;">脚本不存密码。每次需要你点一下账号框选账号。</span></span>
        </label>
        <label style="display:flex;gap:8px;align-items:flex-start;padding:8px;border:1px solid #e2e8f0;
                      border-radius:6px;margin-bottom:14px;cursor:pointer;">
          <input type="radio" name="hbut-mode" value="stored" ${mode === 'stored' ? 'checked' : ''}
                 style="margin-top:2px;">
          <span><b style="font-weight:600;">脚本保存账号密码</b><br>
            <span style="font-size:11.5px;color:#64748b;">全自动，但密码明文存在篡改猴存储里。</span></span>
        </label>

        <div id="hbut-cred-fields" style="display:${mode === 'stored' ? 'block' : 'none'};">
          <div style="font-size:12px;color:#64748b;margin-bottom:4px;">学号 / 工号</div>
          <input id="hbut-u" type="text" value="${user}" autocomplete="off"
            style="width:100%;padding:7px 9px;border:1px solid #cbd5e1;border-radius:6px;
                   font-size:13px;margin-bottom:10px;">
          <div style="font-size:12px;color:#64748b;margin-bottom:4px;">密码</div>
          <input id="hbut-p" type="password" autocomplete="off" placeholder="留空则不修改"
            style="width:100%;padding:7px 9px;border:1px solid #cbd5e1;border-radius:6px;
                   font-size:13px;margin-bottom:14px;">
        </div>

        <div style="display:flex;gap:8px;">
          <button id="hbut-save" style="flex:1;padding:8px;border:0;border-radius:6px;
            background:#2563eb;color:#fff;font-size:13px;cursor:pointer;">保存</button>
          <button id="hbut-close" style="padding:8px 14px;border:1px solid #cbd5e1;border-radius:6px;
            background:#fff;font-size:13px;cursor:pointer;">取消</button>
        </div>
      </div>
    `;
    UI.root.appendChild(box);

    const fields = box.querySelector('#hbut-cred-fields');
    box.querySelectorAll('input[name="hbut-mode"]').forEach((r) => {
      r.onchange = () => { fields.style.display = r.value === 'stored' ? 'block' : 'none'; };
    });

    box.querySelector('#hbut-close').onclick = () => box.remove();
    box.querySelector('#hbut-save').onclick = () => {
      const sel = box.querySelector('input[name="hbut-mode"]:checked');
      const m = sel ? sel.value : 'edge';
      GM_setValue(K_MODE, m);

      if (m === 'stored') {
        const u = box.querySelector('#hbut-u').value.trim();
        const p = box.querySelector('#hbut-p').value;
        if (!u) { alert('请填写学号'); return; }
        GM_setValue(K_USER, u);
        if (p) GM_setValue(K_PASS, p);          // 留空表示不改密码
        setAccount(u + '（脚本保存）');
        setStatus('已保存账号，正在登录…', 'ok');
      } else {
        setAccount('Edge 密码管理器');
        setStatus('已切换到 Edge 密码模式，刷新页面生效', 'ok');
      }
      box.remove();
      // 不在这里直接重跑：当前那轮流程可能还挂在"等账号密码"上，
      // 并行会重复提交。直接重载页面最干净 —— 脚本会带着新设置重新执行。
      setStatus('设置已保存，正在重新加载…', 'ok');
      setTimeout(() => { try { W.location.reload(); } catch (e) {} }, 300);
    };
  }

  // =========================================================================
  // IndexedDB：模型缓存
  // =========================================================================
  function idbOpen() {
    return new Promise((resolve, reject) => {
      const idb = W.indexedDB || indexedDB;
      const req = idb.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbGet(key) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbPut(key, value) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  // 手动导入对话框的「取消」句柄。换线路时要把这个对话框关掉，
  // 否则它会盖在面板上，用户根本点不到线路下拉。
  let modelDialogCancel = null;

  function askModelFile() {
    return new Promise((resolve) => {
      const box = document.createElement('div');
      box.id = 'hbut-model-file';
      box.style.cssText = `position:fixed;inset:0;z-index:2147483646;display:flex;
        align-items:center;justify-content:center;background:rgba(15,23,42,.45);
        font:13px/1.7 -apple-system,'Microsoft YaHei',sans-serif;`;
      box.innerHTML = `
        <div style="background:#fff;border-radius:12px;padding:22px 24px;width:400px;
                    box-shadow:0 20px 50px rgba(0,0,0,.25);color:#1e293b;">
          <div style="font-size:15px;font-weight:600;margin-bottom:8px;">导入识别模型</div>
          <div style="color:#475569;margin-bottom:12px;">
            验证码识别在浏览器里完成，需要一个 5MB 的模型文件。选一次，以后不用再选。
          </div>
          <div style="font-size:12px;color:#64748b;background:#f1f5f9;padding:9px;border-radius:6px;
                      margin-bottom:12px;word-break:break-all;font-family:Consolas,monospace;">
            models\\captcha_cropped.onnx
          </div>
          <input id="hbut-mf" type="file" accept=".onnx" style="width:100%;margin-bottom:14px;">
          <div style="display:flex;gap:8px;">
            <button id="hbut-mok" style="flex:1;padding:8px;border:0;border-radius:6px;
              background:#2563eb;color:#fff;cursor:pointer;">导入</button>
            <button id="hbut-mno" style="padding:8px 14px;border:1px solid #cbd5e1;border-radius:6px;
              background:#fff;cursor:pointer;">取消</button>
          </div>
        </div>`;
      document.body.appendChild(box);

      box.querySelector('#hbut-mno').onclick = () => { box.remove(); resolve(null); };
      box.querySelector('#hbut-mok').onclick = async () => {
        const f = box.querySelector('#hbut-mf').files[0];
        if (!f) { alert('请先选择文件'); return; }
        try {
          const buf = await f.arrayBuffer();
          await idbPut(DB_KEY, buf);
          box.remove();
          resolve(buf);
        } catch (e) { alert('读取失败：' + e.message); }
      };
      modelDialogCancel = () => { try { box.remove(); } catch (e) {} resolve(null); };
    });
  }

  // =========================================================================
  // OCR
  // =========================================================================
  let ocrSession = null;

  // IndexedDB 是按 origin 隔离的：auth.hbut.edu.cn 和 epay.hbut.edu.cn 各存一份，
  // 所以在第二个站点上会重新下 5MB。篡改猴存储是全局的，拿它做一层镜像，
  // 第一次下完就写进去，之后哪个站点都能直接用。
  function bufToB64(buf) {
    const u8 = new Uint8Array(buf);
    const CH = 0x8000;                    // 分块，别让 apply 的参数个数爆掉
    let s = '';
    for (let i = 0; i < u8.length; i += CH) {
      s += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
    }
    return btoa(s);
  }

  function b64ToBuf(b64) {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8.buffer;
  }
  let modelNote = '';   // 模型来源说明，拼进「正在加载识别引擎…」那一行

  // 从 CDN 下载模型二进制。GM_xmlhttpRequest 走扩展层，
  // 不受页面 CORS 限制，所以能直接取二进制。
  //
  // 句柄存到 activeReq，面板的「中断」按钮通过 abortDownload() 调 abort()。
  // ★ 同时还要手动 reject：Tampermonkey 被 abort 后不一定触发 onabort，
  //   不主动结算的话 await 会一直悬着，中断按钮就成了摆设。
  function downloadModel(url, onProgress, timeoutMs) {
    return new Promise((resolve, reject) => {
      const done = () => { activeReq = null; activeReject = null; };
      activeReject = reject;

      const req = GM_xmlhttpRequest({
        method: 'GET',
        url,
        responseType: 'arraybuffer',
        timeout: timeoutMs || 180000,
        onprogress: (e) => {
          if (e.lengthComputable && e.total > 0) onProgress(e.loaded, e.total);
        },
        onload: (res) => {
          done();
          if (res.status !== 200) return reject(new Error('HTTP ' + res.status));
          const buf = res.response;
          if (!buf || !buf.byteLength) return reject(new Error('响应为空'));
          // 5MB 的模型，太小说明拿到的不是模型（比如 CDN 的错误页）
          if (buf.byteLength < 3 * 1024 * 1024) {
            return reject(new Error(`文件只有 ${Math.round(buf.byteLength / 1024)}KB，不像模型`));
          }
          resolve(buf);
        },
        onerror: () => { done(); reject(new Error('网络错误')); },
        ontimeout: () => { done(); reject(new Error('下载超时')); },
        onabort: () => { done(); reject(new Error('已中断')); },
      });

      activeReq = req;
    });
  }

  function abortDownload() {
    dlAborted = true;
    const r = activeReq, rj = activeReject;
    activeReq = null;
    activeReject = null;
    if (r && typeof r.abort === 'function') {
      try { r.abort(); } catch (e) { /* 已经结束了 */ }
    }
    if (rj) {
      try { rj(new Error('已中断')); } catch (e) { /* 已结算 */ }
    }
  }

  // npm 包是个 gzip 压缩的 tar。浏览器有原生 DecompressionStream 能解 gzip，
  // tar 本身格式很简单（512 字节头 + 内容补齐到 512），手写几十行就够。
  async function extractOnnxFromTgz(buf) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('浏览器不支持 DecompressionStream');
    }
    const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    const tar = await new Response(stream).arrayBuffer();
    const u8 = new Uint8Array(tar);
    const dec = new TextDecoder();

    let off = 0;
    while (off + 512 <= u8.length) {
      const name = dec.decode(u8.subarray(off, off + 100)).replace(/\0[\s\S]*$/, '');
      if (!name) break;   // 连续的 0 表示归档结束

      // tar 头里文件大小是偏移 124 处、12 字节的八进制字符串
      const sizeField = dec.decode(u8.subarray(off + 124, off + 136))
        .replace(/\0[\s\S]*$/, '').trim();
      const size = parseInt(sizeField, 8) || 0;

      if (/captcha_cropped\.onnx$/.test(name)) {
        return u8.slice(off + 512, off + 512 + size).buffer;
      }
      // 内容长度要补齐到 512 的整数倍
      off += 512 + Math.ceil(size / 512) * 512;
    }
    throw new Error('压缩包里没找到模型文件');
  }

  // 下载中的状态行：线路 · 百分比 · 已下载/总量 · 速度 · 已用时间
  function dlStatusText(src, k, total, loaded, totalBytes, started) {
    const secs = (Date.now() - started) / 1000;
    const mb = (n) => (n / 1048576).toFixed(1);
    const parts = [];
    if (totalBytes) {
      parts.push(Math.round((loaded / totalBytes) * 100) + '%');
      parts.push(mb(loaded) + '/' + mb(totalBytes) + 'M');
    }
    if (secs > 0.3) parts.push(mb(loaded / secs) + 'M/s');
    parts.push(secs.toFixed(1) + 's');
    // 三行：第几条 → 哪条线路 → 进度。比挤成一行好读，也不会被随机断词。
    return `正在下载模型（${k + 1}/${total}）` + '\n' + `${src.tag} ${src.name}` + '\n' + parts.join(' · ');
  }

  // 并发保护：换线路 / 手动重试可能和正在跑的那一轮撞上，
  // 撞上就复用同一个 Promise，绝不并行下载两份。
  function initOcr() {
    if (ocrSession) return Promise.resolve(ocrSession);
    if (ocrLoading) return ocrLoading;
    ocrLoading = _initOcr().finally(() => { ocrLoading = null; });
    return ocrLoading;
  }

  async function _initOcr() {
    if (typeof ort === 'undefined') {
      setStatus('onnxruntime 加载失败，检查能否访问 npmmirror', 'err');
      return null;
    }

    let buf = await idbGet(DB_KEY);

    // 本 origin 的 IndexedDB 没有 → 先看共享镜像（别的站点下过的）
    if (!buf) {
      try {
        const b64 = GM_getValue(K_MODEL_B64, '');
        if (b64 && b64.length > 1000000) {       // 太短说明是坏数据
          setStatus('正在从本地共享缓存读取模型…', 'busy');
          buf = b64ToBuf(b64);
          try { await idbPut(DB_KEY, buf); } catch (e) { /* 存不进就只用内存 */ }
        }
      } catch (e) { /* 存储不可用，走下载 */ }
    }

    const fromCache = !!buf;

    if (!buf) {
      const picked = GM_getValue(K_SRC, '');

      // ---- 手动导入：不碰网络 ----
      if (picked === 'manual') {
        setStatus('已选择「手动导入」，请选择模型文件', 'warn');
        buf = await askModelFile();
        if (!buf) {
          setDlState('failed');
          setStatus('没有模型，无法自动识别验证码', 'err');
          return null;
        }
        try { await idbPut(DB_KEY, buf); } catch (e) { /* 存不进就只在内存里用 */ }
      } else {
        // ---- 自动 = 五条依次试；指定线路 = 只试那一条 ----
        let idxs = picked === ''
          ? MODEL_SOURCES.map((_, i) => i)
          : [parseInt(picked, 10)].filter((n) => n >= 0 && n < MODEL_SOURCES.length);
        // 存了个越界的值（换过版本 / 手改过存储）就退回自动，别让列表为空
        if (!idxs.length) idxs = MODEL_SOURCES.map((_, i) => i);

        dlAborted = false;
        setDlState('downloading');

        let lastErr = '';
        for (let k = 0; k < idxs.length; k++) {
          if (dlAborted) break;
          const i = idxs[k];
          const src = MODEL_SOURCES[i];
          const started = Date.now();
          let painted = 0;

          try {
            const raw = await downloadModel(src.url, (loaded, total) => {
              const now = Date.now();
              if (now - painted < 150) return;      // 限流，别把面板刷爆
              painted = now;
              setProgress(total ? loaded / total : 0);
              setStatus(dlStatusText(src, k, idxs.length, loaded, total, started), 'busy');
            }, src.timeout);

            if (src.tgz) {
              setStatus('正在解压模型…', 'busy');
              buf = await extractOnnxFromTgz(raw);
            } else {
              buf = raw;
            }
            await idbPut(DB_KEY, buf);
            // 镜像到篡改猴存储，别的站点就不用再下这 5MB 了
            try { GM_setValue(K_MODEL_B64, bufToB64(buf)); } catch (e) { /* 配额满了就算了 */ }
            setDlState('idle');
            // ★ 不要在这里单独写一行「模型就绪」——紧接着就会 setStatus('正在加载识别引擎…')，
            //   那一行活不过一帧，用户根本看不见。把来源并进下一步的状态里。
            modelNote = `${(buf.byteLength / 1048576).toFixed(1)} MB，来自 ${src.tag} ${src.name}`;
            break;
          } catch (e) {
            if (dlAborted) break;
            lastErr = e.message;
            console.warn('[湖工大自动登录] 下载失败', src.url, e.message);
            if (k < idxs.length - 1) {
              setStatus(`${src.tag} ${src.name} 失败（${e.message}），换下一条…`, 'warn');
              await sleep(500);
            }
          }
        }

        // ---- 用户中断 ----
        if (dlAborted) {
          if (restartAfterAbort) {
            // 中断是为了换线路：直接按新选择重来。
            // ★ 这里必须调 _initOcr 而不是 initOcr —— ocrLoading 此刻正指向
            //   本轮的 Promise，调 initOcr 会拿到自己，await 自己 = 死锁。
            restartAfterAbort = false;
            return _initOcr();
          }
          setDlState('aborted');
          setStatus('已中断下载。可换一条线路，或点「重试」', 'warn');
          return null;
        }

        // ---- 全部失败 -> 手动导入兜底 ----
        if (!buf) {
          setDlState('failed');
          const why = idxs.length === 1
            ? '这条线路不可用（' + lastErr + '）。换一条线路，或改成「自动」'
            : '所有线路都失败了（' + lastErr + '）。可在「线路」里换一条，或选「手动导入文件」';
          setStatus('模型下载失败：' + why, 'err');
          buf = await askModelFile();
          if (!buf) { setStatus('没有模型，无法自动识别验证码', 'err'); return null; }
          try { await idbPut(DB_KEY, buf); } catch (e) { /* 同上 */ }
        }
      }
    }

    ort.env.wasm.wasmPaths = ORT_BASE;
    ort.env.wasm.numThreads = 1;

    if (!modelNote) modelNote = fromCache ? '本地缓存' : '';
    setStatus('正在加载识别引擎…' + (modelNote ? `（模型 ${modelNote}）` : ''), 'busy');
    try {
      ocrSession = await ort.InferenceSession.create(buf, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'basic',
      });
      return ocrSession;
    } catch (e) {
      // 模型文件坏了（下载不完整 / 选错文件）。清掉缓存，下次重新来。
      console.error('[湖工大自动登录] 模型加载失败', e);
      try { await idbPut(DB_KEY, null); } catch (_) {}
      setStatus(
        (fromCache ? '本地缓存的模型损坏，已清除，刷新页面会重新下载' : '模型文件无效：' + e.message),
        'err');
      return null;
    }
  }

  function preprocess(imgEl) {
    const H = 64;
    // 图没加载出来（naturalWidth=0）就别算宽高比了，否则会除零得到 Infinity
    if (!imgEl.naturalWidth || !imgEl.naturalHeight) {
      throw new Error('验证码图片没加载出来');
    }
    const Wd = Math.max(1, Math.round(imgEl.naturalWidth * (H / imgEl.naturalHeight)));
    const c = document.createElement('canvas');
    c.width = Wd; c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imgEl, 0, 0, Wd, H);

    const px = ctx.getImageData(0, 0, Wd, H).data;
    const data = new Float32Array(H * Wd);
    for (let i = 0; i < H * Wd; i++) {
      data[i] = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
    }
    return { data, W: Wd, H };
  }

  function ctcDecode(tensor) {
    const dims = tensor.dims;      // [seq, 1, classes]
    const steps = dims[0], classes = dims[2], data = tensor.data;
    let text = '', prev = -1;
    for (let t = 0; t < steps; t++) {
      let best = 0, bestV = -Infinity;
      const base = t * classes;
      for (let c = 0; c < classes; c++) {
        const v = data[base + c];
        if (v > bestV) { bestV = v; best = c; }
      }
      if (best !== prev && best !== 0) text += CHARSET[best] || '';
      prev = best;
    }
    return text;
  }

  async function recognize(session, imgEl) {
    const { data, W: wd, H } = preprocess(imgEl);
    const out = await session.run({ input1: new ort.Tensor('float32', data, [1, 1, H, wd]) });
    return ctcDecode(out[session.outputNames[0]]);
  }

  // =========================================================================
  // 页面交互
  // =========================================================================
  const captchaImg = () => $(F + ' #captchaImg');

  function refreshCaptcha() {
    return new Promise((resolve) => {
      const img = captchaImg();
      if (!img) return resolve(null);
      let done = false;
      const fin = () => { if (!done) { done = true; resolve(img); } };
      img.addEventListener('load', fin, { once: true });
      img.addEventListener('error', fin, { once: true });
      img.src = '/authserver/getCaptcha.htl?t=' + Date.now() + Math.floor(Math.random() * 1000);
      setTimeout(fin, 4000);
    });
  }

  function prepareInputs() {
    const u = $(F + ' #username');
    const p = $(F + ' #password');
    if (u) { u.setAttribute('autocomplete', 'username'); u.removeAttribute('readonly'); }
    if (p) {
      p.setAttribute('autocomplete', 'current-password');
      p.removeAttribute('readonly');
      p.removeAttribute('disabled');
    }
  }

  function fillStored() {
    const u = $(F + ' #username');
    const p = $(F + ' #password');
    const user = GM_getValue(K_USER, '');
    const pass = GM_getValue(K_PASS, '');
    if (!user || !pass) return false;
    u.value = user;
    p.value = pass;
    u.dispatchEvent(new Event('input', { bubbles: true }));
    p.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  function waitCredentials(timeout) {
    return new Promise((resolve) => {
      const t0 = Date.now();
      (function poll() {
        const u = $(F + ' #username');
        const p = $(F + ' #password');
        if (u && p && u.value.trim() && p.value) return resolve(true);
        if (Date.now() - t0 > timeout) return resolve(false);
        setTimeout(poll, 200);
      })();
    });
  }

  function submitWith(captcha) {
    const encrypt = getEncryptFn();
    if (!encrypt) {
      setStatus('页面加密函数不可用，无法提交', 'err');
      return false;
    }
    const form = $(F);
    const pwdEl = $(F + ' #password');
    const salt = ($(F + ' #pwdEncryptSalt') || {}).value || '';
    $(F + ' #saltPassword').value = encrypt(pwdEl.value, salt);
    $(F + ' #captcha').value = captcha;
    pwdEl.disabled = true;
    form.submit();
    return true;
  }

  function readState() {
    try { return JSON.parse(W.sessionStorage.getItem(K_STATE) || 'null') || { submit: 0 }; }
    catch (e) { return { submit: 0 }; }
  }
  function writeState(s) {
    try { W.sessionStorage.setItem(K_STATE, JSON.stringify(s)); } catch (e) {}
  }

  function failTip() {
    const el = $(F + ' #showErrorTip');
    return el ? (el.innerText || '').trim() : '';
  }

  // =========================================================================
  // epay 流程（http://epay.hbut.edu.cn/）
  // ---------------------------------------------------------------------------
  // 和 CAS 完全不同的机制，所以单开一条路：
  //   - 独立 ASP.NET 表单，字段 #txt_yhm / #txt_pwd / #txt_yzm
  //   - 验证码是 <img id="Image1" src="validate.aspx?...">，同源，可以直接 canvas 取像素
  //   - 登录按钮 #ImageButton1 的 onclick 里做 RSA 加密（有 #pbk 才加密），
  //     所以**点按钮**就行，不要自己拼请求
  //   - 站点只开 80 端口，443 不通
  //
  // 验证码特点：4 位、全大写。实测现有模型字符全对、只是大小写不稳，
  // 所以统一 toUpperCase()。
  // =========================================================================
  const E_USER = '#txt_yhm', E_PASS = '#txt_pwd', E_CODE = '#txt_yzm';
  const E_IMG = '#Image1', E_BTN = '#ImageButton1';
  const EPAY_MAX_TRIES = 2;       // 自动最多试几次，避免把账号试锁
  const EPAY_STATE_TTL = 120000;  // 计数有效期，过了就重新算

  function readEpayState() {
    try {
      const st = JSON.parse(W.sessionStorage.getItem(K_EPAY) || 'null');
      if (st && typeof st.ts === 'number' && Date.now() - st.ts < EPAY_STATE_TTL) return st;
    } catch (e) { /* 隐私模式等 */ }
    return { tries: 0, ts: Date.now() };
  }

  function writeEpayState(tries) {
    try { W.sessionStorage.setItem(K_EPAY, JSON.stringify({ tries: tries, ts: Date.now() })); }
    catch (e) { /* 忽略 */ }
  }

  // 等浏览器把账号密码自动填进来（和 CAS 那边同一个思路）
  async function waitEpayCreds(ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const u = $(E_USER), p = $(E_PASS);
      if (u && p && u.value.trim() && p.value) return true;
      await sleep(300);
    }
    return false;
  }

  async function recognizeEpayCaptcha(session) {
    const img = $(E_IMG);
    if (!img) return '';
    if (!img.complete || !img.naturalWidth) {
      await waitFor(() => img.complete && img.naturalWidth, 3000);
    }
    let text = '';
    try { text = await recognize(session, img); } catch (e) { text = ''; }
    return (text || '').toUpperCase();
  }

  // 换一张验证码（换图不消耗失败次数）
  async function refreshEpayCaptcha() {
    const img = $(E_IMG);
    if (!img) return;
    const p = new Promise((resolve) => {
      const fin = () => resolve();
      img.addEventListener('load', fin, { once: true });
      img.addEventListener('error', fin, { once: true });
      setTimeout(fin, 3000);
    });
    img.src = 'validate.aspx?' + Date.now() + Math.floor(Math.random() * 1000);
    await p;
    await sleep(120);
  }

  async function runEpayFlow(manual) {
    await waitFor(() => document.body, 10000);

    // ★ 脚本匹配 epay 的所有页面，但只有登录页该介入。
    //   登录后进到缴费首页还弹面板、还白等 8 秒，会很烦。
    //   所以先快速探一下有没有登录表单，没有就静默退出。
    const isLoginPage = await waitFor(() => $(E_USER) && $(E_PASS), 3000);
    if (!isLoginPage) return;

    buildPanel();

    const ready = await waitFor(
      () => $(E_USER) && $(E_PASS) && $(E_CODE) && $(E_IMG), 8000);
    if (!ready) {
      setStatus('epay 登录表单不完整（缺验证码框或图片）', 'warn');
      return;
    }

    const st = readEpayState();
    if (!manual && st.tries >= EPAY_MAX_TRIES) {
      setStatus('自动试了 ' + st.tries + ' 次都没成功，请手动登录（可能是账号或密码不对）', 'err');
      return;
    }

    // ---- 账号密码 ----
    const mode = GM_getValue(K_MODE, 'edge');
    if (mode === 'stored') {
      const user = GM_getValue(K_USER, '');
      const pass = GM_getValue(K_PASS, '');
      if (!user || !pass) {
        setAccount('未设置');
        setStatus('还没保存账号密码，请点「设置」填写', 'warn');
        openSettings();
        return;
      }
      setAccount(user + '（脚本保存）');
      $(E_USER).value = user;
      $(E_PASS).value = pass;
    } else {
      setAccount('浏览器密码管理器');
      setStatus('请点账号框，选择浏览器保存的账号密码', 'warn');
      const ok = await waitEpayCreds(20000);
      if (!ok) {
        setStatus('没等到账号密码。可以点「设置」改用脚本保存，或手动登录', 'warn');
        return;
      }
      setAccount(($(E_USER).value || '已填充'));
    }

    // ---- 验证码 ----
    setStatus('正在准备识别引擎…', 'busy');
    const session = await initOcr();
    if (!session) return;

    let text = await recognizeEpayCaptcha(session);
    if (text.length !== 4) {
      setStatus('第一张没认准（' + (text || '空') + '），换一张…', 'warn');
      await refreshEpayCaptcha();
      text = await recognizeEpayCaptcha(session);
    }
    if (text.length !== 4) {
      setStatus('验证码没认出来（' + (text || '空') + '），请手动输入后点登录', 'err');
      try { $(E_CODE).focus(); } catch (e) {}
      return;
    }

    // ---- 填 → 动画 → 提交 ----
    setStatus('识别到验证码 ' + text + '，正在提交…', 'busy');
    await animateCaptcha(text, $(E_CODE));
    await playSuccessOverlay();
    try { $(E_CODE).value = text; } catch (e) {}
    writeEpayState(st.tries + 1);
    const btn = $(E_BTN);
    if (btn) btn.click();
    else setStatus('找不到登录按钮', 'err');
  }

  // =========================================================================
  // 主流程
  // =========================================================================
  let running = false;

  async function runFlow(opts) {
    const manual = !!(opts && opts.manual);
    if (running) {
      // 手动触发时如果上一轮还没结束，不能并行跑（会把验证码提交两次）
      if (manual) setStatus('正在自动登录中，请稍候…', 'warn');
      return;
    }
    running = true;

    // epay 是完全独立的机制，走另一条路
    if (SITE === 'epay') {
      try {
        await runEpayFlow(manual);
      } catch (e) {
        console.error('[湖工大自动登录] epay 流程出错', e);
        setStatus('epay 流程出错：' + (e && e.message ? e.message : e), 'err');
      } finally {
        running = false;
      }
      return;
    }

    try {
      await waitFor(() => document.body, 10000);
      buildPanel();

      const formReady = await waitFor(() => $(F + ' #username') && $(F + ' #password'));
      if (!formReady) {
        setStatus('当前不是账号密码登录页', 'warn');
        return;
      }

      // 按钮尽早插上，后面不管走到哪一步都留着手动入口
      injectQuickButton();

      // 沙箱问题：必须用 unsafeWindow 拿页面函数
      const encrypt = await waitFor(() => getEncryptFn(), 10000);
      if (!encrypt) {
        setStatus('页面加密脚本没加载出来（可能被网络拦截），请手动登录', 'err');
        return;
      }

      const state = readState();
      const tip = failTip();

      if (tip) {
        if (/图形动态码|验证码/.test(tip)) {
          setStatus('验证码没认对，换一张重试…', 'warn');
          await sleep(300);
        } else if (/用户名|密码|账号|锁定|冻结/.test(tip)) {
          setStatus('账号或密码不对：' + tip, 'err');
          setAccount('⚠ 凭据有误，请点「设置」更新');
          try { W.sessionStorage.removeItem(K_STATE); } catch (e) {}
          return;
        }
      }

      if (state.submit >= MAX_SUBMIT) {
        setStatus(`试了 ${state.submit} 次都没成功，请手动登录`, 'err');
        try { W.sessionStorage.removeItem(K_STATE); } catch (e) {}
        return;
      }

      prepareInputs();

      // ---- 账号密码 ----
      const mode = GM_getValue(K_MODE, 'edge');
      let credOk = false;

      if (mode === 'stored') {
        const user = GM_getValue(K_USER, '');
        setAccount(user ? user + '（脚本保存）' : '未设置');
        if (!user || !GM_getValue(K_PASS, '')) {
          setStatus('还没保存账号密码，请点「设置」填写', 'warn');
          openSettings();
          return;
        }
        fillStored();
        credOk = true;
      } else {
        setAccount('Edge 密码管理器');
        const uEl = $(F + ' #username');
        if (uEl && !uEl.value) { try { uEl.focus(); } catch (e) {} }
        setStatus('请点账号框，选择 Edge 保存的账号密码', 'warn');
        credOk = await waitCredentials(WAIT_CRED_MS);
        if (!credOk) {
          setStatus('没等到账号密码。可以点「设置」改用脚本保存账号，或手动登录', 'warn');
          return;
        }
        setAccount(($(F + ' #username') || {}).value || '已填充');
      }

      // ---- OCR 与识别 ----
      setStatus('正在准备识别引擎…', 'busy');
      const session = await initOcr();
      if (!session) return;

      let captcha = '', best = '';
      for (let i = 0; i < MAX_CAPTCHA_TRY; i++) {
        const img = captchaImg();
        if (!img) { setStatus('页面上找不到验证码图片', 'err'); return; }

        if (i > 0) await refreshCaptcha();
        else if (!img.complete || !img.naturalWidth) {
          await waitFor(() => img.complete && img.naturalWidth, 3000);
        }

        let text = '';
        try { text = await recognize(session, img); }
        catch (e) { setStatus('识别出错：' + e.message, 'err'); continue; }

        if (text.length === 4) { captcha = text; break; }
        if (text && !best) best = text;
        setStatus(`识别结果异常（${text || '空'}），换一张…`, 'warn');
      }

      if (!captcha) {
        if (!best) {
          setStatus('验证码识别不出来，请手动输入后点「立即登录」', 'err');
          const cap = $(F + ' #captcha');
          if (cap) cap.focus();
          return;
        }
        captcha = best;
      }

      setStatus(`识别到验证码 ${captcha}，正在提交…`, 'busy');
      await animateCaptcha(captcha);          // 纯装饰，失败也照常提交
      await playSuccessOverlay();             // 乐观：播完再提交
      writeState({ submit: state.submit + 1, ts: Date.now() });
      await sleep(60);
      if (submitWith(captcha)) setStatus(`已提交（${captcha}），等待服务器响应…`, 'ok');
    } finally {
      running = false;
    }
  }

  // 手动触发一次（页面上的绿色「一键登录」按钮）
  async function manualLogin() {
    const u = $(F + ' #username');
    const p = $(F + ' #password');
    if (!u || !p) { setStatus('不在登录页，无法执行', 'err'); return; }

    // 没填账号密码就别往下跑，不然会白等 60 秒
    if (!u.value.trim() || !p.value) {
      setStatus('请先填写账号密码', 'warn');
      try { u.focus(); } catch (e) {}
      return;
    }

    setStatus('手动触发登录…', 'busy');
    await runFlow({ manual: true });
  }

  function skipOnce() {
    try { W.sessionStorage.setItem(K_SKIP, '1'); } catch (e) {}
    setStatus('已跳过本次自动登录，刷新页面后恢复', 'ok');
  }

  // =========================================================================
  // 菜单
  // =========================================================================
  try {
    GM_registerMenuCommand('⚙️ 打开设置面板', openSettings);
    GM_registerMenuCommand('🔄 重新导入识别模型', async () => {
      try { await idbPut(DB_KEY, null); } catch (e) {}
      try { GM_setValue(K_MODEL_B64, ''); } catch (e) {}
      ocrSession = null;
      setStatus('模型已清除（含共享缓存），刷新页面后重新下载', 'ok');
    });
    GM_registerMenuCommand('🎬 开 / 关验证码动画', () => {
      const off = GM_getValue(K_ANIM, '1') === '0';
      GM_setValue(K_ANIM, off ? '1' : '0');
      setStatus(off ? '验证码动画已开启' : '验证码动画已关闭', 'ok');
    });
    GM_registerMenuCommand('⚡ 立即登录（epay）', () => {
      if (SITE !== 'epay') { setStatus('当前不在 epay 页面', 'warn'); return; }
      runFlow({ manual: true });
    });
    GM_registerMenuCommand('⏭️ 本次跳过自动登录', skipOnce);
  } catch (e) { /* 非篡改猴环境 */ }

  // =========================================================================
  // 启动
  // =========================================================================
  if (W.sessionStorage && W.sessionStorage.getItem(K_SKIP) === '1') {
    W.sessionStorage.removeItem(K_SKIP);
    waitFor(() => document.body, 5000).then(() => {
      buildPanel();
      setStatus('本次已跳过自动登录，可手动点「一键登录」', 'info');
      // 跳过自动登录，但手动入口还是留着
      waitFor(() => $(F + ' #login_submit'), 8000).then(injectQuickButton);
    });
  } else {
    runFlow().catch((e) => {
      console.error('[湖工大自动登录]', e);
      setStatus('脚本出错：' + e.message, 'err');
    });
  }
})();
