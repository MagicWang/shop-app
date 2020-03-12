import { app, BrowserWindow, Menu, dialog } from 'electron';

export function initContextMenu(win: BrowserWindow) {
  const menu = Menu.buildFromTemplate([
    {
      id: 'goBack',
      label: '返回',
      accelerator: 'Alt+Left',
      click: () => {
        win.webContents.goBack();
      },
    },
    {
      id: 'goForward',
      label: '前进',
      accelerator: 'Alt+Right',
      click: () => {
        win.webContents.goForward();
      },
    },
    {
      label: '重新加载',
      role: 'reload',
      accelerator: 'Ctrl+R',
    },
    {
      type: 'separator',
    },
    {
      label: '另存为',
      accelerator: 'Ctrl+S',
      click: () => {
        const path = dialog.showSaveDialogSync(win, {
          title: '另存为',
          defaultPath: `${win.webContents.getTitle()}.html`,
          filters: [
            // { name: '网页，仅HTML', extensions: ['html', 'htm'] },
            { name: '网页，全部', extensions: ['html', 'htm'] },
            { name: '网页（单个文件）', extensions: ['mhtml'] },
          ],
        });
        if (path) {
          win.webContents.savePage(path, path.endsWith('.mhtml') ? 'MHTML' : 'HTMLComplete');
        }
      },
    },
    {
      label: '打印',
      accelerator: 'Ctrl+P',
      click: () => {
        win.webContents.print();
      },
    },
    {
      type: 'separator',
    },
    {
      label: '检查',
      accelerator: 'Ctrl+Shift+I',
      click: () => {
        if (!win.webContents.isDevToolsOpened()) {
          win.webContents.openDevTools();
        } else {
          win.webContents.devToolsWebContents.focus();
        }
      },
    },
  ]);
  win.webContents.on('context-menu', (e, params) => {
    const goBack = menu.getMenuItemById('goBack');
    goBack.enabled = win.webContents.canGoBack();
    const goForward = menu.getMenuItemById('goForward');
    goForward.enabled = win.webContents.canGoForward();
    menu.popup({ window: win });
  });
}
