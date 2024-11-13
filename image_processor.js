let images = [];
let localUploadImages = [];

// 将函数声明移到全局作用域
window.handleLocalUploadImageUpload = handleLocalUploadImageUpload;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const imageData = urlParams.get('images');
    
    // 处理从 popup 传来的图片
    if (imageData) {
        try {
            images = JSON.parse(decodeURIComponent(imageData));
            
            // 根据当前页面显示不同的图片
            const activeTab = document.querySelector('.tab.active').dataset.tab;
            if (activeTab === 'plugin-images') {
                displayPluginImages();
            } else {
                displayLocalUploadImages();
            }
        } catch (error) {
            console.error('解析图片数据出错:', error);
            const errorMessage = document.createElement('p');
            errorMessage.textContent = '加载图片出错，请重新选择';
            errorMessage.style.color = 'red';
            errorMessage.style.textAlign = 'center';
            document.getElementById('imageContainer').appendChild(errorMessage);
        }
    }

    // 初始化尺寸输入框的事件监听器
    ['canvasWidth', 'canvasHeight', 'imageWidth', 'imageHeight'].forEach(id => {
        const input = document.getElementById(id);
        input.addEventListener('input', debounce(applyImageSize, 300));
    });

    const downloadButton = document.getElementById('downloadAll');
    if (downloadButton) {
        downloadButton.addEventListener('click', downloadSelectedImages);
    }

    // 添加选项卡切换事件监听
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            if (tabId === 'plugin-images') {
                displayPluginImages();
            } else {
                displayLocalUploadImages();
            }
        });
    });

    // 添加联动逻辑
    setupSizeLinking();

    // 添加本地文件上传事件监听器
    const localImageUpload = document.getElementById('localImageUpload');
    if (localImageUpload) {
        localImageUpload.addEventListener('change', handleLocalUploadImageUpload);
    }
});

function displayPluginImages() {
    const imageContainer = document.getElementById('imageContainer');
    imageContainer.innerHTML = '';

    // 确保 images 不为空
    if (!images || images.length === 0) {
        const noImagesMessage = document.createElement('p');
        noImagesMessage.textContent = '没有从插件获取到图片';
        noImagesMessage.style.textAlign = 'center';
        noImagesMessage.style.color = '#666';
        imageContainer.appendChild(noImagesMessage);
        return;
    }

    // 只显示插件获取的图片，排除本地上传的图片
    const pluginImages = images.filter(img => !localUploadImages.includes(img));
    
    if (pluginImages.length === 0) {
        const noImagesMessage = document.createElement('p');
        noImagesMessage.textContent = '没有可显示的插件获取图片';
        noImagesMessage.style.textAlign = 'center';
        noImagesMessage.style.color = '#666';
        imageContainer.appendChild(noImagesMessage);
        return;
    }
    
    pluginImages.forEach((img, index) => {
        const canvas = createCanvasFromImage(img);
        const imgItem = createImageItem(canvas, index, 'plugin');
        imageContainer.appendChild(imgItem);
    });
}

function displayLocalUploadImages() {
    const imageContainer = document.getElementById('imageContainer');
    imageContainer.innerHTML = '';

    localUploadImages.forEach((img, index) => {
        const canvas = createCanvasFromImage(img);
        const imgItem = createLocalUploadImageItem(canvas, index);
        imageContainer.appendChild(imgItem);
    });
}

function createCanvasFromImage(img, canvasWidth = 800, canvasHeight = 800) {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    const imgElement = new Image();
    imgElement.onload = () => {
        // 填充白色背景
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 计算缩放比例
        const scaleX = canvasWidth / imgElement.width;
        const scaleY = canvasHeight / imgElement.height;
        const scale = Math.min(scaleX, scaleY);

        // 计算居中位置
        const scaledWidth = imgElement.width * scale;
        const scaledHeight = imgElement.height * scale;
        const x = (canvasWidth - scaledWidth) / 2;
        const y = (canvasHeight - scaledHeight) / 2;

        // 在白色背景上绘制调整大小后的图像
        ctx.drawImage(imgElement, 0, 0, imgElement.width, imgElement.height, x, y, scaledWidth, scaledHeight);
    };
    imgElement.src = img.src;

    return canvas;
}

function handleLocalUploadImageUpload(event) {
    const files = event.target.files;
    
    // 限制上传文件数量和大小
    if (files.length > 10) {
        alert('最多只能上传10张图片');
        return;
    }

    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const invalidFiles = Array.from(files).filter(file => file.size > maxFileSize);
    
    if (invalidFiles.length > 0) {
        alert('存在超过5MB的图片，请压缩后重新上传');
        return;
    }

    // 原有上传逻辑
    const localImagePromises = Array.from(files).map(file => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const localImg = { 
                        src: e.target.result,
                        width: img.width,
                        height: img.height
                    };
                    resolve(localImg);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    });

    Promise.all(localImagePromises)
        .then(newLocalImages => {
            // 合并本地上传的图片，避免重复
            const uniqueNewImages = newLocalImages.filter(
                newImg => !localUploadImages.some(
                    existImg => existImg.src === newImg.src
                )
            );
            
            localUploadImages = [...localUploadImages, ...uniqueNewImages];
            
            // 切换到本地上传页面并显示图片
            document.querySelector('.tab[data-tab="local-upload"]').click();
        })
        .catch(error => {
            console.error('图片上传错误:', error);
            alert('图片上传失败，请重试');
        });
}

function downloadSelectedImages() {
    const activeTab = document.querySelector('.tab.active').dataset.tab;
    let selectedImages;

    if (activeTab === 'plugin-images') {
        // 只下载插件获取的图片
        selectedImages = Array.from(document.querySelectorAll('#imageContainer .image-item'))
            .filter(item => {
                const checkbox = item.querySelector('input[type="checkbox"]');
                return checkbox && checkbox.checked;
            })
            .map(item => item.querySelector('canvas'));
    } else {
        // 只下载本地上传的图片
        selectedImages = Array.from(document.querySelectorAll('#imageContainer .image-item'))
            .filter(item => {
                const checkbox = item.querySelector('input[type="checkbox"]');
                return checkbox && checkbox.checked;
            })
            .map(item => item.querySelector('canvas'));
    }

    console.log('选中的图片数量:', selectedImages.length, '活动选项卡:', activeTab);

    if (selectedImages.length === 0) {
        alert('请至少选择一张图片进行下载');
        return;
    }

    selectedImages.forEach((canvas, index) => {
        const link = document.createElement('a');
        link.download = `processed_image_${index + 1}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

function createLocalUploadImageItem(canvas, index) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.id = `local-image-checkbox-${index}`;

    const label = document.createElement('label');
    label.htmlFor = `local-image-checkbox-${index}`;
    label.textContent = `本地图片 ${index + 1}`;

    const imgItem = document.createElement('div');
    imgItem.className = 'image-item selected';

    // 添加点击事件逻辑
    imgItem.addEventListener('click', (event) => {
        if (event.target !== checkbox) {
            checkbox.checked = !checkbox.checked;
            imgItem.classList.toggle('selected', checkbox.checked);
        }
    });

    // 复选框变化时的事件
    checkbox.addEventListener('change', () => {
        imgItem.classList.toggle('selected', checkbox.checked);
    });

    imgItem.appendChild(canvas);
    imgItem.appendChild(checkbox);
    imgItem.appendChild(label);

    // 增加图片信息显示
    const imageInfo = document.createElement('div');
    imageInfo.textContent = `尺寸: ${canvas.width}x${canvas.height}`;
    imageInfo.style.fontSize = '12px';
    imageInfo.style.color = '#666';
    imageInfo.style.marginTop = '10px';
    
    imgItem.appendChild(imageInfo);

    return imgItem;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function displayImages() {
    applyImageSize();
}

function applyImageSize() {
    const canvasWidth = parseInt(document.getElementById('canvasWidth').value);
    const canvasHeight = parseInt(document.getElementById('canvasHeight').value);
    const imageWidth = parseInt(document.getElementById('imageWidth').value);
    const imageHeight = parseInt(document.getElementById('imageHeight').value);

    const imageContainer = document.getElementById('imageContainer');
    imageContainer.innerHTML = '';

    images.forEach((img, index) => {
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');

        const imgElement = new Image();
        imgElement.onload = () => {
            // 填充白色背景
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // 计算缩放比例
            const scaleX = imageWidth / imgElement.width;
            const scaleY = imageHeight / imgElement.height;
            const scale = Math.min(scaleX, scaleY);

            // 计算居中位置
            const scaledWidth = imgElement.width * scale;
            const scaledHeight = imgElement.height * scale;
            const x = (canvasWidth - scaledWidth) / 2;
            const y = (canvasHeight - scaledHeight) / 2;

            // 在白色背景上绘制调整大小后的图像
            ctx.drawImage(imgElement, 0, 0, imgElement.width, imgElement.height, x, y, scaledWidth, scaledHeight);

            // 更新显示
            const imgItem = createImageItem(canvas, index);
            imageContainer.appendChild(imgItem);
        };
        imgElement.src = img.src;
    });
}

function createImageItem(canvas, index) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.id = `image-checkbox-${index}`;

    const label = document.createElement('label');
    label.htmlFor = `image-checkbox-${index}`;
    label.textContent = `图片 ${index + 1}`;

    const imgItem = document.createElement('div');
    imgItem.className = 'image-item selected';

    // 添加点击事件逻辑
    imgItem.addEventListener('click', (event) => {
        if (event.target !== checkbox) {
            checkbox.checked = !checkbox.checked;
            imgItem.classList.toggle('selected', checkbox.checked);
        }
    });

    // 复选框变化时的事件
    checkbox.addEventListener('change', () => {
        imgItem.classList.toggle('selected', checkbox.checked);
    });

    // 添加涂抹功能按钮
    addInpaintingFeature(imgItem, canvas);

    imgItem.appendChild(canvas);
    imgItem.appendChild(checkbox);
    imgItem.appendChild(label);

    // 增加图片信息显示
    const imageInfo = document.createElement('div');
    imageInfo.textContent = `尺寸: ${canvas.width}x${canvas.height}`;
    imageInfo.style.fontSize = '12px';
    imageInfo.style.color = '#666';
    imageInfo.style.marginTop = '10px';
    
    imgItem.appendChild(imageInfo);

    return imgItem;
}

// 在文件末尾添加涂抹功能相关代码
let currentCanvas = null;
let isDrawing = false;
let ctx = null;

function addInpaintingFeature(imgItem, canvas) {
    // 暂时注释掉按钮创建和添加
    // const inpaintButton = document.createElement('button');
    // inpaintButton.textContent = '涂抹去除';
    // ... 其他样式和事件代码
    
    // 不再将按钮添加到 imgItem
    // imgItem.appendChild(inpaintButton);
}

function initInpainting(canvas) {
    currentCanvas = canvas;
    ctx = canvas.getContext('2d');
    
    // 禁用其他交互
    canvas.style.cursor = 'crosshair';
    
    // 添加涂抹事件监听
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    alert('现在可以在图片上涂抹要去除的区域，涂抹完成后松开鼠标');
}

function startDrawing(e) {
    if (!currentCanvas) return;
    
    isDrawing = true;
    const rect = currentCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 20;  // 涂抹笔触大小
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    
    ctx.beginPath();
    ctx.moveTo(x, y);
}

function draw(e) {
    if (!isDrawing) return;
    
    const rect = currentCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
}

function stopDrawing() {
    if (!isDrawing) return;
    
    isDrawing = false;
    ctx.closePath();
    
    // 恢复光标
    currentCanvas.style.cursor = 'default';
    
    // 保存原始图像
    const originalImage = ctx.getImageData(0, 0, currentCanvas.width, currentCanvas.height);
    
    // 添加确认对话框
    const confirmRemove = confirm('确定要删除涂抹区域吗？');
    if (!confirmRemove) {
        // 如果取消，恢复原图
        ctx.putImageData(originalImage, 0, 0);
    }
}

function setupSizeLinking() {
    const canvasWidth = document.getElementById('canvasWidth');
    const canvasHeight = document.getElementById('canvasHeight');
    const imageWidth = document.getElementById('imageWidth');
    const imageHeight = document.getElementById('imageHeight');
    const sizeLinkCheckbox = document.getElementById('sizeLinkCheckbox');

    let aspectRatio = 1;

    function updateAspectRatio() {
        aspectRatio = canvasWidth.value / canvasHeight.value;
    }

    function syncDimensions(source, target, isWidth) {
        if (!sizeLinkCheckbox.checked) return;

        if (isWidth) {
            target.value = Math.round(source.value / aspectRatio);
        } else {
            target.value = Math.round(source.value * aspectRatio);
        }
    }

    function syncCanvasAndImageDimensions() {
        if (!sizeLinkCheckbox.checked) return;

        imageWidth.value = canvasWidth.value;
        imageHeight.value = canvasHeight.value;
    }

    // 添加事件监听器
    [canvasWidth, canvasHeight, imageWidth, imageHeight].forEach(input => {
        input.addEventListener('input', () => {
            updateAspectRatio();
            
            switch(input) {
                case canvasWidth:
                    syncDimensions(canvasWidth, canvasHeight, true);
                    syncCanvasAndImageDimensions();
                    break;
                case canvasHeight:
                    syncDimensions(canvasHeight, canvasWidth, false);
                    syncCanvasAndImageDimensions();
                    break;
                case imageWidth:
                    if (sizeLinkCheckbox.checked) {
                        syncDimensions(imageWidth, imageHeight, true);
                        canvasWidth.value = imageWidth.value;
                        canvasHeight.value = imageHeight.value;
                    }
                    break;
                case imageHeight:
                    if (sizeLinkCheckbox.checked) {
                        syncDimensions(imageHeight, imageWidth, false);
                        canvasWidth.value = imageWidth.value;
                        canvasHeight.value = imageHeight.value;
                    }
                    break;
            }

            applyImageSize();
        });
    });

    // 复选框变化事件
    sizeLinkCheckbox.addEventListener('change', () => {
        if (sizeLinkCheckbox.checked) {
            // 重新同步尺寸
            updateAspectRatio();
            syncCanvasAndImageDimensions();
            applyImageSize();
        }
    });
}
