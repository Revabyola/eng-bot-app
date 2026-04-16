// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;

// Сообщаем Telegram, что приложение готово
tg.ready();

// Настраиваем цвета в соответствии с темой Telegram
document.documentElement.style.setProperty('--tg-theme-bg-color', tg.backgroundColor);
document.documentElement.style.setProperty('--tg-theme-text-color', tg.textColor);
document.documentElement.style.setProperty('--tg-theme-hint-color', tg.hintColor);
document.documentElement.style.setProperty('--tg-theme-link-color', tg.linkColor);
document.documentElement.style.setProperty('--tg-theme-button-color', tg.buttonColor);
document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.buttonTextColor);
document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.secondaryBackgroundColor);

// Расширяем приложение на весь экран
tg.expand();

// Получаем данные пользователя
const initData = tg.initData || '';
const initDataUnsafe = tg.initDataUnsafe || {};

// Отображаем информацию о пользователе
const userInfo = document.getElementById('user-info');
if (initDataUnsafe.user) {
    userInfo.textContent = `👤 ${initDataUnsafe.user.first_name} ${initDataUnsafe.user.last_name || ''}`;
} else {
    userInfo.textContent = '👤 Гость';
}

// Навигация
const navButtons = document.querySelectorAll('.nav-btn');
const content = document.getElementById('content');

navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Убираем активный класс со всех кнопок
        navButtons.forEach(b => b.classList.remove('active'));
        // Добавляем активный класс на нажатую
        btn.classList.add('active');
        
        // Загружаем соответствующую страницу
        const page = btn.dataset.page;
        loadPage(page);
    });
});

// Функция загрузки страниц
function loadPage(page) {
    switch(page) {
        case 'learn':
            showLearnPage();
            break;
        case 'add':
            showAddPage();
            break;
        case 'list':
            showListPage();
            break;
        case 'test':
            showTestPage();
            break;
    }
}

function showLearnPage() {
    content.innerHTML = `
        <h2>📚 Изучение слов</h2>
        <p>Здесь будет режим обучения (карточки).</p>
        <button class="button" onclick="alert('В разработке')">Начать обучение</button>
    `;
}

function showAddPage() {
    content.innerHTML = `
        <h2>➕ Добавить слово</h2>
        <div class="input-group">
            <label>Английское слово</label>
            <input type="text" id="new-word" placeholder="Например: cat">
        </div>
        <button class="button" onclick="addWord()">Перевести</button>
        <div id="translation-results"></div>
    `;
}

function showListPage() {
    content.innerHTML = `
        <h2>📋 Мой словарь</h2>
        <div class="loading">Загрузка слов...</div>
    `;
    loadWords();
}

function showTestPage() {
    content.innerHTML = `
        <h2>📝 Тест</h2>
        <p>Выбери тип теста:</p>
        <button class="button" onclick="startTest('en_ru')">🇬🇧 Английский → Русский</button>
        <button class="button" onclick="startTest('ru_en')">🇷🇺 Русский → Английский</button>
        <button class="button secondary" onclick="startTest('mixed')">🔀 Общий тест</button>
    `;
}

// Заглушки для функций (будут реализованы позже)
function addWord() {
    const word = document.getElementById('new-word')?.value;
    if (!word) {
        alert('Введи слово');
        return;
    }
    alert(`Перевод слова: ${word} (в разработке)`);
}

function loadWords() {
    // Здесь будет загрузка слов с сервера
    setTimeout(() => {
        content.innerHTML = `
            <h2>📋 Мой словарь</h2>
            <p>Слов пока нет. Добавь первое слово!</p>
        `;
    }, 500);
}

function startTest(type) {
    alert(`Запуск теста: ${type} (в разработке)`);
}

// Загружаем главную страницу при старте
loadPage('learn');

console.log('English Bot Mini App загружен!');