import UiLayoutWrapper from './lib/UiLayoutWrapper';
import WagmiWrapper from './lib/WagmiWrapper';
import ErrorBoundary from './lib/ErrorBoundary';
import Script from 'next/script';

import './globals.css';
import { siteConfig } from './constants';

export default function RootLayout({ children }) {
    return (
        <html>
            {/* <Script async src="https://saturn.tech/widget.js" /> */}
            <head>
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <title>
                    {siteConfig.title}
                </title>
                <meta
                    name="description"
                    content={siteConfig.description}
                />
            </head>
            <body>
                <ErrorBoundary>
                    <WagmiWrapper>
                        <UiLayoutWrapper>{children}</UiLayoutWrapper>
                    </WagmiWrapper>
                </ErrorBoundary>
            </body>
        </html>
    );
}
