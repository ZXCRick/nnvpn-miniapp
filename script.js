let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Данные пользователя из Telegram
const user = tg.initDataUnsafe?.user;
const isAdmin = [913301430, 7747044405, 706826056].includes(user?.id);

// ========== ПРОФИЛЬ С РЕАЛЬНОЙ АВАТАРКОЙ ==========
function loadProfile() {
    if (!user) {
        document.getElementById('profileName').textContent = 'Гость';
        return;
    }

    // Имя
    document.getElementById('profileName').textContent = user.first_name + (user.last_name ? ' ' + user.last_name : '');
    
    // ID
    document.getElementById('profileId').textContent = user.id;
    
    // Username
    document.getElementById('profileUsername').textContent = user.username ? '@' + user.username : '—';
    
    // Дата (потом из API)
    document.getElementById('profileDate').textContent = 'сегодня';
    
    // Аватарка
    const avatarImg = document.getElementById('avatarImage');
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
    
    // Пытаемся получить фото профиля
    if (user.photo_url) {
        avatarImg.src = user.photo_url;
        avatarImg.style.display = 'block';
        avatarPlaceholder.style.display = 'none';
    } else {
        // Показываем заглушку с инициалами
        const initials = (user.first_name?.[0] || '') + (user.last_name?.[0] || '');
        avatarPlaceholder.textContent = initials || '👤';
    }
}

// ========== УВЕДОМЛЕНИЯ ==========
function showToast(text, duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

// ========== НАВИГАЦИЯ ==========
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        
        // Загружаем данные при переключении
        switch(btn.dataset.tab) {
            case 'status': loadStatus(); break;
            case 'history': loadHistory(); break;
            case 'stats': if (isAdmin) loadStats(); break;
        }
    });
});

// Показываем админ-кнопку если нужно
if (isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex');
}

// ========== СТАТУС ==========
async function loadStatus() {
    const demoKey = localStorage.getItem('demoKey');
    const expires = localStorage.getItem('keyExpires');
    
    if (demoKey) {
        document.getElementById('statusKey').textContent = demoKey;
        document.getElementById('statusTier').textContent = 'DEMO';
        document.getElementById('statusDevices').textContent = '1/2';
        document.getElementById('statusExpires').textContent = expires ? `Действует до: ${expires}` : '';
        
        if (expires) {
            const daysLeft = Math.ceil((new Date(expires) - new Date()) / (1000 * 60 * 60 * 24));
            document.getElementById('statusProgress').style.width = `${Math.min(100, (30 - daysLeft) * 3.33)}%`;
            document.getElementById('statusDays').textContent = `${daysLeft} дней осталось`;
        }
    } else {
        document.getElementById('statusKey').textContent = '—';
        document.getElementById('statusTier').textContent = 'FREE';
        document.getElementById('statusDevices').textContent = '0/2';
        document.getElementById('statusExpires').textContent = '';
        document.getElementById('statusProgress').style.width = '0%';
        document.getElementById('statusDays').textContent = '0 дней осталось';
    }
}

function refreshStatus() {
    loadStatus();
    showToast('Статус обновлён');
}

function copyKey() {
    const key = document.getElementById('statusKey').textContent;
    if (key && key !== '—') {
        navigator.clipboard.writeText(key);
        showToast('Ключ скопирован');
    }
}

// ========== ИСТОРИЯ ==========
function loadHistory() {
    // Заглушка
}

// ========== СТАТИСТИКА ==========
function loadStats() {
    if (!isAdmin) return;
    // Заглушка
}

function refreshStats() {
    loadStats();
    showToast('Статистика обновлена');
}

// ========== ТАРИФЫ ==========
const plans = {
    month: { name: '1 месяц', price: 250 },
    quarter: { name: '3 месяца', price: 750 },
    halfyear: { name: '6 месяцев', price: 1500 }
};

let selectedPlan = null;

function selectPlan(plan) {
    selectedPlan = plan;
    document.getElementById('modalTitle').textContent = plans[plan].name;
    document.getElementById('modalDescription').textContent = `Сумма: ${plans[plan].price} ₽`;
    document.getElementById('paymentModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('paymentModal').style.display = 'none';
    selectedPlan = null;
}

async function payWith(method) {
    if (!selectedPlan) return;
    
    tg.MainButton.setText('Обработка...');
    tg.MainButton.show();
    
    // Здесь будет запрос к бэкенду
    showToast('Демо-режим: оплата не работает');
    
    tg.MainButton.hide();
    closeModal();
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    loadStatus();
    
    // Делаем профиль видимым сразу
    document.getElementById('profileSection').style.display = 'block';
    
    // Приветствие
    if (user?.first_name) {
        document.querySelector('.welcome-text h1').textContent = `⚡ Привет, ${user.first_name}!`;
    }
});

// Закрытие модалки по клику вне
document.getElementById('paymentModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});
