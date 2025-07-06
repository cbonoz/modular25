import { Synapse, RPC_URLS } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';

/**
 * Upload files using Synapse SDK to Filecoin PDP with CDN support
 * Works with MetaMask and other browser wallets
 * @param {File[]} files - Array of files to upload
 * @param {Object} metadata - Optional metadata to include
 * @param {Object} signer - Ethers signer from wallet (MetaMask)
 * @param {Object} chain - Chain object from wagmi (optional, will try to get from signer if not provided)
 * @returns {Promise<string>} - Returns the CID of the uploaded content
 */
export async function uploadFilesWithSynapse(files, metadata = null, signer = null, chain = null) {
    if (!files || files.length === 0) {
        throw new Error('No files provided for upload');
    }

    try {
        console.log('🔄 Starting Synapse upload for files:', files.map(f => f.name));
        console.log('📦 Synapse SDK RPC_URLS available:', RPC_URLS);
        console.log('Input parameters:', { 
            chainProvided: !!chain, 
            chainId: chain?.id, 
            chainName: chain?.name,
            signerProvided: !!signer,
            signerHasProvider: !!signer?.provider 
        });
        
        // Log expected chain IDs for reference
        console.log('Expected chain IDs - Mainnet: 314, Calibration: 314159');
        
        // Try to get network from multiple sources
        let network;
        
        // First try: use provided chain
        if (chain?.id) {
            network = { chainId: chain.id, name: chain.name || `Chain ${chain.id}` };
            console.log('✓ Using provided chain:', network);
        }
        // Second try: get from signer provider network property
        else if (signer?.provider?.network?.chainId) {
            network = signer.provider.network;
            console.log('✓ Using signer network property:', network);
        }
        // Third try: get from signer provider getNetwork()
        else if (signer?.provider?.getNetwork) {
            try {
                network = await signer.provider.getNetwork();
                console.log('✓ Using signer.provider.getNetwork():', network);
            } catch (e) {
                console.warn('Failed to get network from signer.provider.getNetwork():', e);
            }
        }
        // Fourth try: check if signer has _network property (some providers)
        else if (signer?.provider?._network?.chainId) {
            network = signer.provider._network;
            console.log('✓ Using signer._network property:', network);
        }

        console.log('Final network object:', network);

        if (!network?.chainId) {
            console.error('❌ All network detection methods failed:', {
                chain,
                signerProvider: signer?.provider,
                signerProviderNetwork: signer?.provider?.network,
                signerProviderHasGetNetwork: typeof signer?.provider?.getNetwork === 'function'
            });
            throw new Error('Unable to determine network. Please ensure your wallet is connected and on a supported network (Filecoin mainnet or testnet).');
        }

        console.log('📡 Final detected network:', network);

        // Determine which RPC URL to use based on network
        let rpcUrl;
        let synapseNetwork;
        
        // Check for specific chain IDs
        if (network.chainId === 314) {
            // Filecoin mainnet
            rpcUrl = RPC_URLS.mainnet?.websocket || RPC_URLS.mainnet?.http || 'https://api.node.glif.io';
            synapseNetwork = 'mainnet';
            console.log('✓ Detected Filecoin mainnet (314)');
        } else if (network.chainId === 314159) {
            // Filecoin Calibration testnet
            rpcUrl = RPC_URLS.calibration?.websocket || 
                     RPC_URLS.calibration?.http || 
                     'https://api.calibration.node.glif.io/rpc/v1'; // Fallback RPC for Calibration
            synapseNetwork = 'calibration';
            console.log('✓ Detected Filecoin Calibration testnet (314159)');
        } else {
            console.error('❌ Unsupported network detected:', { 
                chainId: network.chainId, 
                chainName: network.name,
                supportedNetworks: 'Filecoin mainnet (314) or Calibration testnet (314159)'
            });
            throw new Error(`Unsupported network for Synapse upload: ${network.name || 'Unknown'} (chainId: ${network.chainId}). Please switch to Filecoin mainnet (314) or Calibration testnet (314159).`);
        }
        
        // Ensure we have a valid RPC URL
        if (!rpcUrl) {
            console.warn('⚠️ No RPC URL found from SDK, using fallback');
            rpcUrl = network.chainId === 314 
                ? 'https://api.node.glif.io/rpc/v1'
                : 'https://api.calibration.node.glif.io/rpc/v1';
        }
        
        console.log('📡 Using RPC URL:', rpcUrl);
        console.log('📡 Synapse network mode:', synapseNetwork);
        
        // Log available RPC URLs for debugging
        console.log('Available RPC URLs:', { 
            mainnet: RPC_URLS.mainnet, 
            calibration: RPC_URLS.calibration 
        });
        
        // Initialize Synapse SDK with multiple configuration strategies
        // The SDK seems to expect specific network identifiers or configurations
        let synapse;
        let initSuccess = false;
        let lastError;
        
        // Strategy 1: Standard configuration with network string
        try {
            const synapseConfig = { 
                wallet: signer,
                rpcURL: rpcUrl,
                network: synapseNetwork
            };
            
            console.log('🔧 Strategy 1: Standard config:', synapseConfig);
            synapse = new Synapse(synapseConfig);
            
            console.log('🔄 Calling synapse.init()...');
            await synapse.init();
            console.log('✅ Strategy 1: Synapse SDK initialized successfully');
            initSuccess = true;
        } catch (error1) {
            lastError = error1;
            console.warn('⚠️ Strategy 1 failed:', error1.message);
            
            // Strategy 2: Try with chainId instead of network string
            try {
                const synapseConfig = { 
                    wallet: signer,
                    rpcURL: rpcUrl,
                    chainId: network.chainId,
                    networkId: network.chainId
                };
                
                console.log('🔧 Strategy 2: ChainId config:', synapseConfig);
                synapse = new Synapse(synapseConfig);
                
                await synapse.init();
                console.log('✅ Strategy 2: Synapse SDK initialized with chainId');
                initSuccess = true;
            } catch (error2) {
                lastError = error2;
                console.warn('⚠️ Strategy 2 failed:', error2.message);
                
                // Strategy 3: Try with explicit provider configuration
                try {
                    const synapseConfig = { 
                        provider: signer.provider,
                        rpcURL: rpcUrl,
                        network: synapseNetwork,
                        chainId: network.chainId
                    };
                    
                    console.log('🔧 Strategy 3: Provider config:', synapseConfig);
                    synapse = new Synapse(synapseConfig);
                    
                    await synapse.init();
                    console.log('✅ Strategy 3: Synapse SDK initialized with provider');
                    initSuccess = true;
                } catch (error3) {
                    lastError = error3;
                    console.warn('⚠️ Strategy 3 failed:', error3.message);
                    
                    // Strategy 4: Try Synapse.create static method if available
                    try {
                        console.log('🔧 Strategy 4: Using Synapse.create() method');
                        if (typeof Synapse.create === 'function') {
                            synapse = await Synapse.create({
                                provider: signer.provider,
                                rpcURL: rpcUrl,
                                withCDN: true
                            });
                            console.log('✅ Strategy 4: Synapse SDK created successfully');
                            initSuccess = true;
                        } else {
                            throw new Error('Synapse.create method not available');
                        }
                    } catch (error4) {
                        lastError = error4;
                        console.error('❌ All Synapse initialization strategies failed');
                        console.error('Strategy 1 (network):', error1.message);
                        console.error('Strategy 2 (chainId):', error2.message);
                        console.error('Strategy 3 (provider):', error3.message);
                        console.error('Strategy 4 (create):', error4.message);
                        
                        // Give testnet users a more helpful error message
                        if (network.chainId === 314159) {
                            console.error('📋 Synapse SDK Debug Info:');
                            console.error('  - SDK Version:', Synapse.version || 'Unknown');
                            console.error('  - Available RPC URLs:', RPC_URLS);
                            console.error('  - Network Detection:', { chainId: network.chainId, name: network.name });
                            console.error('  - RPC URL Used:', rpcUrl);
                            
                            // Check if this is a known SDK issue
                            const isSDKConfigIssue = error4.message.includes('network: undefined') || 
                                                     error4.message.includes('No Pandora service') ||
                                                     error4.message.includes('Failed to get network config');
                                                     
                            if (isSDKConfigIssue) {
                                throw new Error(`Synapse SDK does not appear to properly support Calibration testnet (chainId: 314159) in the current version. This is a known limitation. Error details: ${error4.message}`);
                            } else {
                                throw new Error(`Synapse SDK initialization failed on Calibration testnet. This may be due to limited Pandora service support on testnet. All initialization strategies failed. Last error: ${error4.message}`);
                            }
                        } else {
                            throw new Error(`Failed to initialize Synapse SDK after trying multiple strategies. This may be due to network connectivity issues or Pandora service unavailability. Last error: ${error4.message}`);
                        }
                    }
                }
            }
        }
        
        if (!initSuccess || !synapse) {
            throw new Error(`Synapse SDK initialization failed: ${lastError?.message || 'Unknown error'}`);
        }

        // Different SDK initialization methods may return different object structures
        // Let's inspect what methods are available and adapt accordingly
        console.log('🔍 Synapse object methods:', Object.getOwnPropertyNames(synapse));
        console.log('🔍 Synapse object prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(synapse)));
        
        let uploadResults;
        
        // Check if this is the newer SDK interface (from Synapse.create)
        if (typeof synapse.uploadFiles === 'function') {
            console.log('✓ Using newer SDK interface (uploadFiles method)');
            uploadResults = await synapse.uploadFiles(files, metadata);
        }
        // Check for createStorage method (which we can see is available)
        else if (typeof synapse.createStorage === 'function') {
            console.log('✓ Using createStorage method directly (no selectStorageProvider needed)');
            
            // Try createStorage directly without selecting a provider first
            uploadResults = await synapse.createStorage(files, metadata);
        }
        // Try direct upload method if available
        else if (typeof synapse.upload === 'function') {
            console.log('✓ Using direct upload method');
            uploadResults = await synapse.upload(files, metadata);
        }
        // Try store method if available
        else if (typeof synapse.store === 'function') {
            console.log('✓ Using store method');
            uploadResults = await synapse.store(files, metadata);
        }
        else {
            // List all available methods for debugging
            const availableMethods = Object.getOwnPropertyNames(synapse)
                .concat(Object.getOwnPropertyNames(Object.getPrototypeOf(synapse)))
                .filter(name => typeof synapse[name] === 'function')
                .filter(name => !name.startsWith('_') && name !== 'constructor');
                
            console.error('❌ No recognized upload method found on Synapse object');
            console.error('Available methods:', availableMethods);
            throw new Error(`Synapse SDK interface not recognized. Available methods: ${availableMethods.join(', ')}`);
        }
        
        if (!uploadResults || !uploadResults.cid) {
            throw new Error('No CID returned from Synapse upload');
        }

        console.log('✓ Synapse upload completed successfully');
        console.log('  CID:', uploadResults.cid);
        console.log('  Deal ID:', uploadResults.dealId);
        console.log('  Files uploaded:', files.length);

        return uploadResults.cid;

    } catch (error) {
        console.error('Error uploading file with Synapse SDK:', error);
        
        // Classify the error to help with recovery decisions
        const errorMessage = error.message || '';
        
        // Handle specific Synapse service errors
        if (errorMessage.includes('No Pandora service address configured')) {
            // This error often occurs when the Synapse SDK doesn't recognize the network
            // or when the Pandora service is not available for the current network
            if (errorMessage.includes('network: undefined')) {
                throw new Error('Synapse SDK network configuration failed. This may be due to an SDK version that doesn\'t fully support Calibration testnet. Please try submitting your claim without uploading - the receipt hash will still be recorded on-chain for verification.');
            } else {
                throw new Error('Synapse upload service is temporarily unavailable for this network. This is common on testnets where services may be intermittent. Please try again later, or submit your claim without uploading (the receipt hash will still be recorded on-chain).');
            }
        }
        
        // Handle payment/approval errors on testnet
        if (errorMessage.includes('operator not approved') || 
            errorMessage.includes('Failed to create proof set') ||
            errorMessage.includes('yablu.net/pdp/proof-sets')) {
            throw new Error('Synapse upload failed due to payment or approval issues on testnet. This often occurs when the wallet hasn\'t approved the Synapse service for storage payments, or when testnet services are experiencing issues. Please try submitting your claim without uploading - the receipt hash will still be recorded on-chain for verification.');
        }
        
        const isNetworkError = errorMessage.includes('500') || 
                              errorMessage.includes('502') || 
                              errorMessage.includes('503') || 
                              errorMessage.includes('timeout') ||
                              errorMessage.includes('network') ||
                              errorMessage.includes('Pandora service address') ||
                              errorMessage.includes('Failed to initialize Synapse');
        
        const isGasError = errorMessage.includes('gas') || 
                          errorMessage.includes('exit=[33]') ||
                          errorMessage.includes('failed to estimate gas') ||
                          errorMessage.includes('insufficient funds');
                          
        const isTestnetError = errorMessage.includes('testnet') ||
                              errorMessage.includes('Calibration') ||
                              errorMessage.includes('proof set');

        // Create enhanced error with classification
        const enhancedError = new Error(`Synapse createStorage failed: ${errorMessage}`);
        enhancedError.originalError = error;
        enhancedError.isNetworkIssue = isNetworkError;
        enhancedError.isGasIssue = isGasError;
        enhancedError.isTestnetIssue = isTestnetError;
        
        console.log('Error classification:', {
            isNetworkIssue: isNetworkError,
            isGasIssue: isGasError,
            isTestnetIssue: isTestnetError
        });
        
        throw enhancedError;
    }
}

/**
 * Download file using Synapse SDK
 * @param {string} cid - The CID of the file to download
 * @param {Object} signer - Ethers signer from wallet
 * @returns {Promise<ArrayBuffer>} - Returns the downloaded file data
 */
export async function downloadFileWithSynapse(cid, signer) {
  try {
    console.log(`Starting download for CID: ${cid}`);
    
    // Create Web3Provider from window.ethereum (ethers v5)
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    
    const synapse = await Synapse.create({
      provider: provider,
      rpcURL: RPC_URLS.calibration.websocket,
      withCDN: true
    });

    console.log('✓ Synapse SDK initialized for download');

    // Download from any provider that has the piece
    const downloadedData = await synapse.download(cid);
    
    console.log(`✓ File downloaded successfully, size: ${downloadedData.byteLength} bytes`);
    return downloadedData;

  } catch (error) {
    console.error('Error downloading file with Synapse SDK:', error);
    throw new Error(`Download failed: ${error.message}`);
  }
}

/**
 * Get the FilCDN URL for a file
 * @param {string} cid - The CID of the file
 * @param {string} walletAddress - The wallet address
 * @returns {string} - The FilCDN URL
 */
export function getFilCDNUrl(cid, walletAddress) {
  return `https://${walletAddress}.calibration.filcdn.io/${cid}`;
}

/**
 * Check and setup payments for Synapse SDK
 * @param {Object} signer - Ethers signer from wallet
 * @param {string} depositAmount - Amount to deposit in USDFC (e.g., "100")
 * @returns {Promise<void>}
 */
export async function setupSynapsePayments(signer, depositAmount = "100") {
  try {
    console.log('Setting up Synapse payments...');
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const synapse = await Synapse.create({
      provider: provider,
      rpcURL: RPC_URLS.calibration.websocket
    });

    // Import required constants
    const { TOKENS, CONTRACT_ADDRESSES } = await import('@filoz/synapse-sdk');

    // 1. Deposit USDFC tokens (one-time setup)
    const amount = ethers.utils.parseUnits(depositAmount, 18); // Fixed: use ethers.utils.parseUnits for v5
    console.log(`Depositing ${depositAmount} USDFC...`);
    
    const depositTx = await synapse.payments.deposit(amount, TOKENS.USDFC, {
      onAllowanceCheck: (current, required) => {
        console.log(`Checking allowance: ${current} vs ${required}`);
      },
      onApprovalTransaction: (approveTx) => {
        console.log(`Auto-approval sent: ${approveTx.hash}`);
      },
      onApprovalConfirmed: (receipt) => {
        console.log(`Approval confirmed in block ${receipt.blockNumber}`);
      },
      onDepositStarting: () => {
        console.log('Starting deposit transaction...');
      }
    });

    console.log(`Deposit transaction: ${depositTx.hash}`);
    await depositTx.wait();
    console.log('✓ Deposit confirmed');

    // 2. Approve the Pandora service for automated payments
    const pandoraAddress = CONTRACT_ADDRESSES.PANDORA_SERVICE[synapse.getNetwork()];
    
    await synapse.payments.approveService(
      pandoraAddress,
      ethers.utils.parseUnits('10', 18), // Fixed: use ethers.utils.parseUnits for v5
      ethers.utils.parseUnits('1000', 18) // Fixed: use ethers.utils.parseUnits for v5
    );

    console.log('✓ Synapse payments setup complete');

  } catch (error) {
    console.error('Error setting up Synapse payments:', error);
    throw new Error(`Payment setup failed: ${error.message}`);
  }
}