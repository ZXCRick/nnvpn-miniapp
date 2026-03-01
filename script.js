let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Данные пользователя
const user = tg.initDataUnsafe?.user;
const ADMIN_IDS = [913301430, 7747044405, 706826056];
const isAdmin = user && ADMIN_IDS.includes(user.id);

// Хранилище ключей
let userKeys = [];

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
    
    // Загружаем ключи пользователя
    loadUserKeys();
}

// ========== РАБОТА С КЛЮЧАМИ ==========
function loadUserKeys() {
    if (!user) return;
    
    const saved = localStorage.getItem(`keys_${user.id}`);
    if (saved) {
        userKeys = JSON.parse(saved);
    } else {
        userKeys = [];
        // Проверяем, нет ли ключа из бота в sessionStorage (временное хранилище)
        const botKey = sessionStorage.getItem(`temp_key_${user.id}`);
        if (botKey) {
            try {
                const keyData = JSON.parse(botKey);
                userKeys.push(keyData);
                sessionStorage.removeItem(`temp_key_${user.id}`);
                saveUserKeys();
            } catch (e) {}
        }
    }
}

function saveUserKeys() {
    if (!user) return;
    localStorage.setItem(`keys_${user.id}`, JSON.stringify(userKeys));
}

// Функция для сохранения ключа из бота (вызывается из обработчика start)
function saveKeyFromBot(key, expires) {
    if (!user) return false;
    
    // Проверяем, нет ли уже такого ключа
    if (userKeys.some(k => k.key === key)) {
        return false;
    }
    
    const newKey = {
        id: Date.now(),
        key: key,
        type: 'DEMO',
        status: 'inactive',
        expires: expires,
        devices: 0,
        created: new Date().toISOString()
    };
    
    userKeys.push(newKey);
    saveUserKeys();
    
    // Если мы на вкладке статуса, обновляем
    if (document.querySelector('[data-tab="status"]')?.classList.contains('active')) {
        loadStatus();
    }
    
    showToast('Ключ получен! Активируйте его');
    return true;
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

// ========== СТАТУС (с поддержкой активации) ==========
function loadStatus() {
    if (!user) return;
    
    loadUserKeys();
    
    const activeKey = userKeys.find(k => k.status === 'active');
    const inactiveKeys = userKeys.filter(k => k.status === 'inactive');
    
    if (activeKey) {
        // Есть активный ключ
        document.getElementById('statusKey').textContent = activeKey.key;
        document.getElementById('statusTier').textContent = activeKey.type;
        document.getElementById('statusDevices').textContent = `${activeKey.devices || 0}/2`;
        document.getElementById('statusExpires').textContent = activeKey.expires || '—';
        document.getElementById('keyStatus').textContent = 'Активен';
        document.getElementById('activateKeyBtn').style.display = 'none';
        
        // Прогресс
        if (activeKey.expires && activeKey.expires !== '—') {
            try {
                const [day, month, year] = activeKey.expires.split('.');
                const expiresDate = new Date(`${year}-${month}-${day}`);
                const now = new Date();
                const totalDays = 30; // Примерно для демо
                const daysLeft = Math.ceil((expiresDate - now) / (1000 * 60 * 60 * 24));
                const progress = Math.min(100, Math.max(0, (daysLeft / totalDays) * 100));
                document.getElementById('statusProgress').style.width = progress + '%';
            } catch (e) {
                document.getElementById('statusProgress').style.width = '0%';
            }
        }
    } else if (inactiveKeys.length > 0) {
        // Есть неактивный ключ
        const key = inactiveKeys[0];
        document.getElementById('statusKey').textContent = key.key;
        document.getElementById('statusTier').textContent = key.type;
        document.getElementById('statusDevices').textContent = '0/2';
        document.getElementById('statusExpires').textContent = key.expires || '—';
        document.getElementById('keyStatus').textContent = 'Неактивен';
        document.getElementById('activateKeyBtn').style.display = 'block';
        document.getElementById('statusProgress').style.width = '0%';
    } else {
        // Нет ключей
        document.getElementById('statusKey').textContent = '—';
        document.getElementById('statusTier').textContent = 'FREE';
        document.getElementById('statusDevices').textContent = '0/2';
        document.getElementById('statusExpires').textContent = '—';
        document.getElementById('keyStatus').textContent = '—';
        document.getElementById('activateKeyBtn').style.display = 'none';
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

function activateKey() {
    loadUserKeys();
    const inactiveKey = userKeys.find(k => k.status === 'inactive');
    
    if (inactiveKey) {
        inactiveKey.status = 'active';
        inactiveKey.devices = 1;
        inactiveKey.activatedAt = new Date().toISOString();
        saveUserKeys();
        loadStatus();
        showToast('Ключ активирован');
    }
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
    month: { name: '1 месяц', price: 250, type: 'PREMIUM' },
    quarter: { name: '3 месяца', price: 750, type: 'PREMIUM' },
    halfyear: { name: '6 месяцев', price: 1500, type: 'PREMIUM' }
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
    
    // Генерируем ключ
    setTimeout(() => {
        const key = generateKey('VPN');
        const expires = new Date();
        expires.setMonth(expires.getMonth() + (selectedPlan === 'month' ? 1 : selectedPlan === 'quarter' ? 3 : 6));
        
        const newKey = {
            id: Date.now(),
            key: key,
            type: plans[selectedPlan].type,
            status: 'inactive',
            expires: expires.toLocaleDateString('ru-RU'),
            devices: 0
        };
        
        userKeys.push(newKey);
        saveUserKeys();
        
        showToast('Ключ создан! Активируйте его в статусе');
        tg.MainButton.hide();
        closeModal();
        
        // Если мы на вкладке статуса, обновляем
        if (document.querySelector('[data-tab="status"]').classList.contains('active')) {
            loadStatus();
        }
    }, 1000);
}

function generateKey(prefix) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = prefix + '-';
    for (let i = 0; i < 12; i++) {
        if (i > 0 && i % 4 === 0) result += '-';
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
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
                    <button class="copy-link-btn" onclick="copyPromoUrl('${link.url}')" style="background:none;border:none;color:#8A8C9A;cursor:pointer;">📋</button>
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

// ========== ПРОВЕРКА START-ПАРАМЕТРОВ ==========
function checkStartParams() {
    if (!user) return;
    
    // Проверяем, есть ли параметры в URL (для Telegram Web App)
    const params = new URLSearchParams(window.location.search);
    const startParam = params.get('tgWebAppStartParam');
    
    if (startParam && startParam.startsWith('key_')) {
        // Формат: key_КЛЮЧ_ДАТА
        const parts = startParam.split('_');
        if (parts.length >= 3) {
            const key = parts[1];
            const expires = parts[2];
            saveKeyFromBot(key, expires);
        }
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    loadStatus();
    checkStartParams();
    
    // По умолчанию показываем тарифы
    document.querySelector('[data-tab="plans"]').classList.add('active');
    document.getElementById('tab-plans').classList.add('active');
    
    // Закрытие модалки
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });
    }
});

// Экспортируем функцию для бота (будет вызвана извне если нужно)
window.saveKeyFromBot = saveKeyFromBot;
