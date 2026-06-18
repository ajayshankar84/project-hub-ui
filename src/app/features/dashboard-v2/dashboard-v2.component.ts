import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountStateService } from '../../core/services/account-state.service';

@Component({
  selector: 'app-dashboard-v2',
  templateUrl: './dashboard-v2.component.html',
  styleUrls: ['./dashboard-v2.component.scss'],
})
export class DashboardV2Component {
  accountData: any = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private accountStateService: AccountStateService
  ) {}

  ngOnInit(): void {
    this.accountData = this.accountStateService.getStoredAccountData();
  }

  openCourseDetail(courseId: string): void {
    this.router.navigate(['course-detail'], {
      relativeTo: this.route,
      queryParams: { course: courseId },
    });
  }
}
