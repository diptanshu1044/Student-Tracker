export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export function ok<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null
  };
}

export function fail(message: string): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error: message
  };
}
