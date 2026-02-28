let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Данные пользователя из Telegram
const user = tg.initDataUnsafe?.user;
const isAdmin = [913301430, 7747044405, 706826056].includes(user?.id); // 🔥 ID админов

// ========== API ==========
const API_URL = "https://ISWYRE.pythonanywhere.com"; // Твой бэкенд

async function apiRequest(endpoint, method = "GET", data = null) {
    try {
        const options = {
            method,
            headers: {
                "Content-Type": "application/json",
                "X-Telegram-User": user?.id
            }
        };
        if (data) options.body = JSON.stringify(data);
        
        const response = await fetch(`${API_URL}${endpoint}`, options);
        return await response.json();
    } catch (error) {
        showToast("Ошибка соединения");
        return null;
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
            case 'profile': loadProfile(); break;
            case 'status': loadStatus(); break;
            case 'history': loadHistory(); break;
            case 'stats': if (isAdmin) loadStats(); break;
        }
    });
});

// Показываем админ-кнопку если нужно
if (isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
}

// ========== ПРОФИЛЬ ==========
async function loadProfile() {
    const data = await apiRequest('/api/profile');
    if (!data) return;
    
    document.getElementById('profile-id').textContent = data.id || user?.id;
    document.getElementById('profile-name').textContent = data.first_name || user?.first_name;
    document.getElementById('profile-username').textContent = data.username || user?.username || '—';
    document.getElementById('profile-tier').textContent = data.tier || 'FREE';
    document.getElementById('profile-date').textContent = data.created_at?.slice(0,10) || '—';
}

function copyId() {
    navigator.clipboard.writeText(user?.id || '');
    showToast('ID скопирован');
}

// ========== СТАТУС ==========
async function loadStatus() {
    const data = await apiRequest('/api/status');
    if (!data) return;
    
    document.getElementById('status-tier').textContent = data.tier || 'FREE';
    document.getElementById('status-key').textContent = data.key || 'Нет активного ключа';
    document.getElementById('status-expires').textContent = data.expires || '—';
    document.getElementById('status-devices').textContent = `${data.devices || 0}/2`;
    
    const progress = data.days_left ? (data.days_left / 30) * 100 : 0;
    document.getElementById('status-progress').style.width = `${Math.min(100, progress)}%`;
}

function refreshStatus() {
    loadStatus();
    showToast('Статус обновлён');
}

// ========== ИСТОРИЯ ==========
async function loadHistory() {
    const data = await apiRequest('/api/history');
    const list = document.getElementById('history-list');
    
    if (!data || data.length === 0) {
        list.innerHTML = '<div class="history-empty">Пока нет операций</div>';
        return;
    }
    
    list.innerHTML = data.map(item => `
        <div class="history-item">
            <span>${item.date}</span>
            <span>${item.amount} ₽</span>
            <span>${item.status}</span>
        </div>
    `).join('');
}

// ========== СТАТИСТИКА (админ) ==========
async function loadStats() {
    if (!isAdmin) return;
    
    const data = await apiRequest('/api/stats');
    if (!data) return;
    
    document.getElementById('stats-users').textContent = data.users || 0;
    document.getElementById('stats-active').textContent = data.active || 0;
    document.getElementById('stats-sales').textContent = data.sales || 0;
    document.getElementById('stats-demo').textContent = data.demo || 0;
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
    document.getElementById('modal-title').textContent = plans[plan].name;
    document.getElementById('modal-description').textContent = `Сумма: ${plans[plan].price} ₽`;
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
    
    const result = await apiRequest('/api/create-payment', 'POST', {
        user_id: user?.id,
        plan: selectedPlan,
        method: method
    });
    
    if (result?.payment_url) {
        tg.openLink(result.payment_url);
        setTimeout(() => tg.close(), 1000);
    } else {
        showToast('Ошибка создания платежа');
    }
    
    tg.MainButton.hide();
    closeModal();
}

// ========== ЗАГРУЗКА ПРИ СТАРТЕ ==========
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    loadStatus();
});

