import requests
from bs4 import BeautifulSoup
from PIL import Image
from io import BytesIO
import os
import gradio as gr

def download_and_resize_image(url, output_path, size):
    # 下载图片
    response = requests.get(url)
    img = Image.open(BytesIO(response.content))

    # 创建一个白色背景的新图像，使用指定的尺寸
    new_img = Image.new("RGB", size, (255, 255, 255))

    # 计算缩放比例，保持原始宽高比
    ratio = min(size[0] / img.width, size[1] / img.height)
    new_size = (int(img.width * ratio), int(img.height * ratio))

    # 调整原图大小，保持比例
    img = img.resize(new_size, Image.LANCZOS)

    # 计算粘贴位置(居中)
    paste_position = ((size[0] - new_size[0]) // 2, (size[1] - new_size[1]) // 2)

    # 将调整后的图片粘贴到白色背景上
    new_img.paste(img, paste_position)

    # 确保新图片的尺寸与指定尺寸完全一致
    new_img = new_img.resize(size, Image.LANCZOS)

    # 保存图片
    new_img.save(output_path)

    print(f"图片已调整大小并保存: {output_path}")
    print(f"新图片尺寸: {new_img.size}")

    # 验证保存的图片尺寸
    saved_img = Image.open(output_path)
    print(f"验证保存的图片尺寸: {saved_img.size}")

    return new_img.size

def get_images_from_page(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')
    return [img['src'] for img in soup.find_all('img') if 'src' in img.attrs]

def main():
    def process_images(page_url, selected_images, resize_checkbox, width, height):
        image_urls = get_images_from_page(page_url)
        
        selected_indices = [int(i)-1 for i in selected_images.split(',')]
        
        output_messages = []
        for i in selected_indices:
            if 0 <= i < len(image_urls):
                url = image_urls[i]
                filename = f"image_{i+1}.jpg"
                if resize_checkbox:
                    size = (int(width), int(height))  # 确保宽度和高度是整数
                    actual_size = download_and_resize_image(url, filename, size)
                    output_messages.append(f"已下载并调整大小到 {actual_size[0]}x{actual_size[1]}: {filename}")
                else:
                    response = requests.get(url)
                    with open(filename, 'wb') as f:
                        f.write(response.content)
                    output_messages.append(f"已下载原始大小: {filename}")
        
        return "\n".join(output_messages)

    with gr.Blocks() as demo:
        gr.Markdown("阿里巴巴图片下载器")
        
        page_url = gr.Textbox(label="请输入要下载图片的网页URL")
        selected_images = gr.Textbox(label="请输入要下载的图片编号（用逗号分隔，例如1,3,5）")
        
        resize_checkbox = gr.Checkbox(label="是否需要调整图片大小？")
        
        with gr.Row():
            width = gr.Number(label="宽度", value=800)
            height = gr.Number(label="高度", value=800)
        
        submit_button = gr.Button("下载图片")
        output = gr.Textbox(label="输出信息")
        
        submit_button.click(
            process_images,
            inputs=[page_url, selected_images, resize_checkbox, width, height],
            outputs=output
        )

    demo.launch()

if __name__ == "__main__":
    main()
