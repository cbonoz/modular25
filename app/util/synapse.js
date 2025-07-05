import { Synapse, RPC_URLS } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';

/**
 * Upload files using Synapse SDK to Filecoin PDP with CDN support
 * Works with MetaMask and other browser wallets
 * @param {File[]} files - Array of files to upload
 * @param {Object} metadata - Optional metadata to include
 * @param {Object} signer - Ethers signer from wallet (MetaMask)
 * @returns {Promise<string>} - Returns the CID of the uploaded content
 */
export async function uploadFilesWithSynapse(files, metadata, signer) {
  try {
    console.log('Starting Synapse file upload with MetaMask...');
    
    // Create BrowserProvider from the signer's provider
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // Initialize Synapse SDK with the browser provider
    const synapse = await Synapse.create({
      provider: provider,
      rpcURL: RPC_URLS.calibration.websocket, // Use calibration testnet
      withCDN: true
    });

    console.log('✓ Synapse SDK initialized with MetaMask');

    // Create storage service with enhanced callbacks
    const storage = await synapse.createStorage({
      callbacks: {
        onProviderSelected: (provider) => {
          console.log(`✓ Selected storage provider: ${provider.owner}`);
          console.log(`  PDP URL: ${provider.pdpUrl}`);
        },
        onProofSetResolved: (info) => {
          if (info.isExisting) {
            console.log(`✓ Using existing proof set: ${info.proofSetId}`);
          } else {
            console.log(`✓ Created new proof set: ${info.proofSetId}`);
          }
        },
        onProofSetCreationStarted: (transaction, statusUrl) => {
          console.log(`  Creating proof set, tx: ${transaction.hash}`);
          console.log(`  Status URL: ${statusUrl}`);
        },
        onProofSetCreationProgress: (progress) => {
          if (progress.transactionMined && !progress.proofSetLive) {
            console.log('  Transaction mined, waiting for proof set to be live...');
          }
        },
      },
    });

    console.log('✓ Storage service created');

    // Prepare files for upload
    const filesToUpload = [...files];
    
    // Add metadata file if provided
    if (metadata) {
      const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      const metaFile = new File([blob], 'metadata.json');
      filesToUpload.push(metaFile);
    }

    // For now, we'll upload the first file (receipt)
    // TODO: Handle multiple files or create a bundle
    const fileToUpload = filesToUpload[0];
    const fileData = await fileToUpload.arrayBuffer();

    console.log(`Uploading file: ${fileToUpload.name}, size: ${fileData.byteLength} bytes`);

    // Run preflight checks
    const preflight = await storage.preflightUpload(fileData.byteLength);
    
    console.log('Preflight check results:');
    console.log('- Estimated cost:', preflight.estimatedCost);
    console.log('- Allowance sufficient:', preflight.allowanceCheck.sufficient);

    if (!preflight.allowanceCheck.sufficient) {
      throw new Error(
        `Insufficient allowance for upload. ` +
        `Required: ${preflight.estimatedCost} USDFC. ` +
        `Please increase your allowance via the FilCDN web app at https://fs-upload-dapp.netlify.app/`
      );
    }

    console.log('✓ Preflight checks passed');

    // Upload the file with progress callbacks
    const uploadResult = await storage.upload(fileData, {
      onUploadComplete: (commp) => {
        console.log(`✓ Upload complete! CommP: ${commp}`);
      },
      onRootAdded: (transaction) => {
        if (transaction) {
          console.log(`✓ Transaction confirmed: ${transaction.hash}`);
          console.log(`  Block number: ${transaction.blockNumber}`);
        }
      }
    });
    
    const cid = uploadResult.commp;
    console.log(`✓ File uploaded successfully with CID: ${cid}`);
    
    return cid;

  } catch (error) {
    console.error('Error uploading file with Synapse SDK:', error);
    
    // Provide more specific error messages
    if (error.message.includes('allowance')) {
      throw new Error(`Upload failed: ${error.message}`);
    } else if (error.message.includes('MetaMask')) {
      throw new Error('MetaMask connection required. Please connect your wallet and try again.');
    } else {
      throw new Error(`Upload failed: ${error.message}`);
    }
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
    
    // Create BrowserProvider from the signer's provider
    const provider = new ethers.BrowserProvider(window.ethereum);
    
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
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const synapse = await Synapse.create({
      provider: provider,
      rpcURL: RPC_URLS.calibration.websocket
    });

    // Import required constants
    const { TOKENS, CONTRACT_ADDRESSES } = await import('@filoz/synapse-sdk');
    
    // 1. Deposit USDFC tokens (one-time setup)
    const amount = ethers.parseUnits(depositAmount, 18);
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
      ethers.parseUnits('10', 18), // Rate allowance: 10 USDFC per epoch
      ethers.parseUnits('1000', 18) // Lockup allowance: 1000 USDFC total
    );

    console.log('✓ Synapse payments setup complete');

  } catch (error) {
    console.error('Error setting up Synapse payments:', error);
    throw new Error(`Payment setup failed: ${error.message}`);
  }
}