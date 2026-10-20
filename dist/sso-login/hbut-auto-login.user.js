// ==UserScript==
// @name         湖工大统一认证 · 自动登录
// @namespace    local.hbut.autologin
// @version      3.2.0
// @description  自动识别图形验证码完成登录，OCR 跑在浏览器里，带常驻控制面板
// @author       Ryan
// @match        https://auth.hbut.edu.cn/authserver/login*
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
  const GH_RAW_BASE = 'https://raw.githubusercontent.com/Ryan-alpaca/hbut-kit/main/dist/sso-login/models/';
  const GH_JSD_BASE = 'https://cdn.jsdelivr.net/gh/Ryan-alpaca/hbut-kit@main/dist/sso-login/models/';

  const MODEL_SOURCES = [
    {
      url: 'https://registry.npmmirror.com/captcha-ocr-model/-/captcha-ocr-model-1.0.0.tgz',
      tgz: true,
    },
    {
      url: GH_JSD_BASE + 'captcha_cropped.onnx',
      tgz: false,
      timeout: 120000,
    },
    {
      url: GH_RAW_BASE + 'captcha_cropped.onnx',
      tgz: false,
      timeout: 20000,
    },
    {
      url: 'https://unpkg.com/captcha-ocr-model@latest/models/captcha_cropped.onnx',
      tgz: false,
    },
    {
      url: 'https://cdn.jsdelivr.net/npm/captcha-ocr-model@latest/models/captcha_cropped.onnx',
      tgz: false,
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

  const F = '#pwdFromId';           // 页面有 4 个 form，id 重复，必须限定作用域

  // =========================================================================
  // 沙箱兼容
  // ---------------------------------------------------------------------------
  // 声明了 @grant 之后，脚本跑在篡改猴的沙箱里，这里的 window 是一个隔离代理，
  // 页面上定义的全局函数（encryptPassword、needCaptcha 等）在它上面看不见。
  // 必须通过 unsafeWindow 拿真正的页面 window。
  // =========================================================================
  const W = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;

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
  // 控制面板（常驻，shadow DOM 隔离样式，避免被页面 CSS 污染）
  // =========================================================================
  const UI = {
    host: null,
    root: null,
    statusEl: null,
    accountEl: null,
    collapsed: false,
  };

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
      font-size: 12.5px; line-height: 1.6; padding: 8px 10px; border-radius: 6px;
      background: #f1f5f9; color: #334155; word-break: break-all; min-height: 34px;
    }
    .status.err { background: #fef2f2; color: #b91c1c; }
    .status.ok  { background: #f0fdf4; color: #15803d; }
    .status.warn{ background: #fffbeb; color: #b45309; }
    .row { margin-top: 8px; font-size: 12px; color: #64748b; }
    .row b { color: #334155; font-weight: 500; }
    .acts { display: flex; gap: 6px; margin-top: 10px; }
    button {
      flex: 1; padding: 6px 4px; border-radius: 6px; border: 1px solid #cbd5e1;
      background: #fff; color: #334155; font-size: 12px; cursor: pointer;
      font-family: inherit; transition: background .15s;
    }
    button:hover { background: #f1f5f9; }
    button.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
    button.primary:hover { background: #1d4ed8; }
    button.primary:disabled { background: #94a3b8; border-color: #94a3b8; cursor: default; }
    .collapsed .body { display: none; }
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
        <div class="row">账号：<b id="account">—</b></div>
        <div class="acts">
          <button id="btn-set">设置</button>
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

    UI.root.getElementById('hdr').onclick = () => {
      UI.collapsed = !UI.collapsed;
      wrap.classList.toggle('collapsed', UI.collapsed);
      UI.root.getElementById('toggle').textContent = UI.collapsed ? '+' : '—';
    };
    UI.root.getElementById('btn-set').onclick = (e) => { e.stopPropagation(); openSettings(); };
    UI.root.getElementById('btn-skip').onclick = (e) => { e.stopPropagation(); skipOnce(); };
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

  function askModelFile() {
    return new Promise((resolve) => {
      const box = document.createElement('div');
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
    });
  }

  // =========================================================================
  // OCR
  // =========================================================================
  let ocrSession = null;

  // 从 CDN 下载模型二进制。GM_xmlhttpRequest 走扩展层，
  // 不受页面 CORS 限制，所以能直接取二进制。
  function downloadModel(url, onProgress, timeoutMs) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        responseType: 'arraybuffer',
        timeout: timeoutMs || 180000,
        onprogress: (e) => {
          if (e.lengthComputable && e.total > 0) onProgress(e.loaded / e.total);
        },
        onload: (res) => {
          if (res.status !== 200) return reject(new Error('HTTP ' + res.status));
          const buf = res.response;
          if (!buf || !buf.byteLength) return reject(new Error('响应为空'));
          // 5MB 的模型，太小说明拿到的不是模型（比如 CDN 的错误页）
          if (buf.byteLength < 3 * 1024 * 1024) {
            return reject(new Error(`文件只有 ${Math.round(buf.byteLength / 1024)}KB，不像模型`));
          }
          resolve(buf);
        },
        onerror: () => reject(new Error('网络错误')),
        ontimeout: () => reject(new Error('下载超时')),
      });
    });
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

  async function initOcr() {
    if (ocrSession) return ocrSession;

    if (typeof ort === 'undefined') {
      setStatus('onnxruntime 加载失败，检查能否访问 npmmirror', 'err');
      return null;
    }

    let buf = await idbGet(DB_KEY);
    const fromCache = !!buf;

    // 缓存里没有 -> 自动下载
    if (!buf) {
      for (let i = 0; i < MODEL_SOURCES.length; i++) {
        const src = MODEL_SOURCES[i];
        try {
          setStatus(`正在下载识别模型（${i + 1}/${MODEL_SOURCES.length}）…`, 'busy');
          let raw = await downloadModel(src.url, (p) => {
            setStatus(`正在下载识别模型 ${Math.round(p * 100)}%`, 'busy');
          }, src.timeout);
          if (src.tgz) {
            setStatus('正在解压模型…', 'busy');
            raw = await extractOnnxFromTgz(raw);
          }
          buf = raw;
          await idbPut(DB_KEY, buf);
          setStatus(`模型下载完成（${(buf.byteLength / 1024 / 1024).toFixed(1)}MB）`, 'ok');
          break;
        } catch (e) {
          console.warn('[湖工大自动登录] 下载失败', src.url, e.message);
          buf = null;
        }
      }
    }

    // 下载也失败 -> 手动导入（原有逻辑）
    if (!buf) {
      setStatus('自动下载失败，请手动选择模型文件', 'warn');
      buf = await askModelFile();
      if (!buf) { setStatus('没有模型，无法自动识别验证码', 'err'); return null; }
    }

    ort.env.wasm.wasmPaths = ORT_BASE;
    ort.env.wasm.numThreads = 1;

    setStatus('正在加载识别引擎…', 'busy');
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
      writeState({ submit: state.submit + 1, ts: Date.now() });
      await sleep(100);
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
      ocrSession = null;
      setStatus('模型已清除，刷新页面后重新导入', 'ok');
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
