export type ApiMeta = {
  page?: number;
  pageSize?: number;
  total?: number;
  [key: string]: unknown;
};

export type ApiErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiEnvelope<T> = {
  data: T | null;
  meta: ApiMeta | null;
  error: ApiErrorPayload | null;
};

export function success<T>(
  data: T,
  meta: ApiMeta | null = null,
): ApiEnvelope<T> {
  return {
    data,
    meta,
    error: null,
  };
}

export function failure(
  code: string,
  message: string,
  details?: unknown,
): ApiEnvelope<null> {
  return {
    data: null,
    meta: null,
    error: {
      code,
      message,
      details,
    },
  };
}
