console.log("✅ app.js загружен!");

// ============================================================
// 1. ПОЛЬЗОВАТЕЛИ
// ============================================================
if (!localStorage.getItem('users')) {
    localStorage.setItem('users', JSON.stringify([
        { login: "admin", password: "admin123", role: "admin" },
        { login: "user", password: "user123", role: "user" }
    ]));
    console.log("✅ Пользователи созданы!");
}

// ============================================================
// 2. ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ
// ============================================================
function getCurrentUser() {
    const login = localStorage.getItem('currentUser');
    if (!login) return null;
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return users.find(u => u.login === login) || null;
}

function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

function getUsers() {
    return JSON.parse(localStorage.getItem('users') || '[]');
}

function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

// ============================================================
// 3. DOM ЭЛЕМЕНТЫ
// ============================================================
const loginForm = document.querySelector("#app-login-form");
const logoutBtn = document.getElementById('logout-btn');
const logoutItem = document.getElementById('logout-item');
const kanbanBoard = document.getElementById('kanban-board');
const loginMessage = document.getElementById('login-message');
const userNameSpan = document.getElementById('user-name');

const columns = ['backlog', 'ready', 'inprogress', 'finished'];
const taskLists = {};
const taskCounts = {};
const addButtons = {};

columns.forEach(col => {
    taskLists[col] = document.getElementById(`${col}-tasks`);
    taskCounts[col] = document.getElementById(`${col}-count`);
    addButtons[col] = document.getElementById(`add-${col}-btn`);
});

// ============================================================
// 4. USER MENU
// ============================================================
const userMenuContainer = document.getElementById('user-menu-container');
const userMenuTrigger = document.getElementById('user-menu-trigger');
const userDropdownMenu = document.getElementById('user-dropdown-menu');
const dropdownArrow = document.getElementById('dropdown-arrow');
const avatarText = document.getElementById('avatar-text');
const userMenuName = document.getElementById('user-menu-name');
const userRoleBadge = document.getElementById('user-role-badge');
const userAvatar = document.getElementById('user-avatar');
const userLogoutBtn = document.getElementById('user-logout-btn');

let isMenuOpen = false;

function updateUserMenu(user) {
    if (!user) { userMenuContainer.style.display = 'none'; return; }
    userMenuContainer.style.display = 'flex';
    avatarText.textContent = user.login.charAt(0).toUpperCase();
    userMenuName.textContent = user.login;
    userRoleBadge.textContent = user.role;
    userAvatar.className = user.role === 'admin' ? 'user-avatar admin' : 'user-avatar user';
}

userMenuTrigger.addEventListener('click', function(e) {
    e.stopPropagation();
    isMenuOpen = !isMenuOpen;
    userDropdownMenu.classList.toggle('active');
    dropdownArrow.classList.toggle('open');
});

document.addEventListener('click', function(e) {
    if (isMenuOpen && !userMenuContainer.contains(e.target)) {
        isMenuOpen = false;
        userDropdownMenu.classList.remove('active');
        dropdownArrow.classList.remove('open');
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isMenuOpen) {
        isMenuOpen = false;
        userDropdownMenu.classList.remove('active');
        dropdownArrow.classList.remove('open');
    }
});

// ============================================================
// 5. РАБОТА С ЗАДАЧАМИ
// ============================================================
function getTasks() {
    const user = getCurrentUser();
    if (!user) return { tasks: { backlog: [], ready: [], inprogress: [], finished: [] }, taskCounter: 0 };
    const key = `tasks_${user.login}`;
    return JSON.parse(localStorage.getItem(key) || '{"tasks":{"backlog":[],"ready":[],"inprogress":[],"finished":[]},"taskCounter":0}');
}

function saveTasks(data) {
    const user = getCurrentUser();
    if (!user) return;
    localStorage.setItem(`tasks_${user.login}`, JSON.stringify(data));
}

function addTaskToColumn(column, title, description = '') {
    const data = getTasks();
    data.taskCounter++;
    data.tasks[column].push({
        id: data.taskCounter,
        title: title.trim(),
        description: description.trim(),
        createdAt: new Date().toISOString(),
        createdBy: getCurrentUser()?.login || 'unknown'
    });
    saveTasks(data);
    renderAll();
}

function deleteTaskFromColumn(column, taskId) {
    const data = getTasks();
    data.tasks[column] = data.tasks[column].filter(t => t.id !== taskId);
    saveTasks(data);
    renderAll();
}

function moveTask(fromColumn, toColumn, taskId) {
    const data = getTasks();
    const taskIndex = data.tasks[fromColumn].findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    const [task] = data.tasks[fromColumn].splice(taskIndex, 1);
    data.tasks[toColumn].push(task);
    saveTasks(data);
    renderAll();
}

function getSourceColumn(column) {
    const map = { 'ready': 'backlog', 'inprogress': 'ready', 'finished': 'inprogress' };
    return map[column] || null;
}

// ============================================================
// 6. РЕНДЕРИНГ
// ============================================================
function renderAll() {
    if (!getCurrentUser()) return;
    renderTasks();
    updateStats();
    updateButtonsState();
    renderAdminPanel();
}

function renderTasks() {
    if (!getCurrentUser()) return;
    const data = getTasks();
    const user = getCurrentUser();
    const isAdminUser = isAdmin();

    columns.forEach(col => {
        const tasks = data.tasks[col] || [];
        const list = taskLists[col];
        if (!list) return;
        list.innerHTML = '';

        tasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'task-card';
            card.dataset.taskId = task.id;
            card.dataset.column = col;
            card.draggable = true;

            let authorHtml = '';
            if (isAdminUser && task.createdBy) {
                authorHtml = `<span class="task-author">by ${task.createdBy}</span>`;
            }

            card.innerHTML = `
                <div class="task-card-title">${task.title} ${authorHtml}</div>
                ${task.description ? `<div class="task-card-description">${task.description}</div>` : ''}
            `;

            // Drag & Drop
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);

            // Двойной клик для удаления
            if (isAdminUser || task.createdBy === user?.login) {
                card.addEventListener('dblclick', () => {
                    if (confirm(`Delete task "${task.title}"?`)) {
                        deleteTaskFromColumn(col, task.id);
                    }
                });
                card.style.cursor = 'pointer';
            }

            list.appendChild(card);
        });

        // Восстанавливаем поле ввода для Backlog
        if (col === 'backlog' && backlogInputState.isVisible) {
            const wrapper = createBacklogInputWrapper();
            list.appendChild(wrapper);
        }

        // Восстанавливаем дропдаун
        if (dropdownStates[col]?.isVisible) {
            const wrapper = createDropdownWrapper(col);
            list.appendChild(wrapper);
        }
    });
}

// ============================================================
// 7. DRAG & DROP
// ============================================================
let draggedTaskId = null;
let draggedFromColumn = null;

function handleDragStart(e) {
    draggedTaskId = parseInt(this.dataset.taskId);
    draggedFromColumn = this.dataset.column;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
}

function setupDropZones() {
    document.querySelectorAll('.kanban-column').forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            column.classList.add('drag-over');
        });

        column.addEventListener('dragleave', (e) => {
            column.classList.remove('drag-over');
        });

        column.addEventListener('drop', (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');

            if (draggedTaskId && draggedFromColumn) {
                const toColumn = column.dataset.column;
                if (draggedFromColumn !== toColumn) {
                    moveTask(draggedFromColumn, toColumn, draggedTaskId);
                }
                draggedTaskId = null;
                draggedFromColumn = null;
            }
        });
    });
}

// ============================================================
// 8. ВСПОМОГАТЕЛЬНЫЕ ЭЛЕМЕНТЫ
// ============================================================
let backlogInputState = { isVisible: false };
const dropdownStates = {
    ready: { isVisible: false },
    inprogress: { isVisible: false },
    finished: { isVisible: false }
};

function createBacklogInputWrapper() {
    const wrapper = document.createElement('div');
    wrapper.className = 'task-input-wrapper';
    wrapper.innerHTML = `
        <input type="text" class="task-input" placeholder="New task title..." />
        <button class="task-submit-btn">Submit</button>
        <button class="task-cancel-btn">Cancel</button>
    `;

    const input = wrapper.querySelector('.task-input');
    const submitBtn = wrapper.querySelector('.task-submit-btn');
    const cancelBtn = wrapper.querySelector('.task-cancel-btn');

    const handleSubmit = () => {
        const title = input.value.trim();
        if (title) {
            addTaskToColumn('backlog', title);
            hideBacklogInput();
        }
    };

    submitBtn.addEventListener('click', handleSubmit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault();
            handleSubmit(); }
        if (e.key === 'Escape') hideBacklogInput();
    });
    input.addEventListener('blur', () => {
        setTimeout(() => {
            if (document.activeElement !== submitBtn && document.activeElement !== input) {
                const title = input.value.trim();
                if (title) addTaskToColumn('backlog', title);
                hideBacklogInput();
            }
        }, 150);
    });
    cancelBtn.addEventListener('click', hideBacklogInput);

    return wrapper;
}

function createDropdownWrapper(column) {
    const wrapper = document.createElement('div');
    wrapper.className = 'dropdown-wrapper';

    const data = getTasks();
    const sourceColumn = getSourceColumn(column);
    const sourceTasks = sourceColumn ? data.tasks[sourceColumn] || [] : [];

    if (sourceTasks.length === 0) {
        wrapper.innerHTML = `<span class="text-muted small">No tasks in ${sourceColumn}</span>`;
        return wrapper;
    }

    const select = document.createElement('select');
    select.className = 'task-dropdown';
    select.innerHTML = `<option value="">Select from ${sourceColumn}...</option>`;
    sourceTasks.forEach(task => {
        const opt = document.createElement('option');
        opt.value = task.id;
        opt.textContent = task.title;
        select.appendChild(opt);
    });

    const submitBtn = document.createElement('button');
    submitBtn.className = 'task-submit-btn';
    submitBtn.textContent = 'Add';
    submitBtn.disabled = true;

    select.addEventListener('change', () => { submitBtn.disabled = !select.value; });
    submitBtn.addEventListener('click', () => {
        const taskId = parseInt(select.value);
        if (taskId) {
            moveTask(sourceColumn, column, taskId);
            hideDropdown(column);
        }
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'task-cancel-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => hideDropdown(column));

    wrapper.appendChild(select);
    wrapper.appendChild(submitBtn);
    wrapper.appendChild(cancelBtn);
    return wrapper;
}

// ============================================================
// 9. УПРАВЛЕНИЕ СОСТОЯНИЯМИ
// ============================================================
function updateButtonsState() {
    const data = getTasks();
    const user = getCurrentUser();
    if (!user) {
        columns.forEach(col => { if (addButtons[col]) addButtons[col].disabled = true; });
        return;
    }

    columns.forEach(col => {
        const btn = addButtons[col];
        if (!btn) return;
        if (col === 'backlog') {
            btn.disabled = false;
        } else {
            const source = getSourceColumn(col);
            const sourceTasks = source ? data.tasks[source] || [] : [];
            btn.disabled = sourceTasks.length === 0;
        }
    });
}

function updateStats() {
    const data = getTasks();
    document.getElementById('active-tasks-count').textContent = data.tasks.backlog.length;
    document.getElementById('finished-tasks-count').textContent = data.tasks.finished.length;
}

// ============================================================
// 10. УПРАВЛЕНИЕ ПОЛЕМ ВВОДА И ДРОПДАУНАМИ
// ============================================================
function showBacklogInput() {
    if (backlogInputState.isVisible || !getCurrentUser()) return;
    
    backlogInputState.isVisible = true;
    const list = taskLists.backlog;
    const btn = addButtons.backlog;
    
    // Удаляем старое поле
    const old = list.querySelector('.task-input-wrapper');
    if (old) old.remove();
    
    // Создаём новое поле
    const wrapper = document.createElement('div');
    wrapper.className = 'task-input-wrapper';
    wrapper.innerHTML = `
        <input type="text" class="task-input" placeholder="New task title..." />
        <button class="task-submit-btn">Submit</button>
        <button class="task-cancel-btn">Cancel</button>
    `;
    
    const input = wrapper.querySelector('.task-input');
    const submitBtn = wrapper.querySelector('.task-submit-btn');
    const cancelBtn = wrapper.querySelector('.task-cancel-btn');
    
    const handleSubmit = () => {
        const title = input.value.trim();
        if (title) {
            addTaskToColumn('backlog', title);
            hideBacklogInput();
        }
    };
    
    submitBtn.addEventListener('click', handleSubmit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
        if (e.key === 'Escape') hideBacklogInput();
    });
    input.addEventListener('blur', () => {
        setTimeout(() => {
            if (document.activeElement !== submitBtn && document.activeElement !== input) {
                const title = input.value.trim();
                if (title) addTaskToColumn('backlog', title);
                hideBacklogInput();
            }
        }, 150);
    });
    cancelBtn.addEventListener('click', hideBacklogInput);
    
    list.appendChild(wrapper);
    input.focus();
    
    btn.textContent = 'Submit';
    btn.disabled = true;
}

function hideBacklogInput() {
    backlogInputState.isVisible = false;
    const list = taskLists.backlog;
    const wrapper = list.querySelector('.task-input-wrapper');
    if (wrapper) wrapper.remove();
    const btn = addButtons.backlog;
    btn.textContent = '+ Add card';
    btn.disabled = false;
}

function showDropdown(column) {
    if (dropdownStates[column]?.isVisible || !getCurrentUser()) return;
    const data = getTasks();
    const source = getSourceColumn(column);
    const sourceTasks = source ? data.tasks[source] || [] : [];
    if (sourceTasks.length === 0) {
        alert(`No tasks in "${source}" to move!`);
        return;
    }
    dropdownStates[column].isVisible = true;
    const list = taskLists[column];
    const old = list.querySelector('.dropdown-wrapper');
    if (old) old.remove();
    list.appendChild(createDropdownWrapper(column));
    const btn = addButtons[column];
    btn.textContent = 'Submit';
    btn.disabled = true;
}

function hideDropdown(column) {
    dropdownStates[column].isVisible = false;
    const list = taskLists[column];
    const wrapper = list.querySelector('.dropdown-wrapper');
    if (wrapper) wrapper.remove();
    const btn = addButtons[column];
    btn.textContent = '+ Add card';
    updateButtonsState();
}

// ============================================================
// 11. ОБРАБОТЧИКИ КНОПОК
// ============================================================
addButtons.backlog?.addEventListener('click', function() {
    if (this.disabled || !getCurrentUser() || backlogInputState.isVisible) return;
    showBacklogInput();
});

['ready', 'inprogress', 'finished'].forEach(col => {
    addButtons[col]?.addEventListener('click', function() {
        if (this.disabled || !getCurrentUser() || dropdownStates[col].isVisible) return;
        showDropdown(col);
    });
});

// ============================================================
// 12. АДМИН ПАНЕЛЬ
// ============================================================
function renderAdminPanel() {
    const panel = document.getElementById('admin-panel');
    if (!panel) return;

    if (!isAdmin()) {
        panel.style.display = 'none';
        return;
    }

    panel.style.display = 'block';
    const userList = document.getElementById('user-list');
    const users = getUsers();
    const currentUser = getCurrentUser();

    userList.innerHTML = '';
    users.forEach(user => {
        const item = document.createElement('div');
        item.className = 'user-item';
        const isCurrentUser = user.login === currentUser?.login;

        item.innerHTML = `
            <div class="user-info">
                <strong>${user.login}</strong>
                <span class="user-role-badge ${user.role}">${user.role}</span>
                ${isCurrentUser ? '<span style="font-size:11px;color:#a0aec0;">(вы)</span>' : ''}
            </div>
            ${!isCurrentUser ? `<button class="btn-delete-user" data-login="${user.login}">🗑️</button>` : ''}
        `;
        userList.appendChild(item);
    });

    document.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.addEventListener('click', function() {
            const login = this.dataset.login;
            if (confirm(`Удалить пользователя "${login}"?`)) {
                let users = getUsers();
                users = users.filter(u => u.login !== login);
                saveUsers(users);
                localStorage.removeItem(`tasks_${login}`);
                localStorage.removeItem(`demo_${login}`);
                renderAll();
                alert(`✅ Пользователь "${login}" удалён!`);
            }
        });
    });
}

function addUser(login, password, role) {
    const users = getUsers();
    if (users.find(u => u.login === login)) {
        alert('❌ Пользователь с таким логином уже существует!');
        return false;
    }
    if (!login || login.length < 3) {
        alert('❌ Логин должен быть не менее 3 символов!');
        return false;
    }
    if (!password || password.length < 4) {
        alert('❌ Пароль должен быть не менее 4 символов!');
        return false;
    }

    users.push({ login, password, role });
    saveUsers(users);
    renderAll();
    alert(`✅ Пользователь "${login}" добавлен!`);
    return true;
}

document.getElementById('btn-add-user')?.addEventListener('click', function() {
    const login = document.getElementById('new-user-login').value.trim();
    const password = document.getElementById('new-user-password').value.trim();
    const role = document.getElementById('new-user-role').value;
    if (addUser(login, password, role)) {
        document.getElementById('new-user-login').value = '';
        document.getElementById('new-user-password').value = '';
    }
});

// ============================================================
// 13. ВХОД / ВЫХОД
// ============================================================
loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const login = formData.get('login');
    const password = formData.get('password');

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.login === login && u.password === password);

    if (user) {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('currentUser', login);
        updateUI();
        alert(`👋 Welcome, ${login}! (${user.role})`);
        loginForm.querySelector('[name="login"]').value = '';
        loginForm.querySelector('[name="password"]').value = '';
    } else {
        alert('❌ Invalid login or password!');
    }
});

userLogoutBtn?.addEventListener('click', function(e) {
    e.preventDefault();
    isMenuOpen = false;
    userDropdownMenu.classList.remove('active');
    dropdownArrow.classList.remove('open');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('currentUser');
    updateUI();
    alert('👋 You have been logged out');
});

// ============================================================
// 14. ОБНОВЛЕНИЕ UI
// ============================================================
function updateUI() {
    const isAuth = localStorage.getItem('isAuthenticated') === 'true';
    const user = getCurrentUser();

    if (isAuth && user) {
        kanbanBoard.style.display = 'block';
        loginMessage.style.display = 'none';
        loginForm.style.display = 'none';
        userMenuContainer.style.display = 'flex';

        userNameSpan.textContent = user.login;
        updateUserMenu(user);

        initDemoTasks();
        renderAll();
        setupDropZones();
    } else {
        kanbanBoard.style.display = 'none';
        loginMessage.style.display = 'block';
        loginForm.style.display = 'flex';
        userMenuContainer.style.display = 'none';
    }
}

// ============================================================
// 15. ДЕМО-ЗАДАЧИ
// ============================================================
function initDemoTasks() {
    const user = getCurrentUser();
    if (!user) return;
    if (localStorage.getItem(`demo_${user.login}`)) return;

    const demos = [
        { column: 'backlog', title: 'Login page – performance issues', description: 'Optimize loading' },
        { column: 'backlog', title: 'Sprint bugfix', description: 'Fix sprint bugs' },
        { column: 'backlog', title: 'Shop page – performance issues', description: 'Speed up shop' },
        { column: 'backlog', title: 'Checkout bugfix', description: 'Fix checkout errors' },
        { column: 'ready', title: 'Shop bug1', description: 'Cart bug' },
        { column: 'ready', title: 'Shop bug2', description: 'Filter bug' },
        { column: 'inprogress', title: 'User page – performance issues', description: 'Optimize user page' },
        { column: 'inprogress', title: 'Auth bugfix', description: 'Fix auth errors' },
        { column: 'finished', title: 'Main page – performance issues', description: 'Optimize main' },
        { column: 'finished', title: 'Main page bugfix', description: 'Fix main bugs' }
    ];

    demos.forEach(({ column, title, description }) => {
        const data = getTasks();
        data.taskCounter++;
        data.tasks[column].push({
            id: data.taskCounter,
            title: title,
            description: description,
            createdAt: new Date().toISOString(),
            createdBy: user.login
        });
        saveTasks(data);
    });

    localStorage.setItem(`demo_${user.login}`, 'true');
    console.log(`✅ Демо-задачи для ${user.login} созданы!`);
}

// ============================================================
// 16. ЗАПУСК
// ============================================================
kanbanBoard.style.display = 'none';
loginMessage.style.display = 'block';
loginForm.style.display = 'flex';
userMenuContainer.style.display = 'none';

const isAuth = localStorage.getItem('isAuthenticated') === 'true';
console.log('🔍 isAuth при запуске:', isAuth);

if (isAuth) {
    const user = getCurrentUser();
    if (user) {
        console.log(`✅ Уже авторизован как ${user.login} (${user.role})`);
        updateUI();
    } else {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('currentUser');
        kanbanBoard.style.display = 'none';
        loginMessage.style.display = 'block';
        loginForm.style.display = 'flex';
        userMenuContainer.style.display = 'none';
    }
} else {
    console.log('❌ Не авторизован, доска скрыта');
    kanbanBoard.style.display = 'none';
    loginMessage.style.display = 'block';
    loginForm.style.display = 'flex';
    userMenuContainer.style.display = 'none';
}

console.log("✅ app.js загружен!");
console.log("🔍 Текущий пользователь:", getCurrentUser());