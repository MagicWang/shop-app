import { Menu, autoUpdater, dialog, app, BrowserWindow } from 'electron';
import os from 'os';
import { Global } from './global';
import { helloword } from './user32';

export function initMenu(mainWindow: BrowserWindow) {
  const menu = Menu.buildFromTemplate([
    {
      label: '收银',
      accelerator: 'CmdOrCtrl+P',
      click: () => {
        if (mainWindow) {
          const url = mainWindow.webContents.getURL();
          const arr = url.split('/');
          const rootUrl = `${arr[0]}//${arr[2]}`;
          mainWindow.loadURL(`${rootUrl}/#/pos-cashier/entry`);
        }
      },
    },
    {
      label: 'win32',
      click: () => {
        helloword();
      },
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '切换开发人员工具',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools();
            }
          },
        },
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
            dialog.showMessageBox({
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
