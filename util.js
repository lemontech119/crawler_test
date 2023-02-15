const sliceTextToFront = (text, sliceText) => {
  return text.slice(text.indexOf(sliceText) + sliceText.length, text.length);
}

const sliceTextToBack = (text, sliceText) => {
  return text.slice(text, text.indexOf(sliceText));
}

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

const delay = (ms) => {
  return new Promise( resolve => setTimeout(resolve, ms) );
};

module.exports = {
  sliceTextToFront,
  sliceTextToBack,
  jsonToCsv,
  delay,
}