import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { SubscriptionPlan, TenantSubscription } from '../models/subscription.model';

const API_BASE = 'http://localhost:8000/api/subscriptions';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  getPlans(): Observable<SubscriptionPlan[]> {
    return this.http.get<SubscriptionPlan[]>(`${API_BASE}/plans/`);
  }

  getMySubscription(): Observable<TenantSubscription> {
    return this.http.get<TenantSubscription>(`${API_BASE}/my/`, { headers: this.auth.authHeaders });
  }

  subscribe(planId: string, billingCycle: string): Observable<any> {
    return this.http.post(`${API_BASE}/subscribe/`, { plan_id: planId, billing_cycle: billingCycle }, { headers: this.auth.authHeaders });
  }
}
