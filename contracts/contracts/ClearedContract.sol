// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ClearedContract {
    // Struct to represent a reimbursement claim
    struct ReimbursementClaim {
        address employee;
        bytes32 receiptHash;
        uint256 amount;
        string category;
        string description;
        uint timestamp;
        ClaimStatus status;
        string rejectionReason;
        string receiptCid; // IPFS CID for receipt storage
    }

    // Struct to represent policy parameters
    struct PolicyParams {
        string businessType;
        string location;
        string employeeCount;
        uint256 maxAmount;
        string category;
        bool isActive;
    }

    enum ClaimStatus { Pending, Approved, Rejected }

    // Contract owner (business administrator)
    address private owner;

    // Policy information
    string public policyName;
    string public policyDescription;
    PolicyParams public policyParams;
    uint public createdAt = block.timestamp;

    // Claims tracking
    uint256 public claimCount = 0;
    mapping(uint256 => ReimbursementClaim) public claims;
    mapping(address => uint256[]) public employeeClaims;

    // Events
    event PolicyCreated(address owner, string policyName, uint256 maxAmount, string category);
    event ClaimSubmitted(uint256 claimId, address employee, uint256 amount, string category);
    event ClaimProcessed(uint256 claimId, ClaimStatus status, string reason);

    constructor(
        string memory _policyName,
        string memory _policyDescription,
        string memory _businessType,
        string memory _location,
        string memory _employeeCount,
        uint256 _maxAmount,
        string memory _category
    ) {
        owner = msg.sender;
        policyName = _policyName;
        policyDescription = _policyDescription;

        policyParams = PolicyParams({
            businessType: _businessType,
            location: _location,
            employeeCount: _employeeCount,
            maxAmount: _maxAmount,
            category: _category,
            isActive: true
        });

        emit PolicyCreated(owner, _policyName, _maxAmount, _category);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only policy owner can perform this action");
        _;
    }

    modifier onlyActivePolicy() {
        require(policyParams.isActive, "Policy is not active");
        _;
    }

    // Submit a reimbursement claim
    function submitClaim(
        uint256 _amount,
        string memory _description,
        bytes32 _receiptHash,
        string memory _receiptCid
    ) public onlyActivePolicy {
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= policyParams.maxAmount, "Amount exceeds policy maximum");
        require(_receiptHash != bytes32(0), "Receipt hash required");

        claimCount++;

        ReimbursementClaim memory newClaim = ReimbursementClaim({
            employee: msg.sender,
            receiptHash: _receiptHash,
            amount: _amount,
            category: policyParams.category,
            description: _description,
            timestamp: block.timestamp,
            status: ClaimStatus.Pending,
            rejectionReason: "",
            receiptCid: _receiptCid
        });

        claims[claimCount] = newClaim;
        employeeClaims[msg.sender].push(claimCount);

        emit ClaimSubmitted(claimCount, msg.sender, _amount, policyParams.category);
    }

    // Process a claim (approve/reject) - only owner
    function processClaim(
        uint256 _claimId,
        ClaimStatus _status,
        string memory _reason
    ) public onlyOwner {
        require(_claimId > 0 && _claimId <= claimCount, "Invalid claim ID");
        require(_status != ClaimStatus.Pending, "Must approve or reject");

        ReimbursementClaim storage claim = claims[_claimId];
        require(claim.status == ClaimStatus.Pending, "Claim already processed");

        claim.status = _status;
        if (_status == ClaimStatus.Rejected) {
            claim.rejectionReason = _reason;
        }

        emit ClaimProcessed(_claimId, _status, _reason);
    }

    // Get claim details
    function getClaim(uint256 _claimId) public view returns (ReimbursementClaim memory) {
        require(_claimId > 0 && _claimId <= claimCount, "Invalid claim ID");
        return claims[_claimId];
    }

    // Get employee's claims
    function getEmployeeClaims(address _employee) public view returns (uint256[] memory) {
        return employeeClaims[_employee];
    }

    // Get policy metadata
    function getPolicyMetadata() public view returns (
        string memory,
        string memory,
        PolicyParams memory,
        uint256,
        uint256,
        address
    ) {
        return (policyName, policyDescription, policyParams, claimCount, createdAt, owner);
    }

    // Get owner address
    function getOwner() public view returns (address) {
        return owner;
    }

    // Update policy status (activate/deactivate)
    function updatePolicyStatus(bool _isActive) public onlyOwner {
        policyParams.isActive = _isActive;
    }

    // Validate receipt exists in the system
    function validateReceipt(bytes32 _receiptHash) public view returns (bool exists, uint256 claimId) {
        for (uint256 i = 1; i <= claimCount; i++) {
            if (claims[i].receiptHash == _receiptHash) {
                return (true, i);
            }
        }
        return (false, 0);
    }
}
