declare module 'docx-preview' {
    export function renderAsync(data: any, bodyContainer: HTMLElement, styleContainer?: HTMLElement, options?: any): Promise<any>;
}