import type { User } from './types'
import type {
    DataFunctionArgs,
    LinksFunction,
    MetaFunction,
} from '@remix-run/node'
import { json } from '@remix-run/node'
import {
    Links,
    LiveReload,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
    useCatch,
    useLoaderData,
} from '@remix-run/react'
import styles from './styles/app.css'
import { ServerStyleContext, ClientStyleContext } from './context'
import { useContext, useEffect, useState } from 'react'
import { withEmotionCache } from '@emotion/react'
import { baseTheme, ChakraProvider, extendTheme } from '@chakra-ui/react'
import AuthProvider from './context/AuthProvider'
import { getUser } from './utils/session.server'
import ShopProvider from './context/ShopProvider'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ReactQueryDevtools } from 'react-query/devtools'
import TopProgressBarProvider from './context/TopProgressBarProvider'
import ThemeProvider from './context/ThemeContext'

export const links: LinksFunction = () => {
    return [{ rel: 'stylesheet', href: styles }]
}

export const meta: MetaFunction = () => ({
    // Remove charset, title, and viewport from here
    // They'll be set manually in Document
})

export const loader = async ({ request }: DataFunctionArgs) => {
    const res = await getUser(request)
    const user: User = res?.data
    const data = {
        user: user ? user : {},
    }
    return json({
        user: data.user,
        ENV: {
            API_BASE_URL: process.env.API_BASE_URL,
        },
    })
}

interface DocumentProps {
    children: React.ReactNode
    title?: string
    ENV?: Object
}

const Document = withEmotionCache(
    (
        {
            children,
            title = 'shoroksheba',
            ENV,
        }: DocumentProps,
        emotionCache,
    ) => {
        const serverStyleData = useContext(ServerStyleContext)
        const clientStyleData = useContext(ClientStyleContext)

        // Only executed on client
        useEffect(() => {
            // re-link sheet container
            emotionCache.sheet.container = document.head
            // re-inject tags
            const tags = emotionCache.sheet.tags
            emotionCache.sheet.flush()
            tags.forEach((tag: any) => {
                ;(emotionCache.sheet as any)._insertTag(tag)
            })
            // reset cache to reapply global styles
            clientStyleData?.reset()
        }, [])

        return (
            <html lang="en">
                <head>
                    <meta charSet="utf-8" />
                    <meta name="viewport" content="width=device-width,initial-scale=1" />
                    <title>{title}</title>
                    <Meta />
                    <Links />
                    {serverStyleData?.map(({ key, ids, css }) => (
                        <style
                            key={key}
                            data-emotion={`${key} ${ids.join(' ')}`}
                            dangerouslySetInnerHTML={{ __html: css }}
                        />
                    ))}
                </head>
                <body>
                    {children}
                    <ScrollRestoration />
                    <script
                        dangerouslySetInnerHTML={{
                            __html: `window.ENV = ${JSON.stringify(ENV)}`,
                        }}
                    />
                    <Scripts />
                    <LiveReload />
                </body>
            </html>
        )
    },
)

const theme = extendTheme({
    fonts: {
        heading: `'Open Sans', sans-serif`,
        body: `'Raleway', sans-serif`,
    },
    colors: {
        primary: baseTheme.colors.purple,
    },
})

export default function App() {
    const { user, ENV } = useLoaderData<typeof loader>()

    // Create QueryClient inside component to avoid SSR/client mismatch
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        refetchOnWindowFocus: false,
                    },
                },
            })
    )

    return (
        <Document ENV={ENV}>
            <TopProgressBarProvider>
                <ThemeProvider>
                    <AuthProvider user={user}>
                        <QueryClientProvider client={queryClient}>
                            <ReactQueryDevtools initialIsOpen={false} />
                            <ShopProvider>
                                <ChakraProvider theme={theme}>
                                    <Outlet />
                                </ChakraProvider>
                            </ShopProvider>
                        </QueryClientProvider>
                    </AuthProvider>
                </ThemeProvider>
            </TopProgressBarProvider>
        </Document>
    )
}

export function CatchBoundary() {
    const caught = useCatch()

    return (
        <Document title={`${caught.status} ${caught.statusText}`}>
            <div className="error-container">
                <h1>
                    {caught.status} {caught.statusText}
                </h1>
            </div>
        </Document>
    )
}

export function ErrorBoundary({ error }: { error: Error }) {
    return (
        <Document title="Uh-oh!">
            <div className="error-container">
                <h1>App Error</h1>
                <pre>{error.message}</pre>
            </div>
        </Document>
    )
}