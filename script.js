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
    
    // 📅 Дата первого запуска
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

// ========== РЕФЕРАЛКА ==========
function loadReferralData() {
    if (!user) return;
    
    // Реферальная ссылка
    const referralLink = `https://t.me/NNVPN_bot?start=ref_${user.id}`;
    document.getElementById('referralLink').value = referralLink;
    
    // Статистика рефералов
    const referrals = JSON.parse(localStorage.getItem(`referrals_${user.id}`) || '[]');
    document.getElementById('referralCount').textContent = referrals.length;
    
    // Заработано (50₽ за реферала)
    const earned = referrals.length * 50;
    document.getElementById('referralEarned').textContent = `${earned} ₽`;
    
    // История переходов
    const historyEl = document.getElementById('referralHistory');
    const emptyEl = document.getElementById('referralHistoryEmpty');
    
    if (referrals.length > 0) {
        emptyEl.style.display = 'none';
        
        let historyHTML = '<div class="referral-history-list">';
        referrals.forEach(ref => {
            historyHTML += `
                <div class="referral-item">
                    <span>${ref.name || 'Пользователь'}</span>
                    <span class="badge outline">${ref.date || 'недавно'}</span>
                </div>
            `;
        });
        historyHTML += '</div>';
        
        // Проверяем есть ли уже список
        const existingList = document.querySelector('.referral-history-list');
        if (existingList) {
            existingList.remove();
        }
        
        const listDiv = document.createElement('div');
        listDiv.className = 'referral-history-list';
        listDiv.innerHTML = historyHTML;
        historyEl.appendChild(listDiv);
    } else {
        emptyEl.style.display = 'block';
        const existingList = document.querySelector('.referral-history-list');
        if (existingList) existingList.remove();
    }
}

function copyReferralLink() {
    const link = document.getElementById('referralLink');
    link.select();
    navigator.clipboard.writeText(link.value);
    showToast('Ссылка скопирована');
}

function refreshReferrals() {
    loadReferralData();
    showToast('Статистика обновлена');
}

// ========== НАВИГАЦИЯ (ИСПРАВЛЕНО) ==========
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        // Убираем active у всех кнопок
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        // Добавляем active текущей
        this.classList.add('active');
        
        // Убираем active у всех табов
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        
        // Показываем нужный таб
        const tabId = `tab-${this.dataset.tab}`;
        const activeTab = document.getElementById(tabId);
        if (activeTab) {
            activeTab.classList.add('active');
            
            // Загружаем данные при необходимости
            if (this.dataset.tab === 'referral') {
                loadReferralData();
            } else if (this.dataset.tab === 'status') {
                loadStatus();
            } else if (this.dataset.tab === 'stats' && isAdmin) {
                loadStats();
            }
        }
    });
});

// Показываем админ-кнопку
if (isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
}

// ========== СТАТУС ПОДПИСКИ ==========
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
    
    // По умолчанию показываем тарифы
    document.querySelector('[data-tab="plans"]').classList.add('active');
    document.getElementById('tab-plans').classList.add('active');
    
    // Закрытие модалки по клику вне
    document.getElementById('paymentModal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
});
