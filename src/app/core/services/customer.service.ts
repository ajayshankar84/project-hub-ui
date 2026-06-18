import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CUSTOMER_ENDPOINT } from '../config/api.config'; // Adjust path as needed

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  constructor(private http: HttpClient) { }


  getAllCustomer(): Observable<any[]> {
    return this.http.get<any[]>(CUSTOMER_ENDPOINT);
  }

  getCustomerById(id: string): Observable<any> {
    return this.http.get(`${CUSTOMER_ENDPOINT}/${id}`);
  }

  getCustomerByMobile(mobile: string): Observable<any> {
    return this.http.get(`${CUSTOMER_ENDPOINT}/mobile/${mobile}`);
  }

  getPagedCustomer(page: number, limit: number, search: string = '', sortBy: string = 'createdAt', sortDir: string = 'desc', filters: any = {}): Observable<any> {
    const params: any = { search, sortBy, sortDir, ...filters };

    // Clean up empty parameters so they aren't sent in the query string
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key];
      }
    });

    return this.http.get(`${CUSTOMER_ENDPOINT}/paged/${page}/${limit}`, { params });
  }

  createCustomer(data: any): Observable<any> {
    return this.http.post(CUSTOMER_ENDPOINT, data);
  }

  updateCustomer(id: string, data: any): Observable<any> {
    return this.http.patch(`${CUSTOMER_ENDPOINT}/${id}`, data);
  }

  deleteCustomer(id: string): Observable<any> {
    return this.http.delete(`${CUSTOMER_ENDPOINT}/${id}`);
  }

}