import {
    filecoin,
    filecoinCalibration
} from '@wagmi/core/chains';

export const siteConfig = {
    title: 'Cleared | Self-governing Reimbursements',
    name: 'Cleared',
    description: 'Self-governing reimbursements cleared on-chain with AI and human review.',
    cta: {
        primary: 'Create your Reimbursement policy',
        secondary: 'Learn more'
    },
    logo: {
        url : '/logo.png',
        width: 180,
        height: 37,
        alt: 'Cleared Logo'
    }
};

// Legacy exports for backward compatibility
export const APP_NAME = siteConfig.name;
export const APP_DESC = siteConfig.description;

// https://wagmi.sh/react/chains
export const CHAIN_OPTIONS = [filecoinCalibration, filecoin];

export const CHAIN_MAP = CHAIN_OPTIONS.reduce((acc, chain) => {
    acc[chain.id] = chain;
    return acc;
}, {});

export const ACTIVE_CHAIN = CHAIN_OPTIONS[0]; // scrollSepolia;

export const EXAMPLE_ITEM = {

};

export const IPFS_BASE_URL = 'https://ipfs.io/ipfs';

export const MAX_FILE_SIZE_BYTES = 5000000; // 5MB

// USDFC token address on Filecoin Calibration testnet
// Using a placeholder for now - replace with actual USDFC token address when available
export const USDFC_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000001'; // TODO: Replace with actual USDFC address

// US States for location dropdown
export const US_STATES = [
    { value: 'alabama', label: 'Alabama' },
    { value: 'alaska', label: 'Alaska' },
    { value: 'arizona', label: 'Arizona' },
    { value: 'arkansas', label: 'Arkansas' },
    { value: 'california', label: 'California' },
    { value: 'colorado', label: 'Colorado' },
    { value: 'connecticut', label: 'Connecticut' },
    { value: 'delaware', label: 'Delaware' },
    { value: 'florida', label: 'Florida' },
    { value: 'georgia', label: 'Georgia' },
    { value: 'hawaii', label: 'Hawaii' },
    { value: 'idaho', label: 'Idaho' },
    { value: 'illinois', label: 'Illinois' },
    { value: 'indiana', label: 'Indiana' },
    { value: 'iowa', label: 'Iowa' },
    { value: 'kansas', label: 'Kansas' },
    { value: 'kentucky', label: 'Kentucky' },
    { value: 'louisiana', label: 'Louisiana' },
    { value: 'maine', label: 'Maine' },
    { value: 'maryland', label: 'Maryland' },
    { value: 'massachusetts', label: 'Massachusetts' },
    { value: 'michigan', label: 'Michigan' },
    { value: 'minnesota', label: 'Minnesota' },
    { value: 'mississippi', label: 'Mississippi' },
    { value: 'missouri', label: 'Missouri' },
    { value: 'montana', label: 'Montana' },
    { value: 'nebraska', label: 'Nebraska' },
    { value: 'nevada', label: 'Nevada' },
    { value: 'new-hampshire', label: 'New Hampshire' },
    { value: 'new-jersey', label: 'New Jersey' },
    { value: 'new-mexico', label: 'New Mexico' },
    { value: 'new-york', label: 'New York' },
    { value: 'north-carolina', label: 'North Carolina' },
    { value: 'north-dakota', label: 'North Dakota' },
    { value: 'ohio', label: 'Ohio' },
    { value: 'oklahoma', label: 'Oklahoma' },
    { value: 'oregon', label: 'Oregon' },
    { value: 'pennsylvania', label: 'Pennsylvania' },
    { value: 'rhode-island', label: 'Rhode Island' },
    { value: 'south-carolina', label: 'South Carolina' },
    { value: 'south-dakota', label: 'South Dakota' },
    { value: 'tennessee', label: 'Tennessee' },
    { value: 'texas', label: 'Texas' },
    { value: 'utah', label: 'Utah' },
    { value: 'vermont', label: 'Vermont' },
    { value: 'virginia', label: 'Virginia' },
    { value: 'washington', label: 'Washington' },
    { value: 'west-virginia', label: 'West Virginia' },
    { value: 'wisconsin', label: 'Wisconsin' },
    { value: 'wyoming', label: 'Wyoming' },
    { value: 'district-of-columbia', label: 'District of Columbia' },
    { value: 'other', label: 'Other/International' }
];
