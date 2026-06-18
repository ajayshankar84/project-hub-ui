import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DOCUMENT_ENDPOINT } from '../config/api.config'; // Adjust path as needed

@Injectable({
    providedIn: 'root'
})
export class DocumentService {
    constructor(private http: HttpClient) { }

    // Fetch documents by customer ID
    getDocumentsByCustomerId(customerId: string): Observable<any> {
        return this.http.get(`${DOCUMENT_ENDPOINT}/customer/${customerId}`);
    }

    // Update document status
    updateDocumentStatus(documentId: string, status: string): Observable<any> {
        return this.http.put(`${DOCUMENT_ENDPOINT}/${documentId}/status`, { status });
    }

    // Upload document
    uploadDocument(formData: FormData): Observable<any> {
        return this.http.post(`${DOCUMENT_ENDPOINT}/`, formData, {
            reportProgress: true,
            observe: 'events'
        });
    }

    // Delete document
    deleteDocument(documentId: string): Observable<any> {
        return this.http.delete(`${DOCUMENT_ENDPOINT}/${documentId}`);
    }
}