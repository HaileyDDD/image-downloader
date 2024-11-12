chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "downloadImages") {
    // 实现下载逻辑
  }
});
