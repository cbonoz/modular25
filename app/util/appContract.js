import { ethers } from 'ethers';
import { CLEARED_CONTRACT } from './metadata';
import { formatDate, handleContractError, executeContractTransactionWithRetry, validateTransactionInputs } from '.';
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
            'function balanceOf(address account) external view returns (uint256)'
        ], signer);

        const balance = await contract.balanceOf(userAddress);
        console.log('User USDFC balance:', balance.toString());
        return balance;
    } catch (error) {
        console.error('Error getting user USDFC balance:', error);
        throw error;
    }
};

// Fund contract with USDFC
export const fundContractWithUSDFC = async (signer, contractAddress, amountString) => {
    try {
        // Convert amount from string to proper units (18 decimals to match contract expectation)
        const amount = ethers.utils.parseUnits(amountString.toString(), 18);
        
        console.log('Funding contract - Input amount:', amountString, 'Parsed amount:', amount.toString());
        
        // Get the current user's address for balance checking
        const userAddress = await signer.getAddress();
        console.log('User address:', userAddress);
        
        // Check user's USDFC balance first
        const userBalance = await getUserUSDFCBalance(signer, userAddress);
        console.log('User USDFC balance:', ethers.utils.formatUnits(userBalance, 18));
        
        if (userBalance.lt(amount)) {
            throw new Error(`Insufficient USDFC balance. You have ${ethers.utils.formatUnits(userBalance, 18)} USDFC but need ${amountString} USDFC.`);
        }
        
        // Check current allowance
        const usdtcContract = new ethers.Contract(USDFC_TOKEN_ADDRESS, [
            'function allowance(address owner, address spender) external view returns (uint256)',
            'function approve(address spender, uint256 amount) external returns (bool)',
            'function transfer(address to, uint256 amount) external returns (bool)',
            'function transferFrom(address from, address to, uint256 amount) external returns (bool)'
        ], signer);
        
        const currentAllowance = await usdtcContract.allowance(userAddress, contractAddress);
        console.log('Current allowance:', ethers.utils.formatUnits(currentAllowance, 18));
        
        // If allowance is insufficient, approve a larger amount to avoid frequent approvals
        if (currentAllowance.lt(amount)) {
            console.log('Insufficient allowance. Approving USDFC spend for contract:', contractAddress);
            
            // Reset allowance to 0 first (some tokens require this)
            try {
                const resetTx = await usdtcContract.approve(contractAddress, 0);
                await resetTx.wait();
                console.log('Allowance reset to 0');
            } catch (resetError) {
                console.log('Allowance reset failed (this is OK for most tokens):', resetError.message);
            }
            
            // Approve the exact amount needed
            console.log('Approving amount:', amount.toString());
            const approveTx = await usdtcContract.approve(contractAddress, amount);
            console.log('Approval transaction sent:', approveTx.hash);
            
            // Wait for approval with proper confirmation
            const receipt = await approveTx.wait();
            console.log('USDFC approval confirmed in block:', receipt.blockNumber);
            
            // Add a small delay to ensure the approval is fully propagated
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Verify the approval went through
            const newAllowance = await usdtcContract.allowance(userAddress, contractAddress);
            console.log('New allowance after approval:', ethers.utils.formatUnits(newAllowance, 18));
            
            if (newAllowance.lt(amount)) {
                throw new Error('Approval failed. The allowance was not set correctly. Please try again.');
            }
        } else {
            console.log('Sufficient allowance already exists');
        }

        // Use the contract's fundContract function with retry mechanism
        const contract = new ethers.Contract(contractAddress, CLEARED_CONTRACT.abi, signer);
        console.log('Funding contract through fundContract function...');
        
        // Double-check allowance right before the transaction
        const finalAllowance = await usdtcContract.allowance(userAddress, contractAddress);
        console.log('Final allowance check before funding:', ethers.utils.formatUnits(finalAllowance, 18));
        
        if (finalAllowance.lt(amount)) {
            throw new Error('Allowance verification failed. The contract does not have permission to transfer your USDFC tokens.');
        }
        
        // Use the utility function for contract transaction with retry logic
        return await executeContractTransactionWithRetry(
            contract.fundContract,
            [amount],
            'fund contract'
        );
        
    } catch (error) {
        console.error('Fund contract error:', error);
        
        if (error.message.includes('Insufficient USDFC balance')) {
            throw error; // Pass through the detailed balance message
        }
        if (error.message.includes('Approval failed') || error.message.includes('Allowance')) {
            throw error; // Pass through approval errors
        }
        if (error.message.includes('transfer amount exceeds allowance')) {
            throw new Error('Token allowance error. Please try the funding process again - the approval may need to be repeated.');
        }
        
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

// Debug function to check ownership and USDFC details
export const debugFundingPrerequisites = async (signer, contractAddress, amountString) => {
    try {
        console.log('=== DEBUGGING FUNDING PREREQUISITES ===');
        
        // Validate amount parameter first
        if (!amountString || amountString.toString().trim() === '') {
            throw new Error('Amount is required and cannot be empty');
        }
        
        const numericAmount = parseFloat(amountString);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            throw new Error(`Invalid amount: "${amountString}". Amount must be a valid number greater than 0.`);
        }
        
        // Get user address
        const userAddress = await signer.getAddress();
        console.log('User address:', userAddress);
        
        // Get contract owner
        const contract = new ethers.Contract(contractAddress, CLEARED_CONTRACT.abi, signer);
        const owner = await contract.getOwner();
        console.log('Contract owner:', owner);
        console.log('Is user the owner?', userAddress.toLowerCase() === owner.toLowerCase());
        
        // Get USDFC token address from contract
        const usdfc_address = await contract.getUSDFCAddress();
        console.log('USDFC token address from contract:', usdfc_address);
        console.log('Expected USDFC address:', USDFC_TOKEN_ADDRESS);
        console.log('USDFC addresses match?', usdfc_address.toLowerCase() === USDFC_TOKEN_ADDRESS.toLowerCase());
        
        // Check user USDFC balance
        const userBalance = await getUserUSDFCBalance(signer, userAddress);
        console.log('User USDFC balance:', ethers.utils.formatUnits(userBalance, 18));
        
        // Check amount conversion - now safe to parse since we validated above
        const amount = ethers.utils.parseUnits(numericAmount.toString(), 18);
        console.log('Amount to fund (parsed):', amount.toString());
        console.log('Amount to fund (formatted):', ethers.utils.formatUnits(amount, 18));
        
        // Check if user has enough balance
        const hasEnoughBalance = userBalance.gte(amount);
        console.log('User has enough balance?', hasEnoughBalance);
        
        // Check current allowance
        const usdtcContract = new ethers.Contract(USDFC_TOKEN_ADDRESS, [
            'function allowance(address owner, address spender) external view returns (uint256)',
            'function balanceOf(address account) external view returns (uint256)'
        ], signer);
        
        const currentAllowance = await usdtcContract.allowance(userAddress, contractAddress);
        console.log('Current allowance:', ethers.utils.formatUnits(currentAllowance, 18));
        console.log('Allowance sufficient?', currentAllowance.gte(amount));
        
        // Try to estimate gas for the funding transaction
        try {
            const gasEstimate = await contract.estimateGas.fundContract(amount);
            console.log('Gas estimate for fundContract:', gasEstimate.toString());
        } catch (gasError) {
            console.error('Gas estimation failed:', gasError.message);
        }
        
        console.log('=== END DEBUG ===');
        
        return {
            userAddress,
            owner,
            isOwner: userAddress.toLowerCase() === owner.toLowerCase(),
            userBalance: ethers.utils.formatUnits(userBalance, 18),
            amount: ethers.utils.formatUnits(amount, 18),
            hasEnoughBalance,
            currentAllowance: ethers.utils.formatUnits(currentAllowance, 18),
            allowanceSufficient: currentAllowance.gte(amount)
        };
    } catch (error) {
        console.error('Error in debug function:', error);
        throw error;
    }
};
