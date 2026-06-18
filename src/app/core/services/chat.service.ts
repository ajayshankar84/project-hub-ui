import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { API_BASE_URL, MESSAGE_ENDPOINT } from '../config/api.config';
import { HttpClient } from '@angular/common/http';

export interface ChatMessage {
  _id?: string;
  customerId: string;
  senderId: string;
  senderName?: string;
  messages: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface DocumentStatusChange {
  documentId: string;
  status: string;
  updatedBy: string;
  updatedAt: Date;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private socket!: Socket;

  constructor(private http: HttpClient) { }

  // ─── Connection ───────────────────────────────────────────────

  connect(customerId: string, userId: string, userName: string) {
    this.disconnect();
    const token = localStorage.getItem('session-token') ?? '';
    this.socket = io(API_BASE_URL, {
      path: '/chat',
      transports: ['websocket', 'polling'],
      reconnection: true,
      auth: { token },
    });

    // Connection events
    this.socket.on('connect',             ()  => console.log('[socket] connected:', this.socket.id));
    this.socket.on('disconnect',          (r) => console.log('[socket] disconnected:', r));
    this.socket.on('connect_error',       (e) => console.error('[socket] error:', e.message));

    // Emit joinDocumentRoom only after connection is confirmed
    this.socket.on('connect', () => {
      this.socket.emit('joinDocumentRoom', { customerId, userId, userName });
    });

    // All server → client events with console logs
    this.socket.on('roomJoined',          (d) => console.log('[socket] roomJoined:', d));
    this.socket.on('messageHistory',      (d) => console.log('[socket] messageHistory:', d));
    this.socket.on('receiveMessage',      (d) => console.log('[socket] receiveMessage:', d));
    this.socket.on('userTyping',          (d) => console.log('[socket] userTyping:', d));
    this.socket.on('messagesRead',        (d) => console.log('[socket] messagesRead:', d));
    this.socket.on('newCustomerRoom',     (d) => console.log('[socket] newCustomerRoom:', d));
    this.socket.on('documentStatusChanged', (d) => console.log('[socket] documentStatusChanged:', d));
    this.socket.on('documentUploaded',    (d) => console.log('[socket] documentUploaded:', d));
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }
  }

  // ─── Emitters ─────────────────────────────────────────────────

  sendMessage(customerId: string, message: string) {
    this.socket.emit('sendMessage', { customerId, message });
  }

  sendTyping(customerId: string, isTyping: boolean) {
    this.socket.emit('typing', { customerId, isTyping });
  }

  markRead(customerId: string, readerId: string) {
    this.socket.emit('markRead', { customerId, readerId });
  }

  leaveRoom(customerId: string) {
    this.socket.emit('leaveRoom', { customerId });
  }

  emitDocumentStatusUpdate(customerId: string, documentId: string, status: string, updatedBy: string) {
    this.socket.emit('documentStatusUpdate', { customerId, documentId, status, updatedBy });
  }

  emitNewDocumentUploaded(customerId: string, document: any) {
    this.socket.emit('newDocumentUploaded', { customerId, document });
  }

  // ─── HTTP fallbacks ───────────────────────────────────────────

  getMessageHistory(customerId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${MESSAGE_ENDPOINT}/history/${customerId}`);
  }

  postMessage(message: ChatMessage): Observable<any> {
    return this.http.post(MESSAGE_ENDPOINT, message);
  }

  // ─── Listeners ────────────────────────────────────────────────

  onMessageReceived(): Observable<ChatMessage> {
    return new Observable(observer => {
      if (!this.socket) return;
      const handler = (msg: ChatMessage) => observer.next(msg);
      this.socket.on('receiveMessage', handler);
      return () => this.socket.off('receiveMessage', handler);
    });
  }

  onMessageHistory(): Observable<ChatMessage[]> {
    return new Observable(observer => {
      if (!this.socket) return;
      const handler = (history: ChatMessage[]) => observer.next(history);
      this.socket.on('messageHistory', handler);
      return () => this.socket.off('messageHistory', handler);
    });
  }

  onUserTyping(): Observable<{ senderId: string; senderName: string; isTyping: boolean }> {
    return new Observable(observer => {
      if (!this.socket) return;
      const handler = (data: any) => observer.next(data);
      this.socket.on('userTyping', handler);
      return () => this.socket.off('userTyping', handler);
    });
  }

  onDocumentStatusChanged(): Observable<DocumentStatusChange> {
    return new Observable(observer => {
      if (!this.socket) return;
      const handler = (data: DocumentStatusChange) => observer.next(data);
      this.socket.on('documentStatusChanged', handler);
      return () => this.socket.off('documentStatusChanged', handler);
    });
  }

  onDocumentUploaded(): Observable<any> {
    return new Observable(observer => {
      if (!this.socket) return;
      const handler = (doc: any) => observer.next(doc);
      this.socket.on('documentUploaded', handler);
      return () => this.socket.off('documentUploaded', handler);
    });
  }

  onMessagesRead(): Observable<{ customerId: string; readerId: string; readAt: Date }> {
    return new Observable(observer => {
      if (!this.socket) return;
      const handler = (data: any) => observer.next(data);
      this.socket.on('messagesRead', handler);
      return () => this.socket.off('messagesRead', handler);
    });
  }

  onRoomJoined(): Observable<{ customerId: string }> {
    return new Observable(observer => {
      if (!this.socket) return;
      const handler = (data: any) => observer.next(data);
      this.socket.on('roomJoined', handler);
      return () => this.socket.off('roomJoined', handler);
    });
  }

  onNewCustomerRoom(): Observable<{ customerId: string; userId: string; userName: string }> {
    return new Observable(observer => {
      if (!this.socket) return;
      const handler = (data: any) => observer.next(data);
      this.socket.on('newCustomerRoom', handler);
      return () => this.socket.off('newCustomerRoom', handler);
    });
  }
}
