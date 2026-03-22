let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// ========== НАСТРОЙКИ SUPABASE ==========
const SUPABASE_URL = "https://qgbnjkbtrfyahkxjrokh.supabase.co";
const SUPABASE_KEY = "sb_publishable_Yqsx9Hh6d4tl15XVRSvFhw_LyhxLKB4";

// ========== ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ==========
const user = tg.initDataUnsafe?.user;
const ADMIN_IDS = [913301430, 7747044405, 706826056];
const isAdmin = user && ADMIN_IDS.includes(user.id);

// ========== ХРАНИЛИЩЕ ==========
let userData = null;
let activeKey = null;

// ========== ЗАСТАВКА ==========
window.addEventListener('load', function() {
    setTimeout(() => {
        document.getElementById('splashScreen').classList.add('hidden');
        document.getElementById('app').classList.add('visible');
    }, 1800);
});

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С SUPABASE ==========
async function fetchUserProfile(tgId) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?tg_id=eq.${tgId}&select=*`, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`
        }
    });
    const data = await response.json();
    return data[0] || null;
}

async function fetchUserKeys(userId) {
    const now = new Date().toISOString();
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/keys?user_id=eq.${userId}&select=*&order=expires_at.desc`,
        {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            }
        }
    );
    return await response.json();
}

async function fetchActiveKey(userId) {
    const now = new Date().toISOString();
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/keys?user_id=eq.${userId}&is_active=eq.true&expires_at=gt.${now}&select=*`,
        {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            }
        }
    );
    const data = await response.json();
    return data[0] || null;
}

async function fetchUserPayments(userId) {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/payments?user_id=eq.${userId}&select=*&order=created_at.desc&limit=10`,
        {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            }
        }
    );
    return await response.json();
}

// ========== ЗАГРУЗКА ПРОФИЛЯ ==========
async function loadProfile() {
    if (!user) {
        document.getElementById('profileName').textContent = 'Гость';
        document.getElementById('profileUsername').textContent = '—';
        document.getElementById('profileId').textContent = '—';
        document.getElementById('userName').textContent = 'Гость';
        return;
    }

    // Пробуем загрузить из Supabase
    userData = await fetchUserProfile(user.id);
    
    if (userData) {
        // Есть данные в БД — показываем их
        document.getElementById('profileName').textContent = userData.tg_username || user.tg_username;
        document.getElementById('profileId').textContent = user.id;
        document.getElementById('profileUsername').textContent = userData.tg_username ? '@' + userData.tg_username : '—';
        document.getElementById('profileTier').textContent = userData.tier || 'FREE';
        document.getElementById('profileJoinDate').textContent = userData.created_at?.slice(0, 10) || '—';
        
        // Загружаем активный ключ
        activeKey = await fetchActiveKey(userData.id);
        await loadStatus();
    } else {
        // Нет данных в БД — показываем данные из Telegram
        document.getElementById('profileName').textContent = user.first_name + (user.last_name ? ' ' + user.last_name : '');
        document.getElementById('profileId').textContent = user.id;
        document.getElementById('profileUsername').textContent = user.username ? '@' + user.username : '—';
        document.getElementById('profileTier').textContent = 'FREE';
        document.getElementById('profileJoinDate').textContent = '—';
        
        // Статус без ключа
        document.getElementById('statusKey').textContent = '—';
        document.getElementById('statusTier').textContent = 'FREE';
        document.getElementById('statusDevices').textContent = '0/2';
        document.getElementById('statusExpires').textContent = '—';
        document.getElementById('keyStatus').textContent = '—';
        document.getElementById('statusProgress').style.width = '0%';
    }
    
    // Аватар (всегда из Telegram)
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
}

// ========== СТАТУС ==========
async function loadStatus() {
    if (!user) return;
    
    if (activeKey) {
        document.getElementById('statusKey').textContent = activeKey.key_hash;
        document.getElementById('statusTier').textContent = activeKey.type || 'PREMIUM';
        document.getElementById('statusDevices').textContent = `${activeKey.devices || 1}/2`;
        document.getElementById('statusExpires').textContent = activeKey.expires_at?.slice(0, 10) || '—';
        document.getElementById('keyStatus').textContent = 'Активен';
        
        // Прогресс-бар
        if (activeKey.expires_at) {
            const expires = new Date(activeKey.expires_at);
            const now = new Date();
            const totalDays = 30;
            const daysLeft = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
            const progress = Math.min(100, Math.max(0, (daysLeft / totalDays) * 100));
            document.getElementById('statusProgress').style.width = progress + '%';
        }
    } else {
        document.getElementById('statusKey').textContent = '—';
        document.getElementById('statusTier').textContent = 'FREE';
        document.getElementById('statusDevices').textContent = '0/2';
        document.getElementById('statusExpires').textContent = '—';
        document.getElementById('keyStatus').textContent = '—';
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

// ========== ИСТОРИЯ ==========
async function loadHistory() {
    if (!user || !userData) return;
    
    const payments = await fetchUserPayments(userData.id);
    const list = document.getElementById('historyList');
    
    if (!payments || payments.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>Нет операций</p></div>';
        return;
    }
    
    list.innerHTML = payments.map(p => `
        <div class="history-item">
            <span>${p.created_at?.slice(0, 10)}</span>
            <span>${p.amount_rub} ₽</span>
            <span class="${p.status === 'completed' ? 'status-success' : 'status-pending'}">${p.status}</span>
        </div>
    `).join('');
}

// ========== СТАТИСТИКА (АДМИН) ==========
async function loadStats() {
    if (!isAdmin) return;
    
    // Заглушка — здесь можно добавить реальные запросы
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
        try {
            promoLinks = JSON.parse(saved);
        } catch (e) {
            promoLinks = [];
        }
    } else {
        promoLinks = [];
        localStorage.setItem(`promo_links_${user.id}`, JSON.stringify(promoLinks));
    }
    
    renderPromoLinks();
    updatePromoSummary();
}

function renderPromoLinks() {
    const container = document.getElementById('promoLinksList');
    if (!container) return;
    
    if (promoLinks.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Нет созданных ссылок</p></div>';
        return;
    }
    
    let html = '';
    promoLinks.forEach(link => {
        const convRate = link.clicks > 0 ? Math.round((link.demos / link.clicks) * 100) : 0;
        
        html += `
            <div class="promo-link-item" data-id="${link.id}">
                <div class="promo-link-header">
                    <span class="promo-link-name">${link.name}</span>
                    <button class="copy-link-btn" onclick="copyPromoUrl('${link.url}')">📋</button>
                </div>
                <div class="promo-link-url">${link.url}</div>
                <div class="promo-link-stats">
                    <div class="promo-stat">
                        <span class="promo-stat-label">Клики</span>
                        <span class="promo-stat-value">${link.clicks || 0}</span>
                    </div>
                    <div class="promo-stat">
                        <span class="promo-stat-label">Демо</span>
                        <span class="promo-stat-value">${link.demos || 0}</span>
                    </div>
                    <div class="promo-stat">
                        <span class="promo-stat-label">Конв</span>
                        <span class="promo-stat-value">${convRate}%</span>
                    </div>
                    <div class="promo-stat">
                        <span class="promo-stat-label">Продажи</span>
                        <span class="promo-stat-value">${link.sales || 0}</span>
                    </div>
                    <div class="promo-stat">
                        <span class="promo-stat-label">Выручка</span>
                        <span class="promo-stat-value">${link.revenue || 0}₽</span>
                    </div>
                </div>
                <div class="promo-link-actions">
                    <button class="btn btn-outline" onclick="copyPromoUrl('${link.url}')">Копировать</button>
                    <button class="btn btn-outline" onclick="deletePromoLink('${link.id}')">Удалить</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function updatePromoSummary() {
    const totalClicks = promoLinks.reduce((sum, link) => sum + (link.clicks || 0), 0);
    const totalDemos = promoLinks.reduce((sum, link) => sum + (link.demos || 0), 0);
    const convRate = totalClicks > 0 ? Math.round((totalDemos / totalClicks) * 100) : 0;
    
    document.getElementById('promoTotalClicks').textContent = totalClicks;
    document.getElementById('promoTotalDemos').textContent = totalDemos;
    document.getElementById('promoTotalConv').textContent = convRate + '%';
}

function createPromoLink() {
    const nameInput = document.getElementById('promoNameInput');
    const name = nameInput.value.trim();
    
    if (!name) {
        showToast('Введите название ссылки');
        return;
    }
    
    if (promoLinks.some(link => link.name === name)) {
        showToast('Такое название уже существует');
        return;
    }
    
    const newLink = {
        id: Date.now().toString(),
        name: name,
        url: `https://t.me/vpnNoNamebot?start=promo_${name}`,
        clicks: 0,
        demos: 0,
        sales: 0,
        revenue: 0
    };
    
    promoLinks.push(newLink);
    localStorage.setItem(`promo_links_${user.id}`, JSON.stringify(promoLinks));
    
    nameInput.value = '';
    renderPromoLinks();
    updatePromoSummary();
    showToast('Ссылка создана');
}

function copyPromoUrl(url) {
    navigator.clipboard.writeText(url);
    showToast('Ссылка скопирована');
}

function deletePromoLink(id) {
    if (confirm('Удалить эту ссылку?')) {
        promoLinks = promoLinks.filter(link => link.id !== id);
        localStorage.setItem(`promo_links_${user.id}`, JSON.stringify(promoLinks));
        renderPromoLinks();
        updatePromoSummary();
        showToast('Ссылка удалена');
    }
}

function refreshPromoStats() {
    showToast('Статистика обновлена');
}

// ========== УВЕДОМЛЕНИЯ ==========
function showToast(text, duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

// ========== ТАРИФЫ ==========
const plans = {
    month: { name: '1 месяц', price: 250, type: 'PREMIUM', devices: 2, days: 30 },
    quarter: { name: '3 месяца', price: 650, type: 'PREMIUM', devices: 3, days: 90 },
    family: { name: 'Семейный', price: 1200, type: 'FAMILY', devices: 5, days: 180 },
    year: { name: 'Годовой', price: 2200, type: 'PREMIUM', devices: 5, days: 365 }
};

let selectedPlan = null;

function selectPlan(plan) {
    selectedPlan = plan;
    const planData = plans[plan];
    
    let description = `${planData.name}\nСумма: ${planData.price} ₽\nУстройств: ${planData.devices}\nСрок: ${planData.days} дней`;
    document.getElementById('modalTitle').textContent = planData.name;
    document.getElementById('modalDescription').textContent = description;
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
        tg.showAlert('Демо-режим: оплата не работает');
        tg.MainButton.hide();
        closeModal();
    }, 1000);
}

// ========== НАВИГАЦИЯ ==========
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        const tabId = `tab-${this.dataset.tab}`;
        document.getElementById(tabId).classList.add('active');
        
        if (this.dataset.tab === 'history') loadHistory();
        else if (this.dataset.tab === 'stats' && isAdmin) loadStats();
        else if (this.dataset.tab === 'promo' && isAdmin) loadPromoLinks();
    });
});

// Показываем админ-кнопки
if (isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', async () => {
    await loadProfile();
    await loadHistory();
    
    document.querySelector('[data-tab="status"]').classList.add('active');
    document.getElementById('tab-status').classList.add('active');
    
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });
    }
});
