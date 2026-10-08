export const getSessionToken = () => localStorage.getItem('sessionToken');

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const apiPost = async <T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> => {
  const sessionToken = getSessionToken();
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });

  const data = await response.json().catch(() => null) as T & { error?: string } | null;
  if (!response.ok) {
    throw new ApiError(data?.error || 'Request failed', response.status);
  }

  return data as T;
};
