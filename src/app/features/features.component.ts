import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AccountStateService } from '../core/services/account-state.service';

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './features.component.html',
  styleUrl: './features.component.scss'
})
export class FeaturesComponent {
  // Sidebar starts open on desktop, closed on mobile via CSS
  isSidebarCollapsed = true;
  accountData: any = null;
  isLoggingOut = false;

  constructor(
    private accountStateService: AccountStateService,
    private router: Router
  ) { }
  ngOnInit(): void {
    this.accountData = this.accountStateService.getStoredAccountData();

  }
  get isAdmin(): boolean {
    return this.accountData?.role?.toLowerCase() === 'admin';
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  logout() {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;
    this.accountStateService.clearAccountData();
    this.router.navigate(['/auth/login']);
  }
}
