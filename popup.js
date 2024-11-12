let processedImages = [];

document.addEventListener('DOMContentLoaded', function() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: "getImages"}, function(response) {
      if (response && response.images) {
        displayImages(response.images);
      }
    });
  });

  document.getElementById('downloadBtn').addEventListener('click', openImageProcessor);
  document.getElementById('downloadOriginalBtn').addEventListener('click', downloadOriginalImages);

  const globalSelectAllBtn = document.getElementById('globalSelectAll');
  if (globalSelectAllBtn) {
    globalSelectAllBtn.addEventListener('click', globalSelectAll);
  }
});

function displayImages(images) {
  const imageSizeGroups = document.getElementById('imageSizeGroups');
  const groupedImages = groupImagesBySize(images);

  // 按像素大小从大到小排序
  const sortedSizes = Object.keys(groupedImages).sort((a, b) => {
    const [widthA, heightA] = a.split('x').map(Number);
    const [widthB, heightB] = b.split('x').map(Number);
    return (widthB * heightB) - (widthA * heightA);
  });

  sortedSizes.forEach(size => {
    const imgs = groupedImages[size];
    const sizeGroup = document.createElement('div');
    sizeGroup.className = 'size-group';
    
    const sizeHeader = document.createElement('h2');
    sizeHeader.textContent = `${size} (${imgs.length} 张图片)`;
    sizeGroup.appendChild(sizeHeader);

    const selectAllCheckbox = document.createElement('input');
    selectAllCheckbox.type = 'checkbox';
    selectAllCheckbox.className = 'size-select-all';
    selectAllCheckbox.id = `select-all-${size}`;
    const selectAllLabel = document.createElement('label');
    selectAllLabel.htmlFor = `select-all-${size}`;
    selectAllLabel.textContent = '全选';
    sizeGroup.appendChild(selectAllCheckbox);
    sizeGroup.appendChild(selectAllLabel);

    const imageList = document.createElement('div');
    imageList.className = 'image-list';
    imageList.style.justifyContent = 'flex-start';

    imgs.forEach((img, index) => {
      const imageItem = createImageItem(img, index, size);
      imageList.appendChild(imageItem);
    });

    sizeGroup.appendChild(imageList);
    imageSizeGroups.appendChild(sizeGroup);

    selectAllCheckbox.addEventListener('change', function() {
      const checkboxes = imageList.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => cb.checked = this.checked);
    });
  });
}

function createImageItem(img, index, size) {
  const imageItem = document.createElement('div');
  imageItem.className = 'image-item';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.value = img.src;
  checkbox.id = `image-${size}-${index}`;

  const thumbnail = document.createElement('img');
  thumbnail.src = img.src;
  thumbnail.alt = `Image ${index + 1}`;

  const label = document.createElement('label');
  label.htmlFor = `image-${size}-${index}`;
  label.textContent = `${img.width}x${img.height}`;

  imageItem.addEventListener('click', (event) => {
    if (event.target !== checkbox) {
      checkbox.checked = !checkbox.checked;
      
      imageItem.classList.toggle('selected', checkbox.checked);
    }
  });

  checkbox.addEventListener('change', () => {
    imageItem.classList.toggle('selected', checkbox.checked);
  });

  imageItem.appendChild(checkbox);
  imageItem.appendChild(thumbnail);
  imageItem.appendChild(label);

  return imageItem;
}

function groupImagesBySize(images) {
  return images.reduce((acc, img) => {
    const size = `${img.width}x${img.height}`;
    if (!acc[size]) {
      acc[size] = [];
    }
    acc[size].push(img);
    return acc;
  }, {});
}

function openImageProcessor() {
  const selectedImages = Array.from(document.querySelectorAll('.image-item input[type="checkbox"]:checked')).map(cb => cb.value);

  if (selectedImages.length > 0) {
    const imageData = selectedImages.map(src => ({ src }));
    const encodedImageData = encodeURIComponent(JSON.stringify(imageData));
    const processorUrl = chrome.runtime.getURL('image_processor.html') + `?images=${encodedImageData}`;
    chrome.tabs.create({ url: processorUrl });
  } else {
    console.log('No images selected');
    showError('请至少选择一张图片');
  }
}

function downloadOriginalImages() {
  console.log('Downloading original images');
  const selectedImages = Array.from(document.querySelectorAll('.image-item input[type="checkbox"]:checked')).map(cb => cb.value);

  if (selectedImages.length > 0) {
    selectedImages.forEach((src, index) => {
      chrome.downloads.download({
        url: src,
        filename: `original_image_${index + 1}.jpg`,
        saveAs: false
      });
    });
  } else {
    console.log('No images selected');
    showError('请至少选择一张图片');
  }
}

function showError(message) {
  alert(message);
}

function globalSelectAll() {
  const allCheckboxes = document.querySelectorAll('.image-item input[type="checkbox"]');
  const selectAllGroups = document.querySelectorAll('.size-select-all');

  // 检查当前是否全选
  const isCurrentlyAllSelected = Array.from(allCheckboxes).every(cb => cb.checked);

  // 切换全选状态
  allCheckboxes.forEach(cb => {
    cb.checked = !isCurrentlyAllSelected;
  });

  // 同步组级全选复选框
  selectAllGroups.forEach(checkbox => {
    checkbox.checked = !isCurrentlyAllSelected;
  });
}
