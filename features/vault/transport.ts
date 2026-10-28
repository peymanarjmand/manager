// Read encrypted files as a complete byte range. This also avoids native
// download interception of an ordinary binary response in some browsers.
// Authorization and Storage RLS are identical; callers verify size + checksum.
export const fetchVaultData: typeof fetch = (input, options) => {
  const request =
    typeof Request !== "undefined" && input instanceof Request ? input : null;
  const url = request ? request.url : String(input),
    method = (options?.method || request?.method || "GET").toUpperCase();
  const headers = new Headers(options?.headers ?? request?.headers);
  if (
    method === "GET" &&
    /\/storage\/v1\/object\/(?:lm-vault|lm-images)\//.test(url) &&
    !headers.has("Range")
  )
    headers.set("Range", "bytes=0-");
  return fetch(input, { ...options, headers, cache: "no-store" });
};
