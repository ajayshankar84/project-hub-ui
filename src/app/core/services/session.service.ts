import { Injectable } from '@angular/core';

const AUTH_TOKEN_KEY = 'auth-token';
const SESSION_TOKEN_KEY = 'session-token';
const USER_INFO_KEY = 'user-info';
const IS_ADMIN_KEY = 'is-admin';

@Injectable({ providedIn: 'root' })
export class SessionService {
  setAuthToken(token: string): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  getAuthToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  setSessionToken(token: string): void {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  }

  getSessionToken(): string | null {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  }

  setUserInfo(info: any): void {
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(info));
  }

  getUserInfo<T = any>(): T | null {
    const raw = localStorage.getItem(USER_INFO_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  setIsAdmin(isAdmin: boolean): void {
    localStorage.setItem(IS_ADMIN_KEY, String(isAdmin));
  }

  isAdmin(): boolean {
    return localStorage.getItem(IS_ADMIN_KEY) === 'true';
  }

  isLoggedIn(): boolean {
    return !!this.getSessionToken();
  }

  clear(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
    localStorage.removeItem(IS_ADMIN_KEY);
  }
}
