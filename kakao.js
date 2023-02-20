const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const util = require('./util');

const width = 1024;
const height = 1600;

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

    const productReviewSelector = '#mArticle > div > div.product_section > div.info_photo.type_talkdeal > div.split_info > fu-view-star-rating > div > a > span.desc_txt';
    const productGradeSelector = '#mArticle > div > div.product_section > div.info_photo.type_talkdeal > div.split_info > fu-view-star-rating > div > a > span.area_stargage > span.area_star';
    const titleSelector = '#kakaoHead > fu-view-talkstore-intro > div > a:nth-child(1) > strong';
    const titleImgSelector = '#kakaoHead > fu-view-talkstore-intro > div > a:nth-child(1) > strong > img';

    const reviewText = $(productReviewSelector).text().replace(',', '');
    const review = util.sliceTextToFront(util.sliceTextToBack(reviewText, '건'), '리뷰 ');
    const title = $(titleSelector).text().replace(',', '') || $(titleImgSelector).attr('alt');

    let gradeNum = 0;
    $(productGradeSelector).each((index, element) => {
      if (index === 3) {
        const gradeStyle = $(element).find('span.gage_bar').attr('style');

        if (gradeStyle === "width: 100%;") {
          gradeNum += 1;
        } else if (gradeStyle === "width: 50%;") {
          gradeNum += 0.5;
        }
      } else {
        gradeNum += 1;
      }
    });
    const url = crawlerData[i].url;
    delete crawlerData[i].url;

    crawlerData[i] = {
      ...crawlerData[i],
      리뷰수: review ? Number(review) : 0,
      평점: gradeNum ? Number(gradeNum) : 0,
      마켓명: title,
      URL: url,
    }
  }

  return crawlerData;
};

const getDataToPageByKakao = ($, element) => {
  // '#mArticle > div > div.layout_split > div > div > ul > li.ng-star-inserted';
  const promotionProductTitleSelector = 'app-view-today-tab-big-card > div > span > a:nth-child(1) > strong';
  const promotionProductBuyerNumSelector = 'app-view-today-tab-big-card > div > span > a.link_product.link_dealjoin > span > span > span';
  const promotionProductEventPriceSelector = 'app-view-today-tab-big-card > div > span > a:nth-child(1) > span > span.price_talkdeal > span.txt_price';
  const promotionProductPriceSelector = 'app-view-today-tab-big-card > div > span > a:nth-child(1) > span > span.price_regular > span.txt_price'; 

  const productUrl = $(element).find('a').attr('href');

  return {
    상품명: $(element).find(promotionProductTitleSelector).text().replace(',', ''),
    구매자수: util.sliceTextToBack($(element).find(promotionProductBuyerNumSelector).text().replace(',', ''), '명이 구매했어요'),
    톡딜가: $(element).find(promotionProductEventPriceSelector).text().replace(',', ''),
    정상가: $(element).find(promotionProductPriceSelector).text().replace(',', ''),
    url: productUrl,
  }
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

  await page.goto('https://store.kakao.com/home/top/food', {
    waitUntil: 'load',
    timeout: 0,
  });

  await util.delay(1000);

  const promotionProductsSelector = '#mArticle > div > div.layout_split > div > div > cu-infinite-scroll > div > ul > li';
  // #mArticle > div > div.layout_split > div > div > cu-infinite-scroll > div > ul > li
  const content = await page.content();
  const $ = cheerio.load(content);

  const crawlerData = [];

  $(promotionProductsSelector).each(async (index, element) => {
    if (index < 20) {
      const data = getDataToPageByKakao($, element);
      crawlerData.push(data);
    }
  });

  const crawlerJsonData = await productDetailCrawler(browser, crawlerData);

  const csv = util.jsonToCsv(crawlerJsonData);

  fs.writeFileSync(`./csv/톡딜${new Date().getDate()}.csv`, '\uFEFF' + csv);

  await page.close();
  await browser.close();
};

crawler().then(() => {
  console.log('크롤러 완료');
});
