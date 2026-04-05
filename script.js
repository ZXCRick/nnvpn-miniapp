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

// ========== ЗАСТАВКА ==========
window.addEventListener('load', async function() {
    try {
        await loadAllDataWithTimeout();
        const splashScreen = document.getElementById('splashScreen');
        const app = document.getElementById('app');
        if (splashScreen) splashScreen.classList.add('hidden');
        if (app) app.classList.add('visible');
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        const splashScreen = document.getElementById('splashScreen');
        const app = document.getElementById('app');
        if (splashScreen) splashScreen.classList.add('hidden');
        if (app) app.classList.add('visible');
    }
});

function safeSetText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = text;
}
function safeSetHtml(elementId, html) {
    const element = document.getElementById(elementId);
    if (element) element.innerHTML = html;
}
function safeSetStyle(elementId, property, value) {
    const element = document.getElementById(elementId);
    if (element) element.style[property] = value;
}

async function loadAllDataWithTimeout(timeoutMs = 10000) {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Таймаут')), timeoutMs));
    const loadPromise = (async () => {
        await loadProfile();
        await loadStatus();
        await loadHistory();
        if (isAdmin) {
            await loadPromoLinks();
        }
        allDataLoaded = true;
    })();
    await Promise.race([loadPromise, timeoutPromise]);
}

async function fetchUserProfile(tgId) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/users?tg_id=eq.${tgId}&select=*`, {
            headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data[0] || null;
    } catch (error) {
        console.error('Ошибка fetchUserProfile:', error);
        return null;
    }
}
async function fetchActiveKey(userId) {
    try {
        const now = new Date().toISOString();
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/keys?user_id=eq.${userId}&is_active=eq.true&expires_at=gt.${now}&select=*`,
            { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
        );
        if (!response.ok) return null;
        const data = await response.json();
        return data[0] || null;
    } catch (error) {
        console.error('Ошибка fetchActiveKey:', error);
        return null;
    }
}
async function fetchUserPayments(userId) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/payments?user_id=eq.${userId}&select=*&order=created_at.desc&limit=50`,
            { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
        );
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error('Ошибка fetchUserPayments:', error);
        return [];
    }
}

async function loadProfile() {
    if (!user) {
        safeSetText('profileName', 'Гость');
        safeSetText('profileUsername', '—');
        safeSetText('profileId', '—');
        safeSetText('userName', 'Гость');
        return;
    }
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    safeSetText('profileName', fullName);
    safeSetText('userName', user.first_name || 'Пользователь');
    safeSetText('profileId', user.id.toString());
    safeSetText('profileUsername', user.username ? '@' + user.username : '—');
    const avatarImg = document.getElementById('avatarImage');
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
    if (user.photo_url && avatarImg && avatarPlaceholder) {
        avatarImg.src = user.photo_url;
        avatarImg.style.display = 'block';
        avatarPlaceholder.style.display = 'none';
    } else if (avatarPlaceholder) {
        const initials = (user.first_name?.[0] || '') + (user.last_name?.[0] || '');
        avatarPlaceholder.textContent = initials || '?';
    }
    try {
        userData = await fetchUserProfile(user.id);
        if (userData) {
            safeSetText('profileTier', userData.tier || 'FREE');
            const keysResponse = await fetch(`${SUPABASE_URL}/rest/v1/keys?user_id=eq.${userData.id}&order=created_at.asc&limit=1&select=created_at`, {
                headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
            });
            const keys = await keysResponse.json();
            if (keys && keys.length > 0 && keys[0].created_at) {
                const date = new Date(keys[0].created_at);
                const joinDate = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
                safeSetText('profileJoinDate', joinDate);
            } else {
                safeSetText('profileJoinDate', '—');
            }
        } else {
            safeSetText('profileTier', 'FREE');
            safeSetText('profileJoinDate', '—');
        }
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        safeSetText('profileTier', 'FREE');
        safeSetText('profileJoinDate', '—');
    }
}

async function loadStatus() {
    if (!user) return;
    try {
        const userProfile = await fetchUserProfile(user.id);
        if (!userProfile) {
            safeSetText('statusKey', '—');
            safeSetText('statusTier', 'FREE');
            safeSetText('statusDevices', '0/2');
            safeSetText('statusExpires', '—');
            safeSetText('keyStatus', '—');
            safeSetStyle('statusProgress', 'width', '0%');
            activeKeyData = null;
            window.fullKeyValue = '';
            return;
        }
        if (userProfile.tier) safeSetText('profileTier', userProfile.tier);
        activeKeyData = await fetchActiveKey(userProfile.id);
        if (activeKeyData) {
            const fullKey = activeKeyData.key_hash;
            window.fullKeyValue = fullKey;
            const shortKey = fullKey.substring(0, 8) + '...';
            safeSetText('statusKey', shortKey);
            safeSetText('statusTier', activeKeyData.type || 'PREMIUM');
            safeSetText('statusDevices', `${activeKeyData.devices || 1}/2`);
            safeSetText('keyStatus', 'Активен');
            if (activeKeyData.expires_at) {
                const expires = new Date(activeKeyData.expires_at);
                const now = new Date();
                const YEARS_100 = 100 * 365 * 24 * 60 * 60 * 1000;
                const isEternal = (expires - now) > YEARS_100;
                if (isEternal) {
                    safeSetText('statusExpires', 'Бессрочный');
                    const progressBar = document.getElementById('statusProgress');
                    if (progressBar) {
                        progressBar.style.width = '100%';
                        progressBar.style.background = 'linear-gradient(90deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4, #FFEAA7)';
                        progressBar.style.backgroundSize = '200% 100%';
                        progressBar.style.animation = 'shimmer 3s ease infinite';
                        if (!document.getElementById('eternal-key-style')) {
                            const style = document.createElement('style');
                            style.id = 'eternal-key-style';
                            style.textContent = `@keyframes shimmer { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }`;
                            document.head.appendChild(style);
                        }
                    }
                } else {
                    let totalDays = 30;
                    if (activeKeyData.type === 'demo') totalDays = 7;
                    else if (activeKeyData.type === 'month') totalDays = 30;
                    else if (activeKeyData.type === 'quarter') totalDays = 90;
                    else if (activeKeyData.type === 'halfyear') totalDays = 180;
                    else if (activeKeyData.type === 'year') totalDays = 365;
                    const daysLeft = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
                    const progress = Math.min(100, Math.max(0, (daysLeft / totalDays) * 100));
                    safeSetText('statusExpires', expires.toLocaleDateString('ru-RU'));
                    safeSetStyle('statusProgress', 'width', progress + '%');
                    safeSetStyle('statusProgress', 'background', '#4CAF50');
                    safeSetStyle('statusProgress', 'backgroundSize', 'auto');
                    safeSetStyle('statusProgress', 'animation', 'none');
                }
            } else {
                safeSetText('statusExpires', '—');
                safeSetStyle('statusProgress', 'width', '0%');
            }
        } else {
            safeSetText('statusKey', '—');
            safeSetText('statusTier', 'FREE');
            safeSetText('statusDevices', '0/2');
            safeSetText('statusExpires', '—');
            safeSetText('keyStatus', '—');
            safeSetStyle('statusProgress', 'width', '0%');
            window.fullKeyValue = '';
        }
    } catch (error) {
        console.error('Ошибка загрузки статуса:', error);
    }
}
function refreshStatus() { loadStatus(); showToast('Статус обновлён'); }

function copyKey() {
    const vlessTemplate = `vless://${window.fullKeyValue}@144.31.151.150:8443?encryption=none&flow=xtls-rprx-vision&security=reality&sni=vk.ru&fp=chrome&pbk=woVukqMoNGwwibSYNV05WHl6-XafN-JGZpdqhCR8V34&sid=6ba85179e30d4fc2&type=tcp#NNVPN`;
    if (window.fullKeyValue && window.fullKeyValue !== '') {
        navigator.clipboard.writeText(vlessTemplate);
        showToast('VLESS-ключ скопирован');
    } else {
        showToast('Ключ не найден');
    }
}

async function loadHistory() {
    if (!user) {
        safeSetHtml('historyList', '<div class="empty-state"><p>Нет операций</p></div>');
        return;
    }
    const userProfile = await fetchUserProfile(user.id);
    if (!userProfile) {
        safeSetHtml('historyList', '<div class="empty-state"><p>Нет операций</p></div>');
        return;
    }
    const payments = await fetchUserPayments(userProfile.id);
    const list = document.getElementById('historyList');
    if (!list) return;
    if (!payments || payments.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>Нет операций</p></div>';
        return;
    }
    const grouped = {};
    payments.forEach(p => {
        const date = new Date(p.created_at);
        const dateKey = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(p);
    });
    let html = '';
    for (const [date, items] of Object.entries(grouped)) {
        html += `<div class="history-date-group"><div class="history-date">${date}</div><div class="history-items">`;
        items.forEach(p => {
            const periodText = getPeriodText(p.period);
            const methodText = p.payment_method === 'crypto' ? '💎 CryptoBot' : '💳 Банковская карта';
            const statusClass = p.status === 'completed' ? 'status-success' : 'status-pending';
            const statusText = p.status === 'completed' ? '✅ Оплачено' : '⏳ Ожидание';
            html += `
                <div class="history-item">
                    <div class="history-item-main">
                        <div class="history-item-title">
                            <div class="history-type"><span class="history-period">${periodText}</span></div>
                            <span class="history-amount">${p.amount_rub.toLocaleString()} ₽</span>
                        </div>
                        <div class="history-item-details">
                            <span class="history-method">${methodText}</span>
                            <span class="${statusClass}">${statusText}</span>
                        </div>
                        ${p.aggregator_payment_id ? `<div class="history-tx">${p.aggregator_payment_id}</div>` : ''}
                    </div>
                </div>`;
        });
        html += `</div></div>`;
    }
    list.innerHTML = html;
}
function getPeriodText(period) {
    const periods = { 'month': '1 месяц', 'quarter': '3 месяца', 'halfyear': '6 месяцев', 'year': '12 месяцев', 'demo': 'Демо-доступ' };
    return periods[period] || period;
}

// ========== ПРОМО-ССЫЛКИ ==========
async function fetchPromoLinks() {
    if (!isAdmin || !user) return [];
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/promo_links?select=*`, {
            headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
        });
        return await response.json();
    } catch (error) { return []; }
}
async function loadPromoLinks() {
    if (!isAdmin || !user) return;
    try {
        const links = await fetchPromoLinks();
        promoLinks = links.map(link => ({
            id: link.id,
            name: link.name,
            url: `https://t.me/vpnNoNamebot?start=promo_${link.name}`,
            clicks: 0, demos: 0, sales: 0, revenue: 0
        }));
        renderPromoLinks();
        updatePromoSummary();
    } catch (error) { promoLinks = []; renderPromoLinks(); }
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
                <div class="promo-link-header"><span class="promo-link-name">${link.name}</span><button class="copy-link-btn" onclick="copyPromoUrl('${link.url}')">📋</button></div>
                <div class="promo-link-url">${link.url}</div>
                <div class="promo-link-stats">
                    <div class="promo-stat"><span class="promo-stat-label">Клики</span><span class="promo-stat-value">0</span></div>
                    <div class="promo-stat"><span class="promo-stat-label">Демо</span><span class="promo-stat-value">0</span></div>
                    <div class="promo-stat"><span class="promo-stat-label">Конв</span><span class="promo-stat-value">0%</span></div>
                </div>
                <div class="promo-link-actions">
                    <button class="btn btn-outline" onclick="copyPromoUrl('${link.url}')">Копировать</button>
                    <button class="btn btn-outline" onclick="deletePromoLinkById('${link.id}')">Удалить</button>
                </div>
            </div>`;
    });
    container.innerHTML = html;
}
function updatePromoSummary() {
    const totalClicks = promoLinks.reduce((sum, link) => sum + (link.clicks || 0), 0);
    const totalDemos = promoLinks.reduce((sum, link) => sum + (link.demos || 0), 0);
    const convRate = totalClicks > 0 ? Math.round((totalDemos / totalClicks) * 100) : 0;
    safeSetText('promoTotalClicks', totalClicks.toString());
    safeSetText('promoTotalDemos', totalDemos.toString());
    safeSetText('promoTotalConv', convRate + '%');
}
async function createPromoLink() {
    if (!userData || !userData.id) {
        await loadProfile();
        if (!userData || !userData.id) { showToast('Ошибка загрузки профиля'); return; }
    }
    const nameInput = document.getElementById('promoNameInput');
    if (!nameInput) return;
    const name = nameInput.value.trim();
    if (!name) { showToast('Введите название ссылки'); return; }
    if (promoLinks.find(link => link.name === name)) { showToast('Такое название уже существует'); return; }
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/promo_links`, {
            method: 'POST',
            headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ name: name, user_id: userData.id })
        });
        if (response.ok) {
            showToast('Ссылка создана');
            nameInput.value = '';
            await loadPromoLinks();
        } else { showToast('Ошибка создания ссылки'); }
    } catch (error) { console.error('Ошибка создания:', error); showToast('Ошибка создания ссылки'); }
}
async function deletePromoLinkById(id) {
    if (confirm('Удалить эту ссылку?')) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/promo_links?id=eq.${id}`, {
                method: 'DELETE',
                headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
            });
            if (response.ok) {
                showToast('Ссылка удалена');
                await loadPromoLinks();
            } else { showToast('Ошибка удаления'); }
        } catch (error) { console.error('Ошибка удаления:', error); showToast('Ошибка удаления'); }
    }
}
function copyPromoUrl(url) { navigator.clipboard.writeText(url); showToast('Ссылка скопирована'); }
function refreshPromoStats() { loadPromoLinks(); }

// ========== ТАРИФЫ ==========
const plans = {
    month: { name: '1 месяц', price: 250, type: 'PREMIUM', devices: 2, days: 30 },
    quarter: { name: '3 месяца', price: 650, type: 'PREMIUM', devices: 3, days: 90 },
    halfyear: { name: '6 месяцев', price: 1200, type: 'PREMIUM', devices: 4, days: 180 },
    year: { name: '12 месяцев', price: 2200, type: 'PREMIUM', devices: 5, days: 365 }
};
let selectedPlan = null;
function selectPlan(plan) {
    selectedPlan = plan;
    const modalTitle = document.getElementById('modalTitle');
    const modalDescription = document.getElementById('modalDescription');
    const paymentModal = document.getElementById('paymentModal');
    if (modalTitle) modalTitle.textContent = plans[plan].name;
    if (modalDescription) modalDescription.textContent = `Сумма: ${plans[plan].price} ₽`;
    if (paymentModal) paymentModal.style.display = 'flex';
}
function closeModal() {
    const paymentModal = document.getElementById('paymentModal');
    if (paymentModal) paymentModal.style.display = 'none';
    selectedPlan = null;
}
async function payWithCrypto() {
    if (!selectedPlan) return;
    const userId = user.id;
    showToast('Создаём счёт...');
    try {
        const response = await fetch('https://nnvpn.shop:8443/create-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, plan_type: selectedPlan })
        });
        const data = await response.json();
        if (data.success) {
            tg.openLink(data.pay_url);
            closeModal();
        } else { showToast('Ошибка: ' + data.error); }
    } catch (error) { console.error(error); showToast('Ошибка при создании счёта'); }
}

// ========== МЕНЮ (ТРИ ТОЧКИ) ==========
function showMenu() {
    tg.showPopup({
        title: 'Меню',
        buttons: [
            { id: 'offer', text: '📄 Публичная оферта', type: 'default' },
            { id: 'instructions', text: '📖 Инструкция', type: 'default' },
            { id: 'cancel', text: 'Отмена', type: 'cancel' }
        ]
    }, (buttonId) => {
        if (buttonId === 'offer') {
            tg.openWebView('https://zxcrick.github.io/nnvpn-miniapp/offer.html', 'Публичная оферта', { mode: 'compact' });
        } else if (buttonId === 'instructions') {
            const instructionsBtn = document.querySelector('.nav-btn[data-tab="instructions"]');
            if (instructionsBtn) instructionsBtn.click();
        }
    });
}
document.getElementById('headerMenu')?.addEventListener('click', showMenu);

function showInstructions() {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    const instructionsTab = document.getElementById('tab-instructions');
    if (instructionsTab) instructionsTab.classList.add('active');
    const instructionsBtn = document.querySelector('.nav-btn[data-tab="instructions"]');
    if (instructionsBtn) instructionsBtn.classList.add('active');
}

function animateTabContent(tabId) {
    const tab = document.getElementById(tabId);
    if (!tab) return;
    const animatedElements = tab.querySelectorAll('.animate-on-load');
    animatedElements.forEach((el, index) => {
        el.style.animation = 'none';
        el.offsetHeight;
        el.style.animation = `slideUpFade 0.6s ease-out forwards`;
        if (index < 4) el.style.animationDelay = `${0.1 + index * 0.1}s`;
        else el.style.animationDelay = '0s';
    });
}

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        const tabId = `tab-${this.dataset.tab}`;
        const activeTab = document.getElementById(tabId);
        if (activeTab) {
            activeTab.classList.add('active');
            animateTabContent(tabId);
            if (this.dataset.tab === 'status') loadStatus();
            else if (this.dataset.tab === 'history') loadHistory();
            else if (this.dataset.tab === 'promo' && isAdmin) loadPromoLinks();
        }
    });
});

if (isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => { if (el) el.style.display = 'block'; });
}

document.addEventListener('DOMContentLoaded', async () => {
    const defaultTab = document.querySelector('[data-tab="status"]');
    if (defaultTab) defaultTab.classList.add('active');
    const defaultTabContent = document.getElementById('tab-status');
    if (defaultTabContent) defaultTabContent.classList.add('active');
    await loadProfile();
    await loadStatus();
    await loadHistory();
    if (isAdmin) await loadPromoLinks();
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.addEventListener('click', function(e) { if (e.target === this) closeModal(); });
    }
});

function showToast(text, duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}
