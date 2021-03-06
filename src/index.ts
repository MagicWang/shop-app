import { app, BrowserWindow, Menu, Tray } from 'electron';
import path from 'path';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { initMenu } from './menu';
import { initAutoUpdater } from './update';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}
let mainWindow: BrowserWindow;
let tray: Tray; //防止这个变量被垃圾回收，托盘区消失

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
  });

  // and load the index.html of the app.
  // mainWindow.loadFile(path.join(__dirname, "../src/index.html"));
  const portWeb = 4299; // 前端端口
  bootstrapWeb(portWeb).then(() => {
    const rootUrl = `http://localhost:${portWeb}`;
    mainWindow.loadURL(rootUrl);
  });
  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  // 菜单
  initMenu(mainWindow);
  // 自动更新
  initAutoUpdater();
  // 任务栏
  app.setUserTasks([
    {
      program: process.execPath,
      arguments: '--new-window',
      iconPath: process.execPath,
      iconIndex: 0,
      title: 'New Window',
      description: 'Create a new window',
    },
  ]);
  // 托盘区
  tray = new Tray(path.join(__dirname, '../web/favicon.ico'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Item1', type: 'radio' },
    { label: 'Item2', type: 'radio' },
    { label: 'Item3', type: 'radio', checked: true },
    { label: 'Item4', type: 'radio' },
  ]);
  tray.setToolTip('This is my application.');
  tray.setContextMenu(contextMenu);
  tray.displayBalloon({ title: 'a', content: 'asd' });
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
};
// 启动express承载网站
async function bootstrapWeb(port: number) {
  const expressApp = express();
  expressApp.use(express.static(path.join(__dirname, '../web')));
  expressApp.use(
    '/api',
    createProxyMiddleware({
      target: 'http://store.gmtshenzhen.cn',
      changeOrigin: true,
    }),
  );
  await expressApp.listen(port);
}
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 当运行第二个实例时,将会聚焦到myWindow这个窗口
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on('ready', createWindow);

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // In this file you can include the rest of your app's specific main process
  // code. You can also put them in separate files and import them here.
}
