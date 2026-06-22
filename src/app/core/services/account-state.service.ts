import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, tap, throwError } from 'rxjs';
import { LMS_AUTH_ENDPOINT } from '../config/api.config';
import { SessionService } from './session.service';
import { AuthService, User } from './auth.service';

export interface AccountSubmissionPayload {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  password: string;
  address?: string;
  gstNo?: string;
}

export interface StoredCompanyItem {
  cid: string;
  cname: string;
  address: string;
  gstNo: string;
  email: string;
  mobile: string;
}

export interface StoredAccountData {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile: string;
  address?: string;
  gstNo?: string;
  company?: StoredCompanyItem[];
  isLoggedIn?: boolean;
  role?: string;
  access_token?: string;
}

export interface AccountApiResponse {
  success: boolean;
  message?: string;
  data?: StoredAccountData;
  token?: string;
  access_token?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AccountStateService {
  private readonly storageKey = 'lms-account-data';

  private readonly accountDataSubject = new BehaviorSubject<StoredAccountData | null>(
    this.loadStoredAccountData()
  );

  readonly accountData$ = this.accountDataSubject.asObservable();

  constructor(
    private http: HttpClient,
    private sessionService: SessionService,
    private authService: AuthService
  ) {
    const existing = this.getStoredAccountData();
    if (existing && existing.access_token) {
      this.sessionService.setSessionToken(existing.access_token);
    }

    if (existing) {
      this.syncAuthServiceCurrentUser(existing);
    }
  }

  submitAccount(payload: AccountSubmissionPayload): Observable<AccountApiResponse> {
    const sanitizedForStorage: StoredAccountData = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      mobile: payload.mobile,
      isLoggedIn: false,
    };

    return this.http.post<AccountApiResponse>(`${LMS_AUTH_ENDPOINT}/create`, payload).pipe(
      tap((response) => {
        const storedData = this.normalizeAuthResponse(response, payload.mobile);
        this.setAccountData(storedData);
        this.syncWithSessionService(response, storedData);
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  loginWithMobile(mobile: string, password: string): Observable<AccountApiResponse> {
    const loginEndpoint = `${LMS_AUTH_ENDPOINT}/login`;

    return this.http.post<AccountApiResponse>(loginEndpoint, { mobile, password }).pipe(
      tap((response) => {
        const storedData = this.normalizeAuthResponse(response, mobile);
        this.setAccountData(storedData);
        this.syncWithSessionService(response, storedData);
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  private normalizeAuthResponse(response: AccountApiResponse | any, fallbackMobile: string): StoredAccountData {
    const payload = response && typeof response === 'object' && 'data' in response ? response.data : response;
    const user = (payload && typeof payload === 'object' && 'user' in payload ? (payload as { user?: StoredAccountData }).user : payload) as StoredAccountData | undefined;

    // Robustly extract token checking for various common naming conventions
    const token = response?.access_token || (payload as any)?.access_token || (user as any)?.access_token ||
                  response?.token || (payload as any)?.token || (user as any)?.token ||
                  (response as any)?.accessToken || (payload as any)?.accessToken;

    const company = Array.isArray((user as any)?.company)
      ? (user as any).company.map((companyItem: any) => ({
          cid: companyItem.cid || '',
          cname: companyItem.cname || '',
          address: companyItem.address || '',
          gstNo: companyItem.gstNo || '',
          email: companyItem.email || '',
          mobile: companyItem.mobile || ''
        }))
      : undefined;

    return {
      id: (user as any)?.id ?? (user as any)?._id,
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.email,
      mobile: user?.mobile || fallbackMobile,
      address: user?.address,
      gstNo: user?.role?.toLowerCase() === 'admin' ? user?.gstNo : undefined,
      company: company,
      role: user?.role,
      access_token: token,
      isLoggedIn: true,
    };
  }

  /**
   * Synchronizes authentication metadata with the SessionService.
   * This ensures tokens and user roles are available for guards and interceptors.
   */
  private syncWithSessionService(response: any, userData: StoredAccountData | null): void {
    // Extract token from various possible locations in the API response
    const token = userData?.access_token || 
                  response?.data?.token || 
                  response?.token || 
                  response?.access_token ||
                  (response?.data as any)?.user?.token;
                  
    if (token) {
      this.sessionService.setSessionToken(token);
    }

    if (userData) {
      this.sessionService.setUserInfo(userData);
      this.sessionService.setIsAdmin(userData.role?.toLowerCase() === 'admin');
    }
  }

  setAccountData(data: StoredAccountData | null): void {
    this.accountDataSubject.next(data);

    if (typeof localStorage === 'undefined') {
      return;
    }

    if (!data) {
      localStorage.removeItem(this.storageKey);
      this.syncAuthServiceCurrentUser(null);
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(data));
    this.syncAuthServiceCurrentUser(data);
  }

  getStoredAccountData(): StoredAccountData | null {
    return this.accountDataSubject.value;
  }

  private syncAuthServiceCurrentUser(data: StoredAccountData | null): void {
    const user: User | null = data
      ? {
          _id: data.id,
          id: data.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          mobile: data.mobile,
          address: data.address,
          gstNo: data.role?.toLowerCase() === 'admin' ? data.gstNo : undefined,
          company: data.company,
          role: (data.role as any) || 'user',
          access_token: data.access_token,
        }
      : null;

    this.authService.setCurrentUser(user);
  }

  private loadStoredAccountData(): StoredAccountData | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const stored = localStorage.getItem(this.storageKey);
    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored) as StoredAccountData;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }
  clearAccountData(): void {
    this.setAccountData(null);
    this.sessionService.clear();
  }
}
