import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  SessionCreatedResponse,
  ClinicalFormRequest,
  TriageResultResponse
} from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080';

  createSession(): Observable<SessionCreatedResponse> {
    return this.http.post<SessionCreatedResponse>(`${this.baseUrl}/sessions`, {});
  }

  submitForm(correlationId: string, formData: ClinicalFormRequest): Observable<TriageResultResponse> {
    return this.http.post<TriageResultResponse>(
      `${this.baseUrl}/forms/${correlationId}`,
      formData
    );
  }
}
