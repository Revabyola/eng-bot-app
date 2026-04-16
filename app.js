// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Настройка темы
document.documentElement.style.setProperty('--tg-theme-bg-color', tg.backgroundColor);
document.documentElement.style.setProperty('--tg-theme-text-color', tg.textColor);
document.documentElement.style.setProperty('--tg-theme-hint-color', tg.hintColor);
document.documentElement.style.setProperty('--tg-theme-link-color', tg.linkColor);
document.documentElement.style.setProperty('--tg-theme-button-color', tg.buttonColor);
document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.buttonTextColor);
document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.secondaryBackgroundColor);

// URL твоего бекенда на Render (замени на актуальный)
const API_URL = 'https://english-bot-bq9l.onrender.com';

// Данные пользователя
const initData = tg.initData || '';
const initDataUnsafe = tg.initDataUnsafe || {};
const userId = initDataUnsafe.user?.id || 0;

// Отображение имени пользователя
const userInfo = document.getElementById('user-info');
if (initDataUnsafe.user) {
    userInfo.textContent = `👤 ${initDataUnsafe.user.first_name} ${initDataUnsafe.user.last_name || ''}`;
} else {
    userInfo.textContent = '👤 Гость';
}

// Глобальные переменные
let currentTest = null;
let currentTestIndex = 0;
let correctAnswers = 0;

// Навигация
const navButtons = document.querySelectorAll('.nav-btn');
const content = document.getElementById('content');

navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadPage(btn.dataset.page);
    });
});

// Загрузка страниц
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

// ========== СТРАНИЦА ОБУЧЕНИЯ ==========
function showLearnPage() {
    content.innerHTML = `
        <h2>📚 Изучение слов</h2>
        <p>Режим карточек в разработке.</p>
        <button class="button" onclick="loadPage('list')">📋 Смотреть словарь</button>
    `;
}

// ========== СТРАНИЦА ДОБАВЛЕНИЯ ==========
function showAddPage() {
    content.innerHTML = `
        <h2>➕ Добавить слово</h2>
        <div class="input-group">
            <label>🇬🇧 Английское слово</label>
            <input type="text" id="new-word" placeholder="Например: cat" autocomplete="off">
        </div>
        <button class="button" onclick="translateWord()">🔄 Перевести</button>
        <div id="translation-results"></div>
    `;
}

async function translateWord() {
    const word = document.getElementById('new-word')?.value.trim();
    if (!word) {
        tg.showPopup({ title: 'Ошибка', message: 'Введи слово' });
        return;
    }
    
    const resultsDiv = document.getElementById('translation-results');
    resultsDiv.innerHTML = '<div class="loading">🔄 Перевод через ИИ...</div>';
    
    try {
        const response = await fetch(`${API_URL}/api/translate?word=${encodeURIComponent(word)}&user_id=${userId}`, {
            headers: { 'X-Telegram-InitData': initData }
        });
        const data = await response.json();
        
        if (data.translations && data.translations.length > 0) {
            let html = '<h3>📖 Выбери перевод:</h3><div class="translation-variants">';
            data.translations.forEach(tr => {
                html += `<button class="variant-btn" onclick="saveWord('${word}', '${tr}')">${tr}</button>`;
            });
            html += '</div>';
            html += '<button class="button secondary" onclick="showCustomTranslation()">✏️ Свой вариант</button>';
            resultsDiv.innerHTML = html;
        } else {
            showCustomTranslation();
        }
    } catch (error) {
        tg.showPopup({ title: 'Ошибка', message: 'Не удалось перевести' });
        showCustomTranslation();
    }
}

function showCustomTranslation() {
    const word = document.getElementById('new-word')?.value.trim();
    const resultsDiv = document.getElementById('translation-results');
    resultsDiv.innerHTML = `
        <div class="input-group">
            <label>🇷🇺 Введи свой перевод:</label>
            <input type="text" id="custom-translation" placeholder="Например: кот" autocomplete="off">
        </div>
        <button class="button" onclick="saveCustomWord('${word}')">💾 Сохранить</button>
    `;
}

async function saveWord(english, russian) {
    await sendSaveWord(english, russian);
}

async function saveCustomWord(english) {
    const russian = document.getElementById('custom-translation')?.value.trim();
    if (!russian) {
        tg.showPopup({ title: 'Ошибка', message: 'Введи перевод' });
        return;
    }
    await sendSaveWord(english, russian);
}

async function sendSaveWord(english, russian) {
    try {
        const response = await fetch(`${API_URL}/api/save_word`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-InitData': initData
            },
            body: JSON.stringify({ english, russian, user_id: userId })
        });
        const data = await response.json();
        
        if (data.success) {
            tg.showPopup({ title: '✅ Успех', message: `Слово "${english} — ${russian}" сохранено!` });
            showAddPage(); // Очищаем форму
        } else {
            tg.showPopup({ title: 'Ошибка', message: 'Не удалось сохранить' });
        }
    } catch (error) {
        tg.showPopup({ title: 'Ошибка', message: 'Сервер недоступен' });
    }
}

// ========== СТРАНИЦА СЛОВАРЯ ==========
function showListPage() {
    content.innerHTML = '<h2>📋 Мой словарь</h2><div class="loading">Загрузка...</div>';
    loadWords();
}

async function loadWords() {
    try {
        const response = await fetch(`${API_URL}/api/get_words?user_id=${userId}`, {
            headers: { 'X-Telegram-InitData': initData }
        });
        const data = await response.json();
        
        if (data.words && data.words.length > 0) {
            let html = '<h2>📋 Мой словарь</h2>';
            data.words.forEach(word => {
                html += `
                    <div class="word-card">
                        <div class="english">🇬🇧 ${word.english}</div>
                        <div class="russian">🇷🇺 ${word.russian}</div>
                        ${word.comment ? `<div class="comment">📝 ${word.comment}</div>` : ''}
                    </div>
                `;
            });
            content.innerHTML = html;
        } else {
            content.innerHTML = '<h2>📋 Мой словарь</h2><p>Слов пока нет. Добавь первое слово!</p>';
        }
    } catch (error) {
        content.innerHTML = '<h2>📋 Мой словарь</h2><p>Ошибка загрузки</p>';
    }
}

// ========== СТРАНИЦА ТЕСТА ==========
function showTestPage() {
    if (currentTest) {
        showTestQuestion();
    } else {
        content.innerHTML = `
            <h2>📝 Тест</h2>
            <p>Выбери тип теста:</p>
            <button class="button" onclick="startTest('en_ru')">🇬🇧 Английский → Русский</button>
            <button class="button" onclick="startTest('ru_en')">🇷🇺 Русский → Английский</button>
            <button class="button secondary" onclick="startTest('mixed')">🔀 Общий тест</button>
        `;
    }
}

async function startTest(type) {
    try {
        const response = await fetch(`${API_URL}/api/start_test?type=${type}&user_id=${userId}`, {
            headers: { 'X-Telegram-InitData': initData }
        });
        const data = await response.json();
        
        if (data.words && data.words.length > 0) {
            currentTest = data.words;
            currentTestIndex = 0;
            correctAnswers = 0;
            showTestQuestion();
        } else {
            tg.showPopup({ title: '❌ Ошибка', message: 'Словарь пуст' });
        }
    } catch (error) {
        tg.showPopup({ title: 'Ошибка', message: 'Не удалось загрузить тест' });
    }
}

function showTestQuestion() {
    if (currentTestIndex >= currentTest.length) {
        // Тест завершён
        const accuracy = currentTest.length > 0 ? Math.round(correctAnswers / currentTest.length * 100) : 0;
        content.innerHTML = `
            <h2>🏁 Тест завершён!</h2>
            <div class="test-stats">
                <div class="stat">
                    <div class="stat-value">${correctAnswers}</div>
                    <div class="stat-label">Правильно</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${currentTest.length - correctAnswers}</div>
                    <div class="stat-label">Ошибок</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${accuracy}%</div>
                    <div class="stat-label">Точность</div>
                </div>
            </div>
            <button class="button" onclick="resetTest()">🔄 Новый тест</button>
            <button class="button secondary" onclick="loadPage('test')">🔙 Выбор теста</button>
        `;
        currentTest = null;
        return;
    }
    
    const item = currentTest[currentTestIndex];
    let html = `
        <h2>📝 Тест</h2>
        <div class="test-stats">
            <div class="stat">
                <div class="stat-value">${currentTestIndex + 1}/${currentTest.length}</div>
                <div class="stat-label">Прогресс</div>
            </div>
            <div class="stat">
                <div class="stat-value">${correctAnswers}</div>
                <div class="stat-label">Правильно</div>
            </div>
        </div>
    `;
    
    if (item.type === 'word') {
        html += `
            <div class="test-question">${item.question}</div>
            <div class="input-group">
                <input type="text" id="test-answer" placeholder="Введи перевод" autocomplete="off">
            </div>
            <button class="button" onclick="checkAnswer('${item.type}', '${item.correct}')">✅ Ответить</button>
        `;
    } else {
        html += `
            <div class="test-question">📖 ${item.question}</div>
            <p style="text-align: center; color: #666;">Значение: ${item.meaning}</p>
            <div class="input-group">
                <input type="text" id="test-answer" placeholder="Введи предлог" autocomplete="off">
            </div>
            <button class="button" onclick="checkAnswer('${item.type}', '${item.correct}')">✅ Ответить</button>
        `;
    }
    
    html += '<button class="button secondary" onclick="endTest()">❌ Завершить</button>';
    content.innerHTML = html;
}

function checkAnswer(type, correct) {
    const answer = document.getElementById('test-answer')?.value.trim().toLowerCase();
    const correctLower = correct.toLowerCase();
    
    let isCorrect = false;
    if (type === 'word') {
        isCorrect = answer === correctLower || correctLower.split(',').map(s => s.trim()).includes(answer);
    } else {
        isCorrect = answer === correctLower;
    }
    
    if (isCorrect) {
        correctAnswers++;
        tg.showPopup({ title: '✅ Верно!', message: 'Молодец!' });
    } else {
        tg.showPopup({ title: '❌ Неверно', message: `Правильно: ${correct}` });
    }
    
    currentTestIndex++;
    showTestQuestion();
}

function endTest() {
    currentTest = null;
    showTestPage();
}

function resetTest() {
    currentTest = null;
    showTestPage();
}

// Загружаем страницу обучения при старте
loadPage('learn');
console.log('English Bot Mini App загружен!');