import { Button } from 'antd'
import { useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useNetwork, useSwitchNetwork } from 'wagmi'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { CHAIN_MAP, ACTIVE_CHAIN } from '../constants'
import { abbreviate, getExplorerUrl } from '@/util'


function ConnectButton({size='large', buttonType = 'primary', text = 'Connect Wallet', connectOnMount=false}) {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect({
    connector: new InjectedConnector(),
  })
  const { disconnect } = useDisconnect()
  const { chains, error, isLoading, pendingChainId, switchNetwork } =
  useSwitchNetwork()

  const network = useNetwork()
  useEffect(() => {
    if (connectOnMount) {
      connect()
    }
  }, [])

  useEffect(() => {
    // console.log('check switch', network.chain, pendingChainId, ACTIVE_CHAIN.id, isConnected);
    const currentChainId = network?.chain?.id
    if (currentChainId && currentChainId !== ACTIVE_CHAIN.id) {
      console.log('switching network', CHAIN_MAP[currentChainId], CHAIN_MAP[ACTIVE_CHAIN.id])
      switchNetwork?.(ACTIVE_CHAIN.id)
    }
  }, [network, isConnected])

  if (isConnected)
    return (
      <div>
        Connected to:&nbsp;
        <a href={getExplorerUrl(network?.chain?.id, address)} target="_blank">{abbreviate(address)}</a>
        {/* {address} */}
        <Button type="link" size={size} onClick={() => disconnect()}>Disconnect</Button>
      </div>
    )
  return <Button type={buttonType} size={size} onClick={() => connect()}>{text}</Button>
}

export default ConnectButton
