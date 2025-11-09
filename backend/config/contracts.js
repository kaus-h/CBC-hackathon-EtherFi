/**
 * EtherFi Contract Configuration
 * Contains contract addresses and ABIs for Ethereum mainnet
 */

/**
 * EtherFi Contract Addresses on Ethereum Mainnet
 */
const ADDRESSES = {
    // eETH Token (verified address from prompt)
    EETH_TOKEN: '0x35fA164735182de50811E8e2E824cFb9B6118ac2',

    // EtherFi Core Contracts (these will be verified during initialization)
    LIQUIDITY_POOL: '0x308861A430be4cce5502d0A12724771Fc6DaF216', // EtherFi Liquidity Pool
    STAKING_MANAGER: '0x3d320286E014C3e1ce99Af6d6B00f0C1D63E3000', // EtherFi Staking Manager (approximate)
    WITHDRAWAL_SAFE: '0x0EF8fa4760Db8f5Cd4d993f3e3416f30f942D705', // Withdrawal Safe (approximate)

    // Additional contracts to monitor
    LIQUIDITY_POOL_OLD: '0x308861A430be4cce5502d0A12724771Fc6DaF216',

    // WETH for price comparisons
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',

    // Price oracles (if needed)
    ETH_USD_ORACLE: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419' // Chainlink ETH/USD
};

/**
 * ERC20 Token ABI (minimal)
 * For querying eETH token data
 */
const ERC20_ABI = [
    // Read functions
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',

    // Events
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)'
];

/**
 * EtherFi Liquidity Pool ABI (minimal)
 * For querying TVL and pool metrics
 */
const LIQUIDITY_POOL_ABI = [
    'function getTotalPooledEther() view returns (uint256)',
    'function getTotalEtherClaimOf(address user) view returns (uint256)',
    'function sharesForAmount(uint256 amount) view returns (uint256)',
    'function amountForShare(uint256 shares) view returns (uint256)',

    // Events
    'event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)',
    'event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)'
];

/**
 * Generic ERC20 Vault/Pool ABI
 * For interacting with staking vaults
 */
const VAULT_ABI = [
    'function totalAssets() view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function convertToAssets(uint256 shares) view returns (uint256)',
    'function convertToShares(uint256 assets) view returns (uint256)',
    'function maxDeposit(address) view returns (uint256)',
    'function maxMint(address) view returns (uint256)',
    'function maxWithdraw(address owner) view returns (uint256)',
    'function maxRedeem(address owner) view returns (uint256)',

    'event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)',
    'event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)'
];

/**
 * Chainlink Price Oracle ABI (minimal)
 * For getting ETH/USD price
 */
const CHAINLINK_ORACLE_ABI = [
    'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
    'function decimals() view returns (uint8)'
];

/**
 * Get contract configuration by name
 * @param {string} contractName Name of the contract
 * @returns {object} Contract config with address and ABI
 */
function getContractConfig(contractName) {
    const configs = {
        EETH_TOKEN: {
            address: ADDRESSES.EETH_TOKEN,
            abi: ERC20_ABI,
            name: 'eETH Token'
        },
        LIQUIDITY_POOL: {
            address: ADDRESSES.LIQUIDITY_POOL,
            abi: LIQUIDITY_POOL_ABI,
            name: 'EtherFi Liquidity Pool'
        },
        STAKING_MANAGER: {
            address: ADDRESSES.STAKING_MANAGER,
            abi: VAULT_ABI,
            name: 'EtherFi Staking Manager'
        },
        WITHDRAWAL_SAFE: {
            address: ADDRESSES.WITHDRAWAL_SAFE,
            abi: VAULT_ABI,
            name: 'EtherFi Withdrawal Safe'
        },
        WETH: {
            address: ADDRESSES.WETH,
            abi: ERC20_ABI,
            name: 'Wrapped Ether'
        },
        ETH_USD_ORACLE: {
            address: ADDRESSES.ETH_USD_ORACLE,
            abi: CHAINLINK_ORACLE_ABI,
            name: 'Chainlink ETH/USD Oracle'
        }
    };

    return configs[contractName];
}

/**
 * Get all EtherFi contract addresses
 * @returns {object} All contract addresses
 */
function getAllAddresses() {
    return ADDRESSES;
}

/**
 * Validate contract address format
 * @param {string} address Ethereum address
 * @returns {boolean} True if valid
 */
function isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get event signatures for tracking
 * @returns {object} Event signatures
 */
function getEventSignatures() {
    return {
        // ERC20 Transfer
        TRANSFER: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',

        // Deposit event
        DEPOSIT: '0xdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d7',

        // Withdraw event
        WITHDRAW: '0xfbde797d201c681b91056529119e0b02407c7bb96a4a2c75c01fc9667232c8db'
    };
}

/**
 * Network configuration
 */
const NETWORK_CONFIG = {
    chainId: 1, // Ethereum Mainnet
    name: 'Ethereum Mainnet',
    rpcUrl: process.env.ALCHEMY_RPC_URL || `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    blockTime: 12, // Average block time in seconds
    confirmations: 1 // Number of confirmations to wait
};

/**
 * Data collection configuration
 */
const COLLECTION_CONFIG = {
    // How often to collect data (in milliseconds)
    COLLECTION_INTERVAL: 5 * 60 * 1000, // 5 minutes

    // How often to run AI analysis (in milliseconds)
    ANALYSIS_INTERVAL: 30 * 60 * 1000, // 30 minutes

    // Historical data to fetch on initialization
    HISTORICAL_DAYS: 30,

    // Number of top whale wallets to track
    TOP_WHALES_COUNT: 20,

    // Batch size for historical data fetching
    BATCH_SIZE: 1000,

    // Rate limiting
    MAX_REQUESTS_PER_MINUTE: 30,

    // Retry configuration
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second

    // Block range for event queries
    BLOCKS_PER_QUERY: 10000
};

module.exports = {
    ADDRESSES,
    ERC20_ABI,
    LIQUIDITY_POOL_ABI,
    VAULT_ABI,
    CHAINLINK_ORACLE_ABI,
    NETWORK_CONFIG,
    COLLECTION_CONFIG,
    getContractConfig,
    getAllAddresses,
    isValidAddress,
    getEventSignatures
};
