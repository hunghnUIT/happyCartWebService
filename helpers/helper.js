/** 
 * @description round a float number to human readable
 * @returns number in float or int format.
 */
exports.roundFloatNumber = function (value, decimals) {
    return Number(value.toFixed(decimals));
}

/** 
 * @description Extract information from url
 * @returns Object containing "platform", "itemId", "sellerId".
 */
exports.processUrl = (url) => {
    url = url.toLowerCase(); // for sure than sorry.
    let result = {};
    
    if(url.includes('shopee'))
        result['platform'] = 'shopee';
    else if(url.includes('tiki'))
        result['platform'] = 'tiki';

    if(result['platform'] === 'shopee'){
        // E.g: https://shopee.vn/bach-tuoc-cam-xuc-2-mat-cam-xuc-do-choi-bach-tuoc-co-the-dao-nguoc-tam-trang-bach-tuoc-sang-trong-i.283338743.9918567180 //id shop first, then id item
        let splittedUrlByDot = url.split('.');

        result['itemId'] = Number(splittedUrlByDot[splittedUrlByDot.length - 1]);
        result['sellerId'] = Number(splittedUrlByDot[splittedUrlByDot.length - 2]);
    }
    else if(result['platform'] === 'tiki'){
        // E.g: https://tiki.vn/dien-thoai-iphone-12-pro-max-128gb-hang-chinh-hang-p70771651.html?src=ss-organic
        url = url.slice(0, url.indexOf('.html')); // Remove tail after ".html"
        let splittedUrlByDash = url.split('-');

        result['itemId'] = Number((splittedUrlByDash[splittedUrlByDash.length - 1]).replace('p', ''));
        result['sellerId'] = 0;
    }

    return result;
}

