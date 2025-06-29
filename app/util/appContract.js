import { ethers } from 'ethers';
import { CLEARED_CONTRACT } from './metadata';
import { formatDate } from '.';

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
    const contract = await factory.deploy(
        policyName,
        policyDescription,
        businessType,
        location,
        employeeCount,
        ethers.utils.parseUnits(maxAmount.toString(), 0), // Convert to wei-like units
        category
    );
    
    console.log(
        'Deploying reimbursement policy contract...',
        policyName,
        policyDescription,
        businessType,
        location,
        employeeCount,
        maxAmount,
        category
    );

    await contract.deployed();
    console.log('deployed contract...', contract.address);
    return contract;
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
    const amountInWei = ethers.utils.parseUnits(amount.toString(), 0);
    const result = await contract.submitClaim(amountInWei, description, receiptHash, receiptCid);
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
