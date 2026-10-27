'use strict';
const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

const DEFAULT_URL = 'http://localhost';
let win = null;
let cfg = { serverUrl: '', bounds: null, maximized: false };
const cfgFile = () => path.join(app.getPath('userData'), 'config.json');

function loadCfg() {
  try { cfg = Object.assign(cfg, JSON.parse(fs.readFileSync(cfgFile(), 'utf8'))); } catch (e) { /* primeira execucao */ }
}
function saveCfg() {
  try { fs.mkdirSync(path.dirname(cfgFile()), { recursive: true }); fs.writeFileSync(cfgFile(), JSON.stringify(cfg, null, 2)); } catch (e) { /* ignora */ }
}

function normalizeUrl(raw) {
  let u = String(raw || '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
  try {
    const p = new URL(u);
    if (!/^https?:$/.test(p.protocol)) return '';
    return p.origin;
  } catch (e) { return ''; }
}

// Verifica se o servidor Inverno ERP responde (endpoint publico do backend).
function probe(url) {
  return new Promise(resolve => {
    const origin = normalizeUrl(url);
    if (!origin) return resolve({ ok: false, error: 'Endereço inválido.' });
    const lib = origin.startsWith('https') ? https : http;
    const req = lib.get(origin + '/licenses/installation-id', { timeout: 5000 }, res => {
      let body = '';
      res.on('data', d => { if (body.length < 4096) body += d; });
      res.on('end', () => {
        if (res.statusCode === 200 && /installationId/.test(body)) resolve({ ok: true, origin });
        else resolve({ ok: false, error: 'O endereço responde, mas não parece ser um servidor Inverno ERP (código ' + res.statusCode + ').' });
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'O servidor não respondeu a tempo.' }); });
    req.on('error', e => resolve({ ok: false, error: 'Não foi possível ligar ao servidor (' + (e.code || e.message) + ').' }));
  });
}

function page(name, query) { win.loadFile(path.join(__dirname, name), query ? { query } : undefined); }

async function openServer() {
  if (!cfg.serverUrl) return page('connect.html', { url: DEFAULT_URL });
  const r = await probe(cfg.serverUrl);
  if (r.ok) win.loadURL(r.origin);
  else page('offline.html', { url: cfg.serverUrl, error: r.error });
}

function sameOrigin(u) {
  try { return !!cfg.serverUrl && new URL(u).origin === new URL(cfg.serverUrl).origin; } catch (e) { return false; }
}

function createWindow() {
  const b = cfg.bounds || {};
  win = new BrowserWindow({
    width: b.width || 1366, height: b.height || 820, x: b.x, y: b.y,
    minWidth: 1024, minHeight: 640,
    title: 'Inverno ERP',
    backgroundColor: '#f3f5f8',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false,
    },
  });
  if (cfg.maximized) win.maximize();
  const showNow = () => { if (win && !win.isVisible()) win.show(); };
  win.once('ready-to-show', showNow);
  setTimeout(showNow, 2500); // seguranca: nunca deixar a janela escondida

  // So o servidor configurado e as paginas locais ficam dentro da janela; o resto abre no navegador.
  win.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith('file://') || sameOrigin(url)) return;
    e.preventDefault();
    if (/^(https?|mailto):/i.test(url)) shell.openExternal(url);
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (sameOrigin(url) || url === 'about:blank') return { action: 'allow' };
    if (/^(https?|mailto):/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.session.setPermissionRequestHandler((wc, permission, cb) => cb(['clipboard-read', 'clipboard-sanitized-write', 'fullscreen'].includes(permission)));

  win.on('close', () => {
    cfg.maximized = win.isMaximized();
    if (!cfg.maximized) cfg.bounds = win.getBounds();
    saveCfg();
  });
  win.on('closed', () => { win = null; });
  openServer();
}

function buildMenu() {
  const t = [
    { label: 'Ficheiro', submenu: [
      { label: 'Alterar servidor…', click: () => page('connect.html', { url: cfg.serverUrl || DEFAULT_URL }) },
      { label: 'Recarregar', accelerator: 'F5', click: () => { const u = win && win.webContents.getURL(); if (u && u.startsWith('http')) win.webContents.reload(); else openServer(); } },
      { type: 'separator' },
      { role: 'quit', label: 'Sair' },
    ] },
    { label: 'Ver', submenu: [
      { role: 'resetZoom', label: 'Tamanho normal' }, { role: 'zoomIn', label: 'Aumentar' }, { role: 'zoomOut', label: 'Diminuir' },
      { type: 'separator' }, { role: 'togglefullscreen', label: 'Ecrã inteiro' },
    ] },
    { label: 'Ajuda', submenu: [
      { label: 'Sobre o Inverno ERP', click: () => dialog.showMessageBox(win, { type: 'info', title: 'Inverno ERP', message: 'Inverno ERP Desktop ' + app.getVersion(), detail: 'Servidor: ' + (cfg.serverUrl || '(não configurado)') + '\nA licença é gerida no servidor.' }) },
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(t));
}

ipcMain.handle('server:test', async (_e, url) => probe(url));
ipcMain.handle('server:save', async (_e, url) => {
  const r = await probe(url);
  if (!r.ok) return r;
  cfg.serverUrl = r.origin; saveCfg();
  win.loadURL(r.origin);
  return { ok: true };
});
ipcMain.handle('server:retry', async () => { openServer(); return true; });
ipcMain.handle('server:change', async () => { page('connect.html', { url: cfg.serverUrl || DEFAULT_URL }); return true; });

if (!app.requestSingleInstanceLock()) { app.quit(); }
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => { loadCfg(); buildMenu(); createWindow(); });
  app.on('window-all-closed', () => app.quit());
}
