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

// ========== ЗАСТАВКА (ждём полной загрузки) ==========
window.addEventListener('load', async function() {
    try {
        await loadAllDataWithTimeout();
        
        const splashScreen = document.getElementById('splashScreen');
        const app = document.getElementById('app');
        
        if (splashScreen) {
            splashScreen.classList.add('hidden');
        }
        if (app) {
            app.classList.add('visible');
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        const splashScreen = document.getElementById('splashScreen');
        const app = document.getElementById('app');
        
        if (splashScreen) {
            splashScreen.classList.add('hidden');
        }
        if (app) {
            app.classList.add('visible');
        }
    }
});

// ========== БЕЗОПАСНОЕ ОБНОВЛЕНИЕ DOM ==========
function safeSetText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

function safeSetHtml(elementId, html) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = html;
    }
}

function safeSetStyle(elementId, property, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style[property] = value;
    }
}

// ========== ЗАГРУЗКА ДАННЫХ ==========
async function loadAllDataWithTimeout(timeoutMs = 10000) {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Таймаут')), timeoutMs);
    });
    
    const loadPromise = (async () => {
        await loadProfile();
        await loadStatus();
        await loadHistory();
        
        if (isAdmin) {
            await loadPromoLinks();
            await loadStats();
        }
        
        allDataLoaded = true;
    })();
    
    await Promise.race([loadPromise, timeoutPromise]);
}

// ========== ФУНКЦИИ SUPABASE ==========
async function fetchUserProfile(tgId) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/users?tg_id=eq.${tgId}&select=*`, {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            }
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
            {
                headers: {
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`
                }
            }
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
            `${SUPABASE_URL}/rest/v1/payments?user_id=eq.${userId}&select=*&order=created_at.desc&limit=10`,
            {
                headers: {
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`
                }
            }
        );
        
        if (!response.ok) return [];
        
        return await response.json();
    } catch (error) {
        console.error('Ошибка fetchUserPayments:', error);
        return [];
    }
}

// ========== ПРОФИЛЬ ==========
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
                headers: {
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`
                }
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

// ========== СТАТУС ==========
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
            safeSetStyle('statusProgress', 'background', '#4CAF50');
            activeKeyData = null;
            window.fullKeyValue = '';
            return;
        }
        
        if (userProfile.tier) {
            safeSetText('profileTier', userProfile.tier);
        }
        
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
                
                // Проверяем, является ли ключ "вечным" (срок > 100 лет)
                const YEARS_100 = 100 * 365 * 24 * 60 * 60 * 1000; // 100 лет в миллисекундах
                const isEternal = (expires - now) > YEARS_100;
                
                if (isEternal) {
                    // Красивое оформление для вечного ключа
                    safeSetText('statusExpires', 'Бессрочный');
                    
                    // Переливающийся прогресс-бар
                    const progressBar = document.getElementById('statusProgress');
                    if (progressBar) {
                        progressBar.style.width = '100%';
                        progressBar.style.background = 'linear-gradient(90deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4, #FFEAA7)';
                        progressBar.style.backgroundSize = '200% 100%';
                        progressBar.style.animation = 'shimmer 3s ease infinite';
                        
                        // Добавляем CSS анимацию, если её нет
                        if (!document.getElementById('eternal-key-style')) {
                            const style = document.createElement('style');
                            style.id = 'eternal-key-style';
                            style.textContent = `
                                @keyframes shimmer {
                                    0% { background-position: 0% 50%; }
                                    50% { background-position: 100% 50%; }
                                    100% { background-position: 0% 50%; }
                                }
                            `;
                            document.head.appendChild(style);
                        }
                    }
                } else {
                    // Обычный прогресс-бар для ограниченных ключей
                    let totalDays;
                    if (activeKeyData.type === 'demo') totalDays = 7;
                    else if (activeKeyData.type === 'month') totalDays = 30;
                    else if (activeKeyData.type === 'quarter') totalDays = 90;
                    else if (activeKeyData.type === 'year') totalDays = 365;
                    else if (activeKeyData.type === 'premium') totalDays = 30;
                    else totalDays = 30;
                    
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
            safeSetStyle('statusProgress', 'background', '#4CAF50');
            window.fullKeyValue = '';
        }
        
    } catch (error) {
        console.error('Ошибка загрузки статуса:', error);
    }
}

function refreshStatus() {
    loadStatus();
}

function copyKey() {
    const domain = "nnvpn.shop";
    const vlessTemplate = `vless://${window.fullKeyValue}@${domain}:443?encryption=none&security=tls&sni=${domain}&type=tcp#NNVPN`;
    
    if (window.fullKeyValue && window.fullKeyValue !== '') {
        navigator.clipboard.writeText(vlessTemplate);
        showToast('VLESS-ключ скопирован');
    } else {
        const shortKey = document.getElementById('statusKey').textContent;
        if (shortKey && shortKey !== '—') {
            if (activeKeyData && activeKeyData.key_hash) {
                const fullVless = `vless://${activeKeyData.key_hash}@${domain}:443?encryption=none&security=tls&sni=${domain}&type=tcp#NNVPN`;
                navigator.clipboard.writeText(fullVless);
                showToast('Ключ скопирован');
            } else {
                showToast('Ключ не найден');
            }
        } else {
            showToast('Ключ не найден');
        }
    }
}

// ========== ИСТОРИЯ ==========
async function loadHistory() {
    if (!user) return;
    
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
    
    list.innerHTML = payments.map(p => `
        <div class="history-item">
            <span>${p.created_at?.slice(0, 10)}</span>
            <span>${p.amount_rub} ₽</span>
            <span class="${p.status === 'completed' ? 'status-success' : 'status-pending'}">${p.status}</span>
        </div>
    `).join('');
}

// ========== ПРОМО-ССЫЛКИ ==========
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
        return data;
    } catch (error) {
        console.error('Ошибка загрузки промо:', error);
        return [];
    }
}

async function loadPromoLinks() {
    if (!isAdmin || !user) return;
    
    try {
        const links = await fetchPromoLinks();
        
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
    
    safeSetText('promoTotalClicks', totalClicks.toString());
    safeSetText('promoTotalDemos', totalDemos.toString());
    safeSetText('promoTotalConv', convRate + '%');
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
    if (!nameInput) return;
    
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
}

// ========== СТАТИСТИКА ==========
async function loadStats() {
    if (!isAdmin) return;
    
    try {
        // Получаем статистику из Supabase
        const stats = await fetchStatsFromSupabase();
        
        safeSetText('statsTotalUsers', stats.totalUsers);
        safeSetText('statsActiveToday', stats.activeToday);
        safeSetText('statsNewWeek', stats.newWeek);
        safeSetText('statsDemoKeys', stats.demoKeys);
        safeSetText('statsTotalSales', stats.totalSales);
        safeSetText('statsTotalRevenue', stats.totalRevenue);
        safeSetText('statsMonthRevenue', stats.monthRevenue);
        safeSetText('statsAvgCheck', stats.avgCheck);
        safeSetText('statsClickToDemo', stats.clickToDemo);
        safeSetText('statsDemoToPaid', stats.demoToPaid);
        safeSetText('statsChurn', stats.churn);
        safeSetText('statsLTV', stats.ltv);
        
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        showToast('Ошибка загрузки статистики');
    }
}

async function fetchStatsFromSupabase() {
    // Всего пользователей
    const usersRes = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,created_at`, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`
        }
    });
    const users = await usersRes.json();
    const totalUsers = users?.length || 0;
    
    // Активные ключи
    const keysRes = await fetch(`${SUPABASE_URL}/rest/v1/keys?select=id,user_id,type,created_at,expires_at&is_active=eq.true`, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`
        }
    });
    const activeKeys = keysRes.json();
    const activeCount = activeKeys?.length || 0;
    
    // Демо-ключи
    const demoKeys = activeKeys?.filter(k => k.type === 'demo') || [];
    const demoCount = demoKeys.length;
    
    // Платежи
    const paymentsRes = await fetch(`${SUPABASE_URL}/rest/v1/payments?select=amount_rub,created_at,status,user_id`, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`
        }
    });
    const payments = await paymentsRes.json();
    const completed = payments?.filter(p => p.status === 'completed') || [];
    const totalRevenue = completed.reduce((sum, p) => sum + (p.amount_rub || 0), 0);
    const totalSales = completed.length;
    
    // Выручка за месяц
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const monthPayments = completed.filter(p => new Date(p.created_at) > oneMonthAgo);
    const monthRevenue = monthPayments.reduce((sum, p) => sum + (p.amount_rub || 0), 0);
    
    // Средний чек
    const avgCheck = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0;
    
    // Новые пользователи за неделю
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newUsers = users?.filter(u => new Date(u.created_at) > oneWeekAgo) || [];
    const newUsersCount = newUsers.length;
    
    // Активные сегодня (оценочно)
    const activeToday = Math.round(activeCount * 0.3);
    
    // Демо → Платно
    let demoToPaid = 0;
    try {
        const allDemoKeysRes = await fetch(`${SUPABASE_URL}/rest/v1/keys?select=user_id&type=eq.demo`, {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            }
        });
        const allDemoData = await allDemoKeysRes.json();
        const demoUsers = [...new Set((allDemoData || []).map(k => k.user_id))];
        const payingUsers = [...new Set(completed.map(p => p.user_id))];
        const paidFromDemo = demoUsers.filter(uid => payingUsers.includes(uid));
        demoToPaid = demoUsers.length > 0 ? Math.round((paidFromDemo.length / demoUsers.length) * 100) : 0;
    } catch(e) {
        demoToPaid = 0;
    }
    
    // Клики → Демо
    let clickToDemo = 0;
    try {
        const promoRes = await fetch(`${SUPABASE_URL}/rest/v1/promo_clicks?select=id,converted_to_demo`, {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            }
        });
        const promoData = await promoRes.json();
        const totalClicks = promoData?.length || 0;
        const convertedClicks = (promoData || []).filter(c => c.converted_to_demo === true).length;
        clickToDemo = totalClicks > 0 ? Math.round((convertedClicks / totalClicks) * 100) : 0;
    } catch(e) {
        clickToDemo = 0;
    }
    
    // Отток
    let churn = 0;
    try {
        const expiredKeysRes = await fetch(`${SUPABASE_URL}/rest/v1/keys?select=user_id&is_active=eq.false`, {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`
            }
        });
        const expiredKeys = await expiredKeysRes.json();
        const expiredUsers = [...new Set((expiredKeys || []).map(k => k.user_id))];
        const payingUsers = [...new Set(completed.map(p => p.user_id))];
        const churnedUsers = expiredUsers.filter(uid => !payingUsers.includes(uid));
        churn = expiredUsers.length > 0 ? Math.round((churnedUsers.length / expiredUsers.length) * 100) : 0;
    } catch(e) {
        churn = 0;
    }
    
    // LTV
    let ltv = 0;
    try {
        const payingUsers = [...new Set(completed.map(p => p.user_id))];
        const avgPurchasesPerUser = payingUsers.length > 0 ? (totalSales / payingUsers.length) : 0;
        ltv = Math.round(avgCheck * avgPurchasesPerUser);
    } catch(e) {
        ltv = 0;
    }
    
    return {
        totalUsers: formatNumber(totalUsers),
        activeToday: formatNumber(activeToday),
        newWeek: formatNumber(newUsersCount),
        demoKeys: formatNumber(demoCount),
        totalSales: formatNumber(totalSales),
        totalRevenue: formatMoney(totalRevenue),
        monthRevenue: formatMoney(monthRevenue),
        avgCheck: formatMoney(avgCheck),
        clickToDemo: clickToDemo + '%',
        demoToPaid: demoToPaid + '%',
        churn: churn + '%',
        ltv: formatMoney(ltv)
    };
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
    document.querySelectorAll('.admin-only').forEach(el => {
        if (el) el.style.display = 'block';
    });
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', async () => {
    const defaultTab = document.querySelector('[data-tab="status"]');
    if (defaultTab) defaultTab.classList.add('active');
    
    const defaultTabContent = document.getElementById('tab-status');
    if (defaultTabContent) defaultTabContent.classList.add('active');
    
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });
    }
});
