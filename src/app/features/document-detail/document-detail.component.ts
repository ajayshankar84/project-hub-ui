import { Component, OnInit, ElementRef, OnDestroy, ViewChild, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DueLabelPipe } from '../../shared/pipes/due-label.pipe';
import { Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { API_BASE_URL } from '../../core/config/api.config';
import { CustomerService } from '../../core/services/customer.service';
import { DocumentService } from '../../core/services/document.service';
import { ProjectService ,Project} from '../../core/services/project.service';
import { Subject, takeUntil } from 'rxjs';
import { ChatService, ChatMessage, DocumentStatusChange } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service'; // your auth service

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, DueLabelPipe],
  templateUrl: './document-detail.component.html',
  styleUrl: './document-detail.component.scss'
})
export class DocumentDetailComponent implements OnInit, OnDestroy {
  customer: any = null;
  documents: any[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  filePreviewUrl: SafeResourceUrl | null = null;
  previewFileName: string = '';
  currentViewedDocument: any = null; // Store the document object for modal details

  toastVisible = false;
  toastMessage = '';
  toastVariant: 'success' | 'danger' = 'success';
  private toastTimer: any;
  private destroy$ = new Subject<void>();
  private chatDestroy$ = new Subject<void>();
  private uploadCancel$ = new Subject<void>();

  totalFiles = 0;
  reviewedFiles = 0;
  pendingFiles = 0;
  selectedStatus: string = ''; // To hold the status selected in the view modal
  projects: Project[] = []; // To store projects for the current customer
  

  isEditProjectModalOpen = false;
  currentEditingProject: Project | null = null;
  selectedProjectStatus = '';
  selectedProjectDueDate = '';

  isProjectModalOpen = false;
  projectForm: { projectName: string; dueDate: string; cost?: string | number } = {
    projectName: '',
    dueDate: '',
    cost: 0
  };

  isUploadModalOpen = false;
  currentUploadedSize = '';
  totalFileSize = '';
  isViewModalOpen = false; // New property for view modal
  isLocalDocxPreview = false;
  isRenderingLocal = false;
  isDeleteModalOpen = false;
  documentToDelete: any = null;
  uploadProgress = 0;
  selectedFile: File | null = null;
  uploadForm = {
    docTitle: '',
    docDescription: '',
    status: 'submitted',
    fileType: ''
  };

  // for messages
  @ViewChild('chatScroll') private chatScroll: ElementRef | undefined; // for auto-scroll
  chatMessages: ChatMessage[] = [];
  newMessageText = '';
  typingTimeout: any;
  isUserTyping = false;
  otherUserTyping = false;
  currentUserId: string | undefined; // get from auth
  // for message end
  constructor(
    private customerService: CustomerService,
    private documentService: DocumentService,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private el: ElementRef,
    private chatService: ChatService,
    private projectService: ProjectService,
    private authService: AuthService,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    // The auth data might use '_id' or 'id' depending on which service saved it
    const user = this.authService.currentUserValue;
    this.currentUserId = (user?._id || (user as any)?.id)?.toString();

    console.log('Current User ID:', this.currentUserId);
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.fetchCustomerDetails(id);    
        this.fetchProjects(id); // Fetch projects when customer details are loaded
        this.initChat(id);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.customer?._id) {
      this.chatService.leaveRoom(this.customer._id);
    }
    this.chatService.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
    this.chatDestroy$.next();
    this.chatDestroy$.complete();
  }

  isImage(path: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(path);
  }

  isPdf(path: string): boolean {
    return /\.(pdf|txt)$/i.test(path);
  }

  isCsv(path: string): boolean {
    return path.toLowerCase().endsWith('.csv');
  }

  isExcel(path: string): boolean {
    return /\.(xls|xlsx)$/i.test(path);
  }

  isDocx(path: string): boolean {
    return path.toLowerCase().endsWith('.docx');
  }

  isOfficeFile(path: string): boolean {
    // Targeted formats for external viewer (PowerPoint and old Word)
    return /\.(doc|ppt|pptx)$/i.test(path);
  }

  fetchCustomerDetails(id: string): void {
    this.isLoading = true;
    this.customerService.getCustomerById(id).subscribe({
      next: (res: any) => {
        this.customer = res.data || res;
        this.fetchDocuments(id);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching customer details:', err);
        this.errorMessage = 'Failed to load document details. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  fetchDocuments(customerId: string): void {
    this.documentService.getDocumentsByCustomerId(customerId).subscribe({
      next: (res: any) => {
        this.documents = res.data || res || [];
        this.updateStats();
        // Do NOT automatically open a preview modal on load.
        // The preview will be triggered by user interaction (clicking the eye icon or row).
      },
      error: (err) => console.error('Error fetching documents:', err)
    });
  }

  fetchProjects(customerId: string): void {
    this.projectService.getProjectsByCustomerId(customerId).subscribe({
      next: (res: Project[]) => {
        this.projects = res;
      },
      error: (err:any) => console.error('Error fetching projects:', err)
    });
  }


  updateStats() {
    this.totalFiles = this.documents.length;
    this.reviewedFiles = this.documents.filter(d => d.status === 'reviewed').length;
    // Count files that are either 'submitted' or 'pending' as pending
    this.pendingFiles = this.documents.filter(d => ['submitted', 'pending'].includes(d.status)).length;
  }

  // This method now specifically opens the view modal
  setPreview(doc: any) {
    this.currentViewedDocument = doc;
    const path = doc.documentPath || doc.filePath;
    this.selectedStatus = doc.status; // Initialize with current document status
    if (path) {
      this.previewFileName = doc.docTitle || path;

      // Fix: Correctly normalize Windows backslashes to forward slashes
      const normalizedPath = path.replace(/\\/g, '/');
      let url = normalizedPath.startsWith('http') ? normalizedPath : `${API_BASE_URL}/${normalizedPath}`;

      // Clean up potential double slashes (e.g., http://host.com//path)
      url = url.replace(/([^:])\/\//g, '$1/');

      if (this.isDocx(path)) {
        this.isLocalDocxPreview = true;
        this.isRenderingLocal = true;
        this.filePreviewUrl = null;
        this.http.get(url, { responseType: 'blob' }).subscribe({
          next: (blob) => {
            setTimeout(() => {
              const container = document.getElementById('local-preview-container');
              if (container) {
                import('docx-preview')
                  .then(docx => docx.renderAsync(blob, container).then(() => {
                    this.isRenderingLocal = false;
                  }))
                  .catch((err: any) => {
                    console.error('Error loading docx-preview library:', err);
                    this.showToast('Failed to load DOCX previewer.', 'danger');
                    this.filePreviewUrl = null;
                    this.isRenderingLocal = false;
                  });
              } else {
                console.warn('docx-preview-container not found in DOM.');
                this.filePreviewUrl = null; // Indicate no preview
                this.isLocalDocxPreview = false;
                this.isRenderingLocal = false;
              }
            });
          },
          error: () => {
            this.isRenderingLocal = false;
            this.showToast('Failed to fetch document.', 'danger');
          }
        });
      } else if (this.isExcel(path)) {
        this.isLocalDocxPreview = true;
        this.isRenderingLocal = true;
        this.filePreviewUrl = null;
        this.http.get(url, { responseType: 'arraybuffer' }).subscribe({
          next: (buffer) => {
            import('xlsx').then(XLSX => {
              const workbook = XLSX.read(buffer, { type: 'array' });
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              const html = XLSX.utils.sheet_to_html(worksheet);
              const container = document.getElementById('local-preview-container');
              if (container) {
                container.innerHTML = `<div class="table-responsive">${html}</div>`;
                // Optional: Add bootstrap classes to the generated table
                container.querySelectorAll('table').forEach(t => t.classList.add('table', 'table-bordered', 'table-sm', 'small'));
              }
              this.isRenderingLocal = false;
            }).catch((err: any) => {
              console.error('Excel rendering error:', err);
              this.isRenderingLocal = false;
              this.showToast('Failed to parse Excel file.', 'danger');
            });
          },
          error: () => {
            this.isRenderingLocal = false;
            this.showToast('Failed to load Excel preview.', 'danger');
          }
        });
      } else if (this.isCsv(path)) {
        this.isLocalDocxPreview = true;
        this.isRenderingLocal = true;
        this.filePreviewUrl = null;
        this.http.get(url, { responseType: 'text' }).subscribe({
          next: (csvData) => {
            const lines = csvData.split('\n');
            let html = '<table class="table table-bordered table-sm small"><tbody>';
            lines.forEach(line => {
              html += '<tr>';
              line.split(',').forEach(cell => {
                html += `<td>${cell}</td>`;
              });
              html += '</tr>';
            });
            html += '</tbody></table>';
            const container = document.getElementById('local-preview-container');
            if (container) {
              container.innerHTML = `<div class="table-responsive">${html}</div>`;
            }
            this.isRenderingLocal = false;
          },
          error: () => {
            this.isRenderingLocal = false;
            this.showToast('Failed to load CSV preview.', 'danger');
          }
        });
      } else if (this.isOfficeFile(path)) {
        // Fallback to Microsoft Viewer for other office formats
        url = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
        this.filePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.isLocalDocxPreview = false;
      } else {
        this.filePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.isLocalDocxPreview = false;
      }
    } else {
      this.previewFileName = 'No preview available';
      this.filePreviewUrl = null;
    }
    this.isViewModalOpen = true;
  }

  openProjectModal() {
    this.isProjectModalOpen = true;
    this.projectForm = { projectName: '', dueDate: '', cost: '' };
  }

  closeProjectModal() {
    this.isProjectModalOpen = false;
  }

  openEditProjectModal(project: Project) {
    this.currentEditingProject = project;
    this.selectedProjectStatus = project.status || 'pending';
    if (project.dueDate) {
      try {
        // Format date string for <input type="date"> (YYYY-MM-DD)
        this.selectedProjectDueDate = new Date(project.dueDate).toISOString().split('T')[0];
      } catch (e) {
        this.selectedProjectDueDate = '';
      }
    } else {
      this.selectedProjectDueDate = '';
    }
    this.isEditProjectModalOpen = true;
  }

  openInvoiceDetail(project: Project): void {
    const customerId = this.customer?._id?.toString();
    const projectId = project?._id?.toString();

    if (!customerId || !projectId) {
      return;
    }

    this.router.navigate(['/features/invoice-detail', customerId, projectId]);
  }

  closeEditProjectModal() {
    this.isEditProjectModalOpen = false;
    this.currentEditingProject = null;
  }

  confirmUpdateProjectStatus() {
    if (!this.currentEditingProject?._id) return;
    this.projectService.updateProjectStatus(
      this.currentEditingProject._id, 
      this.selectedProjectStatus, 
      this.selectedProjectDueDate
    ).subscribe({
      next: () => {
        this.showToast('Project updated successfully', 'success');
        this.fetchProjects(this.customer._id);
        this.closeEditProjectModal();
      },
      error: (err) => {
        console.error(err);
        this.showToast('Failed to update project status', 'danger');
      }
    });
  }

  confirmAddProject(): void {
    if (!this.projectForm.projectName || !this.projectForm.dueDate || !this.customer?._id) {
      this.showToast('Please fill all project details.', 'danger');
      return;
    }

    const newProject: any = {
      projectName: this.projectForm.projectName,
      dueDate: this.projectForm.dueDate,
      customerId: this.customer._id.toString(),
      status: 'pending' // Default status
    };

    // include cost if provided
    if (this.projectForm.cost !== undefined && this.projectForm.cost !== '') {
      const parsed = Number(this.projectForm.cost);
      if (!isNaN(parsed)) newProject.cost = parsed;
      else newProject.cost = this.projectForm.cost; // fallback to raw value
    }

    this.projectService.createProject(newProject).subscribe({
      next: (project:any) => {
        this.showToast('Project added successfully', 'success');
        this.closeProjectModal();
        this.fetchProjects(this.customer._id.toString()); // Refresh project list
        
      },
      error: (err:any) => {
        console.error('Error adding project:', err);
        this.showToast('Failed to add project', 'danger');
      }
    });
  }

  closeViewModal() {
    this.isViewModalOpen = false;
    this.currentViewedDocument = null;
    this.filePreviewUrl = null;
    this.previewFileName = '';
    this.isLocalDocxPreview = false;
    this.isRenderingLocal = false;
  }

  downloadDocument(doc: any) {
    const path = doc.documentPath || doc.filePath;
    if (path) {
      const url = path.startsWith('http') ? path : `${API_BASE_URL}/${path.replace(/\\\\/g, '/')}`;
      window.open(url, '_blank');
    }
  }

  deleteDocument(doc: any) {
    this.documentToDelete = doc;
    this.isDeleteModalOpen = true;
  }

  cancelDelete() {
    this.isDeleteModalOpen = false;
    this.documentToDelete = null;
  }

  executeDelete() {
    if (!this.documentToDelete?._id) return;
    this.documentService.deleteDocument(this.documentToDelete._id).subscribe({
      next: () => {
        this.fetchDocuments(this.customer._id);
        this.showToast('Document deleted successfully', 'success');
        // If the deleted document was the one being previewed, close the modal
        // and clear the preview state.
        if (this.currentViewedDocument?._id === this.documentToDelete?._id) {
          this.isViewModalOpen = false;
          this.filePreviewUrl = null;
          this.previewFileName = '';
        }
        this.cancelDelete();
      },
      error: (err) => {
        console.error('Delete failed', err);
        this.showToast('Failed to delete document', 'danger');
        this.cancelDelete();
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/features/customer']);
  }

  openUploadModal() {
    this.isUploadModalOpen = true;
    this.uploadCancel$.next(); // Cancel any lingering uploads
    this.uploadProgress = 0;
    this.currentUploadedSize = '';
    this.totalFileSize = '';
    this.selectedFile = null;
    this.uploadForm = { docTitle: '', docDescription: '', status: 'submitted', fileType: '' };
  }

  closeUploadModal() {
    this.isUploadModalOpen = false;
    // We no longer cancel the upload here so it can continue in the background
  }

  cancelUpload() {
    this.uploadCancel$.next();
    this.isLoading = false;
    this.uploadProgress = 0;
    this.showToast('Upload cancelled', 'danger');
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;

      // Use MIME type (e.g., application/pdf, image/png) instead of extension
      this.uploadForm.fileType = file.type || 'application/octet-stream';

      // Optional: Auto-populate title with filename if title is currently empty
      if (!this.uploadForm.docTitle) {
        this.uploadForm.docTitle = file.name.split('.').slice(0, -1).join('.');
      }
    }
  }

  formatBytes(bytes: any, decimals = 2) {
    if (bytes === 0 || bytes === '0') return '0 Bytes';
    if (!bytes || bytes === 'N/A') return 'N/A';

    // If input is already a formatted string (e.g. "1.5 MB"), return it as is
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

  updateDocumentStatus() {
    if (!this.currentViewedDocument?._id || !this.selectedStatus) {
      this.showToast('No document or status selected for update.', 'danger');
      return;
    }

    const docId = this.currentViewedDocument._id;
    const newStatus = this.selectedStatus;

    this.documentService.updateDocumentStatus(docId, newStatus)
      .subscribe({
        next: () => {
          this.showToast('Document status updated successfully', 'success');
          const index = this.documents.findIndex(d => d._id === docId);
          if (index !== -1) {
            this.documents[index].status = newStatus;
            this.updateStats();
          }
          // Notify client in real time via socket
          this.chatService.emitDocumentStatusUpdate(
            this.customer._id,
            docId,
            newStatus,
            this.getCurrentUserName()
          );
          this.closeViewModal();
        },
        error: (err) => {
          console.error('Failed to update document status:', err);
          this.showToast('Failed to update document status', 'danger');
        }
      });
  }

  confirmUpload() {
    if (!this.selectedFile || !this.uploadForm.docTitle) return;

    // Best Practice: Client-side validation
    const MAX_SIZE = 1.5 * 1024 * 1024 * 1024; // 1.5GB limit
    if (this.selectedFile.size > MAX_SIZE) {
      this.showToast('File is too large. Max limit is 1.5GB.', 'danger');
      return;
    }

    this.isLoading = true;
    this.uploadProgress = 0;

    const user = this.authService.currentUserValue;
    const senderName = user ? `${user.firstName} ${user.lastName}`.trim() : '';

    const formData = new FormData();
    formData.append('customerId', this.customer._id);
    formData.append('docTitle', this.uploadForm.docTitle);
    formData.append('docDescription', this.uploadForm.docDescription);
    formData.append('status', this.uploadForm.status);
    formData.append('fileType', this.uploadForm.fileType);
    formData.append('fileSize', this.selectedFile.size.toString());
    formData.append('senderId', this.currentUserId || '');
    formData.append('senderName', senderName);
    formData.append('file', this.selectedFile);

    this.documentService.uploadDocument(formData)
      .pipe(
        takeUntil(this.uploadCancel$),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (event: any) => {
          if (event.type === HttpEventType.UploadProgress) {
            this.uploadProgress = Math.round((100 * event.loaded) / (event.total || 1));
            this.currentUploadedSize = this.formatBytes(event.loaded);
            this.totalFileSize = this.formatBytes(event.total || this.selectedFile?.size || 0);
          } else if (event.type === HttpEventType.Response) {
            this.closeUploadModal();
            this.fetchDocuments(this.customer._id);
            this.showToast('Document uploaded successfully', 'success');
            this.isLoading = false;
            // Notify via socket so admin overview updates in real time
            const uploaded = event.body?.data || event.body;
            if (uploaded) {
              this.chatService.emitNewDocumentUploaded(this.customer._id, uploaded);
            }
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.uploadProgress = 0;
          console.error('Upload failed', err);
          this.showToast('Failed to upload document', 'danger');
        }
      });
  }

  private showToast(message: string, variant: 'success' | 'danger'): void {
    this.toastMessage = message;
    this.toastVariant = variant;
    this.toastVisible = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastVisible = false, 3000);
  }

  private initChat(customerId: string) {
    this.chatDestroy$.next();

    const userId = this.currentUserId;
    if (!userId) return;

    this.chatService.connect(customerId, userId, this.getCurrentUserName());

    // Mark existing messages as read when admin opens chat
    this.chatService.markRead(customerId, userId);

    // History delivered by socket after joinDocumentRoom
    this.chatService.onMessageHistory()
      .pipe(takeUntil(this.chatDestroy$), takeUntil(this.destroy$))
      .subscribe(history => {
        this.ngZone.run(() => {
          this.chatMessages = history;
          this.scrollChatToBottom();
        });
      });

    // Live incoming messages
    this.chatService.onMessageReceived()
      .pipe(takeUntil(this.chatDestroy$), takeUntil(this.destroy$))
      .subscribe(msg => {
        this.ngZone.run(() => {
          // Skip if already present by _id (prevents duplicates)
          if (msg._id && this.chatMessages.some(m => m._id === msg._id)) return;

          const incomingSenderId = msg.senderId?.toString();
          if (incomingSenderId === this.currentUserId) {
            // Own message echoed back — replace the optimistic entry with the server copy
            const idx = this.chatMessages.findIndex(m => !m._id && m.messages === msg.messages);
            if (idx !== -1) {
              this.chatMessages = [
                ...this.chatMessages.slice(0, idx),
                msg,
                ...this.chatMessages.slice(idx + 1),
              ];
            }
          } else {
            this.chatMessages = [...this.chatMessages, msg];
            this.scrollChatToBottom();
          }
        });
      });

    // Typing indicator
    this.chatService.onUserTyping()
      .pipe(takeUntil(this.chatDestroy$), takeUntil(this.destroy$))
      .subscribe(({ senderId, isTyping }) => {
        if (senderId?.toString() !== this.currentUserId) {
          this.ngZone.run(() => {
            this.otherUserTyping = isTyping;
            if (isTyping) this.scrollChatToBottom();
          });
        }
      });

    // Real-time document status changes pushed by admin (own or other session)
    this.chatService.onDocumentStatusChanged()
      .pipe(takeUntil(this.chatDestroy$), takeUntil(this.destroy$))
      .subscribe((change: DocumentStatusChange) => {
        this.ngZone.run(() => {
          const index = this.documents.findIndex(d => d._id === change.documentId);
          if (index !== -1) {
            this.documents[index].status = change.status;
            this.updateStats();
          }
        });
      });

    // New document uploaded by client — refresh list
    this.chatService.onDocumentUploaded()
      .pipe(takeUntil(this.chatDestroy$), takeUntil(this.destroy$))
      .subscribe(() => {
        this.ngZone.run(() => this.fetchDocuments(customerId));
      });

    // New customer room opened while admin is connected
    this.chatService.onNewCustomerRoom()
      .pipe(takeUntil(this.chatDestroy$), takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log('[chat] new customer room opened:', data);
      });
  }

  sendMessage() {
    const text = this.newMessageText.trim();
    if (!text || !this.currentUserId || !this.customer?._id) return;

    const user = this.authService.currentUserValue;
    const senderName = user ? `${user.firstName} ${user.lastName}`.trim() : '';

    const optimistic: ChatMessage = {
      customerId: this.customer._id.toString(),
      senderId: this.currentUserId,
      senderName,
      messages: text,
      isRead: false,
      createdAt: new Date(),
    };

    this.newMessageText = '';
    this.chatMessages = [...this.chatMessages, optimistic];
    this.scrollChatToBottom();
    this.stopTyping();

    // Send via socket — backend persists + broadcasts receiveMessage to entire room
    this.chatService.sendMessage(this.customer._id.toString(), text);
  }

  onTyping() {
    if (!this.isUserTyping) {
      this.isUserTyping = true;
      this.chatService.sendTyping(this.customer._id, true);
    }
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => this.stopTyping(), 1000);
  }

  private stopTyping() {
    if (this.isUserTyping) {
      this.isUserTyping = false;
      this.chatService.sendTyping(this.customer._id, false);
    }
  }

  private scrollChatToBottom() {
    setTimeout(() => {
      if (this.chatScroll) {
        this.chatScroll.nativeElement.scrollTop = this.chatScroll.nativeElement.scrollHeight;
      }
    }, 100);
  }

  getCurrentUserName(): string {
    const user = this.authService.currentUserValue;
    return user ? `${user.firstName} ${user.lastName}`.trim() : '';
  }

  getInitials(name: string | null | undefined): string {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  getProjectProgress(status: string | undefined): number {
    switch (status) {
      case 'pending':
        return 25;
      case 'in-progress':
        return 75;
      case 'completed':
      case 'overdue': // Overdue can also be considered 100% "progress" towards its due date
        return 100;
      default:
        return 0;
    }
  }

  getProgressBarClass(status: string | undefined): string {
    switch (status) {
      case 'completed': return 'bg-success';
      case 'overdue': return 'bg-danger';
      case 'in-progress': return 'bg-info';
      default: return 'bg-primary'; // pending or unknown
    }
  }

  /**
   * Converts a raw MIME type or extension into a human-readable label.
   */
  getFileTypeLabel(mimeType: string | null | undefined): string {
    if (!mimeType) return 'File';

    const mapping: Record<string, string> = {
      'application/pdf': 'PDF',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
      'application/msword': 'Word',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
      'application/vnd.ms-excel': 'Excel',
      'text/csv': 'CSV',
      'image/jpeg': 'JPEG',
      'image/png': 'PNG',
      'image/webp': 'WEBP',
      'image/gif': 'GIF',
      'text/plain': 'TXT',
      'application/octet-stream': 'Binary'
    };

    if (mapping[mimeType]) return mapping[mimeType];

    // Fallback: return the subtype in uppercase (e.g., image/tiff -> TIFF)
    return mimeType.includes('/') ? mimeType.split('/')[1].toUpperCase() : mimeType.toUpperCase();
  }
}
