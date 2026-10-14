const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type ApiErrorResponse = {
  message?: string;
};

export function getApiUrl(path: string): string {
  return `${API_URL}${path}`;
}

export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Please log in to continue.");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function getErrorMessage(response: Response): Promise<string> {
  const data = (await response
    .json()
    .catch(() => null)) as ApiErrorResponse | null;

  return data?.message || "Something went wrong. Please try again.";
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(getApiUrl(path), options);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json() as Promise<T>;
}
