document.addEventListener('DOMContentLoaded', () => {
    // 处理本地上传图片页面的文件上传
    const localImageUpload = document.getElementById('localImageUpload');
    const localUploadLabel = document.querySelector('label[for="localImageUpload"]');

    // 处理插件获取图片页面的文件上传
    const imageUpload = document.getElementById('imageUpload');
    const imageUploadLabel = document.querySelector('label[for="imageUpload"]');

    // 完全隐藏插件获取图片的文件上传输入
    if (imageUpload) {
        imageUpload.style.display = 'none';
        imageUpload.disabled = true;
    }
    if (imageUploadLabel) {
        imageUploadLabel.style.display = 'none';
    }

    // 完全隐藏本地上传的文件输入
    if (localImageUpload) {
        localImageUpload.style.display = 'none';
        localImageUpload.disabled = true;
    }
    if (localUploadLabel) {
        localUploadLabel.addEventListener('click', (event) => {
            event.preventDefault();
            // 重新启用文件输入
            localImageUpload.disabled = false;
            localImageUpload.click();
        });
    }

    localImageUpload.addEventListener('change', (event) => {
        // 阻止事件冒泡
        event.stopPropagation();
        
        if (typeof handleLocalUploadImageUpload === 'function') {
            handleLocalUploadImageUpload(event);
            // 清空文件输入，防止重复触发
            localImageUpload.value = '';
            // 重新禁用文件输入
            localImageUpload.disabled = true;
        } else {
            console.error('handleLocalUploadImageUpload 函数未定义');
        }
    });
}); 