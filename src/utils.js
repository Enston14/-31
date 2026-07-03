// src/utils.js

export const getFromStorage = function (key) {
  return JSON.parse(localStorage.getItem(key) || "[]");
};

export const addToStorage = function (obj, key) {
  const storageData = getFromStorage(key);
  storageData.push(obj);
  localStorage.setItem(key, JSON.stringify(storageData));
};

export const generateTestUser = function (User) {
  // ❌ УБИРАЕМ localStorage.clear() - ОН УДАЛЯЕТ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ!
  // localStorage.clear(); // <-- УДАЛИТЬ!
  
  const users = getFromStorage("users");
  
  if (users.length === 0) {
    const testUser = new User("test", "qwerty123");
    const adminUser = new User("admin", "admin123");
    const userUser = new User("user", "user123");
    
    User.save(testUser);
    User.save(adminUser);
    User.save(userUser);
    
    console.log("✅ Пользователи созданы!");
  } else {
    console.log("✅ Пользователи уже есть:", users);
  }
};