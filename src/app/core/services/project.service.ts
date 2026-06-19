import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PROJECT_ENDPOINT, PROJECT_DATE_ENDPOINT } from '../config/api.config';

export interface Project {
  _id?: string;
  // id?: string; // Removed as _id is typically used for MongoDB IDs
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

  /**
   * Fetch all projects from the API.
   */
  getAllProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(PROJECT_ENDPOINT);
  }

  /**
   * Fetch project-date entries used for scheduling/active projects on dashboard.
   */
  getProjectDates(): Observable<any[]> {
    return this.http.get<any[]>(PROJECT_DATE_ENDPOINT);
  }

  /**
   * Fetch a single project by id.
   */
  getProjectById(projectId: string): Observable<Project> {
    return this.http.get<Project>(`${PROJECT_ENDPOINT}/${projectId}`);
  }

  getProjectsByCustomerId(customerId: string): Observable<Project[]> {
    return this.http.get<Project[]>(`${PROJECT_ENDPOINT}/customer/${customerId}`);
  }

  updateProjectStatus(projectId: string, status: string, dueDate?: string): Observable<Project> {
    return this.http.patch<Project>(`${PROJECT_ENDPOINT}/${projectId}/status`, { status, dueDate });
  }
}