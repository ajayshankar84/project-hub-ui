import { Pipe, PipeTransform } from '@angular/core';
import { API_BASE_URL } from '../../core/config/api.config';

@Pipe({
  name: 'imagePath',
  standalone: true
})
export class ImagePathPipe implements PipeTransform {
  transform(value: string | undefined, defaultImage: string = API_BASE_URL+'/upload/bg.png'): string {
    if (!value) {
      return defaultImage;
    }
    // If it's already a full URL or a data URL (base64), return it as is
    if (value.startsWith('http') || value.startsWith('data:')) {
      return value;
    }
    return `${API_BASE_URL}/${value}`;
  }
}