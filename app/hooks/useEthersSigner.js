import * as React from 'react'
import { useWalletClient } from 'wagmi'
import { ethers } from 'ethers'
import { ACTIVE_CHAIN } from '../constants'
 
export function walletClientToSigner(walletClient) {
  let { account, chain, transport } = walletClient
  if (!chain) {
    chain = ACTIVE_CHAIN
  }
  console.log("walletClientToSigner", walletClient, chain)
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }
  const provider = new ethers.providers.Web3Provider(transport, network)
  const signer = provider.getSigner(account.address)
  return signer
}
 
/** Hook to convert a viem Wallet Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }) {
  const { data: walletClient } = useWalletClient({ chainId })
  return React.useMemo(
    () => (walletClient ? walletClientToSigner(walletClient) : undefined),
    [walletClient],
  )
}