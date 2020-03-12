import { Menu, autoUpdater, dialog, app, BrowserWindow } from 'electron';
import os from 'os';
import { Global } from './global';
import { helloword } from './user32';
import { screenshot, category, getSeller } from './puppeteer';

export function initMenu(win: BrowserWindow) {
  const menu = Menu.buildFromTemplate([
    {
      label: '文件',
      submenu: [
        {
          label: '退出',
          role: 'quit',
        },
      ],
    },
    {
      label: '编辑',
      submenu: [
        {
          label: '撤销',
          role: 'undo',
        },
        {
          label: '恢复',
          role: 'redo',
        },
        {
          type: 'separator',
        },
        {
          label: '剪切',
          role: 'cut',
        },
        {
          label: '复制',
          role: 'copy',
        },
        {
          label: '粘贴',
          role: 'paste',
        },
        {
          label: '全选',
          role: 'selectAll',
        },
      ],
    },
    {
      label: '视图',
      submenu: [
        {
          label: '重置',
          role: 'resetZoom',
        },
        {
          label: '放大',
          role: 'zoomIn',
        },
        {
          label: '缩小',
          role: 'zoomOut',
        },
        {
          label: '切换全屏',
          role: 'togglefullscreen',
        },
        {
          type: 'separator',
        },
        {
          label: '切换开发人员工具',
          role: 'toggleDevTools',
        },
      ],
    },
    {
      label: '收银',
      accelerator: 'CmdOrCtrl+P',
      click: () => {
        if (win) {
          const url = win.webContents.getURL();
          const arr = url.split('/');
          const rootUrl = `${arr[0]}//${arr[2]}`;
          win.loadURL(`${rootUrl}/#/pos-cashier/entry`);
        }
      },
    },
    {
      label: 'win32',
      submenu: [
        {
          label: 'helloword',
          click: () => {
            helloword();
          },
        },
      ],
    },
    {
      label: 'puppeteer',
      submenu: [
        {
          label: '亚马逊',
          click: () => {
            win.loadURL('https://www.amazon.com/');
          },
        },
        {
          label: '截图',
          click: () => {
            screenshot();
          },
        },
        {
          label: '抓分类',
          click: () => {
            category();
          },
        },
        {
          label: '抓发货方',
          click: () => {
            getSeller();
          },
        },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '检查更新...',
          click: () => {
            Global.manualCheckUpdate = true;
            autoUpdater.checkForUpdates();
          },
        },
        {
          type: 'separator',
        },
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(win, {
              type: 'info',
              title: app.getName(),
              message: `版本：${app.getVersion()}
Electron：${process.versions.electron}
Chrome：${process.versions.chrome}
Node.js：${process.versions.node}
V8：${process.versions.v8}
OS：${os.type()} ${os.arch()} ${os.release()}`,
            });
          },
        },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
}
