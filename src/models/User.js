// src/models/User.js

// ✅ ДОБАВЛЯЕМ .js В КОНЦЕ КАЖДОГО ИМПОРТА
import { BaseModel } from "./BaseModel.js";
import { getFromStorage, addToStorage } from "../utils.js";

export class User extends BaseModel {
  constructor(login, password, role = 'user') {
    super();
    this.login = login;
    this.password = password;
    this.role = role;
    this.storageKey = "users";
  }
  
  get hasAccess() {
    let users = getFromStorage(this.storageKey);
    if (users.length == 0) return false;
    for (let user of users) {
      if (user.login == this.login && user.password == this.password)
        return true;
    }
    return false;
  }
  
  static save(user) {
    try {
      addToStorage(user, user.storageKey);
      return true;
    } catch (e) {
      throw new Error(e);
    }
  }
}