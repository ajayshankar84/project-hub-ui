import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PROJECT_ENDPOINT } from '../config/api.config';

export interface Project {
  _id?: string;
  projectName: string;
  dueDate: string;
  customerId: string; // Assuming projects are linked to a customer
  status?: string; // e.g., 'pending', 'completed'
  cost?: number | string; // project cost/earning
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {

  constructor(private http: HttpClient) { }

  createProject(project: Project): Observable<Project> {
    return this.http.post<Project>(PROJECT_ENDPOINT, project);
  }

  getProjectsByCustomerId(customerId: string): Observable<Project[]> {
    return this.http.get<Project[]>(`${PROJECT_ENDPOINT}/customer/${customerId}`);
  }
}