import { getApiBaseUrl } from "@/lib/auth";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

interface RequestOptions extends RequestInit {
  token?: string | null;
}

const REQUEST_TIMEOUT_MS = 15000;

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  const requestUrl = `${getApiBaseUrl()}${path}`;
  const isSafeMethod = (rest.method ?? "GET").toUpperCase() === "GET";
  const maxAttempts = isSafeMethod ? 3 : 1;

  let lastError: ApiError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;

    try {
      response = await fetch(requestUrl, {
        ...rest,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        cache: rest.cache ?? "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof Error && error.name === "AbortError") {
        lastError = new ApiError("The server took too long to respond. Please try again in a few seconds.", 408);
      } else {
        lastError = new ApiError("Unable to reach API server", 0);
      }

      if (attempt < maxAttempts) {
        await delay(attempt * 1000);
        continue;
      }

      throw lastError;
    }

    clearTimeout(timeout);

    if (response.ok) {
      return response.json() as Promise<T>;
    }

    let detail = response.statusText;
    try {
      const payload = (await response.json()) as { detail?: string };
      detail = payload.detail || detail;
    } catch {
      // Ignore JSON parsing failure for non-JSON errors.
    }

    lastError = new ApiError(detail, response.status);

    if (attempt < maxAttempts && shouldRetry(response.status)) {
      await delay(attempt * 1000);
      continue;
    }

    throw lastError;
  }

  throw lastError ?? new ApiError("Unknown API error", 0);
}

function shouldRetry(status: number) {
  return status === 0 || status === 408 || status === 425 || status === 429 || status === 502 || status === 503 || status === 504;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
