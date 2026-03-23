let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// ========== НАСТРОЙКИ SUPABASE ==========
const SUPABASE_URL = "https://qgbnjkbtrfyahkxjrokh.supabase.co";
const SUPABASE_KEY = "sb_publishable_Yqsx9Hh6d4tl15XVRSvFhw_LyhxLKB4";

// ========== ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ==========
const user = tg.initDataUnsafe?.user;
const ADMIN_IDS = [913301430, 706826056];
const isAdmin = user && ADMIN_IDS.includes(user.id);

// ========== ХРАНИЛИЩЕ ==========
let userData = null;
let promoLinks = [];
let allDataLoaded = false;
let activeKeyData = null;
window.fullKeyValue = '';

// ========== СРАЗУ ПОКАЗЫВАЕМ ИНТЕРФЕЙС ==========
window.addEventListener('load', async function() {
    // Сразу скрываем сплеш и показываем приложение
    const splashScreen = document.getElementById('splashScreen');
    const app = document.getElementById('app');
    
    if (splashScreen) {
        splashScreen.classList.add('hidden');
    }
    if (app) {
        app.classList.add('visible');
    }
    
    console.log('🚀 Приложение запущено, загружаем данные в фоне...');
    console.log('👤 Пользователь:', user ? user.id : 'не авторизован');
    console.log('👑 Админ:', isAdmin);
    
    // Загружаем данные в фоне
    try {
        await loadAllDataWithTimeout();
        console.log('✅ Все данные успешно загружены');
        showToast('Данные загружены');
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        showToast('Ошибка загрузки данных: ' + error.message);
    }
});

// ========== ЗАГРУЗКА С ТАЙМАУТОМ ==========
async function loadAllDataWithTimeout(timeoutMs = 15000) {
    console.log('📥 Начинаем загрузку данных...');
    
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Таймаут 15 секунд')), timeoutMs);
    });
    
    const loadPromise = (async () => {
        // Загружаем всё последовательно для отладки
        await loadProfile();
        console.log('✓ Профиль загружен');
        
        await loadStatus();
        console.log('✓ Статус загружен');
        
        await loadHistory();
        console.log('✓ История загружена');
        
        if (isAdmin) {
            await loadPromoLinks();
            console.log('✓ Промо-ссылки загружены');
        }
        
        allDataLoaded = true;
    })();
    
    await Promise.race([loadPromise, timeoutPromise]);
}

// ========== ПРОГРЕВ БД ==========
async function warmupDatabase() {
    console.log('🔥 Прогреваем базу...');
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/users?limit=1`, {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            }
        });
        console.log('🔥 Прогрев БД:', response.ok ? 'успешно' : 'ошибка ' + response.status);
    } catch (error) {
        console.error('🔥 Ошибка прогрева:', error);
    }
}

// ========== ФУНКЦИИ SUPABASE ==========
async function fetchUserProfile(tgId) {
    console.log(`🔍 Запрос профиля для ${tgId}`);
    
    try {
        const url = `${SUPABASE_URL}/rest/v1/users?tg_id=eq.${tgId}&select=*`;
        console.log('📡 Запрос:', url);
        
        const response = await fetch(url, {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            }
        });
        
        console.log(`📡 Ответ профиля: статус ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`📦 Профиль найден:`, data[0] ? 'да' : 'нет');
        
        if (data[0]) {
            console.log(`📦 Данные профиля:`, {
                id: data[0].id,
                tg_id: data[0].tg_id,
                tier: data[0].tier
            });
        }
        
        return data[0] || null;
    } catch (error) {
        console.error('❌ Ошибка fetchUserProfile:', error);
        return null;
    }
}

async function fetchActiveKey(userId) {
    console.log(`🔑 Запрос ключа для user_id: ${userId}`);
    
    try {
        const now = new Date().toISOString();
        const url = `${SUPABASE_URL}/rest/v1/keys?user_id=eq.${userId}&is_active=eq.true&expires_at=gt.${now}&select=*`;
        console.log('📡 Запрос ключа:', url);
        
        const response = await fetch(url, {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            }
        });
        
        console.log(`📡 Ответ ключа: статус ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`📦 Ключей найдено: ${data.length}`);
        
        if (data[0]) {
            console.log(`📦 Данные ключа:`, {
                type: data[0].type,
                expires_at: data[0].expires_at,
                key_hash_preview: data[0].key_hash?.substring(0, 20)
            });
        }
        
        return data[0] || null;
    } catch (error) {
        console.error('❌ Ошибка fetchActiveKey:', error);
        return null;
    }
}

async function fetchUserPayments(userId) {
    console.log(`💳 Запрос платежей для user_id: ${userId}`);
    
    try {
        const url = `${SUPABASE_URL}/rest/v1/payments?user_id=eq.${userId}&select=*&order=created_at.desc&limit=10`;
        const response = await fetch(url, {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`💳 Платежей найдено: ${data.length}`);
        return data;
    } catch (error) {
        console.error('❌ Ошибка fetchUserPayments:', error);
        return [];
    }
}

// ========== ЗАГРУЗКА ПРОФИЛЯ ==========
async function loadProfile() {
    if (!user) {
        console.log('⚠️ Нет пользователя Telegram');
        document.getElementById('profileName').textContent = 'Гость';
        document.getElementById('profileUsername').textContent = '—';
        document.getElementById('profileId').textContent = '—';
        document.getElementById('userName').textContent = 'Гость';
        return;
    }

    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    document.getElementById('profileName').textContent = fullName;
    document.getElementById('userName').textContent = user.first_name || 'Пользователь';
    document.getElementById('profileId').textContent = user.id;
    document.getElementById('profileUsername').textContent = user.username ? '@' + user.username : '—';
    
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
    
    try {
        userData = await fetchUserProfile(user.id);
        
        if (userData) {
            document.getElementById('profileTier').textContent = userData.tier || 'FREE';
            
            // Загружаем дату регистрации
            const keysResponse = await fetch(`${SUPABASE_URL}/rest/v1/keys?user_id=eq.${userData.id}&order=created_at.asc&limit=1&select=created_at`, {
                headers: {
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`
                }
            });
            const keys = await keysResponse.json();
            
            if (keys && keys.length > 0 && keys[0].created_at) {
                const date = new Date(keys[0].created_at);
                const joinDate = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
                document.getElementById('profileJoinDate').textContent = joinDate;
            } else {
                document.getElementById('profileJoinDate').textContent = '—';
            }
        } else {
            document.getElementById('profileTier').textContent = 'FREE';
            document.getElementById('profileJoinDate').textContent = '—';
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки профиля:', error);
        document.getElementById('profileTier').textContent = 'FREE';
        document.getElementById('profileJoinDate').textContent = '—';
    }
}

// ========== СТАТУС ==========
async function loadStatus() {
    if (!user) {
        console.log('⚠️ loadStatus: нет пользователя');
        return;
    }
    
    console.log('📊 loadStatus: начинаем загрузку...');
    
    try {
        console.log('📊 Шаг 1: получаем профиль пользователя');
        const userProfile = await fetchUserProfile(user.id);
        
        if (!userProfile) {
            console.log('⚠️ loadStatus: профиль не найден');
            document.getElementById('statusKey').textContent = '—';
            document.getElementById('statusTier').textContent = 'FREE';
            document.getElementById('statusDevices').textContent = '0/2';
            document.getElementById('statusExpires').textContent = '—';
            document.getElementById('keyStatus').textContent = '—';
            document.getElementById('statusProgress').style.width = '0%';
            activeKeyData = null;
            window.fullKeyValue = '';
            return;
        }
        
        console.log('📊 Шаг 2: получаем активный ключ');
        activeKeyData = await fetchActiveKey(userProfile.id);
        
        if (activeKeyData) {
            const fullKey = activeKeyData.key_hash;
            window.fullKeyValue = fullKey;
            const shortKey = fullKey.substring(0, 8) + '...';
            
            console.log('📊 Шаг 3: обновляем UI с данными ключа');
            document.getElementById('statusKey').textContent = shortKey;
            document.getElementById('statusTier').textContent = activeKeyData.type || 'PREMIUM';
            document.getElementById('statusDevices').textContent = `${activeKeyData.devices || 1}/2`;
            document.getElementById('statusExpires').textContent = activeKeyData.expires_at?.slice(0, 10) || '—';
            document.getElementById('keyStatus').textContent = 'Активен';
            
            if (activeKeyData.expires_at) {
                const expires = new Date(activeKeyData.expires_at);
                const now = new Date();
                
                let totalDays = 30;
                if (activeKeyData.type === 'demo') totalDays = 7;
                if (activeKeyData.type === 'month') totalDays = 30;
                if (activeKeyData.type === 'quarter') totalDays = 90;
                if (activeKeyData.type === 'year') totalDays = 365;
        
                const daysLeft = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
                const progress = Math.min(100, Math.max(0, (daysLeft / totalDays) * 100));
                document.getElementById('statusProgress').style.width = progress + '%';
            }
        } else {
            console.log('⚠️ loadStatus: активный ключ не найден');
            document.getElementById('statusKey').textContent = '—';
            document.getElementById('statusTier').textContent = 'FREE';
            document.getElementById('statusDevices').textContent = '0/2';
            document.getElementById('statusExpires').textContent = '—';
            document.getElementById('keyStatus').textContent = '—';
            document.getElementById('statusProgress').style.width = '0%';
            window.fullKeyValue = '';
        }
        
        console.log('📊 loadStatus: завершено');
        
    } catch (error) {
        console.error('❌ Ошибка loadStatus:', error);
        showToast('Ошибка загрузки статуса');
    }
}

function refreshStatus() {
    loadStatus();
    showToast('Статус обновлён');
}

function copyKey() {
    console.log('📋 Копирование ключа, fullKeyValue:', window.fullKeyValue);
    
    if (window.fullKeyValue && window.fullKeyValue !== '') {
        navigator.clipboard.writeText(window.fullKeyValue);
        showToast('VLESS-ключ скопирован');
        console.log('✅ Ключ скопирован');
    } else {
        showToast('Ключ не найден');
        console.log('⚠️ Ключ пустой, пробуем перезагрузить...');
        loadStatus().then(() => {
            if (window.fullKeyValue && window.fullKeyValue !== '') {
                navigator.clipboard.writeText(window.fullKeyValue);
                showToast('VLESS-ключ скопирован');
            }
        });
    }
}

// ========== ИСТОРИЯ ==========
async function loadHistory() {
    if (!user) return;
    
    console.log('📜 Загрузка истории...');
    
    const userProfile = await fetchUserProfile(user.id);
    if (!userProfile) {
        document.getElementById('historyList').innerHTML = '<div class="empty-state"><p>Нет операций</p></div>';
        return;
    }
    
    const payments = await fetchUserPayments(userProfile.id);
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

// ========== ПРОМО-ФУНКЦИИ (для админа) ==========
async function fetchPromoLinks() {
    if (!isAdmin || !user) return [];
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/promo_links?select=*`, {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            }
        });
        const data = await response.json();
        console.log('Промо-ссылки загружены:', data.length);
        return data;
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        return [];
    }
}

async function loadPromoLinks() {
    if (!isAdmin || !user) return;
    
    console.log('Загрузка промо-ссылок...');
    
    try {
        const links = await fetchPromoLinks();
        console.log('Получено ссылок:', links.length);
        
        if (!links || links.length === 0) {
            promoLinks = [];
            renderPromoLinks();
            updatePromoSummary();
            return;
        }
        
        promoLinks = links.map(link => ({
            id: link.id,
            name: link.name,
            url: `https://t.me/vpnNoNamebot?start=promo_${link.name}`,
            clicks: 0,
            demos: 0,
            sales: 0,
            revenue: 0
        }));
        
        renderPromoLinks();
        updatePromoSummary();
    } catch (error) {
        console.error('Ошибка загрузки промо:', error);
        promoLinks = [];
        renderPromoLinks();
    }
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
                        <span class="promo-stat-value">0</span>
                    </div>
                    <div class="promo-stat">
                        <span class="promo-stat-label">Демо</span>
                        <span class="promo-stat-value">0</span>
                    </div>
                    <div class="promo-stat">
                        <span class="promo-stat-label">Конв</span>
                        <span class="promo-stat-value">0%</span>
                    </div>
                </div>
                <div class="promo-link-actions">
                    <button class="btn btn-outline" onclick="copyPromoUrl('${link.url}')">Копировать</button>
                    <button class="btn btn-outline" onclick="deletePromoLinkById('${link.id}')">Удалить</button>
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

async function createPromoLink() {
    if (!userData || !userData.id) {
        await loadProfile();
        if (!userData || !userData.id) {
            showToast('Ошибка загрузки профиля');
            return;
        }
    }
    
    const nameInput = document.getElementById('promoNameInput');
    const name = nameInput.value.trim();
    
    if (!name) {
        showToast('Введите название ссылки');
        return;
    }
    
    const existing = promoLinks.find(link => link.name === name);
    if (existing) {
        showToast('Такое название уже существует');
        return;
    }
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/promo_links`, {
            method: 'POST',
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                user_id: userData.id
            })
        });
        
        if (response.ok) {
            showToast('Ссылка создана');
            nameInput.value = '';
            await loadPromoLinks();
        } else {
            showToast('Ошибка создания ссылки');
        }
    } catch (error) {
        console.error('Ошибка создания:', error);
        showToast('Ошибка создания ссылки');
    }
}

async function deletePromoLinkById(id) {
    if (confirm('Удалить эту ссылку?')) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/promo_links?id=eq.${id}`, {
                method: 'DELETE',
                headers: {
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`
                }
            });
            
            if (response.ok) {
                showToast('Ссылка удалена');
                await loadPromoLinks();
            } else {
                showToast('Ошибка удаления');
            }
        } catch (error) {
            console.error('Ошибка удаления:', error);
            showToast('Ошибка удаления');
        }
    }
}

function copyPromoUrl(url) {
    navigator.clipboard.writeText(url);
    showToast('Ссылка скопирована');
}

function refreshPromoStats() {
    loadPromoLinks();
    showToast('Статистика обновлена');
}

// ========== СТАТИСТИКА (АДМИН) ==========
async function loadStats() {
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
        const activeTab = document.getElementById(tabId);
        if (activeTab) {
            activeTab.classList.add('active');
            
            if (this.dataset.tab === 'status') loadStatus();
            else if (this.dataset.tab === 'history') loadHistory();
            else if (this.dataset.tab === 'stats' && isAdmin) loadStats();
            else if (this.dataset.tab === 'promo' && isAdmin) loadPromoLinks();
        }
    });
});

if (isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM загружен');
    
    // Показываем статус таб по умолчанию
    document.querySelector('[data-tab="status"]').classList.add('active');
    document.getElementById('tab-status').classList.add('active');
    
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });
    }
    
    // Загружаем данные
    await loadAllDataWithTimeout();
});
