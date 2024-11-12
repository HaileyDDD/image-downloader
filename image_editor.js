let canvas;

function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function initializeEditor() {
    try {
        const fabricUrl = chrome.runtime.getURL('fabric.min.js');
        await loadScript(fabricUrl);

        if (typeof fabric === 'undefined') {
            throw new Error('Fabric.js 未能正确加载。');
        }

        const urlParams = new URLSearchParams(window.location.search);
        const imageData = urlParams.get('image');

        initializeFabricCanvas(imageData);

        document.getElementById('crop').addEventListener('click', enableCropping);
        document.getElementById('rotate').addEventListener('click', rotateImage);
        document.getElementById('flip-x').addEventListener('click', () => flipImage('x'));
        document.getElementById('flip-y').addEventListener('click', () => flipImage('y'));
        document.getElementById('draw').addEventListener('click', enableDrawing);
        document.getElementById('text').addEventListener('click', addText);
        document.getElementById('save').addEventListener('click', saveEditedImage);
        document.getElementById('cancel').addEventListener('click', () => window.close());
    } catch (error) {
        console.error('初始化编辑器时出错:', error);
    }
}

document.addEventListener('DOMContentLoaded', initializeEditor);

function initializeFabricCanvas(imageData) {
    canvas = new fabric.Canvas('editor-canvas');
    fabric.Image.fromURL(imageData, img => {
        canvas.setDimensions({width: img.width, height: img.height});
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
    });
}

function enableCropping() {
    // 实现裁剪功能
    alert('裁剪功能尚未实现');
}

function rotateImage() {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
        activeObject.rotate(activeObject.angle + 90);
        canvas.renderAll();
    } else {
        alert('请先选择一个对象');
    }
}

function flipImage(axis) {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
        if (axis === 'x') {
            activeObject.set('flipX', !activeObject.flipX);
        } else {
            activeObject.set('flipY', !activeObject.flipY);
        }
        canvas.renderAll();
    } else {
        alert('请先选择一个对象');
    }
}

function enableDrawing() {
    canvas.isDrawingMode = !canvas.isDrawingMode;
    if (canvas.isDrawingMode) {
        canvas.freeDrawingBrush.width = 5;
        canvas.freeDrawingBrush.color = '#000000';
    }
}

function addText() {
    const text = new fabric.IText('输入文字', {
        left: 50,
        top: 50,
        fontFamily: 'Arial',
        fill: '#000000',
        fontSize: 20
    });
    canvas.add(text);
    canvas.setActiveObject(text);
}

function saveEditedImage() {
    const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1
    });

    const link = document.createElement('a');
    link.download = 'edited_image.png';
    link.href = dataURL;
    link.click();

    window.close();
}
