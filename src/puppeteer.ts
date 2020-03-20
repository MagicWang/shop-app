import { app, BrowserWindow } from 'electron';
import puppeteer, { Browser } from 'puppeteer-core';
import axios from 'axios';
import Store from 'electron-store';
import { DbUtils, ArrayUtils } from './utils';

const store = new Store();
let browser: Browser;
let mainWindow: BrowserWindow;
let isStopped = false;
let emailReg = /(\w-*\.*)+@(\w-?)+(\.\w{2,})+/g;
let telReg = /(\+?\d{1,4}(\s|-)?)?\(?\d{2,4}\)?(\s|-)?(\d{7,8}|(\d{3}(\s|-)?\d{4})|(\d{4}(\s|-)?\d{3})|(\d{4}(\s|-)?\d{4}))/g;
const excludeSellers = ['AmazonBasics'];

export async function initPuppeteer(win: BrowserWindow) {
  const port = app.commandLine.getSwitchValue('remote-debugging-port');
  let res = await axios.get(`http://127.0.0.1:${port}/json/version`);
  //直接连接已经存在的 Chrome
  mainWindow = win;
  const size = win.getSize();
  browser = await puppeteer.connect({
    browserWSEndpoint: res.data.webSocketDebuggerUrl,
    defaultViewport: { width: size[0], height: size[1] },
    slowMo: 50,
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
export async function resumeSeller() {
  const url = store.get('lastUrl');
  if (url && mainWindow) {
    mainWindow.loadURL(url);
  }
}
export async function stopSeller() {
  isStopped = true;
}
export async function getSeller() {
  isStopped = false;
  await initTable();
  const pages = await browser.pages();
  const page = pages[0];
  const category = await page.$eval('#nav-search-dropdown-card > div > div > span', el => (el as any).innerText);
  store.set('lastUrl', mainWindow.webContents.getURL());
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
        const info = await getInfo(seller);
        await insertData({ category, seller, title, ...info });
      } catch (error) {
        console.log(error);
      }
      if (isStopped) {
        break;
      }
    }
    if (nextUrl) {
      await page.goto(nextUrl, { waitUntil: 'domcontentloaded' });
      store.set('lastUrl', nextUrl);
    } else {
      break;
    }
    if (isStopped) {
      break;
    }
  }
  // mainWindow.webContents.findInPage('卖家：');
}
export async function getInfo(seller: string) {
  if (!seller || excludeSellers.includes(seller) || seller.startsWith('Amazon')) return;
  try {
    const pages = await browser.pages();
    const page = pages[0];
    await page.goto('https://www.google.com/', { waitUntil: 'domcontentloaded' });
    await page.type('#tsf input.gsfi', seller);
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.keyboard.down('Enter')]);
    await Promise.all([
      page.click('#rso > div:nth-child(1) > div > div > div.r > a'),
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    ]);
    let body = await page.evaluate(() => document.body.innerText);
    let email = ArrayUtils.distinct(body.match(emailReg)).join(';');
    let tel = ArrayUtils.distinct(body.match(telReg)).join(';');
    const contact = await page.$x("//a[contains(text(), 'Contact')]");
    if (contact.length > 0) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        contact[contact.length - 1].click(),
      ]);
      // const url = await contact[0].evaluate(el => (el as HTMLAnchorElement).href);
      // if (url) {
      //   await page.goto(url, { waitUntil: 'domcontentloaded' });
      // }
      body = await page.evaluate(() => document.body.innerText);
      email = ArrayUtils.distinct(body.match(emailReg)).join(';');
      tel = ArrayUtils.distinct(body.match(telReg)).join(';');
    }
    return { email, tel };
  } catch (error) {
    const e = error;
    console.log(e);
  }
}
//判断产品表是否存在(不存在则创建)
async function initTable() {
  const result = await DbUtils.executeSql(`select count(*) from pg_class where relname = 'product'`, null);
  if (!result || !result.rows[0] || result.rows[0].count === '0') {
    await DbUtils.executeSql(
      'create table product(id serial,title varchar(255) NULL,seller varchar(255) NULL,category varchar(255) NULL,email varchar(500) NULL,tel varchar(255) NULL,primary key(id))',
    );
  }
}
//添加商品数据
async function insertData(data: any) {
  DbUtils.executeSql('insert into product(title,seller,category,email,tel) values($1,$2,$3,$4,$5)', [
    data.title,
    data.seller,
    data.category,
    data.email,
    data.tel,
  ]);
}
