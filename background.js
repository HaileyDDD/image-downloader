function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "downloadImage") {
    fetch(request.imageUrl)
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = function() {
          const base64data = reader.result;
          chrome.downloads.download({
            url: base64data,
            filename: `image_${Date.now()}.jpg`,
            saveAs: false
          }, (downloadId) => {
            if (chrome.runtime.lastError) {
              sendResponse({ error: chrome.runtime.lastError });
            } else {
              sendResponse({ success: true, downloadId: downloadId });
            }
          });
        };
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        sendResponse({ error: error.toString() });
      });
    return true; // 保持消息通道开放
  }
});
