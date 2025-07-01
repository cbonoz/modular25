import { ethers } from 'ethers';
import { CLEARED_CONTRACT } from './metadata';
import { formatDate } from '.';
import { USDFC_TOKEN_ADDRESS } from '../constants';

export async function deployContract(
    signer,
    policyName,
    policyDescription,
    businessType,
    location,
    employeeCount,
    maxAmount,
    category
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

        console.log(
            'Deploying reimbursement policy contract...',
            policyName,
            policyDescription,
            businessType,
            location,
            employeeCount,
            maxAmount,
            category,
            'USDFC Address:',
            USDFC_TOKEN_ADDRESS
        );

        const contract = await factory.deploy(
            policyName,
            policyDescription,
            businessType,
            location,
            employeeCount,
            parseInt(maxAmount), // Convert to integer instead of using parseUnits
            category,
            USDFC_TOKEN_ADDRESS // Add USDFC token address as the last parameter
        );

        await contract.deployed();
        console.log('deployed contract...', contract.address);
        return contract;
    } catch (error) {
        console.error('Contract deployment error:', error);

        // Check for common network-related errors
        if (error.message.includes('network changed') || error.message.includes('Network')) {
            throw new Error('Network changed during deployment. Please refresh the page and try again.');
        }

        if (error.message.includes('user rejected')) {
            throw new Error('Transaction was rejected by user.');
        }

        if (error.message.includes('insufficient funds')) {
            throw new Error('Insufficient funds for gas fees.');
        }

        // Re-throw the original error if it's not a known network issue
        throw error;
    }
}

export const getMetadata = async (signer, address) => {
    const contract = new ethers.Contract(address, CLEARED_CONTRACT.abi, signer);
    const result = await contract.getPolicyMetadata();
    console.log('policy metadata result', result);
    return {
        name: result[0],
        description: result[1],
        policyParams: {
            businessType: result[2].businessType,
            location: result[2].location,
            employeeCount: result[2].employeeCount,
            maxAmount: result[2].maxAmount.toNumber(),
            category: result[2].category,
            isActive: result[2].isActive
        },
        claimCount: result[3].toNumber(),
        createdAt: formatDate(result[4].toNumber() * 1000),
        owner: result[5],
    };
};

// Submit a reimbursement claim
export const submitClaim = async (signer, address, amount, description, receiptHash, receiptCid) => {
    const contract = new ethers.Contract(address, CLEARED_CONTRACT.abi, signer);
    console.log('submitting claim', amount, description, receiptHash, receiptCid);
    const amountAsInteger = parseInt(amount);
    const result = await contract.submitClaim(amountAsInteger, description, receiptHash, receiptCid);
    console.log('submit claim result', result);
    await result.wait(); // Wait for transaction confirmation
    return result;
};

// Process a claim (approve/reject) - owner only
export const processClaim = async (signer, address, claimId, status, reason) => {
    const contract = new ethers.Contract(address, CLEARED_CONTRACT.abi, signer);
    console.log('processing claim', claimId, status, reason);
    const result = await contract.processClaim(claimId, status, reason || '');
    console.log('process claim result', result);
    await result.wait();
    return result;
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
        amount: result.amount.toNumber(),
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

// Validate receipt
export const validateReceipt = async (signer, address, receiptHash) => {
    const contract = new ethers.Contract(address, CLEARED_CONTRACT.abi, signer);
    console.log('validating receipt', receiptHash);
    const result = await contract.validateReceipt(receiptHash);
    console.log('validate receipt result', result);
    return {
        exists: result.exists,
        claimId: result.claimId.toNumber()
    };
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

// Get USDFC balance of the contract
export const getContractUSDFCBalance = async (signer, contractAddress) => {
    try {
        const contract = new ethers.Contract(contractAddress, CLEARED_CONTRACT.abi, signer);
        const balance = await contract.getContractBalance();
        console.log('Contract USDFC balance:', balance.toString());
        return balance;
    } catch (error) {
        console.error('Error getting contract USDFC balance:', error);
        throw error;
    }
};

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
export const fundContractWithUSDFC = async (signer, contractAddress, amount) => {
    try {
        // First approve the contract to spend USDFC
        const usdtcContract = new ethers.Contract(USDFC_TOKEN_ADDRESS, [
            'function approve(address spender, uint256 amount) external returns (bool)',
            'function transfer(address to, uint256 amount) external returns (bool)',
            'function transferFrom(address from, address to, uint256 amount) external returns (bool)'
        ], signer);

        console.log('Approving USDFC spend for contract:', contractAddress, 'amount:', amount.toString());
        const approveTx = await usdtcContract.approve(contractAddress, amount);
        await approveTx.wait();
        console.log('USDFC approval confirmed');

        // Use the contract's fundContract function
        const contract = new ethers.Contract(contractAddress, CLEARED_CONTRACT.abi, signer);
        console.log('Funding contract through fundContract function...');
        const fundTx = await contract.fundContract(amount);
        await fundTx.wait();
        console.log('Contract funding confirmed');

        return fundTx;
    } catch (error) {
        console.error('Error funding contract with USDFC:', error);
        if (error.message.includes('user rejected')) {
            throw new Error('Transaction was rejected by user.');
        }
        if (error.message.includes('insufficient balance')) {
            throw new Error('Insufficient USDFC balance.');
        }
        throw error;
    }
};

// Withdraw USDFC from contract (owner only)
export const withdrawFromContract = async (signer, contractAddress, amount) => {
    try {
        const contract = new ethers.Contract(contractAddress, CLEARED_CONTRACT.abi, signer);

        console.log('Withdrawing from contract:', contractAddress, 'amount:', amount.toString());
        const withdrawTx = await contract.withdrawFunds(amount);
        await withdrawTx.wait();
        console.log('Withdrawal confirmed');

        return withdrawTx;
    } catch (error) {
        console.error('Error withdrawing from contract:', error);
        if (error.message.includes('user rejected')) {
            throw new Error('Transaction was rejected by user.');
        }
        if (error.message.includes('Insufficient contract balance')) {
            throw new Error('Insufficient contract balance for withdrawal.');
        }
        if (error.message.includes('Only policy owner')) {
            throw new Error('Only the policy owner can withdraw funds.');
        }
        throw error;
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
