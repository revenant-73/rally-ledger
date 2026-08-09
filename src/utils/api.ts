export const getSessionToken = () => localStorage.getItem('sessionToken');

export const apiPost = async <T>(path: string, body: unknown): Promise<T> => {
  const sessionToken = getSessionToken();
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null) as T & { error?: string } | null;
  if (!response.ok) {
    throw new Error(data?.error || 'Request failed');
  }

  return data as T;
};
