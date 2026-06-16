import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Locale routing only. Auth is enforced server-side in protected layouts,
// because the credentials provider (argon2) requires the Node.js runtime,
// which is not available in edge middleware.
export default createMiddleware(routing);

export const config = {
  // Match all paths except API, Next internals and static files.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
