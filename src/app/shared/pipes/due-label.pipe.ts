import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dueLabel',
  standalone: true,
})
export class DueLabelPipe implements PipeTransform {
  transform(dueDate: string | Date | null | undefined): string {
    if (!dueDate) return 'No date';
    const due = new Date(dueDate as any);
    if (isNaN(due.getTime())) return 'Invalid date';

    const today = new Date();
    const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const utcDue = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
    const diffDays = Math.floor((utcDue - utcToday) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 0) return `Overdue ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const formatted = due.toLocaleDateString(undefined, options);
    return `${formatted} (in ${diffDays} day${diffDays !== 1 ? 's' : ''})`;
  }
}
