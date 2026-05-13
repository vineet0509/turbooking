import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'super_admin' | 'turf_owner' | 'customer';
  date_joined: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
  user: User;
}

export interface RegisterPayload {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  password: string;
  confirm_password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

const API_BASE = 'http://localhost:8000/api/auth';
const TOKEN_KEY = 'tb_access';
const REFRESH_KEY = 'tb_refresh';
const USER_KEY = 'tb_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(this.loadUser());
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ── Getters ───────────────────────────────────────────────────────────────

  get isLoggedIn(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get accessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get authHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.accessToken}` });
  }

  // ── Auth Actions ──────────────────────────────────────────────────────────

  login(payload: LoginPayload): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${API_BASE}/login/`, payload).pipe(
      tap(res => this.saveSession(res)),
      catchError(err => throwError(() => err))
    );
  }

  register(payload: any): Observable<AuthTokens> {
    const isCustomer = payload.role === 'customer';
    const endpoint = isCustomer ? 'customer/register/' : 'register/';
    
    return this.http.post<AuthTokens>(`${API_BASE}/${endpoint}`, payload).pipe(
      tap(res => this.saveSession(res)),
      catchError(err => throwError(() => err))
    );
  }

  refreshToken(): Observable<{ access: string }> {
    const refresh = localStorage.getItem(REFRESH_KEY);
    return this.http.post<{ access: string }>(`${API_BASE}/token/refresh/`, { refresh }).pipe(
      tap(res => localStorage.setItem(TOKEN_KEY, res.access)),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  fetchProfile(): Observable<User> {
    return this.http.get<User>(`${API_BASE}/profile/`, { headers: this.authHeaders }).pipe(
      tap(user => {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.currentUserSubject.next(user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUserSubject.next(null);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private saveSession(res: AuthTokens): void {
    localStorage.setItem(TOKEN_KEY, res.access);
    localStorage.setItem(REFRESH_KEY, res.refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.currentUserSubject.next(res.user);
  }

  private loadUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
