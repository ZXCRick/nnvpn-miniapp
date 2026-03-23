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
let activeKeyData = null; // Добавляем глобальное хранилище для ключа
window.fullKeyValue = '';

// ========== ФУНКЦИЯ "ПРОГРЕВКИ" БД ==========
async function warmupDatabase() {
    console.log('🔥 Прогреваем базу данных...');
    
    // Делаем простой запрос к любой таблице, чтобы "разбудить" соединение
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/users?limit=1`, {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Prefer": "apikey=true"
            }
        });
        
        if (response.ok) {
            console.log('✅ База данных прогрета');
        } else {
            console.log('⚠️ База ответила с ошибкой, но соединение установлено');
        }
    } catch (error) {
        console.log('⚠️ Ошибка прогрева БД:', error);
    }
}

// ========== ЗАСТАВКА ==========
window.addEventListener('load', async function() {
    const splashScreen = document.getElementById('splashScreen');
    const app = document.getElementById('app');
    
    try {
        // ШАГ 1: Сначала прогреваем БД
        await warmupDatabase();
        
        // ШАГ 2: Небольшая пауза для стабилизации соединения
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // ШАГ 3: Загружаем ВСЕ данные последовательно, но с гарантией загрузки
        await loadAllDataSequentially();
        
        // ШАГ 4: Дополнительная проверка - если ключ не загрузился, пробуем ещё раз
        if (!activeKeyData && user) {
            console.log('🔄 Ключ не загрузился, пробуем ещё раз...');
            await loadStatus();
        }
        
        // Скрываем сплеш
        if (splashScreen) {
            splashScreen.classList.add('hidden');
        }
        if (app) {
            app.classList.add('visible');
        }
        
        console.log('✅ Все данные успешно загружены');
        showToast('Данные загружены');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        showToast('Ошибка загрузки данных');
        
        if (splashScreen) {
            splashScreen.classList.add('hidden');
        }
        if (app) {
            app.classList.add('visible');
        }
    }
});

// ========== ПОСЛЕДОВАТЕЛЬНАЯ ЗАГРУЗКА С ГАРАНТИЕЙ ==========
async function loadAllDataSequentially() {
    console.log('📥 Начинаем последовательную загрузку данных...');
    
    // Сначала загружаем профиль (он нужен для остальных запросов)
    await loadProfile();
    console.log('✓ Профиль загружен:', userData ? 'есть' : 'нет');
    
    // Небольшая пауза между запросами для стабильности
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Затем загружаем статус (ключ)
    await loadStatus();
    console.log('✓ Статус загружен:', activeKeyData ? 'есть ключ' : 'нет ключа');
    
    // Пауза
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Затем историю
    await loadHistory();
    console.log('✓ История загружена');
    
    // Для админа загружаем промо-ссылки
    if (isAdmin) {
        await new Promise(resolve => setTimeout(resolve, 200));
        await loadPromoLinks();
        console.log('✓ Промо-ссылки загружены');
    }
    
    allDataLoaded = true;
}

// ========== ОПТИМИЗИРОВАННЫЙ fetchUserProfile ==========
async function fetchUserProfile(tgId) {
    console.log(`🔍 Запрос профиля для tg_id: ${tgId}`);
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/users?tg_id=eq.${tgId}&select=*`, {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json"
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`📦 Получен профиль: ${data[0] ? 'да' : 'нет'}`);
        return data[0] || null;
    } catch (error) {
        console.error('❌ Ошибка fetchUserProfile:', error);
        return null;
    }
}

// ========== ОПТИМИЗИРОВАННЫЙ fetchActiveKey ==========
async function fetchActiveKey(userId) {
    console.log(`🔑 Запрос активного ключа для user_id: ${userId}`);
    
    try {
        const now = new Date().toISOString();
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/keys?user_id=eq.${userId}&is_active=eq.true&expires_at=gt.${now}&select=*`,
            {
                headers: {
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`📦 Получен ключ: ${data[0] ? 'да' : 'нет'}`);
        
        if (data[0]) {
            console.log(`🔑 Тип ключа: ${data[0].type}, истекает: ${data[0].expires_at}`);
        }
        
        return data[0] || null;
    } catch (error) {
        console.error('❌ Ошибка fetchActiveKey:', error);
        return null;
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

// ========== СТАТУС (СОХРАНЯЕМ В ГЛОБАЛЬНУЮ ПЕРЕМЕННУЮ) ==========
async function loadStatus() {
    if (!user) return;
    
    console.log('📊 Загрузка статуса...');
    
    try {
        const userProfile = await fetchUserProfile(user.id);
        
        if (!userProfile) {
            console.log('⚠️ Профиль не найден');
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
        
        // Загружаем активный ключ
        activeKeyData = await fetchActiveKey(userProfile.id);
        
        if (activeKeyData) {
            const fullKey = activeKeyData.key_hash;
            window.fullKeyValue = fullKey;
            const shortKey = fullKey.substring(0, 8) + '...';
            
            document.getElementById('statusKey').textContent = shortKey;
            document.getElementById('statusTier').textContent = activeKeyData.type || 'PREMIUM';
            document.getElementById('statusDevices').textContent = `${activeKeyData.devices || 1}/2`;
            document.getElementById('statusExpires').textContent = activeKeyData.expires_at?.slice(0, 10) || '—';
            document.getElementById('keyStatus').textContent = 'Активен';
            
            console.log(`✅ Ключ загружен: ${activeKeyData.type}, истекает: ${activeKeyData.expires_at?.slice(0, 10)}`);
            
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
            console.log('⚠️ Активный ключ не найден');
            document.getElementById('statusKey').textContent = '—';
            document.getElementById('statusTier').textContent = 'FREE';
            document.getElementById('statusDevices').textContent = '0/2';
            document.getElementById('statusExpires').textContent = '—';
            document.getElementById('keyStatus').textContent = '—';
            document.getElementById('statusProgress').style.width = '0%';
            window.fullKeyValue = '';
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки статуса:', error);
        showToast('Ошибка загрузки статуса');
    }
}

// ========== КОПИРОВАНИЕ КЛЮЧА (теперь данные уже должны быть загружены) ==========
function copyKey() {
    console.log('📋 Копирование ключа, fullKeyValue:', window.fullKeyValue);
    
    if (window.fullKeyValue && window.fullKeyValue !== '') {
        navigator.clipboard.writeText(window.fullKeyValue);
        showToast('VLESS-ключ скопирован');
        console.log('✅ Ключ скопирован');
    } else {
        // Если по какой-то причине ключ ещё не загружен, пробуем загрузить снова
        console.log('⚠️ Ключ не найден, пробуем перезагрузить...');
        showToast('Загружаем ключ...');
        loadStatus().then(() => {
            if (window.fullKeyValue && window.fullKeyValue !== '') {
                navigator.clipboard.writeText(window.fullKeyValue);
                showToast('VLESS-ключ скопирован');
            } else {
                showToast('Ключ не найден');
            }
        });
    }
}

// ========== ИСТОРИЯ ==========
async function loadHistory() {
    if (!user) return;
    
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
    await loadProfile();
    await loadStatus();
    await loadHistory();
    
    if (isAdmin) {
        await loadPromoLinks();
    }
    
    document.querySelector('[data-tab="status"]').classList.add('active');
    document.getElementById('tab-status').classList.add('active');
    
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });
    }
});
