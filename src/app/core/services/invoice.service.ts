import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { INVOICE_DETAIL_ENDPOINT } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  constructor(private http: HttpClient) { }

  createInvoice(payload: unknown): Observable<any> {
    return this.http.post(INVOICE_DETAIL_ENDPOINT, payload);
  }

  getCustomersByCompany(companyName: string): Observable<any> {
    return this.http.get(`${INVOICE_DETAIL_ENDPOINT}/customer/${encodeURIComponent(companyName)}`);
  }

  getInvoicesByCompanyAndCustomer(companyName: string, customerName: string): Observable<any> {
    return this.http.get(
      `${INVOICE_DETAIL_ENDPOINT}/company/${encodeURIComponent(companyName)}/customer/${encodeURIComponent(customerName)}`
    );
  }
}