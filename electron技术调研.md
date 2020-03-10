# electron技术调研

1. 承载web程序

   安装express(web容器)，http-proxy-middleware(http代理中间件用于访问后端接口)，

   将web程序在本地部署(最终打包进exe)，

   通过BrowserWindow加载本地站点

   ```typescript
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
   mainWindow = new BrowserWindow({
     height: 600,
     width: 800,
   });
   mainWindow.loadURL("http://localhost:4299");
   ```

   

2. 快捷键注册

   - 应用程序没有键盘焦点时 ，通过 globalShortcut注册全局快捷键

     ```typescript
     // 注册一个 'CommandOrControl+X' 的全局快捷键
     const ret = globalShortcut.register('CommandOrControl+X', () => {
       console.log('CommandOrControl+X is pressed');
     });
     if (!ret) {
       console.log('registration failed');
     }
     // 检查快捷键是否注册成功
     console.log(globalShortcut.isRegistered('CommandOrControl+X'));
     ```

     

   - electron顶部菜单栏快捷键，通过accelerator注册快捷键

     ```typescript
     const menu = new Menu();
     menu.append(new MenuItem({
       label: 'Print',
       accelerator: 'CmdOrCtrl+P',
       click: () => { console.log('time to print stuff') }
     }))
     ```

     

   - 浏览器窗口内的快捷键，直接在web应用中监听window的keyup事件，electron上层不会拦截

3. 编译问题，不直接编译成安装包，编译为一个exe软件

   electron-forge本身即支持编译为安装包，也支持编译为exe

   ```json
     "scripts": {
       "start": "tsc && electron-forge start", // 启动
       "package": "electron-forge package",    // 打包到目录
       "make": "electron-forge make",          // 打包为exe
       "publish": "electron-forge publish",
       "lint": "eslint --ext .ts ."
     },
   ```

   

4. 版本升级的方式是什么样子的，机制是什么样的 

   官方支持的方法是利用内置的[Squirrel](https://github.com/Squirrel)框架和Electron的[autoUpdater](https://www.electronjs.org/docs/api/auto-updater)模块

   最简单的是使用GitHub 的 Electron 团队维护 [update.electronjs.org](https://github.com/electron/update.electronjs.org)，一个免费开源的网络服务，可以让 Electron 应用使用自动更新。 这个服务是设计给那些满足以下标准的 Electron 应用：

   - 应用运行在 macOS 或者 Windows
   - 应用有公开的 GitHub 仓库
   - 编译的版本发布在 GitHub Releases
   - 编译的版本已代码签名

   如果你开发的是一个私有的 Electron 应用程序，或者你没有在 GitHub Releases 中公开发布，你可能需要运行自己的更新服务器。

   根据你的需要，你可以从下方选择：

   - [Hazel](https://github.com/zeit/hazel) – 用于私人或开源应用的更新服务器，可以在 [Now](https://zeit.co/now) 上免费部署。 它从[GitHub Releases](https://help.github.com/articles/creating-releases/)中拉取更新文件，并且利用 GitHub CDN 的强大性能。
   - [Nuts](https://github.com/GitbookIO/nuts)－同样使用[GitHub Releases](https://help.github.com/articles/creating-releases/), 但得在磁盘上缓存应用程序更新并支持私有存储库.
   - [electron-release-server](https://github.com/ArekSredzki/electron-release-server) – 提供一个用于处理发布的仪表板，并且不需要在GitHub上发布发布。
   - [Nucleus](https://github.com/atlassian/nucleus) – 一个由Atlassian维护的 Electron 应用程序的完整更新服务器。 支持多种应用程序和渠道; 使用静态文件存储来降低服务器成本. 

   鉴于项目可能不在github上开源，不使用github release，最终选择electron-release-server方式，

   使用electron-release-server v1.5.2过程遇到问题汇总

   - 使用数据库postgresql-12时，运行出错，重装版本11解决

   - linux上安装依赖包失败，运行npm i --unsafe-perm解决

     npm 出于安全考虑不支持以 root 用户运行，即使你用 root 用户身份运行了，npm 会自动转成一个叫 nobody 的用户来运行，而这个用户几乎没有任何权限。这样的话如果你脚本里有一些需要权限的操作，比如写文件（尤其是写 /root/.node-gyp），就会崩掉了。为了避免这种情况，要么按照 npm 的规矩来，专门建一个用于运行 npm 的高权限用户；要么加 --unsafe-perm 参数，这样就不会切换到 nobody 上，运行时是哪个用户就是哪个用户，即使是 root。

   - 上传软件包时需要同时上传.exe(用于重新安装)和.nupkg(用于更新)文件，否则autoUpdater不会下载更新

   升级机制使用electron自带的autoUpdater,可以设置轮询间隔，当有新版本可用时会自动下载更新，下载完成时提示用户是否重启应用(注意process.platform在64位windows上返回win32)。

   ```typescript
   import { autoUpdater, app, dialog } from 'electron';
   import isDev from 'electron-is-dev';
   import { Global } from './global';
   
   export function initAutoUpdater() {
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
           dialog.showMessageBox({
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
           dialog.showMessageBox({
             type: 'info',
             title: app.getName(),
             message: '当前没有可用的更新',
           });
         }
         console.info('Update not available.');
       });
       autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
         dialog
           .showMessageBox({
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
   
   ```

   

5. 编译后代码签名

   代码签名首先需要证书(pfx文件)，主要的证书商有以下几家：

   - Digicert/Symantec  https://www.digicert.com/code-signing/microsoft-authenticode.htm 

   - Comodo https://www.comodo.com/landing/ssl-certificate/authenticode-signature/ 

   - GoDaddy https://sg.godaddy.com/zh/web-security/code-signing-certificate 

     国内代理机构

   - 沃通  https://www.wosign.com/Products/digicert_CodeSigning_EV.htm 

   - 亚洲诚信 https://www.trustasia.com/symantec/code-signing 

   为了方便测试，使用powershell脚本生成自签名的证书

   ```powershell
   $Subject = "wj"
   $EMail = "494082081@qq.com"
   $FriendlyName = "test"
   $CertValidYears = 5
   $PFXPassword = "123456"
   
   $SubjectFull = "CN=$Subject,E=$EMail"
   $SecurePassword = ConvertTo-SecureString -String $PFXPassword -AsPlainText -Force
   $CertFilePath = $([Environment]::GetFolderPath("Desktop"))
   
   #Generate certificate
   $CodeSigningCert = New-SelfSignedCertificate -Type CodeSigningCert -KeyUsage DigitalSignature -KeyAlgorithm RSA -CertStoreLocation "Cert:\CurrentUser\My" -Subject $SubjectFull -NotAfter $(Get-Date).AddYears($CertValidYears) -FriendlyName $FriendlyName
   
   #Export certificate
   Export-PfxCertificate -Cert $CodeSigningCert -FilePath $CertFilePath\$FriendlyName.pfx -Password $SecurePassword
   
   ```

   

   有了证书文件和密码之后，可通过以下几种方法添加数字签名

   - 通过electron-forge生成的exe，可以在package.json中配置证书路径和密码

     ```json
     {
       "name": "@electron-forge/maker-squirrel",
       "config": {
         "certificateFile": "./test.pfx",
         "certificatePassword": "123456"
       }
     }
     ```

     

   - 通过微软的signtool.exe工具  (C:\Program Files (x86)\Windows Kits\10\bin\10.0.17763.0\x64\signtool.exe)

     ```powershell
     signtool sign /f MyCert.pfx /p MyPassword MyFile.exe 
     ```

   - 打包工具如advanced installer打包时添加数字签名

   - 证书机构给的工具

6. 安装包的制作（MSIInstaller）

   比较常用的有下面两种，都收费，需要注意的是通过这种方法打包的程序无法使用electron的更新机制，需要自己写自动更新

   - advanced installer，有破解版，普通打包没问题，但是测试添加数字签名时报错没有权限，可能是破解的问题
   - install shield，无破解版，有limited版配合visual studio 2015使用

7. Tray相关的操作

   需要注意 tray 变量声明要放到全局中，防止被垃圾回收，托盘区消失

   ```typescript
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
   ```

   

8. 任务栏菜单的操作

   ```typescript
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
   ```

   

9. 如何调用系统原生API，（LoadLibrary或者能够link kernal.dll)

   调用dll分为两类，c++写的dll，c#写的dll

   - c++写的dll可通过node-ffi或者node-ffi-napi，node-ffi不再更新，只支持到node6.X，node-ffi-napi还有更新，可支持最新版的node12.X，但是不支持最新版的electron8.X，需要手动降级到electron6.X

     ```typescript
     import ffi from 'ffi-napi';
     import ref from 'ref-napi';
     
     /**
      * 先定义一个函数, 用来在窗口中显示字符
      * @param {String} text
      * @return {*} none
      */
     function convertText(text: string) {
       return new Buffer(text + '\0', 'ucs2').toString(); //字符串必须以\0即null结尾!
     }
     // 通过ffi加载user32.dll
     const myUser32 = new ffi.Library('user32', {
       // 声明这个dll中的一个函数
       MessageBoxW: [
         ref.types.int32,
         [ref.types.int32, ref.types.CString, ref.types.CString, ref.types.int32], // 用json的格式罗列其返回类型和参数类型
       ],
     });
     
     export function helloword() {
       // 调用user32.dll中的MessageBoxW()函数, 弹出一个对话框
       myUser32.MessageBoxW(0, convertText('I am Node.JS!'), convertText('Hello, World!'), 1);
     }
     
     ```

     

   - c#写的dll可通过edge.js调用(未深入调研)