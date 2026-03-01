let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Данные пользователя
const user = tg.initDataUnsafe?.user;
const ADMIN_IDS = [913301430, 7747044405, 706826056];
const isAdmin = user && ADMIN_IDS.includes(user.id);

// ========== ПРОФИЛЬ ==========
function loadProfile() {
    if (!user) {
        document.getElementById('profileName').textContent = 'Гость';
        document.getElementById('profileUsername').textContent = '—';
        document.getElementById('profileId').textContent = '—';
        return;
    }

    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    document.getElementById('profileName').textContent = fullName;
    document.getElementById('userName').textContent = user.first_name || 'Пользователь';
    document.getElementById('profileId').textContent = user.id;
    document.getElementById('profileUsername').textContent = user.username ? '@' + user.username : '—';
    
    // Дата регистрации
    let joinDate = localStorage.getItem(`join_date_${user.id}`);
    if (!joinDate) {
        const now = new Date();
        joinDate = now.toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
        localStorage.setItem(`join_date_${user.id}`, joinDate);
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
    
    // Тариф
    const tier = localStorage.getItem(`tier_${user.id}`) || 'FREE';
    document.getElementById('profileTier').textContent = tier;
}

// ========== НАВИГАЦИЯ ==========
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        const tabId = `tab-${this.dataset.tab}`;
        const activeTab = document.getElementById(tabId);
        if (activeTab) {
            activeTab.classList.add('active');
            
            // Загружаем данные
            if (this.dataset.tab === 'status') loadStatus();
            else if (this.dataset.tab === 'stats' && isAdmin) loadStats();
            else if (this.dataset.tab === 'promo' && isAdmin) loadPromoLinks();
        }
    });
});

// Показываем админ-кнопки
if (isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
}

// ========== СТАТУС ==========
function loadStatus() {
    if (!user) return;
    
    const demoKey = localStorage.getItem(`demo_key_${user.id}`);
    const expires = localStorage.getItem(`expires_${user.id}`);
    
    if (demoKey) {
        document.getElementById('statusKey').textContent = demoKey;
        document.getElementById('statusTier').textContent = 'DEMO';
        document.getElementById('statusDevices').textContent = '1/2';
        
        if (expires) {
            document.getElementById('statusExpires').textContent = expires;
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

// ========== УВЕДОМЛЕНИЯ ==========
function showToast(text, duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
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
    
    setTimeout(() => {
        showToast('Демо-режим: оплата не работает');
        tg.MainButton.hide();
        closeModal();
    }, 1000);
}

// ========== СТАТИСТИКА (АДМИН) ==========
function loadStats() {
    if (!isAdmin) return;
    
    document.getElementById('statsTotalUsers').textContent = '1 234';
    document.getElementById('statsActiveToday').textContent = '345';
    document.getElementById('statsNewWeek').textContent = '123';
    document.getElementById('statsDemoKeys').textContent = '456';
    document.getElementById('statsTotalSales').textContent = '789';
    document.getElementById('statsTotalRevenue').textContent = '187 250 ₽';
    document.getElementById('statsMonthRevenue').textContent = '45 600 ₽';
    document.getElementById('statsAvgCheck').textContent = '237 ₽';
    document.getElementById('statsClickToDemo').textContent = '24%';
    document.getElementById('statsDemoToPaid').textContent = '12%';
    document.getElementById('statsChurn').textContent = '5.6%';
    document.getElementById('statsLTV').textContent = '1 450 ₽';
}

function refreshStats() {
    loadStats();
    showToast('Статистика обновлена');
}

// ========== ПРОМО (ДЛЯ ПИАРЩИКА) ==========
let promoLinks = [];

function loadPromoLinks() {
    if (!isAdmin || !user) return;
    
    const saved = localStorage.getItem(`promo_links_${user.id}`);
    if (saved) {
        promoLinks = JSON.parse(saved);
    } else {
        // Тестовые данные
        promoLinks = [
            {
                id: '1',
                name: 'telegram_channel',
                url: `https://t.me/vpnNoNamebot?start=promo_telegram_channel`,
                clicks: 245,
                demos: 38,
                sales: 4,
                revenue: 1000
            },
            {
                id: '2',
                name: 'youtube_review',
                url: `https://t.me/vpnNoNamebot?start=promo_youtube_review`,
                clicks: 567,
                demos: 89,
                sales: 12,
                revenue: 3000
           
