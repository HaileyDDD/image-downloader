console.log("Content script is running");

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("收到内容脚本中的消息:", request);
  if (request.action === "getImages") {
    console.log("开始获取图片和视频...");
    
    let allImages = [];

    // 获取亚马逊商品图片
    if (window.location.hostname.includes('amazon')) {
      const amazonImages = getAmazonProductImages();
      allImages = allImages.concat(amazonImages);
      console.log("亚马逊商品图片信息:", JSON.stringify(amazonImages, null, 2));
    }

    // 获取通用图片
    const genericImages = getGenericImages();
    allImages = allImages.concat(genericImages);
    console.log("通用图片信息:", JSON.stringify(genericImages, null, 2));

    // 去重
    allImages = allImages.filter((img, index, self) =>
      index === self.findIndex((t) => t.src === img.src)
    );

    // 获取视频
    const videos = Array.from(document.querySelectorAll('video'))
      .map(video => ({
        src: video.src,
        poster: video.poster,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0
      }))
      .filter(video => video.src && video.src.startsWith('http'));

    console.log("Found videos:", videos.length);

    const productInfo = {
      color: getProductInfo('Color'),
      brand: getProductInfo('Brand'),
      model: getProductInfo('Model')
    };

    console.log("Product info:", productInfo);

    sendResponse({images: allImages, videos: videos, productInfo: productInfo});
    return true;
  } else if (request.action === "processImage") {
    processImage(request.imageUrl, request.width, request.height, request.canvasWidth, request.canvasHeight)
      .then(dataUrl => {
        console.log(`图像处理成功，DataURL 长度: ${dataUrl.length}`);
        sendResponse({dataUrl: dataUrl});
      })
      .catch(error => {
        console.error(`图像处理失败: ${error.message}`);
        console.error(error.stack);
        sendResponse({error: error.toString()});
      });
    return true; // 保持消息通道开放
  }
});

function getProductInfo(infoType) {
  const selectors = ['table tr', 'div', 'span', 'p'];
  for (let selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (let element of elements) {
      const text = element.textContent.trim().toLowerCase();
      if (text.includes(infoType.toLowerCase())) {
        let value = text.split(infoType.toLowerCase())[1].trim();
        if (infoType.toLowerCase() === 'model') {
          const modelMatch = value.match(/[\w-]+/);
          if (modelMatch) value = modelMatch[0];
        }
        return value;
      }
    }
  }
  return '未找到';
}

function processImage(imageUrl, targetWidth, targetHeight, canvasWidth, canvasHeight) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');

      // 填充白色背景
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // 计算缩放比例
      const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;

      // 计算居中位置
      const x = (canvasWidth - scaledWidth) / 2;
      const y = (canvasHeight - scaledHeight) / 2;

      // 在白色背景上绘制调整大小后的图像
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

      // 将canvas转换为dataURL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      resolve(dataUrl);
    };
    img.onerror = function() {
      reject(new Error('Image failed to load'));
    };
    img.src = imageUrl;
  });
}

function getMainProductImage() {
  console.log("开始获取主图...");

  // 尝试获取 data-a-dynamic-image 属性
  const dynamicImageElement = document.querySelector('[data-a-dynamic-image]');
  if (dynamicImageElement) {
    try {
      const dynamicImageData = JSON.parse(dynamicImageElement.getAttribute('data-a-dynamic-image'));
      const largestImage = Object.keys(dynamicImageData).reduce((a, b) => 
        dynamicImageData[a][0] * dynamicImageData[a][1] > dynamicImageData[b][0] * dynamicImageData[b][1] ? a : b
      );
      console.log("从 data-a-dynamic-image 找到主图:", largestImage);
      return [{
        src: largestImage,
        source: '主图',
        series: '主图系列',
        width: dynamicImageData[largestImage][0],
        height: dynamicImageData[largestImage][1]
      }];
    } catch (e) {
      console.error('解析 data-a-dynamic-image 失败:', e);
    }
  }

  // 尝试获取 data-old-hires 属性
  const oldHiresElement = document.querySelector('[data-old-hires]');
  if (oldHiresElement) {
    const oldHiresUrl = oldHiresElement.getAttribute('data-old-hires');
    console.log("找到 data-old-hires 主图:", oldHiresUrl);
    return [{
      src: oldHiresUrl,
      source: '主图',
      series: '主图系列',
      width: oldHiresElement.naturalWidth || 0,
      height: oldHiresElement.naturalHeight || 0
    }];
  }

  // 尝试从脚本中提取图片信息
  const scripts = document.querySelectorAll('script');
  for (let script of scripts) {
    const content = script.textContent;
    if (content.includes('colorImages') || content.includes('initial')) {
      const matches = content.match(/"large":"(https:\/\/[^"]+)"/g);
      if (matches) {
        return matches.map((match, index) => {
          const imageUrl = match.match(/"large":"(https:\/\/[^"]+)"/)[1].replace(/\\u002F/g, '/');
          console.log(`在脚本中找到主图 ${index + 1}:`, imageUrl);
          return {
            src: imageUrl,
            source: '主图',
            series: '主图列',
            width: 0,
            height: 0
          };
        });
      }
    }
  }

  // 如果上述方法都失败，尝试获取任何可能的主图
  const possibleMainImages = document.querySelectorAll('#main-image, #landingImage, #imgBlkFront, .a-dynamic-image');
  if (possibleMainImages.length > 0) {
    return Array.from(possibleMainImages).map((img, index) => {
      console.log(`找到可能的主图 ${index + 1}:`, img.src);
      return {
        src: img.src,
        source: '主图',
        series: '主图系列',
        width: img.naturalWidth || 0,
        height: img.naturalHeight || 0
      };
    });
  }

  console.warn('未找到主图');
  return null;
}

function getAmazonProductImages() {
  console.log("开始获取亚马逊商品图片...");
  
  let images = [];

  function addImage(img) {
    images.push(img);
    console.log(`添加图片: ${img.src}, 尺寸: ${img.width}x${img.height}`);
  }

  // 尝试获取 'data-a-dynamic-image' 属性中的图片
  const landingImage = document.getElementById('landingImage');
  if (landingImage) {
    const dynamicImageData = landingImage.getAttribute('data-a-dynamic-image');
    if (dynamicImageData) {
      try {
        const imageUrls = JSON.parse(dynamicImageData);
        Object.keys(imageUrls).forEach((url, index) => {
          addImage({
            src: url,
            source: '主图',
            series: `主图${index + 1}`,
            width: imageUrls[url][0],
            height: imageUrls[url][1]
          });
        });
      } catch (e) {
        console.error('解析 data-a-dynamic-image 失败:', e);
      }
    }
  }

  // 获取所有缩略图
  const thumbnails = document.querySelectorAll('#altImages li.item, #altImages li.imageThumbnail');
  thumbnails.forEach((thumbnail, index) => {
    const img = thumbnail.querySelector('img');
    if (img) {
      // 构造高分辨率图片 URL
      const highResUrl = img.src.replace(/\._.*_\./, '._AC_SL1500_.');
      addImage({
        src: highResUrl,
        source: '缩略图',
        series: `缩略图${index + 1}`,
        width: 1500,  // 假设宽度为 1500
        height: 1500  // 假设高度为 1500
      });
    }
  });

  // 尝试从页面脚本中提取更多图片信息
  const scripts = document.querySelectorAll('script');
  for (let script of scripts) {
    const content = script.textContent;
    if (content.includes('ImageBlockATF')) {
      const match = content.match(/var obj = jQuery\.parseJSON\('(.+?)'\);/);
      if (match) {
        try {
          const data = JSON.parse(match[1].replace(/\\'/g, "'"));
          if (data.colorImages && data.colorImages.initial) {
            data.colorImages.initial.forEach((img, index) => {
              if (img.hiRes) {
                addImage({
                  src: img.hiRes,
                  source: '脚本数据',
                  series: `脚本图${index + 1}`,
                  width: img.variant && img.variant.width || 0,
                  height: img.variant && img.variant.height || 0
                });
              }
            });
          }
        } catch (e) {
          console.error('解析脚本数据失败:', e);
        }
      }
    }
  }

  // 去重
  images = images.filter((img, index, self) =>
    index === self.findIndex((t) => t.src === img.src)
  );

  console.log(`总共找到 ${images.length} 张亚马逊商品图片`);
  return images;
}

function getGenericImages() {
  console.log("开始获取通用网站图片...");
  
  let images = Array.from(document.images)
    .map(img => ({
      src: img.src, 
      source: '通用',
      series: '其他图片',
      width: img.naturalWidth,
      height: img.naturalHeight
    }))
    .filter(img => img.src.startsWith('http') && img.width > 0 && img.height > 0);

  console.log(`总共找到 ${images.length} 张通用图片`);
  return images;
}
