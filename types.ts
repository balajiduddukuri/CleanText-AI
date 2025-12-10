export interface ConversionStats {
  originalChars: number;
  cleanedChars: number;
  reductionPercent: number;
}

export enum ViewMode {
  Split = 'SPLIT',
  Edit = 'EDIT',
  PreviewText = 'PREVIEW_TEXT',
  PreviewHtml = 'PREVIEW_HTML'
}

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export type Theme = 'midnight' | 'light' | 'ocean' | 'forest' | 'coffee' | 'whiteboard';