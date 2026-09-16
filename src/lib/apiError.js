// Normalizes any thrown SDK/network error into a safe, displayable shape.
// Never contains secret values; only the server's error code, its
// human-readable message, and the request id.
export function extractApiError(err) {
  const data = err && err.response && err.response.data ? err.response.data : err && err.data ? err.data : null;
  const apiError = data && data.error ? data.error : null;
  if (apiError && apiError.code) {
    return {
      code: apiError.code,
      message: apiError.message || "",
      request_id: apiError.request_id || null
    };
  }
  return {
    code: "NETWORK",
    message: (err && err.message) || "",
    request_id: null
  };
}