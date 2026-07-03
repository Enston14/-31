export class State {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.tasks = {
      backlog: [],
      ready: [],
      inprogress: [],
      finished: []
    };
    this.taskCounter = 0;
  }

  set currentUser(user) {
    this._currentUser = user;
  }

  get currentUser() {
    return this._currentUser;
  }

  // Добавить задачу
  addTask(column, taskData) {
    const task = {
      id: ++this.taskCounter,
      title: taskData.title.trim(),
      description: taskData.description ? taskData.description.trim() : '',
      createdAt: new Date().toISOString(),
      status: column
    };
    this.tasks[column].push(task);
    return task;
  }

  // Получить задачи из колонки
  getTasks(column) {
    return this.tasks[column] || [];
  }

  // Получить количество задач в колонке
  getTaskCount(column) {
    return this.tasks[column]?.length || 0;
  }

  // Переместить задачу между колонками
  moveTask(fromColumn, taskId, toColumn) {
    const taskIndex = this.tasks[fromColumn].findIndex(t => t.id === taskId);
    if (taskIndex === -1) return null;
    
    const [task] = this.tasks[fromColumn].splice(taskIndex, 1);
    task.status = toColumn;
    this.tasks[toColumn].push(task);
    return task;
  }

  // Удалить задачу
  deleteTask(column, taskId) {
    const taskIndex = this.tasks[column].findIndex(t => t.id === taskId);
    if (taskIndex === -1) return false;
    this.tasks[column].splice(taskIndex, 1);
    return true;
  }

  // Сохранить состояние в localStorage
  saveState() {
    if (this.currentUser) {
      const key = `tasks_${this.currentUser}`;
      localStorage.setItem(key, JSON.stringify({
        tasks: this.tasks,
        taskCounter: this.taskCounter
      }));
    }
    localStorage.setItem('isAuthenticated', String(this.isAuthenticated));
    localStorage.setItem('currentUser', this.currentUser || '');
  }

  // Загрузить состояние из localStorage
  loadState(user) {
    const key = `tasks_${user}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.tasks = data.tasks;
        this.taskCounter = data.taskCounter;
        return true;
      } catch (e) {
        console.error('Ошибка загрузки состояния:', e);
      }
    }
    return false;
  }

  // Очистить состояние
  clearState() {
    this.tasks = {
      backlog: [],
      ready: [],
      inprogress: [],
      finished: []
    };
    this.taskCounter = 0;
    this.isAuthenticated = false;
    this.currentUser = null;
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('currentUser');
  }

  // Проверить авторизацию
  checkAuth() {
    const savedAuth = localStorage.getItem('isAuthenticated');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedAuth === 'true' && savedUser) {
      this.isAuthenticated = true;
      this.currentUser = savedUser;
      this.loadState(savedUser);
      return true;
    }
    return false;
  }
}