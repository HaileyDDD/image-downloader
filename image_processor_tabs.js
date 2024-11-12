document.addEventListener('DOMContentLoaded', () => {
    // 选项卡切换逻辑
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // 切换选项卡激活状态
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // 切换内容面板
            document.querySelectorAll('.content-panel').forEach(panel => panel.classList.remove('active'));
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });
}); 