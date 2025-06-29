import UiLayoutWrapper from './lib/UiLayoutWrapper';
import WagmiWrapper from './lib/WagmiWrapper';
import Script from 'next/script';

import './globals.css';

export default function RootLayout({ children }) {
    return (
        <html>
            {/* <Script async src="https://saturn.tech/widget.js" /> */}
            <head>
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <title>
                    Cleared | Distributed data management and security
                </title>
                <meta
                    name="description"
                    content="Distributed data management and security"
                />
            </head>
            <body>
                <WagmiWrapper>
                    <UiLayoutWrapper>{children}</UiLayoutWrapper>
                </WagmiWrapper>
            </body>
        </html>
    );
}
