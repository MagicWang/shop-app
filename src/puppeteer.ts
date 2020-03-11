import { app, screen } from 'electron';
import puppeteer, { Browser } from 'puppeteer-core';
import axios from 'axios';

let browser: Browser;
export async function initPuppeteer() {
  const port = app.commandLine.getSwitchValue('remote-debugging-port');
  let res = await axios.get(`http://127.0.0.1:${port}/json/version`);
  //直接连接已经存在的 Chrome
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  browser = await puppeteer.connect({
    browserWSEndpoint: res.data.webSocketDebuggerUrl,
    defaultViewport: { width, height },
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
