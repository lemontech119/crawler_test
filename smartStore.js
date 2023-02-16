const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const util = require('./util');
// 스마트스토어 1회용 크롤링

const width = 1024;
const height = 1600;

const pageNum = "10";

const pageToBottom = async (page) => {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let scrollTop = -1;
        const interval = setInterval(() => {
          window.scrollBy(0, 100);
          if (document.documentElement.scrollTop !== scrollTop) {
            scrollTop = document.documentElement.scrollTop;
            return;
          }
          clearInterval(interval);
          resolve();
        }, 10);
      }),
  );
};

const productDetailCrawler = async (browser, crawlerData) => {
  for (let i = 0; i < crawlerData.length; i++) {
    const page = await browser.newPage();
    await page.goto(crawlerData[i].url, {
      waitUntil: 'load',
      timeout: 0,
    });

    await util.delay(500);
    const content = await page.content();
    const $ = cheerio.load(content);

    const url = page.url();
    const productId = url.split('?')[0].split('/')[5];
    
    const reviewSelector = '#content > div > div._2-I30XS1lA > div._25tOXGEYJa > div.NFNlCQC2mv > div:nth-child(1) > a > strong';
    const gradeSelector = '#content > div > div._2-I30XS1lA > div._25tOXGEYJa > div.NFNlCQC2mv > div:nth-child(2) > strong';
    const review = $(reviewSelector).text().replace(',', '');
    const grade = $(gradeSelector).text().replace(',', '');

    delete crawlerData[i].url;
    crawlerData[i] = {
      ...crawlerData[i],
      review: review ? Number(review) : 0,
      grade: grade ? Number(util.sliceTextToBack(grade, '/5')) : 0,
      productId,
    }

    await page.close();
  }

  return crawlerData;
}

const crawler = async () => {
  const browser = await puppeteer.launch({
    // headless: false,
    slowMo: true,
    args: [
      `--window-size=${width},${height}`,
    ]
  });
  const page = await browser.newPage();
  const crawlerData = [];
  const url = 'https://search.shopping.naver.com/search/all?frm=NVSHCHK&origQuery=%EB%9E%9C%EC%84%A0%EC%8B%9D%EB%8B%B9&pagingSize=40&productSet=checkout&query=%EB%9E%9C%EC%84%A0%EC%8B%9D%EB%8B%B9&sort=rel&timestamp=&viewType=list&pagingIndex=';
  await page.goto(url + pageNum, {
    waitUntil: 'load',
    timeout: 0,
  });
  await util.delay(2000);

  await pageToBottom(page);
  const content = await page.content();
  const $ = cheerio.load(content);
  const productSelector = '#__next > div > div.style_container__UxP6u > div > div.style_content_wrap__Cdqnl > div.style_content__xWg5l > ul > div > div';

  let count = 0;
  $(productSelector).each(async (index, element) => {
    const ad = $(element).find('button.ad_ad_stk__pBe5A').text();
    const productName = $(element).find('div.basicList_title__VfX3c').text();
    const smartStore = $(element).find('a.basicList_mall__BC5Xu').text();
    const pick = $(element).find('span.basicList_etc__LSkN_ > a.basicList_btn_zzim__YCRGy > span.basicList_text__gCaiD').text();


    if (smartStore === '랜선식당') {
      count += 1;
      const basicListSelector = 'span.basicList_etc__LSkN_';
      const createdAt = $(element).find(basicListSelector).first().text();

      crawlerData.push({
        name: productName.replace(',', ''),
        ad: !!ad,
        createdAt: util.sliceTextToFront(createdAt, '등록일 '),
        pick: util.sliceTextToFront(pick, '찜하기'),
        url: $(element).find('a.thumbnail_thumb__Bxb6Z').attr('href'),
      });
    }
  });
  const data = await productDetailCrawler(browser, crawlerData);
  const csv = util.jsonToCsv(data);
  fs.writeFileSync(`./csv/랜선식당${pageNum}.csv`, '\uFEFF' + csv);
  await page.close();
  await browser.close();
};

crawler().then(() => {
  console.log('크롤러 완료');
});
