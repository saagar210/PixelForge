export interface ImageInfo {
  width: number;
  height: number;
  format: string;
  fileSizeBytes: number;
  fileName: string;
  filePath: string;
  needsConversion: boolean;
}

export interface AppError {
  kind: string;
  message: string;
}
