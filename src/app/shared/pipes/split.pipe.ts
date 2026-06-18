import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'split',
  standalone: true
})
export class SplitPipe implements PipeTransform {
  transform(value: string | undefined | null, separator: string = ','): string[] {
    if (!value || typeof value !== 'string') {
      return [];
    }
    return value.split(separator)
      .map(s => s.trim())
      .filter(s => s !== '')
      .map(s => s.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()));
  }
}