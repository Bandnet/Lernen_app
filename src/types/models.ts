/** Core domain models. Kept free of any storage details. */

export interface Subject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  /** 0–100, filled in by the progress system (Phase 4). */
  progress?: number;
  createdAt: number;
  updatedAt: number;
}

export interface TopicInput {
  subjectId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

export type SummaryType = 'pdf' | 'html';

/** An extra file (image, stylesheet, font) that an HTML summary refers to. */
export interface SummaryAsset {
  /** File name or relative path as referenced by the HTML. */
  path: string;
  mimeType: string;
  data: Blob;
}

/** One summary per topic. `topicId` doubles as the storage key. */
export interface Summary {
  topicId: string;
  type: SummaryType;
  fileName: string;
  /** The PDF file, or the HTML document (UTF-8). */
  data: Blob;
  /** Only used for HTML. */
  assets: SummaryAsset[];
  createdAt: number;
  updatedAt: number;
}
