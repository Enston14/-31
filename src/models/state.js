// src/models/state.js - управление состоянием приложения

export const state = {
    tasks: {
        backlog: [],
        ready: [],
        inprogress: [],
        finished: []
    },
    taskCounter: 0,
    isAuthenticated: false,
    currentUser: null
};

// Функции для работы с состоянием
export function addTask(column, taskData) {
    const task = {
        id: ++state.taskCounter,
        title: taskData.title.trim(),
        description: taskData.description ? taskData.description.trim() : '',
        createdAt: new Date().toISOString(),
        status: column
    };
    state.tasks[column].push(task);
    return task;
}

export function getTasks(column) {
    return state.tasks[column] || [];
}

export function getTaskCount(column) {
    return state.tasks[column]?.length || 0;
}

export function getAllTasks() {
    return state.tasks;
}

export function moveTask(fromColumn, taskId, toColumn) {
    const taskIndex = state.tasks[fromColumn].findIndex(t => t.id === taskId);
    if (taskIndex === -1) return null;
    
    const [task] = state.tasks[fromColumn].splice(taskIndex, 1);
    task.status = toColumn;
    state.tasks[toColumn].push(task);
    return task;
}

export function deleteTask(column, taskId) {
    const taskIndex = state.tasks[column].findIndex(t => t.id === taskId);
    if (taskIndex === -1) return false;
    state.tasks[column].splice(taskIndex, 1);
    return true;
}

export function setAuthentication(status) {
    state.isAuthenticated = status;
    localStorage.setItem('isAuthenticated', String(status));
}

export function isAuthenticated() {
    return state.isAuthenticated;
}

export function setCurrentUser(user) {
    state.currentUser = user;
    localStorage.setItem('currentUser', user);
}

export function getCurrentUser() {
    return state.currentUser || localStorage.getItem('currentUser');
}

// Сохранение состояния в localStorage
export function saveState() {
    const user = getCurrentUser();
    if (user) {
        const key = `tasks_${user}`;
        localStorage.setItem(key, JSON.stringify({
            tasks: state.tasks,
            taskCounter: state.taskCounter
        }));
    }
}

// Загрузка состояния из localStorage
export function loadState(user) {
    const key = `tasks_${user}`;
    const saved = localStorage.getItem(key);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            state.tasks = data.tasks;
            state.taskCounter = data.taskCounter;
            return true;
        } catch (e) {
            console.error('Ошибка загрузки состояния:', e);
        }
    }
    return false;
}

// Очистка состояния
export function clearState() {
    state.tasks = {
        backlog: [],
        ready: [],
        inprogress: [],
        finished: []
    };
    state.taskCounter = 0;
}