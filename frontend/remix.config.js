/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
    ignoredRouteFiles: ['**/.*'],
    serverDependenciesToBundle: ['axios'],
    // appDirectory: "app",
    // assetsBuildDirectory: "public/build",
    // serverBuildPath: "build/index.js",
    // publicPath: "/build/",
    future: {
        v2_errorBoundary: false,
        v2_meta: false,
        v2_normalizeFormMethod: false,
        v2_headers: false,
        v2_routeConvention: false,
    },
}
