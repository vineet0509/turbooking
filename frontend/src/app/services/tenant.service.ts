import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { Tenant, TurfGround } from '../models/tenant.model';

const API_BASE = 'http://localhost:8000/api/tenant';

@Injectable({ providedIn: 'root' })
export class TenantService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  getProfile(): Observable<Tenant> {
    return this.http.get<Tenant>(`${API_BASE}/profile/`, { headers: this.auth.authHeaders });
  }

  updateProfile(tenant: Partial<Tenant>): Observable<Tenant> {
    return this.http.put<Tenant>(`${API_BASE}/profile/`, tenant, { headers: this.auth.authHeaders });
  }

  getTurfs(): Observable<TurfGround[]> {
    return this.http.get<TurfGround[]>(`${API_BASE}/turfs/`, { headers: this.auth.authHeaders });
  }

  createTurf(turf: TurfGround): Observable<TurfGround> {
    return this.http.post<TurfGround>(`${API_BASE}/turfs/`, turf, { headers: this.auth.authHeaders });
  }

  updateTurf(id: string, turf: Partial<TurfGround>): Observable<TurfGround> {
    return this.http.put<TurfGround>(`${API_BASE}/turfs/${id}/`, turf, { headers: this.auth.authHeaders });
  }

  deleteTurf(id: string): Observable<any> {
    return this.http.delete(`${API_BASE}/turfs/${id}/`, { headers: this.auth.authHeaders });
  }
}
