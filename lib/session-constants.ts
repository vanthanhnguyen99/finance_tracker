export const SESSION_COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Host-session" : "session";
export const SESSION_COOKIE_SECURE = process.env.NODE_ENV === "production";
