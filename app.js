// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Настройка тем
const isDark = tg.colorScheme === 'dark';
document.documentElement.style.setProperty('--tg-theme-bg-color', tg.backgroundColor || (isDark ? '#1c1c1e' : '#ffffff'));
document.documentElement.style.setProperty('--tg-theme-text-color', tg.textColor || (isDark ? '#ffffff' : '#1a1a1a'));
document.documentElement.style.setProperty('--tg-theme-hint-color', tg.hintColor || (isDark ? '#8e8e93' : '#8e8e93'));
document.documentElement.style.setProperty('--tg-theme-link-color', tg.linkColor || '#007aff');
document.documentElement.style.setProperty('--tg-theme-button-color', tg.buttonColor || '#007aff');
document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.buttonTextColor || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.secondaryBackgroundColor || (isDark ? '#2c2c2e' : '#f8f9fa'));

// API URL
const API_URL = 'https://english-bot-bq9l.onrender.com';

// Данные пользователя
const initDataUnsafe = tg.initDataUnsafe || {};
const userId = initDataUnsafe.user?.id || 0;

// Отображение имени
const userInfo = document.getElementById('user-info');
if (initDataUnsafe.user) {
    userInfo.textContent = `${initDataUnsafe.user.first_name} ${initDataUnsafe.user.last_name || ''}`;
}

// Глобальные переменные
let allFolders = [];
let currentFolderId = null;
let allWords = [];
let allPhrasalVerbs = [];
let dictionaryTab = 'words';
let currentTest = { items: [], index: 0, correct: 0, type: '' };
let lastTestResult = null;
let lastFolderId = localStorage.getItem('lastFolderId') || '';

// Режим массового выбора
let selectionMode = false;
let selectedWords = new Set();

// Загрузка сохранённого результата теста
try {
    const saved = localStorage.getItem('lastTestResult');
    if (saved) lastTestResult = JSON.parse(saved);
} catch(e) {}

// Навигация
const navButtons = document.querySelectorAll('.nav-btn');
const content = document.getElementById('content');

function setActiveTab(page) {
    navButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.page === page) btn.classList.add('active');
    });
    localStorage.setItem('lastPage', page);
}

navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        setActiveTab(page);
        loadPage(page);
        window.scrollTo({ top: 0, behavior: 'instant' });
    });
});

// ========== ПРОКРУТКА ==========
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToBottom() {
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
        const rect = bottomNav.getBoundingClientRect();
        const scrollY = window.scrollY;
        const targetY = rect.top + scrollY - window.innerHeight + rect.height + 10;
        window.scrollTo({ top: targetY, behavior: 'smooth' });
    } else {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
}

window.addEventListener('scroll', () => {
    const btnTop = document.getElementById('scrollToTop');
    const btnBottom = document.getElementById('scrollToBottom');
    if (btnTop) btnTop.classList.toggle('show', window.scrollY > 300);
    if (btnBottom) btnBottom.classList.toggle('show', window.scrollY > 200);
});

// ========== ЗАГРУЗКА ПАПОК ==========
async function loadFolders() {
    try {
        const response = await fetch(`${API_URL}/api/folders?user_id=${userId}`);
        const data = await response.json();
        allFolders = data.folders || [];
    } catch (error) {
        console.error('Ошибка загрузки папок:', error);
    }
}

// ========== ЗАГРУЗКА СТРАНИЦ ==========
async function loadPage(page) {
    await loadFolders();
    selectionMode = false;
    selectedWords.clear();
    switch(page) {
        case 'dictionary': loadDictionary(); break;
        case 'add': showAddPage(); break;
        case 'test': showTestMenu(); break;
        case 'stats': showStats(); break;
        case 'folders': showFoldersPage(); break;
    }
}

// ========== СЛОВАРЬ ==========
async function loadDictionary() {
    content.innerHTML = '<div class="loading"></div>';
    
    let url = `${API_URL}/api/words?user_id=${userId}`;
    if (currentFolderId) {
        url += `&folder_id=${currentFolderId}`;
    }
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        allWords = data.words || [];
        allPhrasalVerbs = data.phrasal_verbs || [];
        renderDictionary();
    } catch (error) {
        content.innerHTML = '<div class="empty-state">Ошибка загрузки<button class="button secondary small" onclick="loadDictionary()" style="margin-top:20px;">Попробовать снова</button></div>';
    }
}

function renderDictionary() {
    const currentFolder = allFolders.find(f => f.id == currentFolderId);
    const folderName = currentFolder ? currentFolder.name : 'Все слова';
    
    let selectionBar = '';
    if (selectionMode && selectedWords.size > 0) {
        selectionBar = `
            <div style="position: sticky; top: 0; background: var(--tg-theme-button-color, #007aff); color: white; padding: 12px 16px; border-radius: 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; z-index: 10;">
                <span>Выбрано: ${selectedWords.size}</span>
                <div>
                    <button class="button small" style="width: auto; margin: 0; background: white; color: #007aff;" onclick="showBulkMoveMenu()">📁 Переместить</button>
                    <button class="button small" style="width: auto; margin: 0 0 0 8px; background: rgba(255,255,255,0.2); color: white;" onclick="cancelSelection()">✖</button>
                </div>
            </div>
        `;
    }
    
    let html = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <h2 style="margin: 0;">📚 ${folderName}</h2>
            <div style="display: flex; gap: 8px;">
                <button class="button secondary small" style="width: auto; margin: 0;" onclick="toggleSelectionMode()">
                    ${selectionMode ? '✖ Отмена' : '☑ Выбрать'}
                </button>
                <button class="button secondary small" style="width: auto; margin: 0;" onclick="showFolderSelector()">
                    📁 ${currentFolder ? 'Сменить' : 'Папка'}
                </button>
            </div>
        </div>
        ${selectionBar}
        <div class="tabs">
            <button class="tab ${dictionaryTab === 'words' ? 'active' : ''}" onclick="switchDictionaryTab('words')">
                Слова · ${allWords.length}
            </button>
            <button class="tab ${dictionaryTab === 'phrasal' ? 'active' : ''}" onclick="switchDictionaryTab('phrasal')">
                Фразовые · ${allPhrasalVerbs.length}
            </button>
        </div>
        <div id="dictionary-content"></div>
    `;
    content.innerHTML = html;
    renderDictionaryContent();
}

function switchDictionaryTab(tab) {
    dictionaryTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[onclick*="${tab}"]`)?.classList.add('active');
    renderDictionaryContent();
}

function renderDictionaryContent() {
    const container = document.getElementById('dictionary-content');
    if (!container) return;
    
    if (dictionaryTab === 'words') {
        if (allWords.length === 0) {
            container.innerHTML = '<div class="empty-state">Нет слов в этой папке</div>';
            return;
        }
        
        let html = '';
        allWords.forEach(word => {
            const folder = allFolders.find(f => f.id == word.folder_id);
            const isSelected = selectedWords.has(word.id);
            
            html += `
                <div class="word-card ${isSelected ? 'selected-card' : ''}" style="${isSelected ? 'border: 2px solid var(--tg-theme-button-color, #007aff);' : ''}">
                    <div class="word-header">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${selectionMode ? `<div class="checkbox ${isSelected ? 'checked' : ''}" onclick="toggleWordSelection(${word.id})" style="width: 24px; height: 24px; border: 2px solid ${isSelected ? 'var(--tg-theme-button-color, #007aff)' : '#ccc'}; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; ${isSelected ? 'background: var(--tg-theme-button-color, #007aff);' : ''}">${isSelected ? '✓' : ''}</div>` : ''}
                            <span class="english">${word.english}</span>
                        </div>
                        <button class="delete-btn" onclick="deleteWord(${word.id})">🗑️</button>
                    </div>
                    <div class="russian">${word.russian}</div>
                    ${word.comment ? `<div class="comment">💬 ${word.comment}</div>` : ''}
                    ${folder ? `<div style="font-size:12px; color: #8e8e93; margin-top:8px;">📁 ${folder.name}</div>` : ''}
                    ${!selectionMode ? `
                    <div style="display: flex; gap: 8px; margin-top: 12px;">
                        <button class="button secondary small" style="flex:1;" onclick="showAddComment(${word.id}, '${word.english.replace(/'/g, "\\'")}')">
                            ${word.comment ? '✏️' : '➕'} Комментарий
                        </button>
                        <button class="button secondary small" style="flex:1;" onclick="showMoveWordMenu(${word.id}, '${word.english.replace(/'/g, "\\'")}')">
                            📁 Переместить
                        </button>
                    </div>
                    ` : ''}
                </div>
            `;
        });
        container.innerHTML = html;
    } else {
        if (allPhrasalVerbs.length === 0) {
            container.innerHTML = '<div class="empty-state">Нет фразовых глаголов</div>';
            return;
        }
        
        let html = '';
        allPhrasalVerbs.forEach(verb => {
            const folder = allFolders.find(f => f.id == verb.folder_id);
            html += `
                <div class="word-card">
                    <div class="word-header">
                        <span class="english">${verb.verb} <span style="font-weight:400; font-size:18px;">(${verb.prepositions})</span></span>
                        <button class="delete-btn" onclick="deletePhrasal(${verb.id})">🗑️</button>
                    </div>
                    <div class="russian">${verb.russian}</div>
                    ${folder ? `<div style="font-size:12px; color: #8e8e93; margin-top:8px;">📁 ${folder.name}</div>` : ''}
                    <button class="button secondary small" style="margin-top:12px; width:100%;" onclick="showMovePhrasalMenu(${verb.id})">
                        📁 Переместить
                    </button>
                </div>
            `;
        });
        container.innerHTML = html;
    }
}

// ========== РЕЖИМ ВЫБОРА ==========
function toggleSelectionMode() {
    selectionMode = !selectionMode;
    selectedWords.clear();
    renderDictionary();
}

function cancelSelection() {
    selectionMode = false;
    selectedWords.clear();
    renderDictionary();
}

function toggleWordSelection(wordId) {
    if (selectedWords.has(wordId)) {
        selectedWords.delete(wordId);
    } else {
        selectedWords.add(wordId);
    }
    renderDictionary();
}

function showBulkMoveMenu() {
    if (selectedWords.size === 0) {
        alert('Выберите хотя бы одно слово');
        return;
    }
    
    if (allFolders.length === 0) {
        alert('Сначала создайте папку');
        return;
    }
    
    let html = `
        <h2>📁 Переместить ${selectedWords.size} слов(а)</h2>
        <button class="button secondary" onclick="bulkMoveWords(null)">📚 Без папки</button>
    `;
    
    allFolders.forEach(folder => {
        html += `<button class="button secondary" onclick="bulkMoveWords(${folder.id})">📁 ${folder.name}</button>`;
    });
    
    html += `<button class="button secondary" onclick="cancelSelection(); loadDictionary();">🔙 Отмена</button>`;
    content.innerHTML = html;
}

async function bulkMoveWords(folderId) {
    const promises = [];
    selectedWords.forEach(wordId => {
        promises.push(
            fetch(`${API_URL}/api/words/${wordId}/move`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder_id: folderId, user_id: userId })
            })
        );
    });
    
    await Promise.all(promises);
    selectionMode = false;
    selectedWords.clear();
    loadDictionary();
}

// ========== ВЫБОР ПАПКИ ==========
function showFolderSelector() {
    let html = `
        <h2>📁 Выбери папку</h2>
        <button class="button secondary" onclick="selectFolder(null)">📚 Все слова</button>
    `;
    
    allFolders.forEach(folder => {
        html += `<button class="button secondary" onclick="selectFolder(${folder.id})">📁 ${folder.name}</button>`;
    });
    
    html += `
        <div style="margin-top: 20px;">
            <button class="button" onclick="showCreateFolderForm()">➕ Создать новую папку</button>
            <button class="button secondary" onclick="loadDictionary()">🔙 Назад</button>
        </div>
    `;
    
    content.innerHTML = html;
}

function selectFolder(folderId) {
    currentFolderId = folderId;
    loadDictionary();
}

function showCreateFolderForm() {
    content.innerHTML = `
        <h2>➕ Новая папка</h2>
        <div class="input-group">
            <label>Название папки</label>
            <input type="text" id="folder-name" placeholder="Например: Путешествия" autocomplete="off" autofocus>
        </div>
        <button class="button" onclick="createFolder()">✅ Создать</button>
        <button class="button secondary" onclick="showFolderSelector()">🔙 Назад</button>
    `;
}

async function createFolder() {
    const name = document.getElementById('folder-name')?.value.trim();
    if (!name) { alert('Введи название'); return; }
    
    const res = await fetch(`${API_URL}/api/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, user_id: userId })
    });
    const data = await res.json();
    if (data.success) {
        alert(`✅ Папка "${name}" создана!`);
        await loadFolders();
        showFolderSelector();
    } else {
        alert('❌ Ошибка создания');
    }
}

async function showMoveWordMenu(wordId, english) {
    if (allFolders.length === 0) {
        alert('Сначала создайте папку');
        return;
    }
    
    let html = `
        <h2>📁 Переместить "${english}"</h2>
        <button class="button secondary" onclick="moveWord(${wordId}, null)">📚 Без папки</button>
    `;
    
    allFolders.forEach(folder => {
        html += `<button class="button secondary" onclick="moveWord(${wordId}, ${folder.id})">📁 ${folder.name}</button>`;
    });
    
    html += `<button class="button secondary" onclick="loadDictionary()">🔙 Отмена</button>`;
    content.innerHTML = html;
}

async function moveWord(wordId, folderId) {
    await fetch(`${API_URL}/api/words/${wordId}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderId, user_id: userId })
    });
    loadDictionary();
}

async function showMovePhrasalMenu(verbId) {
    if (allFolders.length === 0) {
        alert('Сначала создайте папку');
        return;
    }
    
    let html = `
        <h2>📁 Переместить глагол</h2>
        <button class="button secondary" onclick="movePhrasal(${verbId}, null)">📚 Без папки</button>
    `;
    
    allFolders.forEach(folder => {
        html += `<button class="button secondary" onclick="movePhrasal(${verbId}, ${folder.id})">📁 ${folder.name}</button>`;
    });
    
    html += `<button class="button secondary" onclick="loadDictionary()">🔙 Отмена</button>`;
    content.innerHTML = html;
}

async function movePhrasal(verbId, folderId) {
    await fetch(`${API_URL}/api/phrasal/${verbId}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderId, user_id: userId })
    });
    loadDictionary();
}

// ========== УДАЛЕНИЕ ==========
async function deleteWord(wordId) {
    if (!confirm('Удалить слово?')) return;
    await fetch(`${API_URL}/api/words/${wordId}?user_id=${userId}`, { method: 'DELETE' });
    loadDictionary();
}

async function deletePhrasal(verbId) {
    if (!confirm('Удалить фразовый глагол?')) return;
    await fetch(`${API_URL}/api/phrasal/${verbId}?user_id=${userId}`, { method: 'DELETE' });
    loadDictionary();
}

// ========== КОММЕНТАРИИ ==========
function showAddComment(wordId, english) {
    const comment = prompt(`Комментарий к слову "${english}":`);
    if (comment === null) return;
    
    fetch(`${API_URL}/api/words/${wordId}/comment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment, user_id: userId })
    }).then(() => loadDictionary());
}

// ========== УПРАВЛЕНИЕ ПАПКАМИ ==========
function showFoldersPage() {
    let html = `
        <h2>📁 Управление папками</h2>
        <button class="button" onclick="showCreateFolderForm()">➕ Создать папку</button>
        <div style="margin-top: 20px;">
    `;
    
    if (allFolders.length === 0) {
        html += '<div class="empty-state">Нет папок. Создайте первую!</div>';
    } else {
        allFolders.forEach(folder => {
            html += `
                <div class="word-card" style="display: flex; justify-content: space-between; align-items: center;">
                    <span>📁 ${folder.name}</span>
                    <button class="delete-btn" onclick="deleteFolder(${folder.id})">🗑️</button>
                </div>
            `;
        });
    }
    
    html += `</div><button class="button secondary" onclick="loadDictionary()">🔙 В словарь</button>`;
    content.innerHTML = html;
}

async function deleteFolder(folderId) {
    if (!confirm('Удалить папку? Слова останутся, но будут без папки.')) return;
    await fetch(`${API_URL}/api/folders/${folderId}?user_id=${userId}`, { method: 'DELETE' });
    await loadFolders();
    showFoldersPage();
}

// ========== ДОБАВЛЕНИЕ ==========
function showAddPage() {
    content.innerHTML = `
        <h2>➕ Добавить</h2>
        <div class="tabs">
            <button class="tab active" onclick="switchAddTab('word')">Слово</button>
            <button class="tab" onclick="switchAddTab('phrasal')">Фразовый глагол</button>
        </div>
        <div id="add-form"></div>
    `;
    renderAddForm('word');
}

function switchAddTab(type) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[onclick*="${type}"]`)?.classList.add('active');
    renderAddForm(type);
}

function renderAddForm(type) {
    const container = document.getElementById('add-form');
    const folderSelect = allFolders.map(f => 
        `<option value="${f.id}" ${f.id == lastFolderId ? 'selected' : ''}>${f.name}</option>`
    ).join('');
    
    if (type === 'word') {
        container.innerHTML = `
            <div class="input-group">
                <label>🇬🇧 Английское слово</label>
                <input type="text" id="new-word" placeholder="cat" autocomplete="off" autofocus>
            </div>
            <div class="input-group">
                <label>📁 Папка</label>
                <select id="word-folder" style="width:100%; padding:16px; border-radius:16px; background:var(--tg-theme-secondary-bg-color); color:var(--tg-theme-text-color); border:1.5px solid rgba(0,0,0,0.08);">
                    <option value="">📚 Без папки</option>
                    ${folderSelect}
                </select>
            </div>
            <button class="button" onclick="translateAndAdd()">🔄 Перевести</button>
            <div id="translation-area"></div>
        `;
    } else {
        container.innerHTML = `
            <div class="input-group">
                <label>📘 Глагол</label>
                <input type="text" id="phrasal-verb" placeholder="look" autocomplete="off">
            </div>
            <div class="input-group">
                <label>📝 Предлоги и перевод</label>
                <textarea id="phrasal-data" rows="3" placeholder="after = присматривать, down = презирать"></textarea>
            </div>
            <div class="input-group">
                <label>📁 Папка</label>
                <select id="phrasal-folder" style="width:100%; padding:16px; border-radius:16px; background:var(--tg-theme-secondary-bg-color); color:var(--tg-theme-text-color); border:1.5px solid rgba(0,0,0,0.08);">
                    <option value="">📚 Без папки</option>
                    ${folderSelect}
                </select>
            </div>
            <button class="button" onclick="savePhrasal()">💾 Сохранить</button>
        `;
    }
}

async function translateAndAdd() {
    const word = document.getElementById('new-word')?.value.trim();
    if (!word) { alert('Введи слово'); return; }
    
    const area = document.getElementById('translation-area');
    area.innerHTML = '<div class="loading"></div>';
    
    try {
        const response = await fetch(`${API_URL}/api/translate?word=${word}`);
        const data = await response.json();
        const translations = data.translations || [];
        
        if (translations.length > 0) {
            let html = '<h3>📖 Выбери перевод:</h3><div class="translation-variants">';
            translations.forEach(tr => html += `<button class="variant-btn" onclick="saveWord('${word}', '${tr}')">${tr}</button>`);
            html += '</div><button class="button secondary" onclick="showCustomInput()">✏️ Свой вариант</button>';
            area.innerHTML = html;
        } else {
            showCustomInput();
        }
    } catch {
        showCustomInput();
    }
}

function showCustomInput() {
    const word = document.getElementById('new-word')?.value.trim();
    document.getElementById('translation-area').innerHTML = `
        <div class="input-group">
            <label>🇷🇺 Перевод</label>
            <input type="text" id="custom-translation" placeholder="кот" autocomplete="off">
        </div>
        <div class="input-group">
            <label>💬 Комментарий</label>
            <input type="text" id="custom-comment" placeholder="Необязательно">
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
    if (!russian) { alert('Введи перевод'); return; }
    await sendSaveWord(english, russian, comment);
}

async function sendSaveWord(english, russian, comment) {
    const folderSelect = document.getElementById('word-folder');
    const folderId = folderSelect?.value || null;
    
    // Сохраняем последнюю выбранную папку
    lastFolderId = folderId || '';
    localStorage.setItem('lastFolderId', lastFolderId);
    
    const res = await fetch(`${API_URL}/api/words`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ english, russian, comment, folder_id: folderId || null, user_id: userId })
    });
    const data = await res.json();
    if (data.success) {
        alert(`✅ "${english} — ${russian}" сохранено!`);
        showAddPage();
    } else {
        alert('❌ Ошибка сохранения');
    }
}

async function savePhrasal() {
    const verb = document.getElementById('phrasal-verb')?.value.trim();
    const data = document.getElementById('phrasal-data')?.value.trim();
    const folderSelect = document.getElementById('phrasal-folder');
    const folderId = folderSelect?.value || null;
    
    if (!verb || !data) { alert('Заполни все поля'); return; }
    
    // Сохраняем последнюю выбранную папку
    lastFolderId = folderId || '';
    localStorage.setItem('lastFolderId', lastFolderId);
    
    const preps = [], trans = [];
    data.split(',').forEach(p => {
        if (p.includes('=')) {
            const [prep, tran] = p.split('=').map(s => s.trim());
            preps.push(prep);
            trans.push(`${prep} — ${tran}`);
        }
    });
    
    if (preps.length === 0) { alert('Неверный формат'); return; }
    
    const res = await fetch(`${API_URL}/api/phrasal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verb, prepositions: preps.join(', '), russian: trans.join('; '), folder_id: folderId || null, user_id: userId })
    });
    const result = await res.json();
    if (result.success) {
        alert(`✅ "${verb}" сохранён!`);
        showAddPage();
    } else {
        alert('❌ Ошибка сохранения');
    }
}

// ========== ТЕСТ ==========
function showTestMenu() {
    let lastTestHtml = '';
    if (lastTestResult) {
        lastTestHtml = `
            <div class="last-test-result">
                <div class="last-test-title">📊 Последний тест (${lastTestResult.type})</div>
                <div style="display:flex; justify-content:space-around;">
                    <div style="text-align:center;"><span style="font-size:28px;font-weight:700;color:#34c759;">${lastTestResult.correct}</span><br>✅</div>
                    <div style="text-align:center;"><span style="font-size:28px;font-weight:700;color:#ff3b30;">${lastTestResult.total - lastTestResult.correct}</span><br>❌</div>
                    <div style="text-align:center;"><span style="font-size:28px;font-weight:700;color:#007aff;">${lastTestResult.accuracy}%</span><br>📊</div>
                </div>
            </div>
        `;
    }
    
    const currentFolder = allFolders.find(f => f.id == currentFolderId);
    
    content.innerHTML = `
        <h2>📝 Тест</h2>
        <div style="margin-bottom: 20px;">
            <label>📁 Папка для теста:</label>
            <select id="test-folder" style="width:100%; padding:16px; border-radius:16px; background:var(--tg-theme-secondary-bg-color); color:var(--tg-theme-text-color); border:1.5px solid rgba(0,0,0,0.08); margin-top:8px;">
                <option value="">📚 Все слова</option>
                ${allFolders.map(f => `<option value="${f.id}" ${f.id == currentFolderId ? 'selected' : ''}>📁 ${f.name}</option>`).join('')}
            </select>
        </div>
        ${lastTestHtml}
        <button class="button" onclick="startTest('en_ru')">🇬🇧 Английский → Русский</button>
        <button class="button" onclick="startTest('ru_en')">🇷🇺 Русский → Английский</button>
        <button class="button" onclick="startTest('phrasal')">📖 Фразовые глаголы</button>
        <button class="button secondary" onclick="startTest('mixed')">🔀 Общий тест</button>
    `;
}

async function startTest(type) {
    const folderSelect = document.getElementById('test-folder');
    const folderId = folderSelect?.value || currentFolderId;
    
    content.innerHTML = '<div class="loading"></div>';
    
    try {
        let url = `${API_URL}/api/test?user_id=${userId}&type=${type}`;
        if (folderId && folderId !== '') {
            url += `&folder_id=${folderId}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        const items = data.items || [];
        
        if (items.length === 0) {
            content.innerHTML = '<div class="empty-state">Нет слов в выбранной папке</div>';
            return;
        }
        
        const testItems = [];
        items.forEach(item => {
            if (item.type === 'word') {
                if (type === 'en_ru') {
                    testItems.push({ type: 'word', question: item.english, correct: item.russian, display: `${item.english} — ${item.russian}` });
                } else if (type === 'ru_en') {
                    testItems.push({ type: 'word', question: item.russian, correct: item.english, display: `${item.english} — ${item.russian}` });
                } else {
                    const isEnRu = Math.random() > 0.5;
                    testItems.push({
                        type: 'word',
                        question: isEnRu ? item.english : item.russian,
                        correct: isEnRu ? item.russian : item.english,
                        display: `${item.english} — ${item.russian}`
                    });
                }
            } else {
                const preps = item.prepositions.split(',').map(p => p.trim());
                const chosen = preps[Math.floor(Math.random() * preps.length)];
                let meaning = chosen;
                for (const t of item.russian.split(';')) {
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
                    meaning,
                    display: `${item.verb} ${chosen} — ${meaning}`
                });
            }
        });
        
        testItems.sort(() => Math.random() - 0.5);
        currentTest = { items: testItems, index: 0, correct: 0, type };
        showTestQuestion();
    } catch {
        content.innerHTML = '<div class="empty-state">Ошибка загрузки теста</div>';
    }
}

function showTestQuestion() {
    if (currentTest.index >= currentTest.items.length) {
        const total = currentTest.items.length;
        const correct = currentTest.correct;
        const accuracy = total > 0 ? Math.round(correct / total * 100) : 0;
        
        lastTestResult = {
            type: currentTest.type === 'en_ru' ? 'EN→RU' : currentTest.type === 'ru_en' ? 'RU→EN' : currentTest.type === 'phrasal' ? 'Фразовые' : 'Общий',
            correct, total, accuracy,
            date: new Date().toLocaleDateString()
        };
        localStorage.setItem('lastTestResult', JSON.stringify(lastTestResult));
        
        content.innerHTML = `
            <h2>🏁 Тест завершён!</h2>
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-number">${correct}</div><div class="stat-label">Правильно</div></div>
                <div class="stat-card"><div class="stat-number">${total - correct}</div><div class="stat-label">Ошибок</div></div>
                <div class="stat-card"><div class="stat-number">${accuracy}%</div><div class="stat-label">Точность</div></div>
                <div class="stat-card"><div class="stat-number">${total}</div><div class="stat-label">Всего</div></div>
            </div>
            <button class="button" onclick="showTestMenu()">🔄 Новый тест</button>
            <button class="button secondary" onclick="setActiveTab('dictionary'); loadDictionary();">📚 В словарь</button>
        `;
        return;
    }
    
    const item = currentTest.items[currentTest.index];
    const progress = `Вопрос ${currentTest.index + 1} из ${currentTest.items.length}`;
    
    let html = `<h2>📝 Тест</h2><div class="test-progress">${progress}</div>`;
    
    if (item.type === 'word') {
        html += `
            <div class="test-question">${item.question}</div>
            <div class="input-group">
                <input type="text" id="test-answer" placeholder="Введи перевод" autocomplete="off" autofocus>
            </div>
        `;
    } else {
        html += `
            <div class="test-question">${item.question} ______</div>
            <div class="test-meaning">${item.meaning}</div>
            <div class="input-group">
                <input type="text" id="test-answer" placeholder="Введи предлог" autocomplete="off" autofocus>
            </div>
        `;
    }
    
    html += `
        <button class="button" onclick="checkAnswer()">✅ Ответить</button>
        <button class="button secondary" onclick="showTestMenu()">❌ Выйти</button>
    `;
    
    content.innerHTML = html;
    document.getElementById('test-answer')?.addEventListener('keypress', e => { if (e.key === 'Enter') checkAnswer(); });
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
        alert(`❌ Правильно: ${item.display || item.correct}`);
    }
    
    currentTest.index++;
    showTestQuestion();
}

// ========== СТАТИСТИКА ==========
function showStats() {
    const totalWords = allWords.length;
    const totalPhrasal = allPhrasalVerbs.length;
    
    let lastTestHtml = '';
    if (lastTestResult) {
        lastTestHtml = `
            <div class="last-test-result">
                <div class="last-test-title">📊 Последний тест (${lastTestResult.type}) · ${lastTestResult.date}</div>
                <div style="display:flex; justify-content:space-around; margin:16px 0;">
                    <div style="text-align:center;"><span style="font-size:32px;font-weight:700;color:#34c759;">${lastTestResult.correct}</span><br>✅ Правильно</div>
                    <div style="text-align:center;"><span style="font-size:32px;font-weight:700;color:#ff3b30;">${lastTestResult.total - lastTestResult.correct}</span><br>❌ Ошибок</div>
                </div>
                <div style="text-align:center; padding:12px; background:rgba(0,122,255,0.1); border-radius:12px;">
                    <span style="font-size:24px;font-weight:700;color:#007aff;">${lastTestResult.accuracy}%</span> точность
                </div>
            </div>
        `;
    }
    
    content.innerHTML = `
        <h2>📊 Статистика</h2>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-number">${totalWords}</div><div class="stat-label">Слов</div></div>
            <div class="stat-card"><div class="stat-number">${totalPhrasal}</div><div class="stat-label">Фразовых</div></div>
            <div class="stat-card highlight"><div class="stat-number">${totalWords + totalPhrasal}</div><div class="stat-label">Всего</div></div>
            <div class="stat-card"><div class="stat-number">${allWords.filter(w => w.comment).length}</div><div class="stat-label">С коммент.</div></div>
            <div class="stat-card"><div class="stat-number">${allFolders.length}</div><div class="stat-label">Папок</div></div>
            <div class="stat-card"><div class="stat-number">${allWords.filter(w => w.folder_id).length}</div><div class="stat-label">В папках</div></div>
        </div>
        ${lastTestHtml}
        <button class="button secondary" style="margin-top:16px;" onclick="setActiveTab('dictionary'); loadDictionary();">📚 Смотреть словарь</button>
        <button class="button secondary" style="margin-top:8px;" onclick="showFoldersPage()">📁 Управление папками</button>
    `;
}

// Восстановление последней страницы
const lastPage = localStorage.getItem('lastPage') || 'dictionary';
setActiveTab(lastPage);
loadPage(lastPage);