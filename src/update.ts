import { autoUpdater, app, dialog, BrowserWindow } from 'electron';
import isDev from 'electron-is-dev';
import { Global } from './global';

export function initAutoUpdater(win: BrowserWindow) {
  if (!isDev) {
    const server = 'http://yunjiang.wang:1337';
    const platform =
      process.platform === 'win32' ? (process.arch === 'x64' ? 'win64' : process.platform) : process.platform;
    const feed = `${server}/update/${platform}/${app.getVersion()}`;
    autoUpdater.setFeedURL({ url: feed });
    autoUpdater.on('checking-for-update', () => {
      console.info('Checking for update...');
    });
    autoUpdater.on('update-available', () => {
      if (Global.manualCheckUpdate) {
        Global.manualCheckUpdate = false;
        dialog.showMessageBox(win, {
          type: 'info',
          title: app.getName(),
          message: '发现新版本，已在后台自动更新，请稍后重启应用程序',
        });
      }
      console.info('Update available.');
    });
    autoUpdater.on('update-not-available', () => {
      if (Global.manualCheckUpdate) {
        Global.manualCheckUpdate = false;
        dialog.showMessageBox(win, {
          type: 'info',
          title: app.getName(),
          message: '当前没有可用的更新',
        });
      }
      console.info('Update not available.');
    });
    autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
      dialog
        .showMessageBox(win, {
          type: 'info',
          title: app.getName(),
          message: process.platform === 'win32' ? releaseNotes : releaseName,
          buttons: ['重启', '稍后'],
          detail: '新版本已下载，请重启应用程序以应用更新',
        })
        .then(returnValue => {
          if (returnValue.response === 0) autoUpdater.quitAndInstall();
        });
    });
    autoUpdater.on('error', message => {
      console.error('There was a problem updating the application');
      console.error(message);
    });
    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 8 * 60 * 60 * 1000);
    autoUpdater.checkForUpdates();
  }
}
