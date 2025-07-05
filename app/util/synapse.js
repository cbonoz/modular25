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
        
        // Try to get network from multiple sources
        let network;
        
        // First try: use provided chain
        if (chain?.id) {
            network = { chainId: chain.id, name: chain.name };
            console.log('Using provided chain:', network);
        }
        // Second try: get from signer provider
        else if (signer?.provider?.network) {
            network = signer.provider.network;
            console.log('Using signer network:', network);
        }
        // Third try: get from signer provider getNetwork()
        else if (signer?.provider?.getNetwork) {
            try {
                network = await signer.provider.getNetwork();
                console.log('Using signer.provider.getNetwork():', network);
            } catch (e) {
                console.warn('Failed to get network from signer.provider.getNetwork():', e);
            }
        }

        if (!network?.chainId) {
            throw new Error('Unable to determine network from signer or chain parameter. Please ensure wallet is connected.');
        }

        console.log('📡 Detected network:', network);

        // Determine which RPC URL to use based on network
        let rpcUrl;
        if (network.chainId === 314) {
            // Filecoin mainnet
            rpcUrl = RPC_URLS.mainnet?.websocket || RPC_URLS.mainnet?.http || 'https://api.node.glif.io';
        } else if (network.chainId === 314159) {
            // Filecoin Calibration testnet
            rpcUrl = RPC_URLS.calibration?.websocket || RPC_URLS.calibration?.http || 'https://api.calibration.node.glif.io';
        } else {
            throw new Error(`Unsupported network for Synapse: ${network.name} (chainId: ${network.chainId}). Please switch to Filecoin mainnet or Calibration testnet.`);
        }
        
        console.log('Using RPC URL:', rpcUrl);
        
        // Initialize Synapse SDK with proper network configuration
        const synapse = new Synapse({ 
            wallet: signer,
            rpcURL: rpcUrl,
            network: network.chainId === 314 ? 'mainnet' : 'calibration'
        });
        await synapse.init();
        console.log('✓ Synapse SDK initialized with network:', network.name);

        // Select storage provider
        const storageProvider = await synapse.selectStorageProvider();
        console.log('✓ Selected storage provider:', storageProvider.address);
        console.log('  PDP URL:', storageProvider.pdpUrl);

        // Create storage for files
        const uploadResults = await synapse.createStorage(files, metadata);
        
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
        const isNetworkError = errorMessage.includes('500') || 
                              errorMessage.includes('502') || 
                              errorMessage.includes('503') || 
                              errorMessage.includes('timeout') ||
                              errorMessage.includes('network') ||
                              errorMessage.includes('Pandora service address');
        
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