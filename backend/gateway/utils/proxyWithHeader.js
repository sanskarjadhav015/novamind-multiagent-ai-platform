import proxy from "express-http-proxy";

/**
 * ============================================================================
 * PROXY WITH HEADER UTILITY (`proxyWithHeader`)
 * ============================================================================
 * Purpose:
 * - Wraps express-http-proxy to proxy requests to internal microservices.
 * - Injects the authenticated user's ID (`x-user-id`) into the outbound HTTP
 *   request headers so internal services know the caller identity without
 *   needing to re-verify cookies or query Redis sessions.
 * ============================================================================
 * @param {string} serviceUrl - Downstream service target URL (e.g. process.env.CHAT_SERVICE)
 */
export const proxyWithHeader = (serviceUrl) => {
    return proxy(serviceUrl, {
        limit: "50mb",
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            if (srcReq.user) {
                proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
            }
            return proxyReqOpts;
        }
    });
};
