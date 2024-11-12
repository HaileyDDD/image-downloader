let images = [];

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const imageData = urlParams.get('images');
    
    // 处理从 popup 传来的图片
    if (imageData) {
        images = JSON.parse(decodeURIComponent(imageData));
    }

    // 初始化尺寸输入框的事件监听器
    ['canvasWidth', 'canvasHeight', 'imageWidth', 'imageHeight'].forEach(id => {
        const input = document.getElementById(id);
        input.addEventListener('input', debounce(applyImageSize, 300));
    });

    // 添加本地文件上传事件监听器
    const imageUpload = document.getElementById('imageUpload');
    imageUpload.addEventListener('change', handleLocalImageUpload);

    displayImages();

    const downloadButton = document.getElementById('downloadAll');
    if (downloadButton) {
        downloadButton.addEventListener('click', downloadSelectedImages);
    }

    // 添加联动逻辑
    const canvasWidth = document.getElementById('canvasWidth');
    const canvasHeight = document.getElementById('canvasHeight');
    const imageWidth = document.getElementById('imageWidth');
    const imageHeight = document.getElementById('imageHeight');

    // 画布宽度变化时，同步像素宽度
    canvasWidth.addEventListener('input', () => {
        imageWidth.value = canvasWidth.value;
        applyImageSize();
    });

    // 画布高度变化时，同步像素高度
    canvasHeight.addEventListener('input', () => {
        imageHeight.value = canvasHeight.value;
        applyImageSize();
    });

    // 像素宽度变化时，同步画布宽度
    imageWidth.addEventListener('input', () => {
        canvasWidth.value = imageWidth.value;
        applyImageSize();
    });

    // 像素高度变化时，同步画布高度
    imageHeight.addEventListener('input', () => {
        canvasHeight.value = imageHeight.value;
        applyImageSize();
    });
});

function handleLocalImageUpload(event) {
    const files = event.target.files;
    
    // 将本地文件转换为可处理的图片数据
    const localImagePromises = Array.from(files).map(file => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({ src: e.target.result });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    });

    Promise.all(localImagePromises)
        .then(localImages => {
            // 合并本地上传的图片和之前的图片
            images = [...images, ...localImages];
            displayImages();
        })
        .catch(error => {
            console.error('图片上传错误:', error);
            alert('图片上传失败，请重试');
        });
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

    imgItem.appendChild(canvas);
    imgItem.appendChild(checkbox);
    imgItem.appendChild(label);

    return imgItem;
}

function downloadSelectedImages() {
    const selectedImages = Array.from(document.querySelectorAll('.image-item input:checked'))
        .map(checkbox => checkbox.closest('.image-item').querySelector('canvas'));

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
