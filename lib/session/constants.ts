/** Cookie names shared by the client- and server-side session helpers. */
export const ACCESS_TOKEN_COOKIE = "ne_at";
export const REFRESH_TOKEN_COOKIE = "ne_rt";

/** Plain cookie attributes, not httpOnly -- the browser needs to read these to call needleye-api directly. */
export const COOKIE_MAX_AGE_ACCESS = 60 * 60 * 24; // 1 day safety net; real expiry is read from the JWT itself
export const COOKIE_MAX_AGE_REFRESH = 60 * 60 * 24 * 30; // 30 days
