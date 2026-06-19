import { Component, OnInit } from '@angular/core';
import { AccountStateService } from '../../core/services/account-state.service';
import { ProjectService } from '../../core/services/project.service';
import { CustomerService } from '../../core/services/customer.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard-v2',
  templateUrl: './dashboard-v2.component.html',
  styleUrls: ['./dashboard-v2.component.scss'],
})
export class DashboardV2Component implements OnInit {
  accountData: any = null;
  userName = 'Admin';
  totalProjects = 0;
  totalCustomers = 0;
  projectsInProgress = 0;
  projectsCompleted = 0;
  totalEarnings = 0;
  // recentActivity items may include the raw payload returned from /project-date
recentActivity:any[]=[];

  upcomingDeadlines = [
    { title: 'Marketing deck review', deadline: 'Today', status: 'High' },
    { title: 'Q2 financial report', deadline: 'Tomorrow', status: 'Medium' },
    { title: 'Client feedback call', deadline: 'Fri, 4 Jun', status: 'Low' },
  ];

  projects = [
    { name: 'Website relaunch', status: 'In progress', team: 'Design', due: 'Jun 19' },
    { name: 'CRM integration', status: 'Pending review', team: 'Operations', due: 'Jun 22' },
    { name: 'Consulting proposal', status: 'Complete', team: 'Strategy', due: 'Jun 14' },
    { name: 'Content campaign', status: 'Planning', team: 'Marketing', due: 'Jun 29' },
  ];

  topClients = [
    { name: 'Acme Industries', projects: 6, revenue: '$28.7k' },
    { name: 'Pinnacle Labs', projects: 4, revenue: '$17.5k' },
    { name: 'Greenfield Capital', projects: 3, revenue: '$12.2k' },
  ];

  constructor(
    private accountStateService: AccountStateService,
    private projectService: ProjectService,
    private customerService: CustomerService
  ) {}

  ngOnInit(): void {
    this.accountData = this.accountStateService.getStoredAccountData();
    this.userName =
      this.accountData?.fullName || this.accountData?.name || this.accountData?.username || 'Admin';

    // Load totals and upcoming deadlines from /project
    this.projectService.getAllProjects().subscribe(
      (projects) => {
        const list = projects || [];
        this.totalProjects = list.length;
        const lower = (s?: string) => (s || '').toLowerCase();
        this.projectsInProgress = list.filter(p => {
          const st = lower(p.status);
          return st.includes('progress') || st.includes('in progress') || st.includes('in-progress');
        }).length;
        this.projectsCompleted = list.filter(p => {
          const st = lower(p.status);
          return st.includes('complete') || st.includes('completed');
        }).length;

        // Sum up `cost` from projects (cost may be number or string)
        this.totalEarnings = list.reduce((sum, p) => {
          const raw = (p as any).cost;
          const n = typeof raw === 'string' ? parseFloat(raw.replace(/[^0-9.-]+/g, '')) : Number(raw);
          return sum + (isFinite(n) ? n : 0);
        }, 0);

        // Populate upcomingDeadlines from projects that have a dueDate, sorted ascending
        const dueProjects = list.filter(p => p && p.dueDate).slice();
        dueProjects.sort((a, b) => (new Date(String(a.dueDate)).getTime() || 0) - (new Date(String(b.dueDate)).getTime() || 0));
        this.upcomingDeadlines = dueProjects.map(p => ({
          title: p.projectName || (p as any).name || 'Untitled project',
          deadline: new Date(String(p.dueDate)).toLocaleDateString(),
          status: (p as any).status || 'Pending'
        }));
      },
      (err) => {
        console.error('Failed to load projects for dashboard totals', err);
      }
    );

    // Load customers
    this.customerService.getAllCustomer().subscribe(
      (customers) => {
        this.totalCustomers = Array.isArray(customers) ? customers.length : 0;
      },
      (err) => {
        console.error('Failed to load customers for dashboard totals', err);
      }
    );

    // Load active projects and recent activity from project-date endpoint
    this.projectService.getProjectDates().subscribe(
      (items) => {
        if (!items || !Array.isArray(items)) {
          return;
        }

        // Map to projects shown in Active projects table
        this.projects = items.map((it: any) => {
          const name = it.projectName || it.name || it.title || (it.project && (it.project.projectName || it.project.name)) || 'Untitled';
          const status = it.status || it.state || (it.project && it.project.status) || 'Unknown';
          const team = it.team || it.assignedTeam || it.owner || (it.project && it.project.team) || '-';
          const due = it.dueDate || it.date || it.deadline || it.projectDate || (it.project && it.project.dueDate) || '';
          return { name, status, team, due };
        });

        // Build recentActivity with raw payloads (keep latest 8 by date if available)
        const withDate = items.map((it: any) => {
          const dateStr = it.date || it.dueDate || it.projectDate || it.deadline || (it.project && it.project.dueDate) || null;
          const time = dateStr ? new Date(dateStr).toISOString() : (it.time || '');
          const title = it.activityTitle || it.title || it.projectName || it.name || 'Project update';
          const subtitle = it.subtitle || it.note || (it.project && it.project.projectName) || '';
          const sortKey = dateStr ? new Date(dateStr).getTime() : 0;
          const projectId = it.projectId || it.project_id || it.project?._id || it.project?.id || it.project?.projectId || it.project?.project_id || it._id || it.id || null;
          return { title, subtitle, time, sortKey, raw: it, projectId };
        });

        withDate.sort((a, b) => (b.sortKey || 0) - (a.sortKey || 0));
        const top = withDate.slice(0, 8);

        // Collect unique projectIds to resolve names
        const ids = Array.from(new Set(top.map(t => t.projectId).filter(Boolean)));
        if (ids.length === 0) {
          this.recentActivity = top.map(({ title, subtitle, time, raw }) => ({
            title,
            subtitle,
            time,
            raw,
            projectName: raw?.projectName || raw?.name || raw?.title || title,
            status: raw?.status || raw?.state || (raw?.project && raw.project.status) || '',
            updatedAt: raw?.updatedAt || raw?.updated_at || raw?.modifiedAt || raw?.updated || ''
          }));
          return;
        }

        const calls = ids.map(id => this.projectService.getProjectById(String(id)));
        forkJoin(calls).subscribe(
          (projects) => {
            const map = new Map<string, any>();
            projects.forEach(p => { if (p && (p as any)._id) map.set((p as any)._id, p); });

            this.recentActivity = top.map(({ title, subtitle, time, raw, projectId }) => {
              const resolved = projectId ? map.get(String(projectId)) : null;
              const projectName = resolved ? (resolved.projectName || (resolved as any).projectName || (resolved as any).name) : (raw?.projectName || raw?.name || raw?.title || title);
              const status = raw?.status || raw?.state || (raw?.project && raw.project.status) || (resolved && (resolved.status || (resolved as any).state)) || '';
              const updatedAtRaw = raw?.updatedAt || raw?.updated_at || raw?.modifiedAt || raw?.updated || raw?.updatedOn || resolved?.updatedAt || resolved?.updated_at || resolved?.modifiedAt || null;
              const updatedAt = updatedAtRaw ? new Date(updatedAtRaw).toLocaleString() : (raw?.time || '');
              return { title, subtitle, time, raw, projectName, status, updatedAt };
            });
          },
          (err) => {
            console.error('Failed to resolve project names for recentActivity', err);
            this.recentActivity = top.map(({ title, subtitle, time, raw }) => ({
              title,
              subtitle,
              time,
              raw,
              projectName: raw?.projectName || raw?.name || raw?.title || title,
              status: raw?.status || raw?.state || (raw?.project && raw.project.status) || '',
              updatedAt: raw?.updatedAt || raw?.updated_at || raw?.modifiedAt || raw?.updated || ''
            }));
          }
        );
      },
      (err) => {
        console.error('Failed to load project-date entries for active projects', err);
      }
    );
  }
}
