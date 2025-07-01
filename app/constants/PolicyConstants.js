// Constants for PolicyDetail component

export const POLICY_CONSTANTS = {
    CLAIM_STATUS: {
        PENDING: 0,
        APPROVED: 1,
        REJECTED: 2
    },

    STATUS_COLORS: {
        0: '#faad14', // Pending - yellow
        1: '#52c41a', // Approved - green
        2: '#ff4d4f', // Rejected - red
        default: '#d9d9d9'
    },

    STATUS_TEXTS: {
        0: 'Pending',
        1: 'Approved',
        2: 'Rejected',
        default: 'Unknown'
    }
};

export const getStatusColor = (status) => {
    return POLICY_CONSTANTS.STATUS_COLORS[status] || POLICY_CONSTANTS.STATUS_COLORS.default;
};

export const getStatusText = (status) => {
    return POLICY_CONSTANTS.STATUS_TEXTS[status] || POLICY_CONSTANTS.STATUS_TEXTS.default;
};

export const RESULT_MESSAGES = {
    CLAIM_SUBMITTED: 'claim_submitted',
    RECEIPT_VALIDATION: 'receipt_validation',
    CLAIM_PROCESSED: 'claim_processed',
    POLICY_STATUS_UPDATED: 'policy_status_updated',
    CONTRACT_FUNDED: 'contract_funded',
    CONTRACT_WITHDRAWAL: 'contract_withdrawal'
};
