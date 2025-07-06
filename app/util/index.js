import { IPFS_BASE_URL, ACTIVE_CHAIN, } from '../constants'
import { ethers } from 'ethers'

export const abbreviate = s => s ? `${s.substr(0, 6)}**` : ''

export const formatDate = (d) => {
  if (!(d instanceof Date)) {
    d = d ? new Date(d) : new Date()
  }
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
}

export const formatCurrency = (amount, symbol) => {
  if (amount === 0) {
    return 'Free'
  } else if (!amount) {
    return ''
  }
  return `${amount} ${symbol || ACTIVE_CHAIN.symbol}`
}

export const ipfsUrl = (cid, fileName) => {
  // let url = `https://ipfs.io/ipfs/${cid}`;
  let url = `${IPFS_BASE_URL}/${cid}`
  if (fileName) {
    return `${url}/${fileName}`;
  }
  return url;
};

export const policyUrl = (uploadId) => `${window.location.origin}/upload/${uploadId}`;

export const convertCamelToHuman = (str) => {
  // Check if likely datetime timestamp ms
  if (str.length === 13) {
    return new Date(str).toLocaleDateString();
  }

  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, function (str) {
      return str.toUpperCase();
    }).replace(/_/g, ' ');
}

export function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const getBlockExplorerFromChain = (chain) => chain?.blockExplorers?.default?.url || chain?.blockExplorerUrls?.[0]

export const getExplorerUrl = (chain, hash, useTx) =>
  `${getBlockExplorerFromChain(chain)}/${useTx ? "tx/" : "address/"}${hash}${ACTIVE_CHAIN.id === 31415 ? '?network=wallaby' : ''}`;

export const createJsonFile = (signload, fileName) => {
  const st = JSON.stringify(signload);
  const blob = new Blob([st], { type: "application/json" });
  const fileData = new File([blob], fileName);
  return fileData;
};

export const col = (k, render) => ({
  title: capitalize(k).replaceAll('_', ' '),
  dataIndex: k,
  key: k,
  render,
});

export const getKeccak256 = (str) => {
  const bytes = ethers.utils.toUtf8Bytes(str);
  const hash = ethers.utils.keccak256(bytes);
  return hash;
}

export const isEmpty = (r) => {
  return !r || r.length === 0
}

const getError = (error) => {
  if (error?.data?.message) {
    return error.data.message;
  } else if (error?.reason) {
    return error.reason;
  } else if (error?.message) {
    return error.message;
  }
  return error;
};

export const humanError = err => {
  let message = getError(err);

  // Network and connection errors
  if (message.indexOf('404') !== -1) {
    message = 'Entry not found. Do you have the correct url?';
  } else if (message.indexOf('network changed') !== -1) {
    message = 'Network changed since page loaded, please refresh.';
  }
  // MetaMask-specific errors
  else if (message.indexOf('Internal JSON-RPC error') !== -1 || message.indexOf('internal error') !== -1) {
    message = 'MetaMask encountered an internal error. This often happens due to gas estimation issues. Please try again, or consider increasing your gas limit in MetaMask settings.';
  } else if (message.indexOf('Unknown account') !== -1) {
    message = 'MetaMask account not recognized. Please ensure your wallet is unlocked and connected.';
  } else if (message.indexOf('invalid argument') !== -1 && message.indexOf('missing') !== -1) {
    message = 'Invalid transaction parameters. Please refresh the page and try again.';
  }
  // Gas and funding errors
  else if (message.indexOf('insufficient funds') !== -1 ||
           message.indexOf('gas required exceeds allowance') !== -1) {
    message = 'Insufficient funds in your wallet for gas fees. Please add some funds and try again.';
  } else if (message.indexOf('failed to estimate gas') !== -1 ||
             message.indexOf('gas estimation failed') !== -1) {
    message = 'Unable to estimate gas fees. This usually means you need more funds in your wallet for transaction fees.';
  } else if (message.indexOf('ApplyWithGasOnState failed') !== -1 ||
             message.indexOf('actor not found') !== -1) {
    message = 'Transaction failed. Please check that you have sufficient funds for gas fees and try again.';
  } else if (message.indexOf('nonce too low') !== -1) {
    message = 'Transaction nonce error. Please reset your MetaMask account activity (Advanced -> Reset Account) and try again.';
  } else if (message.indexOf('replacement transaction underpriced') !== -1) {
    message = 'Transaction already pending with higher gas price. Please wait for the previous transaction to complete or increase the gas price.';
  }
  // User interaction errors
  else if (message.indexOf('user rejected') !== -1 ||
           message.indexOf('User denied') !== -1) {
    message = 'Transaction was cancelled by user.';
  }
  // Contract interaction errors
  else if (message.indexOf('execution reverted') !== -1) {
    message = 'Transaction failed. Please check your inputs and try again.';
  } else if (message.indexOf('contract not deployed') !== -1 || message.indexOf('contract does not exist') !== -1) {
    message = 'Contract not found at this address. Please verify the contract address.';
  }

  return message;
}

export function bytesToSize(bytes) {
  var sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes == 0) return "0 Byte";
  var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + " " + sizes[i];
}

// Gas strategy configurations for transaction retries (reduced for better UX)
export const getGasStrategies = () => [
  // Strategy 1: Let MetaMask handle everything (most reliable)
  {},
  // Strategy 2: Conservative fallback with higher gas limit
  {
    gasLimit: 200000,
  }
];

// Conservative gas strategies for funding operations (reduced retries)
export const getFundingGasStrategies = () => [
  // Strategy 1: Let MetaMask handle everything (most reliable)
  {},
  // Strategy 2: Conservative fallback with higher gas limit
  {
    gasLimit: 200000,
  }
];

// Execute ERC20 approve with a single, reliable attempt
export const executeApprovalWithRetry = async (tokenContract, spender, amount) => {
  console.log('Starting ERC20 approval');
  
  try {
    // Use a conservative gas limit that works for most ERC20 tokens
    // Let MetaMask handle gas price estimation
    const gasOptions = {
      gasLimit: 80000 // Standard gas limit for ERC20 approve
    };
    
    console.log('Approving USDFC spending with gas limit:', gasOptions.gasLimit);
    
    const result = await tokenContract.approve(spender, amount, gasOptions);
    console.log('Approval transaction sent:', result.hash);
    await result.wait();
    console.log('Approval transaction confirmed');
    return result;
    
  } catch (error) {
    console.log('Initial approval failed, trying with max approval amount...');
    
    // If exact amount fails, try max uint256 (this often works better)
    try {
      const maxAmount = ethers.constants.MaxUint256;
      const result = await tokenContract.approve(spender, maxAmount, { gasLimit: 100000 });
      console.log('Max approval transaction sent:', result.hash);
      await result.wait();
      console.log('Max approval transaction confirmed');
      return result;
    } catch (maxError) {
      console.log('Max approval also failed:', maxError.message);
      // Handle the error from the original attempt for better user messaging
      handleContractError(error, 'approve USDFC spending');
    }
  }
};

// Check if an error should trigger a retry
export const shouldRetryTransaction = (error) => {
  // Don't retry for user rejections
  if (error.message.includes('user rejected') || error.code === 4001) {
    return false;
  }
  
  // Don't retry for contract validation errors
  if (error.message.includes('Amount exceeds policy maximum') ||
      error.message.includes('Policy is not active') ||
      error.message.includes('Invalid passcode') ||
      error.message.includes('Receipt hash required') ||
      error.message.includes('Only policy owner') ||
      error.message.includes('Insufficient contract balance')) {
    return false;
  }
  
  return true;
};

// Handle contract transaction errors with user-friendly messages
export const handleContractError = (error, operationName = 'transaction') => {
  console.error(`Error in ${operationName}:`, error);
  
  // Handle undefined or null error
  if (!error) {
    throw new Error(`Failed to ${operationName}: Unknown error occurred`);
  }
  
  // Handle cases where error doesn't have a message property
  const errorMessage = error.message || error.toString() || 'Unknown error';
  
  // User rejection errors
  if (errorMessage.includes('user rejected') || error.code === 4001) {
    throw new Error('Transaction was rejected by user.');
  }
  
  // MetaMask-specific errors
  if (errorMessage.includes('Internal JSON-RPC error') || errorMessage.includes('internal error')) {
    if (operationName && operationName.includes('approve')) {
      throw new Error('Token approval failed. This can happen due to network congestion or gas estimation issues. Please try again, and if the problem persists, try refreshing the page or increasing the gas limit manually in MetaMask.');
    }
    throw new Error('MetaMask encountered an internal error. This often happens due to gas estimation issues or network problems. Please try again, or consider refreshing the page. If the problem persists, try switching to a different network and back, or reset your MetaMask account.');
  }
  if (errorMessage.includes('Unknown account')) {
    throw new Error('MetaMask account not recognized. Please ensure your wallet is unlocked and the correct account is selected.');
  }
  if (errorMessage.includes('invalid argument') && errorMessage.includes('missing')) {
    throw new Error('Invalid transaction parameters detected. Please refresh the page and try again.');
  }
  if (errorMessage.includes('nonce too low')) {
    throw new Error('Transaction nonce error. Please reset your MetaMask account activity (Settings > Advanced > Reset Account) and try again.');
  }
  if (errorMessage.includes('replacement transaction underpriced')) {
    throw new Error('Transaction already pending with higher gas price. Please wait for the previous transaction to complete or increase the gas price in MetaMask.');
  }
  
  // Contract-specific validation errors
  if (errorMessage.includes('Amount exceeds policy maximum')) {
    throw new Error('Claim amount exceeds the policy maximum allowed amount.');
  }
  if (errorMessage.includes('Policy is not active')) {
    throw new Error('This policy is currently inactive and cannot accept new claims.');
  }
  if (errorMessage.includes('Invalid passcode')) {
    throw new Error('Invalid passcode provided. Please check and try again.');
  }
  if (errorMessage.includes('Receipt hash required')) {
    throw new Error('Please upload a valid receipt.');
  }
  if (errorMessage.includes('Only policy owner')) {
    throw new Error('Only the policy owner can perform this action.');
  }
  if (errorMessage.includes('Insufficient contract balance')) {
    throw new Error('Insufficient contract balance for this operation.');
  }
  
  // Funding and balance errors
  if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
    throw new Error('Insufficient funds for transaction fees. Please add more ETH to your wallet.');
  }
  if (errorMessage.includes('transfer failed') || errorMessage.includes('transfer amount exceeds')) {
    throw new Error('Token transfer failed. Please check your USDFC balance and allowance. If the problem persists, try resetting the token allowance to 0 first.');
  }
  
  // Gas estimation errors
  if (errorMessage.includes('gas') || errorMessage.includes('estimate')) {
    throw new Error('Unable to estimate gas fees. This usually means you need more funds in your wallet for transaction fees, or there may be an issue with the transaction parameters. Try refreshing and attempting again.');
  }
  
  // Network connectivity errors
  if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    throw new Error('Network connectivity issue. Please check your internet connection and try again. If the problem persists, try switching to a different RPC endpoint in MetaMask.');
  }
  
  // Contract deployment and existence errors
  if (errorMessage.includes('contract not deployed') || errorMessage.includes('contract does not exist') || errorMessage.includes('code=CALL_EXCEPTION')) {
    throw new Error('Contract not found or not accessible at this address. Please verify the contract address and ensure it\'s deployed on the current network.');
  }
  
  // Execution errors
  if (errorMessage.includes('execution failed') || errorMessage.includes('execution reverted')) {
    throw new Error('Transaction failed during execution. This may be due to insufficient allowance, insufficient balance, or invalid transaction parameters. Please check all requirements and try again.');
  }
  
  // Check if it's already a formatted error message
  const formattedErrorPrefixes = [
    'Transaction was rejected',
    'MetaMask encountered',
    'MetaMask account not',
    'Invalid transaction parameters',
    'Transaction nonce error',
    'Transaction already pending',
    'Claim amount exceeds',
    'This policy is currently',
    'Invalid passcode',
    'Please upload',
    'Only the policy owner',
    'Insufficient funds',
    'Insufficient contract balance',
    'Token transfer failed',
    'Unable to estimate gas',
    'Network connectivity',
    'Contract not found',
    'Transaction failed'
  ];
  
  if (formattedErrorPrefixes.some(prefix => errorMessage.startsWith(prefix))) {
    throw error;
  }
  
  // Generic fallback
  throw new Error(`Failed to ${operationName}: ${errorMessage}`);
};

// Execute a contract transaction with retry logic
export const executeContractTransactionWithRetry = async (
  contractMethod, 
  args = [], 
  operationName = 'transaction',
  customGasStrategies = null
) => {
  const gasStrategies = customGasStrategies || getGasStrategies();
  let lastError;
  
  for (let i = 0; i < gasStrategies.length; i++) {
    const gasOptions = gasStrategies[i];
    console.log(`${operationName} attempt ${i + 1}/${gasStrategies.length} with gas options:`, gasOptions);
    
    try {
      // Try to estimate gas first (optional, for debugging)
      try {
        // Check if the contractMethod has estimateGas available
        if (contractMethod && typeof contractMethod.estimateGas === 'function') {
          const gasEstimate = await contractMethod.estimateGas(...args);
          console.log(`Gas estimate for ${operationName}:`, gasEstimate.toString());
        } else {
          console.log('Gas estimation not available for this method');
        }
      } catch (estimateError) {
        console.log('Gas estimation failed:', estimateError.message);
        // Continue anyway - estimation failure doesn't mean transaction will fail
      }
      
      const result = await contractMethod(...args, gasOptions);
      console.log(`${operationName} transaction sent:`, result.hash);
      await result.wait(); // Wait for transaction confirmation
      console.log(`${operationName} transaction confirmed`);
      return result;
      
    } catch (error) {
      console.log(`${operationName} attempt ${i + 1} failed:`, error.message);
      lastError = error;
      
      // Check if we should retry this error
      if (!shouldRetryTransaction(error)) {
        break; // Exit retry loop for non-retryable errors
      }
      
      // Wait a bit before retrying (except on last attempt)
      if (i < gasStrategies.length - 1) {
        console.log('Waiting 2 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  // Handle the final error
  handleContractError(lastError, operationName);
};

// Validate common input parameters
export const validateTransactionInputs = (params) => {
  const { amount, receiptHash } = params;
  
  if (amount !== undefined) {
    const amountAsInteger = parseInt(amount);
    if (amountAsInteger <= 0) {
      throw new Error('Amount must be greater than 0');
    }
  }
  
  if (receiptHash !== undefined) {
    if (!receiptHash || receiptHash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      throw new Error('Valid receipt hash is required');
    }
  }
};
