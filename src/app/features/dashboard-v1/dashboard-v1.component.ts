import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DocumentService } from '../../core/services/document.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-dashboard-v1',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-v1.component.html',
  styleUrl: './dashboard-v1.component.scss'
})
export class DashboardV1Component implements OnInit, OnDestroy {
  clientName: string = 'Client';
  currentUserId: string | undefined;
  documents: any[] = [];
  isLoading = false;
  errorMessage: string | null = null;

  totalFiles = 0;
  reviewedFiles = 0;
  pendingFiles = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private documentService: DocumentService,
    public router: Router // Changed to public
  ) { }

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    this.currentUserId = user?._id || (user as any)?.id;
    this.clientName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Client';

    if (this.currentUserId) {
      this.fetchClientDocuments(this.currentUserId);
    } else {
      this.errorMessage = 'User not logged in or ID not found.';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchClientDocuments(userId: string): void {
    this.isLoading = true;
    this.documentService.getDocumentsByCustomerId(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.documents = res.data || res || [];
          this.updateStats();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching client documents:', err);
          this.errorMessage = 'Failed to load your documents. Please try again later.';
          this.isLoading = false;
        }
      });
  }

  updateStats() {
    this.totalFiles = this.documents.length;
    this.reviewedFiles = this.documents.filter(d => d.status === 'reviewed').length;
    this.pendingFiles = this.documents.filter(d => ['submitted', 'pending'].includes(d.status)).length;
  }

  // Reusing utility functions from document-detail.component.ts
  getInitials(name: string | null | undefined): string {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  formatBytes(bytes: any, decimals = 2) {
    if (bytes === 0 || bytes === '0') return '0 Bytes';
    if (!bytes || bytes === 'N/A') return 'N/A';
    if (typeof bytes === 'string' && isNaN(Number(bytes))) {
      return bytes;
    }
    const bytesNum = Number(bytes);
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytesNum) / Math.log(k));
    return `${parseFloat((bytesNum / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  getFileTypeLabel(mimeType: string | null | undefined): string {
    if (!mimeType) return 'File';
    const mapping: Record<string, string> = {
      'application/pdf': 'PDF', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
      'application/msword': 'Word', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
      'application/vnd.ms-excel': 'Excel', 'text/csv': 'CSV', 'image/jpeg': 'JPEG', 'image/png': 'PNG',
      'image/webp': 'WEBP', 'image/gif': 'GIF', 'text/plain': 'TXT', 'application/octet-stream': 'Binary'
    };
    if (mapping[mimeType]) return mapping[mimeType];
    return mimeType.includes('/') ? mimeType.split('/')[1].toUpperCase() : mimeType.toUpperCase();
  }

  // Placeholder for opening upload modal (if you want to integrate it here)
  openUploadModal() {
    this.router.navigate(['/features/document-detail', this.currentUserId]); // Example: navigate to document-detail for upload
  }
}