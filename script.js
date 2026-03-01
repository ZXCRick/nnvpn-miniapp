let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Данные пользователя из Telegram
const user = tg.initDataUnsafe?.user;
const isAdmin = [913301430, 7747044405, 706826056].includes(user?.id);

// ========== ПРОФИЛЬ ==========
function loadProfile() {
    if (!user) {
        document.getElementById('profileName').textContent = 'Гость';
        document.getElementById('profileUsername').textContent = '—';
        document.getElementById('profileId').textContent = 'ID: —';
        return;
    }

    // Имя
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    document.getElementById('profileName').textContent = fullName;
    document.getElementById('userName').textContent = user.first_name;
    
    // ID
    document.getElementById('profileId').textContent = `ID: ${user.id}`;
    
    // Username
    document.getElementById('profileUsername').textContent = user.username ? '@' + user.username : '—';
    
    // 📅 Дата первого запуска (хранится локально)
    let joinDate = localStorage.getItem('nnvpn_join_date');
    if (!joinDate) {
        const now = new Date();
        joinDate = now.toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
        localStorage.setItem('nnvpn_join_date', joinDate);
        localStorage.setItem('nnvpn_join_timestamp', now.getTime());
    }
    document.getElementById('profileJoinDate').textContent = joinDate;
    
    // Аватар
    const avatarImg = document.getElementById('avatarImage');
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
    
    if (user.photo_url) {
        avatarImg.src = user.photo_url;
        avatarImg.style.display = 'block';
        avatarPlaceholder.style.display = 'none';
    } else {
        const initials = (user.first_name?.[0] || '') + (user.last_name?.[0] || '');
        avatarPlaceholder.textContent = initials || '?';
    }
    
    // Тариф (из localStorage или demo)
    const tier = localStorage.getItem('nnvpn_tier') || 'FREE';
    document.getElementById('profileTier').textContent = tier;
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
            case 'stats': if (isAdmin) loadStats(); break;
        }
    });
});

// Показываем админ-кнопку
if (isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
}

// ========== СТАТУС ПОДПИСКИ ==========
function loadStatus() {
    const demoKey = localStorage.getItem('nnvpn_demo_key');
    const expires = localStorage.getItem('nnvpn_expires');
    
    if (demoKey) {
        document.getElementById('statusKey').textContent = demoKey;
        document.getElementById('statusTier').textContent = 'DEMO';
        document.getElementById('statusDevices').textContent = '1/2';
        
        if (expires) {
            document.getElementById('statusExpires').textContent = expires;
            
            // Считаем дни
            const daysLeft = Math.ceil((new Date(expires) - new Date()) / (1000 * 60 * 60 * 24));
            const progress = Math.min(100, Math.max(0, (daysLeft / 7) * 100));
            document.getElementById('statusProgress').style.width = progress + '%';
        }
    } else {
        document.getElementById('statusKey').textContent = '—';
        document.getElementById('statusTier').textContent = 'FREE';
        document.getElementById('statusDevices').textContent = '0/2';
        document.getElementById('statusExpires').textContent = '—';
        document.getElementById('statusProgress').style.width = '0%';
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

function payWith(method) {
    if (!selectedPlan) return;
    
    tg.MainButton.setText('Обработка...');
    tg.MainButton.show();
    
    // Имитация оплаты
    setTimeout(() => {
        showToast('Демо-режим: оплата не работает');
        tg.MainButton.hide();
        closeModal();
    }, 1000);
}

// ========== СТАТИСТИКА (АДМИН) ==========
function loadStats() {
    if (!isAdmin) return;
    
    // Заглушка
    document.getElementById('statsUsers').textContent = '125';
    document.getElementById('statsActive').textContent = '43';
    document.getElementById('statsSales').textContent = '12';
    document.getElementById('statsDemo').textContent = '67';
}

function refreshStats() {
    loadStats();
    showToast('Статистика обновлена');
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    loadStatus();
    
    // Закрытие модалки по клику вне
    document.getElementById('paymentModal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
});
