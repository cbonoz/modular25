import {
    filecoinCalibration
} from '@wagmi/core/chains';

export const siteConfig = {
    name: 'Cleared',
    description: 'Self-governing reimbursements cleared on-chain with AI and human review.',
    cta: {
        primary: 'Create your Reimbursement policy',
        secondary: 'Learn more'
    },
    logo: {
        width: 180,
        height: 37,
        alt: 'Cleared Logo'
    }
};

// Legacy exports for backward compatibility
export const APP_NAME = siteConfig.name;
export const APP_DESC = siteConfig.description;

// https://wagmi.sh/react/chains
export const CHAIN_OPTIONS = [filecoinCalibration];

export const CHAIN_MAP = CHAIN_OPTIONS.reduce((acc, chain) => {
    acc[chain.id] = chain;
    return acc;
}, {});

export const ACTIVE_CHAIN = CHAIN_OPTIONS[0]; // scrollSepolia;

export const EXAMPLE_ITEM = {

};

export const IPFS_BASE_URL = 'https://ipfs.io/ipfs';

export const MAX_FILE_SIZE_BYTES = 5000000; // 5MB
