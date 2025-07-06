import { Button } from 'antd'
import { useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect, useNetwork, useSwitchNetwork } from 'wagmi'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { CHAIN_MAP, ACTIVE_CHAIN } from '../constants'
import { abbreviate, getExplorerUrl } from '@/util'


function ConnectButton({size='large', buttonType = 'primary', text = 'Connect Wallet', connectOnMount=false}) {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect({
    connector: new InjectedConnector(),
  })
  const { disconnect } = useDisconnect({
    onSuccess: () => {
      console.log('Successfully disconnected')
    },
    onError: (error) => {
      console.error('Failed to disconnect:', error)
    }
  })
  const { chains, error, isLoading, pendingChainId, switchNetwork } =
  useSwitchNetwork()
  const [showNetworkWarning, setShowNetworkWarning] = useState(false)

  const network = useNetwork()

  useEffect(() => {
    if (connectOnMount) {
      connect()
    }
  }, [])

  useEffect(() => {
    const currentChainId = network?.chain?.id
    if (isConnected && currentChainId && currentChainId !== ACTIVE_CHAIN.id) {
      console.log('Wrong network detected:', CHAIN_MAP[currentChainId], 'Expected:', CHAIN_MAP[ACTIVE_CHAIN.id])
      setShowNetworkWarning(true)
    } else {
      setShowNetworkWarning(false)
    }
  }, [network, isConnected])

  const handleSwitchNetwork = () => {
    try {
      switchNetwork?.(ACTIVE_CHAIN.id)
    } catch (error) {
      console.error('Failed to switch network:', error)
    }
  }

  const handleDisconnect = async () => {
    try {
      console.log('Attempting to disconnect...')
      await disconnect()
    } catch (error) {
      console.error('Error during disconnect:', error)
    }
  }

  if (isConnected) {
    return (
      <div>
        {!showNetworkWarning && (
          <div>
            <a href={getExplorerUrl(network?.chain?.id, address)} target="_blank">{abbreviate(address)}</a>
            <Button type="link" size={size} onClick={handleDisconnect}>Disconnect</Button>
          </div>
        )}

        {showNetworkWarning && (
          <div>
            <div style={{ marginBottom: '10px' }}>
              Connected to:&nbsp;
              <a href={getExplorerUrl(network?.chain?.id, address)} target="_blank">{abbreviate(address)}</a>
              <Button type="link" size={size} onClick={handleDisconnect}>Disconnect</Button>
            </div>
            <div style={{ color: '#ff4d4f', fontSize: '12px' }}>
              Wrong network: {network?.chain?.name}
            </div>
            <Button
              type="dashed"
              size="small"
              onClick={handleSwitchNetwork}
              loading={isLoading}
              style={{ marginTop: '5px' }}
            >
              Switch to {ACTIVE_CHAIN.name}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return <Button type={buttonType} size={size} onClick={() => connect()}>{text}</Button>
}

export default ConnectButton
