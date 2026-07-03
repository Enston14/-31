// src/models/BaseModel.js

export class BaseModel {
  constructor() {
    this.id = Date.now() + Math.random();
    this.createdAt = new Date().toISOString();
  }
}