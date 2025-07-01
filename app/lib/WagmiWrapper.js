'use client'

// https://wagmi.sh/
import { WagmiConfig, createConfig } from 'wagmi'
import { createPublicClient, http } from 'viem'
import { ACTIVE_CHAIN } from '../constants';

const config = createConfig({
    autoConnect: true,
    publicClient: createPublicClient({
        chain: ACTIVE_CHAIN,
        transport: http()
    }),
})

const WagmiWrapper = ({ children }) => {
    return (
        <WagmiConfig config={config}>
            {children}
        </WagmiConfig>
    )
}

export default WagmiWrapper
