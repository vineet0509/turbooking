import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

const API_BASE = 'http://localhost:8000/api/super-admin';

export interface AdminTenant {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  owner_email: string;
  owner_name: string;
  city: string;
  plan: string;
  turf_count: number;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  getStats(): Observable<any> {
    return this.http.get(`${API_BASE}/dashboard/`, { headers: this.auth.authHeaders });
  }

  getTenants(status?: string): Observable<AdminTenant[]> {
    let url = `${API_BASE}/tenants/`;
    if (status) url += `?status=${status}`;
    return this.http.get<AdminTenant[]>(url, { headers: this.auth.authHeaders });
  }

  updateTenantStatus(id: string, status: string): Observable<any> {
    return this.http.patch(`${API_BASE}/tenants/${id}/`, { status }, { headers: this.auth.authHeaders });
  }

  getSettings(): Observable<any> {
    return this.http.get(`${API_BASE}/settings/`, { headers: this.auth.authHeaders });
  }

  updateSettings(settings: any): Observable<any> {
    return this.http.post(`${API_BASE}/settings/`, settings, { headers: this.auth.authHeaders });
  }
}
