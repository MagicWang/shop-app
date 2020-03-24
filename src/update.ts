import { autoUpdater, app, dialog, BrowserWindow } from 'electron';
import isDev from 'electron-is-dev';
import { Global } from './global';
import path from 'path';
import fs from 'fs-extra';
import unzipper from 'unzipper';
import axios from 'axios';
const webPackage = require('../web/package.json');

export function initAutoUpdater(win: BrowserWindow) {
  if (!isDev) {
    const server = 'http://yunjiang.wang:1337';
    const platform =
      process.platform === 'win32' ? (process.arch === 'x64' ? 'win64' : process.platform) : process.platform;
    const feed = `${server}/update/${platform}/${app.getVersion()}`;
    autoUpdater.setFeedURL({ url: feed });
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
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
      console.log('Update available.');
    });
    autoUpdater.on('update-not-available', async () => {
      if (Global.isWebDownloading) {
        dialog.showMessageBox(win, {
          type: 'info',
          title: app.getName(),
          message: '更新包正在下载中...',
        });
        return;
      }
      const webPkgUrl = `${server}/download/${app.getVersion()}/windows_64/package.json`;
      let res = await axios.get(webPkgUrl);
      if (webPackage.version !== res.data.version) {
        dialog
          .showMessageBox(win, {
            type: 'info',
            title: app.getName(),
            message: '发现新版本，是否立即更新',
            buttons: ['更新', '稍后'],
          })
          .then(returnValue => {
            if (returnValue.response === 0) {
              Global.isWebDownloading = true;
              const webUrl = `${server}/download/${app.getVersion()}/windows_64/web.zip`;
              axios
                .get(webUrl, { responseType: 'stream' })
                .then(res => {
                  let loaded = 0;
                  const total = parseInt(res.headers['content-length']);
                  const webPath = path.join(__dirname, '../../web.zip');
                  const writer = fs.createWriteStream(webPath);
                  res.data.on('data', (c: Buffer) => {
                    loaded += c.length;
                    win.setProgressBar(loaded / total);
                  });
                  res.data.pipe(writer);
                  writer.on('close', () => {
                    //先备份当前的 app.asar.unpacked目录
                    const unpackPath = path.join(__dirname, '../../app.asar.unpacked');
                    const unpackWebPath = path.join(unpackPath, 'web');
                    fs.renameSync(unpackWebPath, `${unpackWebPath}.back`);
                    fs.createReadStream(webPath)
                      .pipe(unzipper.Extract({ path: unpackPath }))
                      .on('close', () => {
                        fs.removeSync(webPath);
                        fs.removeSync(`${unpackWebPath}.back`);
                        Global.isWebDownloading = false;
                        win.setProgressBar(0);
                        dialog
                          .showMessageBox(win, {
                            type: 'info',
                            title: app.getName(),
                            message: '新版本已下载，请重启应用程序以应用更新',
                            buttons: ['重启', '稍后'],
                          })
                          .then(returnValue => {
                            if (returnValue.response === 0) {
                              app.relaunch();
                              app.exit();
                            }
                          });
                      })
                      .on('error', () => {
                        fs.renameSync(`${unpackWebPath}.back`, unpackWebPath);
                        Global.isWebDownloading = false;
                      });
                  });
                })
                .catch(err => {
                  Global.isWebDownloading = false;
                });
            }
          });
      } else {
        if (Global.manualCheckUpdate) {
          Global.manualCheckUpdate = false;
          dialog.showMessageBox(win, {
            type: 'info',
            title: app.getName(),
            message: '当前没有可用的更新',
          });
        }
      }
      console.log('Update not available.');
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
      console.log('There was a problem updating the application');
      console.log(message);
    });
    setInterval(() => autoUpdater.checkForUpdates(), 8 * 60 * 60 * 1000);
    setTimeout(() => autoUpdater.checkForUpdates(), 10 * 60 * 1000);
  }
}
