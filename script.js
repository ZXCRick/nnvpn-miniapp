let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Данные пользователя из Telegram
const user = tg.initDataUnsafe?.user;
if (user) {
    document.getElementById('userName').innerText = user.first_name || 'Пользователь';
} else {
    document.getElementById('userName').innerText = 'Гость';
}

// Тарифы
const plans = {
    month: { name: '1 месяц', price: 250 },
    quarter: { name: '3 месяца', price: 750 },
    halfyear: { name: '6 месяцев', price: 1500 }
};

let selectedPlan = null;

// Выбор тарифа
function selectPlan(plan) {
    selectedPlan = plan;
    document.getElementById('modalTitle').innerText = plans[plan].name;
    document.getElementById('modalDescription').innerText = `Сумма: ${plans[plan].price} ₽`;
    document.getElementById('paymentModal').style.display = 'flex';
}

// Закрыть модалку
function closeModal() {
    document.getElementById('paymentModal').style.display = 'none';
}

// Оплата
async function payWith(method) {
    if (!selectedPlan) return;
    
    const plan = selectedPlan;
    const price = plans[plan].price;
    
    // Показываем кнопку загрузки
    tg.MainButton.setText('Обработка...');
    tg.MainButton.show();
    
    try {
        // Здесь будет запрос к твоему бэкенду
        // Пока просто тест
        tg.showAlert(`Оплата ${method}: ${price} ₽`);
        closeModal();
        
        // Когда будет бэкенд, раскомментируй:
        /*
        const response = await fetch('https://твой-бэкенд.com/api/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: user?.id,
                plan: plan,
                amount: price,
                method: method
            })
        });
        
        const data = await response.json();
        if (data.payment_url) {
            tg.openLink(data.payment_url);
            setTimeout(() => tg.close(), 1000);
        }
        */
    } catch (error) {
        tg.showAlert('Ошибка: ' + error.message);
    } finally {
        tg.MainButton.hide();
    }
}

// Закрытие по клику вне модалки
document.getElementById('paymentModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});