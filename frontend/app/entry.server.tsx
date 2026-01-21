import { PassThrough } from 'stream'
import type { EntryContext } from '@remix-run/node'
import { Response } from '@remix-run/node'
import { RemixServer } from '@remix-run/react'
import { renderToPipeableStream } from 'react-dom/server'
import createEmotionCache from './createEmotionCache'
import { ServerStyleContext } from './context'
import { CacheProvider } from '@emotion/react'

const ABORT_DELAY = 5000

export default function handleRequest(
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    remixContext: EntryContext,
) {
    return new Promise((resolve, reject) => {
        let shellRendered = false
        const cache = createEmotionCache()

        const { pipe, abort } = renderToPipeableStream(
            <ServerStyleContext.Provider value={null}>
                <CacheProvider value={cache}>
                    <RemixServer
                        context={remixContext}
                        url={request.url}
                        abortDelay={ABORT_DELAY}
                    />
                </CacheProvider>
            </ServerStyleContext.Provider>,
            {
                onShellReady() {
                    shellRendered = true
                    const body = new PassThrough()

                    responseHeaders.set('Content-Type', 'text/html')

                    resolve(
                        new Response(body as any, {
                            headers: responseHeaders,
                            status: responseStatusCode,
                        }),
                    )

                    pipe(body)
                },
                onShellError(error: unknown) {
                    reject(error)
                },
                onError(error: unknown) {
                    responseStatusCode = 500
                    // Log streaming rendering errors from inside the shell
                    if (shellRendered) {
                        console.error(error)
                    }
                },
            },
        )

        setTimeout(abort, ABORT_DELAY)
    })
}