// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// IERC20 interface for USDFC token interactions
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract ClearedContract {
    // USDFC token contract address on Filecoin Calibration
    // This would be the actual USDFC contract address when deployed
    IERC20 public immutable usdfc;

    // Optional passcode hash for additional security
    bytes32 private passcodeHash;
    bool public hasPasscode;

    // Struct to represent a reimbursement claim
    struct ReimbursementClaim {
        address employee;
        bytes32 receiptHash;
        uint256 amount; // Amount in USDFC (scaled by 18 decimals)
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
        uint256 maxAmount; // Maximum amount in USDFC (scaled by 18 decimals)
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

    // Funding tracking
    uint256 public totalFunded = 0;
    uint256 public totalReimbursed = 0;

    // Events
    event PolicyCreated(address owner, string policyName, uint256 maxAmount, string category);
    event ClaimSubmitted(uint256 claimId, address employee, uint256 amount, string category);
    event ClaimProcessed(uint256 claimId, ClaimStatus status, string reason);
    event ReimbursementPaid(uint256 claimId, address employee, uint256 amount);
    event PolicyFunded(address funder, uint256 amount);
    event FundsWithdrawn(address owner, uint256 amount);

    constructor(
        string memory _policyName,
        string memory _policyDescription,
        string memory _businessType,
        string memory _location,
        string memory _employeeCount,
        uint256 _maxAmount,
        string memory _category,
        address _usdfc,
        bytes32 _passcodeHash
    ) {
        require(_usdfc != address(0), "USDFC token address cannot be zero");

        owner = msg.sender;
        usdfc = IERC20(_usdfc);
        policyName = _policyName;
        policyDescription = _policyDescription;

        // Set passcode if provided
        if (_passcodeHash != bytes32(0)) {
            passcodeHash = _passcodeHash;
            hasPasscode = true;
        }

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

    modifier validPasscode(string memory _passcode) {
        if (hasPasscode) {
            require(keccak256(abi.encodePacked(_passcode)) == passcodeHash, "Invalid passcode");
        }
        _;
    }

    // Submit a reimbursement claim
    function submitClaim(
        uint256 _amount,
        string memory _description,
        bytes32 _receiptHash,
        string memory _receiptCid,
        string memory _passcode
    ) public onlyActivePolicy validPasscode(_passcode) {
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
        } else if (_status == ClaimStatus.Approved) {
            // Automatically transfer USDFC to employee when approved
            uint256 contractBalance = usdfc.balanceOf(address(this));
            require(contractBalance >= claim.amount, "Insufficient USDFC balance in contract");

            // Transfer USDFC to employee
            bool success = usdfc.transfer(claim.employee, claim.amount);
            require(success, "USDFC transfer failed");

            // Update tracking
            totalReimbursed += claim.amount;

            emit ReimbursementPaid(_claimId, claim.employee, claim.amount);
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

    // Fund contract with USDFC (owner only)
    function fundContract(uint256 _amount) public onlyOwner {
        require(_amount > 0, "Amount must be greater than 0");

        // Transfer USDFC from owner to contract
        bool success = usdfc.transferFrom(msg.sender, address(this), _amount);
        require(success, "USDFC transfer failed");

        totalFunded += _amount;
        emit PolicyFunded(msg.sender, _amount);
    }

    // Withdraw USDFC from contract (owner only)
    function withdrawFunds(uint256 _amount) public onlyOwner {
        require(_amount > 0, "Amount must be greater than 0");

        uint256 contractBalance = usdfc.balanceOf(address(this));
        require(contractBalance >= _amount, "Insufficient contract balance");

        // Transfer USDFC from contract to owner
        bool success = usdfc.transfer(msg.sender, _amount);
        require(success, "USDFC transfer failed");

        emit FundsWithdrawn(msg.sender, _amount);
    }

    // Get contract USDFC balance
    function getContractBalance() public view returns (uint256) {
        return usdfc.balanceOf(address(this));
    }

    // Get USDFC token address
    function getUSDFCAddress() public view returns (address) {
        return address(usdfc);
    }
}
