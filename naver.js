const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const width = 1024;
const height = 1600;

const pageToBottom = async (page) => {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let scrollTop = -1;
        const interval = setInterval(() => {
          window.scrollBy(0, 1000);
          if (document.documentElement.scrollTop < 4000) {
            scrollTop = document.documentElement.scrollTop;
            return;
          }
          clearInterval(interval);
          resolve();
        }, 300);
      }),
  );
};

const jsonToCsv = (jsonData) => {

  const jsonArray = jsonData;

  let csvString = '';

  const titles = Object.keys(jsonArray[0]);

  titles.forEach((title, index)=>{
    csvString += (index !== titles.length-1 ? `${title},` : `${title}\r\n`);
  });
  jsonArray.forEach((content, index)=>{
      let row = '';
      for(let title in content){
          row += (row === '' ? `${content[title]}` : `,${content[title]}`);
      }
      csvString += (index !== jsonArray.length-1 ? `${row}\r\n`: `${row}`);
  })
  return csvString;
}

const sliceTextToFront = (text, sliceText) => {
  return text.slice(text.indexOf(sliceText) + sliceText.length, text.length);
}

const sliceTextToBack = (text, sliceText) => {
  return text.slice(text, text.indexOf(sliceText));
}

const getDataToPage = ($, element) => {
  // const promotionProductDataSelector = 'div.productCard_information__YEkjB';
  const promotionProductTitleSelector = 'div.productCard_information__YEkjB > strong.productCard_title__aMA_D';
  const promotionProductPromotionTypeSelector = 'span.productCard_badge__7KOcA > span.blind';
  const promotionProductDeliveryTypeSelector = 'span.productCard_badge__7KOcA > span.productCard_delivery__x5lsL';
  const promotionProductDiscountSelector = 'div.productCard_price_area__RleMi > div.productCard_price_wrap__WaX_2 > span.productCard_discount__tupNR';
  const promotionProductPriceSelector = 'div.productCard_price_area__RleMi > div.productCard_price_wrap__WaX_2 > span.productCard_price__2waKK';
  const promotionProductSubInformation = 'div.productCard_sub_information__Ym_7W > div.productCard_order__OzSGc';

  const title = $(element).find(promotionProductTitleSelector).text().replace(',', '');
  const promotionType = $(element).find(promotionProductPromotionTypeSelector).text().replace(',', '');
  const deliveryType = $(element).find(promotionProductDeliveryTypeSelector).text().replace(',', '');
  const discount = $(element).find(promotionProductDiscountSelector).text().replace(',', '');
  const price = $(element).find(promotionProductPriceSelector).text().replace(',', '');
  const subInformation = $(element).find(promotionProductSubInformation).text().replace(',', '');

  return {
    상품명: sliceTextToFront(title, deliveryType),
    '구경자 수': sliceTextToBack(subInformation, '명이 구경했어요.'),
    가격: sliceTextToBack(price, '원'),
    할인율: sliceTextToFront(discount, '할인율'),
    promotionType: promotionType,
  }
}

const productDetailCrawler = async (browser, crawlerData) => {

  for (let i = 0; i < crawlerData.length; i++) {
    const page = await browser.newPage();
    await page.goto(crawlerData[i].url, {
      waitUntil: 'load',
      timeout: 0,
    });
    const content = await page.content();
    const $ = cheerio.load(content);
    
    const productReviewSelector = '#content > div > div._2-I30XS1lA > div._25tOXGEYJa > div.NFNlCQC2mv > div:nth-child(1) > a > strong';
    const productGradeSelector = '#content > div > div._2-I30XS1lA > div._25tOXGEYJa > div.NFNlCQC2mv > div:nth-child(2) > strong';
    const storeNameSelector = '#pc-storeNameWidget > div > div > a > img';
    const storeNameNotImageSelector = '#pc-storeNameWidget > div > div > a > span';
    const storeNameCase3 = '#pc-gnbWidget > div > div > div._1G2E7OXbG3 > div._3aNsjos9K5 > h1 > a > img';

    const productReview = $(productReviewSelector).text().replace(',', '');
    const productGrade = $(productGradeSelector).text();
    // $(productGradeSelector).text().replace(',', '') || $(storeNameNotImageSelector).text().replace(',', '');
    // 옵션 순서 위치 조정
    const promotionType = crawlerData[i].promotionType;
    const storeName = $(storeNameSelector).attr('alt') || $(storeNameNotImageSelector).text() || $(storeNameCase3).attr('alt');
    delete crawlerData[i].promotionType;
    delete crawlerData[i].url;

    crawlerData[i] = {
      ...crawlerData[i],
      리뷰수: productReview,
      평점: sliceTextToBack(productGrade, '/'),
      옵션: promotionType,
      마켓명: storeName,
      URL: crawlerData[i].url,
    }

    await page.close();
  };

  return crawlerData;
};

const crawler = async () => {       
  const browser = await puppeteer.launch({
    // headless: false,
    slowMo: true,
    args: [
      `--window-size=${width},${height}`,
    ]
  }); 
  const page = await browser.newPage();

  await page.goto('https://plusdeal.naver.com/?ic=K07146&tab=1&sort=1&listType=&grpSeq=4');

  const promotionProductsSelector = '#content > div.plusDealV2_content_area__mYadG > div.tabContainer_tab_container__Eg_Zs > div > div.listTab_plusdeal_product_area__5gLg_ > div.listTab_product_card_list__xUf7g > div > div.productCard_product_card_view__yt7Ji' ;

  await pageToBottom(page);
  const content = await page.content();
  const $ = cheerio.load(content);
  // const list = await page.$x('//*[@id="content"]/div[2]/div[2]/div/div[2]/div/div/div[1]/div/div[1]');
  // const dataTest = await page.evaluate((test) => test.textContent, list[0]);
  // console.log(dataTest);
  const crawlerData = [];
  $(promotionProductsSelector).each(async (index, element) => {
    if (index < 20) {
      const promotionData = getDataToPage($, element);
      const productUrl = $(element).find('a').attr('href');
      // #content > div.plusDealV2_content_area__mYadG > div.tabContainer_tab_container__Eg_Zs > div > div.listTab_plusdeal_product_area__5gLg_ > div > div > div:nth-child(1) > div > a

      crawlerData.push({
        ...promotionData,
        url: productUrl,
      });
    }
  });

  // 상품 상세 페이지 크롤링
  const crawlerJsonData = await productDetailCrawler(browser, crawlerData);

  const csv = jsonToCsv(crawlerJsonData);

  fs.writeFileSync(`스마트스토어${new Date().getDate()}.csv`, csv);
  await page.close();
  await browser.close();
}

crawler().then(() => {
  console.log('크롤러 완료');
});