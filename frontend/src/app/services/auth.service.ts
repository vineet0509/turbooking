import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
import { User } from '../models/booking.model';

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

const API_BASE = 'http://localhost:8000/api/accounts';
const TOKEN_KEY = 'turf_access';
const REFRESH_KEY = 'turf_refresh';
const USER_KEY = 'turf_user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;

  constructor(private http: HttpClient) {
    const savedUser = localStorage.getItem(USER_KEY);
    this.currentUserSubject = new BehaviorSubject<User | null>(
      savedUser ? JSON.parse(savedUser) : null
    );
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

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

  // ── Private Helpers ────────────────────────────────────────────────────────

  private saveSession(res: AuthTokens): void {
    localStorage.setItem(TOKEN_KEY, res.access);
    localStorage.setItem(REFRESH_KEY, res.refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.currentUserSubject.next(res.user);
  }
}
