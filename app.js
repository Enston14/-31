console.log("✅ app.js загружен!");


if (!localStorage.getItem('users')) {
    localStorage.setItem('users', JSON.stringify([
        { login: "admin", password: "admin123", role: "admin" },
        { login: "user", password: "user123", role: "user" }
    ]));
    console.log("✅ Пользователи созданы!");
}

const loginForm = document.querySelector("#app-login-form");
const logoutBtn = document.getElementById('logout-btn');
const logoutItem = document.getElementById('logout-item');
const kanbanBoard = document.getElementById('kanban-board');
const loginMessage = document.getElementById('login-message');
const userNameSpan = document.getElementById('user-name');
const userNameFull = document.getElementById('user-name-full');

const columns = ['backlog', 'ready', 'inprogress', 'finished'];
const taskLists = {};
const taskCounts = {};
const addButtons = {};
const columnFooters = {};

columns.forEach(col => {
    taskLists[col] = document.getElementById(`${col}-tasks`);
    taskCounts[col] = document.getElementById(`${col}-count`);
    addButtons[col] = document.getElementById(`add-${col}-btn`);
    columnFooters[col] = addButtons[col]?.parentElement;
});


let backlogInputState = {
    isVisible: false,
    inputElement: null,
    submitButton: null
};

const dropdownStates = {
    ready: { isVisible: false },
    inprogress: { isVisible: false },
    finished: { isVisible: false }
};


function getTasks() {
    return JSON.parse(localStorage.getItem('tasks_admin') || '{"tasks":{"backlog":[],"ready":[],"inprogress":[],"finished":[]},"taskCounter":0}');
}

function saveTasks(data) {
    localStorage.setItem('tasks_admin', JSON.stringify(data));
}

function addTaskToColumn(column, title, description = '') {
    const data = getTasks();
    data.taskCounter++;
    data.tasks[column].push({
        id: data.taskCounter,
        title: title.trim(),
        description: description.trim(),
        createdAt: new Date().toISOString()
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
    const map = {
        'ready': 'backlog',
        'inprogress': 'ready',
        'finished': 'inprogress'
    };
    return map[column] || null;
}


function renderAll() {
    if (localStorage.getItem('isAuthenticated') !== 'true') {
       
        return;
    }
    renderTasks();
    updateStats();
    updateButtonsState();
}

function renderTasks() {
    if (localStorage.getItem('isAuthenticated') !== 'true') return;

    const data = getTasks();
    
    columns.forEach(col => {
        const tasks = data.tasks[col] || [];
        const list = taskLists[col];
        if (!list) return;
        
        list.innerHTML = '';
        
        tasks.forEach(task => {
            const card = createTaskCard(task, col);
            list.appendChild(card);
        });
        
        // Восстанавливаем поле ввода для Backlog если было
        if (col === 'backlog' && backlogInputState.isVisible) {
            const wrapper = createBacklogInputWrapper();
            list.appendChild(wrapper);
            backlogInputState.inputElement = wrapper.querySelector('.task-input');
            backlogInputState.submitButton = wrapper.querySelector('.task-submit-btn');
            backlogInputState.inputElement.focus();
        }
        
        // Восстанавливаем дропдаун если был
        if (dropdownStates[col]?.isVisible) {
            const wrapper = createDropdownWrapper(col);
            list.appendChild(wrapper);
        }
    });
}

function createTaskCard(task, column) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.dataset.taskId = task.id;
    card.dataset.column = column;
    card.innerHTML = `
        <div class="task-card-title">${task.title}</div>
        ${task.description ? `<div class="task-card-description">${task.description}</div>` : ''}
    `;
    
    card.addEventListener('dblclick', () => {
        if (confirm(`Удалить задачу "${task.title}"?`)) {
            deleteTaskFromColumn(column, task.id);
        }
    });
    
    return card;
}

function createBacklogInputWrapper() {
    const wrapper = document.createElement('div');
    wrapper.className = 'task-input-wrapper';
    wrapper.innerHTML = `
        <input type="text" class="task-input form-control" placeholder="Введите название задачи..." />
        <button class="task-submit-btn btn btn-primary btn-sm">Submit</button>
        <button class="task-cancel-btn btn btn-secondary btn-sm">Отмена</button>
    `;
    
    const input = wrapper.querySelector('.task-input');
    const submitBtn = wrapper.querySelector('.task-submit-btn');
    const cancelBtn = wrapper.querySelector('.task-cancel-btn');
    
    const handleSubmit = () => {
        const title = input.value.trim();
        if (title) {
            addTaskToColumn('backlog', title);
            hideBacklogInput();
        } else {
            alert('Введите название задачи!');
        }
    };
    
    submitBtn.addEventListener('click', handleSubmit);
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
        if (e.key === 'Escape') {
            hideBacklogInput();
        }
    });
    
    input.addEventListener('blur', (e) => {
        setTimeout(() => {
            if (document.activeElement !== submitBtn && document.activeElement !== input) {
                const title = input.value.trim();
                if (title) {
                    addTaskToColumn('backlog', title);
                }
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
        wrapper.innerHTML = `<p class="text-muted text-center small">Нет задач в ${sourceColumn}</p>`;
        return wrapper;
    }
    
    const select = document.createElement('select');
    select.className = 'task-dropdown form-select';
    select.innerHTML = `<option value="">Выберите задачу из ${sourceColumn}...</option>`;
    
    sourceTasks.forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = task.title;
        select.appendChild(option);
    });
    
    const submitBtn = document.createElement('button');
    submitBtn.className = 'task-submit-btn btn btn-primary btn-sm';
    submitBtn.textContent = 'Добавить';
    submitBtn.disabled = true;
    
    select.addEventListener('change', () => {
        submitBtn.disabled = !select.value;
    });
    
    submitBtn.addEventListener('click', () => {
        const taskId = parseInt(select.value);
        if (taskId) {
            const sourceColumn = getSourceColumn(column);
            moveTask(sourceColumn, column, taskId);
            hideDropdown(column);
        }
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'task-cancel-btn btn btn-secondary btn-sm';
    cancelBtn.textContent = 'Отмена';
    cancelBtn.addEventListener('click', () => hideDropdown(column));
    
    wrapper.appendChild(select);
    wrapper.appendChild(submitBtn);
    wrapper.appendChild(cancelBtn);
    
    return wrapper;
}


function updateButtonsState() {
    const data = getTasks();
    
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
    const active = data.tasks.backlog.length;
    const finished = data.tasks.finished.length;
    
    document.getElementById('active-tasks-count').textContent = active;
    document.getElementById('finished-tasks-count').textContent = finished;
}


function showBacklogInput() {
    if (backlogInputState.isVisible) return;
    
    backlogInputState.isVisible = true;
    const list = taskLists.backlog;
    
    const oldWrapper = list.querySelector('.task-input-wrapper');
    if (oldWrapper) oldWrapper.remove();
    
    const wrapper = createBacklogInputWrapper();
    list.appendChild(wrapper);
    
    backlogInputState.inputElement = wrapper.querySelector('.task-input');
    backlogInputState.submitButton = wrapper.querySelector('.task-submit-btn');
    backlogInputState.inputElement.focus();
    
    const btn = addButtons.backlog;
    btn.textContent = 'Submit';
    btn.disabled = true;
}

function hideBacklogInput() {
    backlogInputState.isVisible = false;
    backlogInputState.inputElement = null;
    backlogInputState.submitButton = null;
    
    const list = taskLists.backlog;
    const wrapper = list.querySelector('.task-input-wrapper');
    if (wrapper) wrapper.remove();
    
    const btn = addButtons.backlog;
    btn.textContent = '+ Add card';
    btn.disabled = false;
}


function showDropdown(column) {
    if (dropdownStates[column]?.isVisible) return;
    
    const data = getTasks();
    const source = getSourceColumn(column);
    const sourceTasks = source ? data.tasks[source] || [] : [];
    
    if (sourceTasks.length === 0) {
        alert(`Нет задач в колонке "${source}" для перемещения!`);
        return;
    }
    
    dropdownStates[column].isVisible = true;
    const list = taskLists[column];
    
    const oldWrapper = list.querySelector('.dropdown-wrapper');
    if (oldWrapper) oldWrapper.remove();
    
    const wrapper = createDropdownWrapper(column);
    list.appendChild(wrapper);
    
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

addButtons.backlog?.addEventListener('click', function() {
    if (this.disabled) return;
    if (localStorage.getItem('isAuthenticated') !== 'true') {
        alert('Пожалуйста, войдите в систему!');
        return;
    }
    if (backlogInputState.isVisible) return;
    showBacklogInput();
});

['ready', 'inprogress', 'finished'].forEach(col => {
    addButtons[col]?.addEventListener('click', function() {
        if (this.disabled) return;
        if (localStorage.getItem('isAuthenticated') !== 'true') {
            alert('Пожалуйста, войдите в систему!');
            return;
        }
        if (dropdownStates[col].isVisible) return;
        showDropdown(col);
    });
});

loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const login = formData.get('login');
    const password = formData.get('password');

    const users = JSON.parse(localStorage.getItem('users'));
    const user = users.find(u => u.login === login && u.password === password);

    if (user) {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('currentUser', login);
        updateUI();
        alert(`👋 Добро пожаловать, ${login}!`);
        loginForm.querySelector('[name="login"]').value = '';
        loginForm.querySelector('[name="password"]').value = '';
    } else {
        alert('❌ Неверный логин или пароль!');
    }
});

logoutBtn.addEventListener('click', function(e) {
    e.preventDefault();
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('currentUser');
    updateUI();
    alert('👋 Вы вышли из системы');
});

function updateUI() {
    const isAuth = localStorage.getItem('isAuthenticated') === 'true';
    console.log('🔍 updateUI: isAuth =', isAuth);
    
    if (isAuth) {
        kanbanBoard.style.display = 'block';
        loginMessage.style.display = 'none';
        logoutItem.style.display = 'block';
        loginForm.style.display = 'none';
        
        const user = localStorage.getItem('currentUser') || 'User';
        userNameSpan.textContent = user;
        userNameFull.textContent = user;
        
        renderAll();
    } else {
        kanbanBoard.style.display = 'none';
        loginMessage.style.display = 'block';
        logoutItem.style.display = 'none';
        loginForm.style.display = 'flex';
    }
}

function initDemoTasks() {
    if (localStorage.getItem('hasDemoTasks')) return;

    const demos = [
        { column: 'backlog', title: 'Login page – performance issues', description: 'Оптимизировать загрузку' },
        { column: 'backlog', title: 'Sprint bugfix', description: 'Исправить ошибки' },
        { column: 'backlog', title: 'Shop page – performance issues', description: 'Ускорить загрузку' },
        { column: 'backlog', title: 'Checkout bugfix', description: 'Исправить ошибки' },
        { column: 'backlog', title: 'Shop bug1', description: 'Баг с корзиной' },
        { column: 'backlog', title: 'Shop bug2', description: 'Баг с фильтрацией' },
        { column: 'ready', title: 'User page – performance issues', description: 'Оптимизировать' },
        { column: 'ready', title: 'Auth bugfix', description: 'Исправить ошибки' },
        { column: 'inprogress', title: 'Main page – performance issues', description: 'Оптимизация' },
        { column: 'finished', title: 'Main page bugfix', description: 'Исправление' }
    ];

    demos.forEach(({ column, title, description }) => {
        const data = getTasks();
        data.taskCounter++;
        data.tasks[column].push({
            id: data.taskCounter,
            title: title,
            description: description,
            createdAt: new Date().toISOString()
        });
        saveTasks(data);
    });

    localStorage.setItem('hasDemoTasks', 'true');
    console.log('✅ Демо-задачи добавлены!');
}

console.log('🔍 Принудительно скрываем доску...');

if (kanbanBoard) kanbanBoard.style.display = 'none';
if (loginMessage) loginMessage.style.display = 'block';
if (logoutItem) logoutItem.style.display = 'none';
if (loginForm) loginForm.style.display = 'flex';

initDemoTasks();

const isAuth = localStorage.getItem('isAuthenticated') === 'true';
console.log('🔍 isAuth при запуске:', isAuth);

if (isAuth) {
    console.log('✅ Уже авторизован, показываем доску');
    updateUI();
} else {
    console.log('❌ Не авторизован, доска скрыта');
    // Ещё раз принудительно скрываем
    if (kanbanBoard) kanbanBoard.style.display = 'none';
    if (loginMessage) loginMessage.style.display = 'block';
    if (logoutItem) logoutItem.style.display = 'none';
    if (loginForm) loginForm.style.display = 'flex';
}

console.log("✅ app.js загружен!");
console.log("🔍 Статус авторизации:", localStorage.getItem('isAuthenticated'));
console.log("🔍 Пользователь:", localStorage.getItem('currentUser'));