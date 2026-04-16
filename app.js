// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Настройка темы
document.documentElement.style.setProperty('--tg-theme-bg-color', tg.backgroundColor || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-text-color', tg.textColor || '#000000');
document.documentElement.style.setProperty('--tg-theme-hint-color', tg.hintColor || '#666666');
document.documentElement.style.setProperty('--tg-theme-link-color', tg.linkColor || '#2481cc');
document.documentElement.style.setProperty('--tg-theme-button-color', tg.buttonColor || '#2481cc');
document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.buttonTextColor || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.secondaryBackgroundColor || '#f0f0f0');

// API URL
const API_URL = 'https://english-bot-bq9l.onrender.com';

// Данные пользователя
const initDataUnsafe = tg.initDataUnsafe || {};
const userId = initDataUnsafe.user?.id || 0;

// Отображение имени
const userInfo = document.getElementById('user-info');
if (initDataUnsafe.user) {
    userInfo.textContent = `👤 ${initDataUnsafe.user.first_name} ${initDataUnsafe.user.last_name || ''}`;
} else {
    userInfo.textContent = '👤 Гость';
}

// Глобальные переменные
let allWords = [];
let allPhrasalVerbs = [];
let dictionaryTab = 'words';

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

// ========== ЗАГРУЗКА СТРАНИЦ ==========
function loadPage(page) {
    switch(page) {
        case 'dictionary':
            loadDictionary();
            break;
        case 'add':
            showAddPage();
            break;
        case 'test':
            showTestMenu();
            break;
        case 'stats':
            showStats();
            break;
    }
}

// ========== СЛОВАРЬ ==========
async function loadDictionary() {
    content.innerHTML = '<div class="loading">Загрузка словаря...</div>';
    
    console.log('Loading dictionary for user:', userId);
    
    try {
        const url = `${API_URL}/api/get_all_words?user_id=${userId}`;
        console.log('Fetching:', url);
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('API response:', data);
        
        allWords = data.words || [];
        allPhrasalVerbs = data.phrasal_verbs || [];
        
        console.log('Words loaded:', allWords.length);
        console.log('Phrasal verbs loaded:', allPhrasalVerbs.length);
        
        renderDictionary();
    } catch (error) {
        console.error('Load error:', error);
        content.innerHTML = `
            <p style="text-align:center; padding:40px; color:red;">
                Ошибка загрузки: ${error.message}
            </p>
            <button class="button" onclick="loadDictionary()">🔄 Попробовать снова</button>
        `;
    }
}

function renderDictionary() {
    let html = `
        <h2>📚 Мой словарь</h2>
        <div class="tabs">
            <button class="tab ${dictionaryTab === 'words' ? 'active' : ''}" id="tab-words">
                📝 Слова (${allWords.length})
            </button>
            <button class="tab ${dictionaryTab === 'phrasal' ? 'active' : ''}" id="tab-phrasal">
                📘 Фразовые (${allPhrasalVerbs.length})
            </button>
        </div>
        <div id="dictionary-content"></div>
    `;
    content.innerHTML = html;
    
    document.getElementById('tab-words')?.addEventListener('click', () => switchDictionaryTab('words'));
    document.getElementById('tab-phrasal')?.addEventListener('click', () => switchDictionaryTab('phrasal'));
    
    renderDictionaryContent();
}

function switchDictionaryTab(tab) {
    dictionaryTab = tab;
    
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tab}`)?.classList.add('active');
    
    renderDictionaryContent();
}

function renderDictionaryContent() {
    const container = document.getElementById('dictionary-content');
    
    if (!container) {
        console.error('Container not found');
        return;
    }
    
    if (dictionaryTab === 'words') {
        if (allWords.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding:40px;">Нет слов. Добавь первое!</p>';
            return;
        }
        
        let html = '';
        allWords.forEach(word => {
            html += `
                <div class="word-card">
                    <div class="word-header">
                        <span class="english">🇬🇧 ${word.english}</span>
                        <button class="delete-btn" onclick="deleteWord(${word.id})">🗑</button>
                    </div>
                    <div class="russian">🇷🇺 ${word.russian}</div>
                    ${word.comment ? `<div class="comment">📝 ${word.comment}</div>` : ''}
                    <button class="button secondary" style="margin-top:8px; padding:8px;" onclick="showAddComment(${word.id}, '${word.english.replace(/'/g, "\\'")}')">
                        ✏️ ${word.comment ? 'Изменить' : 'Добавить'} комментарий
                    </button>
                </div>
            `;
        });
        container.innerHTML = html;
    } else {
        if (allPhrasalVerbs.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding:40px;">Нет фразовых глаголов.</p>';
            return;
        }
        
        let html = '';
        allPhrasalVerbs.forEach(verb => {
            html += `
                <div class="word-card">
                    <div class="word-header">
                        <span class="english">📖 ${verb.verb} (${verb.prepositions})</span>
                        <button class="delete-btn" onclick="deletePhrasal(${verb.id})">🗑</button>
                    </div>
                    <div class="russian">🇷🇺 ${verb.russian}</div>
                </div>
            `;
        });
        container.innerHTML = html;
    }
}

async function deleteWord(wordId) {
    if (!confirm('Удалить слово?')) return;
    
    try {
        await fetch(`${API_URL}/api/delete_word`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word_id: wordId, user_id: userId })
        });
        allWords = allWords.filter(w => w.id !== wordId);
        renderDictionaryContent();
        document.getElementById('tab-words').textContent = `📝 Слова (${allWords.length})`;
        alert('✅ Слово удалено');
    } catch (error) {
        alert('❌ Ошибка удаления');
    }
}

async function deletePhrasal(verbId) {
    if (!confirm('Удалить фразовый глагол?')) return;
    
    try {
        await fetch(`${API_URL}/api/delete_phrasal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ verb_id: verbId, user_id: userId })
        });
        allPhrasalVerbs = allPhrasalVerbs.filter(v => v.id !== verbId);
        renderDictionaryContent();
        document.getElementById('tab-phrasal').textContent = `📘 Фразовые (${allPhrasalVerbs.length})`;
        alert('✅ Фразовый глагол удалён');
    } catch (error) {
        alert('❌ Ошибка удаления');
    }
}

function showAddComment(wordId, english) {
    const comment = prompt(`Введи комментарий к слову "${english}":`);
    if (comment === null) return;
    
    fetch(`${API_URL}/api/update_comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word_id: wordId, comment: comment, user_id: userId })
    }).then(() => {
        const word = allWords.find(w => w.id === wordId);
        if (word) word.comment = comment;
        renderDictionaryContent();
        alert('✅ Комментарий сохранён');
    }).catch(() => {
        alert('❌ Ошибка сохранения');
    });
}

// ========== ДОБАВЛЕНИЕ ==========
function showAddPage() {
    content.innerHTML = `
        <h2>➕ Добавить</h2>
        <div class="tabs">
            <button class="tab active" id="add-word-tab">📝 Слово</button>
            <button class="tab" id="add-phrasal-tab">📘 Фразовый глагол</button>
        </div>
        <div id="add-form"></div>
    `;
    
    document.getElementById('add-word-tab').addEventListener('click', () => switchAddTab('word'));
    document.getElementById('add-phrasal-tab').addEventListener('click', () => switchAddTab('phrasal'));
    
    renderAddForm('word');
}

function switchAddTab(type) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`add-${type}-tab`).classList.add('active');
    renderAddForm(type);
}

function renderAddForm(type) {
    const container = document.getElementById('add-form');
    
    if (type === 'word') {
        container.innerHTML = `
            <div class="input-group">
                <label>🇬🇧 Английское слово</label>
                <input type="text" id="new-word" placeholder="Например: cat" autocomplete="off">
            </div>
            <button class="button" onclick="translateAndAdd()">🔄 Перевести</button>
            <div id="translation-area"></div>
        `;
    } else {
        container.innerHTML = `
            <div class="input-group">
                <label>📘 Глагол</label>
                <input type="text" id="phrasal-verb" placeholder="Например: look" autocomplete="off">
            </div>
            <div class="input-group">
                <label>📝 Предлоги и перевод</label>
                <textarea id="phrasal-data" rows="3" placeholder="after = присматривать, down = презирать"></textarea>
            </div>
            <button class="button" onclick="savePhrasal()">💾 Сохранить</button>
        `;
    }
}

async function translateAndAdd() {
    const word = document.getElementById('new-word')?.value.trim();
    if (!word) {
        alert('Введи слово');
        return;
    }
    
    const area = document.getElementById('translation-area');
    area.innerHTML = '<div class="loading">Перевод через ИИ...</div>';
    
    try {
        const response = await fetch(`${API_URL}/api/translate?word=${encodeURIComponent(word)}`);
        const data = await response.json();
        const translations = data.translations || [];
        
        if (translations.length > 0) {
            let html = '<h3>📖 Выбери перевод:</h3><div class="translation-variants">';
            translations.forEach(tr => {
                html += `<button class="variant-btn" onclick="saveWord('${word}', '${tr}')">${tr}</button>`;
            });
            html += '</div>';
            html += '<button class="button secondary" onclick="showCustomInput()">✏️ Свой вариант</button>';
            area.innerHTML = html;
        } else {
            showCustomInput();
        }
    } catch (error) {
        showCustomInput();
    }
}

function showCustomInput() {
    const word = document.getElementById('new-word')?.value.trim();
    const area = document.getElementById('translation-area');
    area.innerHTML = `
        <div class="input-group">
            <label>🇷🇺 Введи перевод:</label>
            <input type="text" id="custom-translation" placeholder="Например: кот" autocomplete="off">
        </div>
        <div class="input-group">
            <label>📝 Комментарий (необязательно):</label>
            <input type="text" id="custom-comment" placeholder="Пример: домашнее животное">
        </div>
        <button class="button" onclick="saveCustomWord('${word}')">💾 Сохранить</button>
    `;
}

async function saveWord(english, russian) {
    await sendSaveWord(english, russian, '');
}

async function saveCustomWord(english) {
    const russian = document.getElementById('custom-translation')?.value.trim();
    const comment = document.getElementById('custom-comment')?.value.trim();
    if (!russian) {
        alert('Введи перевод');
        return;
    }
    await sendSaveWord(english, russian, comment);
}

async function sendSaveWord(english, russian, comment) {
    try {
        const response = await fetch(`${API_URL}/api/save_word`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ english, russian, comment, user_id: userId })
        });
        const data = await response.json();
        
        if (data.success) {
            alert(`✅ "${english} — ${russian}" сохранено!`);
            showAddPage();
        } else {
            alert('❌ Не удалось сохранить');
        }
    } catch (error) {
        alert('❌ Сервер недоступен');
    }
}

async function savePhrasal() {
    const verb = document.getElementById('phrasal-verb')?.value.trim();
    const data = document.getElementById('phrasal-data')?.value.trim();
    
    if (!verb || !data) {
        alert('Заполни все поля');
        return;
    }
    
    const preps = [];
    const trans = [];
    data.split(',').forEach(p => {
        if (p.includes('=')) {
            const [prep, tran] = p.split('=').map(s => s.trim());
            preps.push(prep);
            trans.push(`${prep} — ${tran}`);
        }
    });
    
    if (preps.length === 0) {
        alert('Неверный формат. Пример: after = присматривать');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/save_phrasal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                verb,
                prepositions: preps.join(', '),
                russian: trans.join('; '),
                user_id: userId
            })
        });
        const result = await response.json();
        
        if (result.success) {
            alert(`✅ Глагол "${verb}" сохранён!`);
            showAddPage();
        } else {
            alert('❌ Не удалось сохранить');
        }
    } catch (error) {
        alert('❌ Сервер недоступен');
    }
}

// ========== ТЕСТ ==========
function showTestMenu() {
    content.innerHTML = `
        <h2>📝 Тест</h2>
        <button class="button" onclick="startTest('en_ru')">🇬🇧 Английский → Русский</button>
        <button class="button" onclick="startTest('ru_en')">🇷🇺 Русский → Английский</button>
        <button class="button" onclick="startTest('phrasal')">📖 Фразовые глаголы</button>
        <button class="button secondary" onclick="startTest('mixed')">🔀 Общий тест</button>
    `;
}

let currentTest = { items: [], index: 0, correct: 0 };

async function startTest(type) {
    content.innerHTML = '<div class="loading">Загрузка теста...</div>';
    
    try {
        const response = await fetch(`${API_URL}/api/get_test_data?user_id=${userId}&type=${type}`);
        const data = await response.json();
        const items = data.items || [];
        
        if (items.length === 0) {
            content.innerHTML = '<p style="text-align:center; padding:40px;">Словарь пуст. Добавь слова!</p>';
            return;
        }
        
        const testItems = [];
        items.forEach(item => {
            if (item.type === 'word') {
                if (type === 'en_ru') {
                    testItems.push({ type: 'word', question: item.english, correct: item.russian });
                } else if (type === 'ru_en') {
                    testItems.push({ type: 'word', question: item.russian, correct: item.english });
                } else {
                    const isEnRu = Math.random() > 0.5;
                    testItems.push({
                        type: 'word',
                        question: isEnRu ? item.english : item.russian,
                        correct: isEnRu ? item.russian : item.english
                    });
                }
            } else {
                const preps = item.prepositions.split(',').map(p => p.trim());
                const chosen = preps[Math.floor(Math.random() * preps.length)];
                const translations = item.russian.split(';');
                let meaning = chosen;
                for (const t of translations) {
                    if (t.includes(chosen) && t.includes('—')) {
                        meaning = t.split('—')[1]?.trim() || chosen;
                        break;
                    }
                }
                testItems.push({
                    type: 'phrasal',
                    verb: item.verb,
                    question: item.verb,
                    correct: chosen,
                    meaning: meaning
                });
            }
        });
        
        // Перемешиваем
        testItems.sort(() => Math.random() - 0.5);
        
        currentTest = { items: testItems, index: 0, correct: 0 };
        showTestQuestion();
    } catch (error) {
        content.innerHTML = '<p style="text-align:center; padding:40px;">Ошибка загрузки теста</p>';
    }
}

function showTestQuestion() {
    if (currentTest.index >= currentTest.items.length) {
        const total = currentTest.items.length;
        const correct = currentTest.correct;
        const accuracy = total > 0 ? Math.round(correct / total * 100) : 0;
        
        content.innerHTML = `
            <h2>🏁 Тест завершён!</h2>
            <div style="display:flex; justify-content:space-around; margin:30px 0;">
                <div class="stat-card"><div class="stat-number">${correct}</div><div class="stat-label">Правильно</div></div>
                <div class="stat-card"><div class="stat-number">${total - correct}</div><div class="stat-label">Ошибок</div></div>
                <div class="stat-card"><div class="stat-number">${accuracy}%</div><div class="stat-label">Точность</div></div>
            </div>
            <button class="button" onclick="showTestMenu()">🔄 Новый тест</button>
            <button class="button secondary" onclick="loadPage('dictionary')">📚 В словарь</button>
        `;
        return;
    }
    
    const item = currentTest.items[currentTest.index];
    const progress = `📌 Вопрос ${currentTest.index + 1} из ${currentTest.items.length}`;
    
    let html = `<h2>📝 Тест</h2><p style="text-align:center; color:#666;">${progress}</p>`;
    
    if (item.type === 'word') {
        html += `
            <div class="test-question">${item.question}</div>
            <div class="input-group">
                <input type="text" id="test-answer" placeholder="Введи перевод" autocomplete="off">
            </div>
        `;
    } else {
        html += `
            <div class="test-question">📖 ${item.question} ______</div>
            <div class="test-meaning">Значение: ${item.meaning}</div>
            <div class="input-group">
                <input type="text" id="test-answer" placeholder="Введи предлог" autocomplete="off">
            </div>
        `;
    }
    
    html += `
        <button class="button" onclick="checkAnswer()">✅ Ответить</button>
        <button class="button secondary" onclick="showTestMenu()">❌ Выйти</button>
    `;
    
    content.innerHTML = html;
    document.getElementById('test-answer')?.focus();
    document.getElementById('test-answer')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkAnswer();
    });
}

function checkAnswer() {
    const answer = document.getElementById('test-answer')?.value.trim().toLowerCase();
    const item = currentTest.items[currentTest.index];
    
    let isCorrect = false;
    if (item.type === 'word') {
        const correctLower = item.correct.toLowerCase();
        isCorrect = answer === correctLower || correctLower.split(',').map(s => s.trim()).includes(answer);
    } else {
        isCorrect = answer === item.correct.toLowerCase();
    }
    
    if (isCorrect) {
        currentTest.correct++;
        alert('✅ Верно!');
    } else {
        alert(`❌ Неверно! Правильно: ${item.correct}`);
    }
    
    currentTest.index++;
    showTestQuestion();
}

// ========== СТАТИСТИКА ==========
function showStats() {
    const totalWords = allWords.length;
    const totalPhrasal = allPhrasalVerbs.length;
    
    content.innerHTML = `
        <h2>📊 Статистика</h2>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:20px;">
            <div class="stat-card"><div class="stat-number">${totalWords}</div><div class="stat-label">Слов</div></div>
            <div class="stat-card"><div class="stat-number">${totalPhrasal}</div><div class="stat-label">Фразовых глаголов</div></div>
        </div>
        <div class="stat-card" style="margin-top:12px;">
            <div class="stat-number">${totalWords + totalPhrasal}</div>
            <div class="stat-label">Всего единиц</div>
        </div>
        <button class="button" style="margin-top:20px;" onclick="loadDictionary()">📚 Смотреть словарь</button>
    `;
}

// Запуск
loadPage('dictionary');