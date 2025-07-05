import {
    filecoin,
    filecoinCalibration
} from '@wagmi/core/chains';

export const siteConfig = {
    title: 'Cleared | On-chain reimbursement policies',
    name: 'Cleared',
    description: 'Generate one click reimbursement URLs with self-governing policies cleared on-chain with AI and human review.',
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

// Use environment variable to determine active chain
// In production (NEXT_PUBLIC_NETWORK=mainnet), use filecoin mainnet
// In development, use filecoinCalibration testnet
const isProduction = process.env.NEXT_PUBLIC_NETWORK === 'mainnet';
export const ACTIVE_CHAIN = isProduction ? filecoin : filecoinCalibration;

export const IPFS_BASE_URL = 'https://ipfs.io/ipfs';

export const MAX_FILE_SIZE_BYTES = 5000000; // 5MB

// https://docs.secured.finance/usdfc-stablecoin/deployed-contracts
// USDFC token address - different for mainnet vs testnet
export const USDFC_TOKEN_ADDRESS = isProduction 
    ? '0x80B98d3aa09ffff255c3ba4A241111Ff1262F045'
    : '0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0';

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
