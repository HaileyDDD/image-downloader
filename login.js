const API_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('#loginForm form');
    const registerForm = document.querySelector('#registerForm form');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const subscribeBtn = document.getElementById('subscribeBtn');

    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    showRegisterBtn.addEventListener('click', () => toggleForms('register'));
    showLoginBtn.addEventListener('click', () => toggleForms('login'));
    subscribeBtn.addEventListener('click', handleSubscribe);

    checkAuthStatus();
});

function toggleForms(formToShow) {
    document.querySelectorAll('.form-container').forEach(form => form.classList.remove('active'));
    document.getElementById(`${formToShow}Form`).classList.add('active');
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('subscriptionStatus', data.subscriptionStatus);
            checkAuthStatus();
        } else {
            const errorData = await response.json();
            alert(errorData.message);
        }
    } catch (error) {
        console.error('登录错误:', error);
        alert('登录过程中发生错误，请稍后再试');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        alert('密码不匹配');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            alert('注册成功，请登录');
            toggleForms('login');
        } else {
            const errorData = await response.json();
            alert(errorData.message);
        }
    } catch (error) {
        console.error('注册错误:', error);
        alert('注册过程中发生错误，请稍后再试');
    }
}

async function handleSubscribe() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('请先登录');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/subscribe`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('subscriptionStatus', data.subscriptionStatus);
            alert('订阅成功');
            checkAuthStatus();
        } else {
            const errorData = await response.json();
            alert(errorData.message);
        }
    } catch (error) {
        console.error('订阅错误:', error);
        alert('订阅过程中发生错误，请稍后再试');
    }
}

async function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const subscriptionStatus = localStorage.getItem('subscriptionStatus');

    if (token) {
        try {
            const response = await fetch(`${API_URL}/verify-token`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                if (subscriptionStatus === 'active') {
                    window.location.href = 'image_processor.html';
                } else {
                    toggleForms('subscribe');
                }
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('subscriptionStatus');
                toggleForms('login');
            }
        } catch (error) {
            console.error('验证错误:', error);
            toggleForms('login');
        }
    } else {
        toggleForms('login');
    }
}
