import { app, BrowserWindow } from 'electron';
import puppeteer, { Browser } from 'puppeteer-core';
import axios from 'axios';
import { DbUtils } from './utils';

let browser: Browser;
let mainWindow: BrowserWindow;
export async function initPuppeteer(win: BrowserWindow) {
  const port = app.commandLine.getSwitchValue('remote-debugging-port');
  let res = await axios.get(`http://127.0.0.1:${port}/json/version`);
  //直接连接已经存在的 Chrome
  mainWindow = win;
  const size = win.getSize();
  browser = await puppeteer.connect({
    browserWSEndpoint: res.data.webSocketDebuggerUrl,
    defaultViewport: { width: size[0], height: size[1] },
    slowMo: 200,
  });
}
export async function screenshot() {
  const pages = await browser.pages();
  await pages[0].screenshot({ path: 'screenshot.png', fullPage: true });
}
export async function category() {
  const pages = await browser.pages();
  const page = pages[0];
  const menuElement = await page.$('#nav-hamburger-menu');
  await menuElement.click();
  const fullDirectoryElement = await page.waitForSelector(
    '#hmenu-content > ul.hmenu.hmenu-visible > li:nth-child(37) > a',
  );
  await Promise.all([fullDirectoryElement.click(), page.waitForNavigation()]);
}
export async function getSeller() {
  await initTable();
  const pages = await browser.pages();
  const page = pages[0];
  const category = await page.$eval('#nav-search-dropdown-card > div > div > span', el => (el as any).innerText);
  while (true) {
    let nextUrl;
    try {
      nextUrl = await page.$eval('.a-last>a', el => (el as any).href);
    } catch (error) {
      nextUrl = await page.$eval('#pagnNextLink', el => (el as any).href);
    }
    let hrefs = await page.$$eval('.s-result-list .rush-component>.a-link-normal', elements =>
      elements.map(l => (l as any).href),
    );
    if (hrefs?.length <= 0) {
      hrefs = await page.$$eval('.s-result-list .a-section>.a-link-normal', elements =>
        elements.map(l => (l as any).href),
      );
    }
    for (let i = 0; i < hrefs.length; i++) {
      const href = hrefs[i];
      try {
        await page.goto(href, { waitUntil: 'domcontentloaded' });
        const seller = await page.$eval('#bylineInfo', el => (el as any).innerText);
        const title = await page.$eval('#productTitle', el => (el as any).innerText);
        await insertData({ category, seller, title });
      } catch (error) {
        console.log(error);
      }
    }
    if (nextUrl) {
      await page.goto(nextUrl, { waitUntil: 'domcontentloaded' });
    } else {
      break;
    }
  }
  // mainWindow.webContents.findInPage('卖家：');
}
//判断产品表是否存在(不存在则创建)
async function initTable() {
  const result = await DbUtils.executeSql(`select count(*) from pg_class where relname = 'product'`, null);
  if (!result || !result.rows[0] || result.rows[0].count === '0') {
    await DbUtils.executeSql(
      'create table product(id serial,title varchar(255) NULL,seller varchar(255) NULL,category varchar(255) NULL,email varchar(255) NULL,phone varchar(255) NULL,primary key(id))',
    );
  }
}
//添加商品数据
async function insertData(data: any) {
  DbUtils.executeSql('insert into product(title,seller,category) values($1,$2,$3)', [
    data.title,
    data.seller,
    data.category,
  ]);
}
