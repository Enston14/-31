// src/services/auth.js

import { User } from "../models/User.js";  // ✅ ДОБАВИЛИ .js
import { getFromStorage } from "../utils.js";  // ✅ ДОБАВИЛИ .js

export function authUser(login, password) {
    const users = getFromStorage("users");
    const user = users.find(u => u.login === login && u.password === password);
    
    if (user) {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('currentUser', login);
        return true;
    }
    return false;
}

export function logoutUser() {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('currentUser');
    return true;
}

export function getCurrentUser() {
    return localStorage.getItem('currentUser');
}

export function isAuthenticated() {
    return localStorage.getItem('isAuthenticated') === 'true';
}