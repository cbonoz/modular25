import { ethers } from 'ethers';
import { CLEARED_CONTRACT } from './metadata';
import { formatDate, handleContractError, executeContractTransactionWithRetry, validateTransactionInputs, executeApprovalWithRetry } from '.';
import { USDFC_TOKEN_ADDRESS } from '../constants';

// Helper function to hash passcode
export function hashPasscode(passcode) {
    if (!passcode || passcode.trim() === '') {
        return ethers.constants.HashZero;
    }
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(passcode));
}

export async function deployContract(
    signer,
    policyName,
    policyDescription,
    businessType,
    location,
    employeeCount,
    maxAmount,
    category,
    passcode = ''
) {
    try {
        // Check if signer is available and connected
        if (!signer) {
            throw new Error('No signer available. Please connect your wallet.');
        }

        // Get the current network from the signer
        const network = await signer.provider.getNetwork();
        console.log('Deploying to network:', network.name, network.chainId);

        // Deploy contract with ethers
        const factory = new ethers.ContractFactory(
            CLEARED_CONTRACT.abi,
            CLEARED_CONTRACT.bytecode,
            signer
        );

        const options = {
            // gasLimit: 3000000,
            // gasPrice: 10000000000,
        };

        // Hash the passcode if provided
        const passcodeHash = hashPasscode(passcode);

        // Convert maxAmount to Wei units to match how claims are submitted
        const maxAmountInWei = ethers.utils.parseUnits(maxAmount.toString(), 18);

        console.log(
            'Deploying reimbursement policy contract...',
            policyName,
            policyDescription,
            businessType,
            location,
            employeeCount,
            maxAmount,
            'maxAmountInWei:', maxAmountInWei.toString(),
            category,
            'USDFC Address:',
            USDFC_TOKEN_ADDRESS,
            'Has Passcode:',
            passcode ? 'Yes' : 'No'
        );

        const contract = await factory.deploy(
            policyName,
            policyDescription,
            businessType,
            location,
            employeeCount,
            maxAmountInWei, // Use Wei units to match claim submission format
            category,
            USDFC_TOKEN_ADDRESS, // Add USDFC token address as the last parameter
            passcodeHash
        );

        await contract.deployed();
        console.log('deployed contract...', contract.address);
        return contract;
    } catch (error) {
        console.error('Contract deployment error:', error);
        handleContractError(error, 'deploy contract');
    }
}

export const getMetadata = async (signer, address) => {
    const contract = new ethers.Contract(address, CLEARED_CONTRACT.abi, signer);
    const result = await contract.getPolicyMetadata();
    console.log('policy metadata result', result);
    console.log('raw maxAmount from contract:', result[2].maxAmount.toString());
    
    const formattedMaxAmount = ethers.utils.formatUnits(result[2].maxAmount, 18);
    console.log('formatted maxAmount:', formattedMaxAmount);
    
    return {
        name: result[0],
        description: result[1],
        policyParams: {
            businessType: result[2].businessType,
            location: result[2].location,
            employeeCount: result[2].employeeCount,
            maxAmount: formattedMaxAmount, // Keep as string to preserve precision
            category: result[2].category,
            isActive: result[2].isActive
        },
        claimCount: result[3].toNumber(),
        createdAt: formatDate(result[4].toNumber() * 1000),
        owner: result[5],
    };
};

// Submit a claim - employee only
export const submitClaim = async (signer, contractAddress, amount, description, receiptHash, receiptCid, passcode) => {
    try {
        const contract = new ethers.Contract(contractAddress, CLEARED_CONTRACT.abi, signer);
        
        console.log('Submitting claim:', {
            amount,
            description,
            receiptHash,
            receiptCid,
            passcode: passcode ? 'provided' : 'not provided'
        });
        
        // Validate that amount is a valid number
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            throw new Error(`Invalid amount: "${amount}". Amount must be a valid number greater than 0.`);
        }
        
        // Convert amount to proper units (assuming 18 decimals)
        const amountInWei = ethers.utils.parseUnits(numericAmount.toString(), 18);
        
        // Submit the claim to the contract with correct parameter order
        // Contract expects: _amount, _description, _receiptHash, _receiptCid, _passcode (as string, not hash)
        return await executeContractTransactionWithRetry(
            contract.submitClaim,
            [amountInWei, description, receiptHash, receiptCid || '', passcode || ''],
            'submit claim'
        );
        
    } catch (error) {
        console.error('Submit claim error:', error);
        handleContractError(error, 'submit claim');
    }
};

// Validate receipt using AI service
const validateReceipt = async (receiptImageUrl, description, amount) => {
    try {
        // This would integrate with your AI service for receipt validation
        // For now, return a basic validation
        console.log('Validating receipt:', { receiptImageUrl, description, amount });
        
        // Basic validation - ensure all required fields are present
        if (!receiptImageUrl || !description || !amount || amount <= 0) {
            return {
                isValid: false,
                reason: 'Missing required information or invalid amount'
            };
        }
        
        // TODO: Integrate with actual AI service for receipt validation
        // This is a placeholder that always validates successfully
        return {
            isValid: true,
            reason: 'Receipt validation passed'
        };
        
    } catch (error) {
        console.error('Receipt validation error:', error);
        return {
            isValid: false,
            reason: `Validation service error: ${error.message}`
        };
    }
};

export const processClaim = async (signer, address, claimId, status, reason) => {
    try {
        const contract = new ethers.Contract(address, CLEARED_CONTRACT.abi, signer);
        console.log('processing claim', claimId, status, reason);
        
        // Use the utility function for contract transaction with retry logic
        return await executeContractTransactionWithRetry(
            contract.processClaim,
            [claimId, status, reason || ''],
            'process claim'
        );
        
    } catch (error) {
        handleContractError(error, 'process claim');
    }
};

// Get claim details
export const getClaim = async (signer, address, claimId) => {
    const contract = new ethers.Contract(address, CLEARED_CONTRACT.abi, signer);
    console.log('getting claim', claimId);
    const result = await contract.getClaim(claimId);
    console.log('claim result', result);
    return {
        employee: result.employee,
        receiptHash: result.receiptHash,
        amount: parseFloat(ethers.utils.formatUnits(result.amount, 18)), // Convert from wei to USD dollars for consistency
        category: result.category,
        description: result.description,
        timestamp: formatDate(result.timestamp.toNumber() * 1000),
        status: result.status, // 0=Pending, 1=Approved, 2=Rejected
        rejectionReason: result.rejectionReason,
        receiptCid: result.receiptCid
    };
};

// Get employee's claims
export const getEmployeeClaims = async (signer, address, employeeAddress) => {
    const contract = new ethers.Contract(address, CLEARED_CONTRACT.abi, signer);
    console.log('getting employee claims', employeeAddress);
    const result = await contract.getEmployeeClaims(employeeAddress);
    console.log('employee claims result', result);
    return result.map(claimId => claimId.toNumber());
};

// Check if receipt hash has already been used (for duplicate prevention)
export const checkReceiptHash = async (signer, address, receiptHash) => {
    try {
        const contract = new ethers.Contract(address, CLEARED_CONTRACT.abi, signer);
        
        // This would check if the receipt hash already exists
        // Implementation depends on your contract's receipt tracking
        return false; // Placeholder - always returns false (not duplicate)
        
    } catch (error) {
        console.error('Receipt hash validation error:', error);
        handleContractError(error, 'validate receipt hash');
        return true; // Assume duplicate on error to be safe
    }
};

// Get contract USDFC balance
export const getContractUSDFCBalance = async (signer, address) => {
    try {
        const contract = new ethers.Contract(address, CLEARED_CONTRACT.abi, signer);
        return await contract.getContractBalance();
    } catch (error) {
        console.error('Error getting contract USDFC balance:', error);
        throw error;
    }
};

// Update policy status (activate/deactivate) - owner only
export const updatePolicyStatus = async (signer, address, isActive) => {
    const contract = new ethers.Contract(address, CLEARED_CONTRACT.abi, signer);
    console.log('updating policy status', isActive);
    const result = await contract.updatePolicyStatus(isActive);
    console.log('update policy status result', result);
    return result;
};

// USDFC-related functions

// Get user's USDFC balance
export const getUserUSDFCBalance = async (signer, userAddress) => {
    try {
        const contract = new ethers.Contract(USDFC_TOKEN_ADDRESS, [
            'function balanceOf(address account) external view returns (uint256)',
            'function symbol() external view returns (string)',
            'function decimals() external view returns (uint8)'
        ], signer);

        // Verify contract is accessible
        try {
            await contract.symbol();
        } catch (contractError) {
            console.error('USDFC contract verification failed in balance check:', contractError);
            throw new Error('Unable to connect to USDFC token contract. Please check your network connection and try again.');
        }

        const balance = await contract.balanceOf(userAddress);
        console.log('User USDFC balance:', balance.toString());
        return balance;
    } catch (error) {
        console.error('Error getting user USDFC balance:', error);
        if (error.message.includes('Unable to connect to USDFC')) {
            throw error;
        }
        throw new Error('Failed to check USDFC balance. Please ensure you are connected to the correct network and try again.');
    }
};

// Fund contract with USDFC
export const fundContractWithUSDFC = async (signer, contractAddress, amountString) => {
    try {
        console.log('=== Starting enhanced funding process ===');
        console.log('Funding contract - Input amount:', amountString);
        
        // Pre-validation checks
        if (!signer) {
            throw new Error('No signer available. Please ensure your wallet is connected.');
        }
        
        if (!contractAddress || contractAddress === ethers.constants.AddressZero) {
            throw new Error('Invalid contract address provided.');
        }
        
        // Check network connectivity and ETH balance first with comprehensive validation
        const userAddress = await signer.getAddress();
        console.log('User address:', userAddress);
        
        // Comprehensive ETH balance check
        try {
            const ethBalance = await signer.getBalance();
            const ethBalanceFormatted = ethers.utils.formatEther(ethBalance);
            console.log('User ETH balance:', ethBalanceFormatted);
            
            // More strict ETH requirement check for complex transactions
            const minEthRequired = ethers.utils.parseEther('0.02'); // Increased minimum for safety
            if (ethBalance.lt(minEthRequired)) {
                throw new Error(`Insufficient ETH for gas fees. You have ${ethBalanceFormatted} ETH but need at least 0.02 ETH for transaction fees. Please add more ETH to your wallet.`);
            }
        } catch (balanceError) {
            if (balanceError.message.includes('Insufficient ETH')) {
                throw balanceError; // Re-throw our custom error
            }
            console.warn('Could not check ETH balance:', balanceError.message);
            throw new Error('Unable to verify ETH balance. Please ensure your wallet is connected and try again.');
        }
        
        // Convert amount from string to proper units (18 decimals to match contract expectation)
        const amount = ethers.utils.parseUnits(amountString.toString(), 18);
        
        // Validate amount is reasonable (not zero, not extremely large)
        const maxReasonableAmount = ethers.utils.parseUnits('1000000', 18); // 1M USDFC max
        if (amount.lte(0)) {
            throw new Error('Funding amount must be greater than zero.');
        }
        if (amount.gt(maxReasonableAmount)) {
            throw new Error('Funding amount is unreasonably large. Please check the amount and try again.');
        }
        
        // Check user's USDFC balance with better error handling
        let userBalance;
        try {
            userBalance = await getUserUSDFCBalance(signer, userAddress);
            console.log('User USDFC balance:', ethers.utils.formatUnits(userBalance, 18));
        } catch (balanceCheckError) {
            console.error('Failed to check USDFC balance:', balanceCheckError);
            throw new Error('Unable to verify your USDFC balance. Please ensure you are connected to the correct network and try again.');
        }
        
        if (userBalance.lt(amount)) {
            throw new Error(`Insufficient USDFC balance. You have ${ethers.utils.formatUnits(userBalance, 18)} USDFC but need ${amountString} USDFC.`);
        }
        
        // Create USDFC token contract with comprehensive ERC20 ABI
        const usdtcContract = new ethers.Contract(USDFC_TOKEN_ADDRESS, [
            // Standard ERC20 functions
            'function allowance(address owner, address spender) external view returns (uint256)',
            'function approve(address spender, uint256 amount) external returns (bool)',
            'function transfer(address to, uint256 amount) external returns (bool)',
            'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
            'function balanceOf(address account) external view returns (uint256)',
            'function totalSupply() external view returns (uint256)',
            'function name() external view returns (string)',
            'function symbol() external view returns (string)',
            'function decimals() external view returns (uint8)',
            // Events
            'event Transfer(address indexed from, address indexed to, uint256 value)',
            'event Approval(address indexed owner, address indexed spender, uint256 value)'
        ], signer);
        
        // Verify the contract is valid by checking if it has the required methods
        try {
            await usdtcContract.symbol();
            console.log('USDFC contract interface verified successfully');
        } catch (contractError) {
            console.error('USDFC contract verification failed:', contractError);
            throw new Error('Unable to connect to USDFC token contract. Please check your network connection and try again.');
        }
        
        // Check current allowance with retry logic
        let currentAllowance;
        try {
            currentAllowance = await usdtcContract.allowance(userAddress, contractAddress);
            console.log('Current allowance:', ethers.utils.formatUnits(currentAllowance, 18));
        } catch (allowanceError) {
            console.warn('Failed to check current allowance, assuming zero allowance:', allowanceError.message);
            currentAllowance = ethers.BigNumber.from(0);
        }
        
        // If allowance is insufficient, approve the required amount
        if (currentAllowance.lt(amount)) {
            console.log('Insufficient allowance. Approving USDFC spend for contract:', contractAddress);
            
            try {
                console.log('Starting approval process...');
                
                // Use the specialized approval function with multiple retry strategies
                const approvalResult = await executeApprovalWithRetry(usdtcContract, contractAddress, amount);
                
                console.log('USDFC approval confirmed:', approvalResult.hash);
                
                // Add a small delay to ensure the approval is fully propagated
                console.log('Waiting for approval to propagate...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Verify the approval went through (with error handling)
                try {
                    const newAllowance = await usdtcContract.allowance(userAddress, contractAddress);
                    console.log('New allowance after approval:', ethers.utils.formatUnits(newAllowance, 18));
                    
                    if (newAllowance.lt(amount)) {
                        console.warn('Allowance verification shows insufficient amount, but continuing with transfer attempt');
                    }
                } catch (verifyError) {
                    console.warn('Could not verify new allowance, but continuing with transfer attempt:', verifyError.message);
                }
                
            } catch (approvalError) {
                console.error('Approval process failed:', approvalError);
                
                // Don't wrap the error if it's already user-friendly from executeApprovalWithRetry
                if (approvalError.message.includes('cancelled by user') ||
                    approvalError.message.includes('Insufficient ETH balance') ||
                    approvalError.message.includes('Token approval failed') ||
                    approvalError.message.includes('MetaMask encountered an internal error')) {
                    throw approvalError;
                }
                
                throw new Error(`Failed to approve USDFC spending: ${approvalError.message}. Please try again or check your wallet settings.`);
            }
        } else {
            console.log('Sufficient allowance already exists');
        }

        // Use the contract's fundContract function with enhanced preparation
        const contract = new ethers.Contract(contractAddress, CLEARED_CONTRACT.abi, signer);
        console.log('Funding contract through fundContract function...');
        
        // Triple-check all conditions before executing the funding transaction
        const finalAllowance = await usdtcContract.allowance(userAddress, contractAddress);
        console.log('Final allowance check before funding:', ethers.utils.formatUnits(finalAllowance, 18));
        
        if (finalAllowance.lt(amount)) {
            throw new Error('Final allowance verification failed. The contract does not have permission to transfer your USDFC tokens. Please try the approval process again.');
        }
        
        // Basic contract validation before attempting transaction (assuming caller is owner)
        try {
            // Verify contract is accessible by getting policy metadata
            const metadata = await contract.getPolicyMetadata();
            console.log('✅ Contract accessibility verified via getPolicyMetadata');
            
            // Check if the policy is active
            if (!metadata[2].isActive) {
                throw new Error('This policy is currently inactive and cannot be funded. Please activate the policy first.');
            }
            
            console.log('✅ Policy is active and ready for funding');
            
        } catch (contractCheckError) {
            if (contractCheckError.message.includes('policy is currently inactive')) {
                throw contractCheckError; // Re-throw our custom validation error
            }
            console.error('Contract validation failed:', contractCheckError.message);
            throw new Error('Cannot access the policy contract. Please verify the contract address and ensure you are connected to the correct network.');
        }
        
        // Final pre-flight validation: try to estimate gas for the funding transaction
        console.log('Performing final pre-flight validation...');
        try {
            const gasEstimate = await contract.estimateGas.fundContract(amount);
            console.log('✅ Pre-flight validation successful. Estimated gas:', gasEstimate.toString());
        } catch (preEstimateError) {
            console.error('❌ Pre-flight validation failed:', preEstimateError.message);
            
            // Analyze the pre-flight failure and provide specific guidance
            if (preEstimateError.message?.includes('insufficient funds')) {
                throw new Error('Pre-flight check failed: Insufficient funds for the transaction. Please ensure you have enough USDFC tokens and ETH for gas fees.');
            }
            if (preEstimateError.message?.includes('allowance')) {
                throw new Error('Pre-flight check failed: Token allowance issue. Please ensure you have approved the contract to spend your USDFC tokens.');
            }
            if (preEstimateError.message?.includes('execution reverted')) {
                throw new Error('Pre-flight check failed: The funding transaction would be rejected by the contract. Please verify all requirements are met.');
            }
            
            // For other pre-flight failures, provide general guidance
            throw new Error(`Pre-flight validation failed: ${preEstimateError.message}. The transaction would likely fail. Please check all requirements and try again.`);
        }
        
        // Small delay to ensure network stability
        console.log('All validations passed. Proceeding with funding transaction...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Execute the funding transaction (will show exactly ONE MetaMask prompt)
        console.log('🚀 Requesting user confirmation for funding transaction...');
        const result = await executeContractTransactionWithRetry(
            contract.fundContract,
            [amount],
            'fund contract'
        );
        
        console.log('=== Funding process completed successfully ===');
        return result;
        
    } catch (error) {
        console.error('Fund contract error:', error);
        
        // Re-throw specific error messages that are already user-friendly
        if (error.message.includes('Insufficient USDFC balance') ||
            error.message.includes('Failed to approve USDFC') ||
            error.message.includes('Approval verification failed') ||
            error.message.includes('Final allowance verification')) {
            throw error;
        }
        
        // Handle other specific errors
        if (error.message.includes('transfer amount exceeds allowance')) {
            throw new Error('Token allowance error detected. Please try the funding process again - the approval may need to be repeated.');
        }
        
        if (error.message.includes('transfer amount exceeds balance')) {
            throw new Error('Insufficient USDFC balance. Please check your wallet balance and try again.');
        }
        
        // Use the improved error handling
        handleContractError(error, 'fund contract');
    }
};

// Withdraw USDFC from contract - owner only
export const withdrawFromContract = async (signer, contractAddress, amountString) => {
    try {
        const amount = ethers.utils.parseUnits(amountString.toString(), 18);
        const contract = new ethers.Contract(contractAddress, CLEARED_CONTRACT.abi, signer);
        
        console.log('Withdrawing from contract:', amountString, 'USDFC');
        
        // Use the utility function for contract transaction with retry logic
        return await executeContractTransactionWithRetry(
            contract.withdrawFunds,
            [amount],
            'withdraw funds'
        );
        
    } catch (error) {
        console.error('Withdraw funds error:', error);
        handleContractError(error, 'withdraw funds');
    }
};

// Get funding and reimbursement totals
export const getFundingInfo = async (signer, contractAddress) => {
    try {
        const contract = new ethers.Contract(contractAddress, CLEARED_CONTRACT.abi, signer);

        const totalFunded = await contract.totalFunded();
        const totalReimbursed = await contract.totalReimbursed();

        console.log('Funding info - Total funded:', totalFunded.toString(), 'Total reimbursed:', totalReimbursed.toString());

        return {
            totalFunded,
            totalReimbursed,
            remainingBalance: totalFunded.sub(totalReimbursed)
        };
    } catch (error) {
        console.error('Error getting funding info:', error);
        throw error;
    }
};

// Get contract passcode status
export const getContractPasscodeStatus = async (signer, contractAddress) => {
    try {
        const contract = new ethers.Contract(contractAddress, CLEARED_CONTRACT.abi, signer);
        const hasPasscode = await contract.hasPasscode();
        console.log('Contract has passcode:', hasPasscode);
        return hasPasscode;
    } catch (error) {
        console.error('Error checking contract passcode status:', error);
        return false; // Default to no passcode if check fails
    }
};
