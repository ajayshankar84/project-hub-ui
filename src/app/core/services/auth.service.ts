import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { LMS_AUTH_ENDPOINT } from '../config/api.config';
import { SessionService } from './session.service';

export type UserRole = 'user' | 'admin';

export interface User {
  id?: string;
  _id?: string;
  email: string;
  firstName: string;
  lastName: string;
  mobile: string;
  role: UserRole;
  address?: string;
  gstNo?: string;
  password?: string;
  access_token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  private readonly API_URL = LMS_AUTH_ENDPOINT; // Adjust this to match your backend environment

  constructor(private http: HttpClient, private sessionService: SessionService) {
    // Initialize with data from localStorage if available
    this.currentUserSubject = new BehaviorSubject<User | null>(
      JSON.parse(localStorage.getItem('lms-account-data') || 'null')
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${LMS_AUTH_ENDPOINT}/${id}`);
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${LMS_AUTH_ENDPOINT}`);
  }

  createUser(user: User): Observable<User> {
    return this.http.post<User>(`${LMS_AUTH_ENDPOINT}/create`, user);
  }

  updateUser(user: User): Observable<User> {
    if (!user._id) throw new Error('User ID is required for updates');
    return this.http.patch<User>(`${LMS_AUTH_ENDPOINT}/${user._id}`, user);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${LMS_AUTH_ENDPOINT}/${id}`);
  }

  sendResetLink(email: string): Observable<any> {
    console.log(email);
    return this.http.post(`https://bharatapp-admin.praispranav.com/auth/reset-password`, { email });
  }

  // resetPassword(password: string, token: string): Observable<any> {
  //   return this.http.post(`${this.API_URL}/reset-password`, { password, token });
  // }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public setCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user);
  }

  public logout(): void {
    localStorage.removeItem('lms-account-data');
    this.currentUserSubject.next(null);
  }
}