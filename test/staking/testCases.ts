export interface StakingTestCase {
    // mutable transaction
    case: string;
    sender: string;
    rewardToken?: 'ETH' | 'token1' | 'token2';
    stakeAmount?: number;
    deposit?: number;
    withdrawAmount?: number;
    voteDepositAmount?: number;
    voteWithdrawAmount?: number;
    expectedRewards?: number;
    term?: number;

    // view check
    currentStaking?: number;
    currentStakingOf?: {
        account: string;
        deposit: number;
        withdrawable?: number;
        term: number;
    }[];
    destinations?: ('token1' | 'token2')[];
    termReward?: number;
    current?: number;
}

export const MAX_TERM = 1000;

export const getTestData = (accounts: string[]): StakingTestCase[] => [
    {
        case: '1st Account 0 stake 100.',
        sender: accounts[0],
        stakeAmount: 100,

        currentStaking: 100,
        currentStakingOf: [
            {
                account: accounts[0],
                deposit: 100,
                term: 0,
            },
        ],
        destinations: ['token1'],
        termReward: 0,
        current: 0,
    },
    {
        case: '2nd Account 0 stake 100.',
        sender: accounts[0],
        stakeAmount: 100,

        currentStaking: 200,
        currentStakingOf: [
            {
                account: accounts[0],
                deposit: 200,
                term: 0,
            },
        ],
        destinations: ['token1'],
        termReward: 0,
        current: 0,
    },
    {
        case: 'Deposit reward 1000.',
        sender: accounts[1],
        deposit: 1000,
        term: 1,

        currentStaking: 200,
        currentStakingOf: [
            {
                account: accounts[0],
                deposit: 200,
                term: 0,
            },
        ],
        termReward: 1000,
        current: 1,
    },
    {
        case: 'Account 0 withdraw 100.',
        sender: accounts[0],
        withdrawAmount: 100,

        currentStaking: 100,
        currentStakingOf: [
            {
                account: accounts[0],
                deposit: 100,
                term: 1,
            },
        ],
        destinations: ['token1'],
        termReward: 1000,
        current: 1,
    },
    {
        case: 'Account 2 stake 100.',
        sender: accounts[2],
        stakeAmount: 100,

        currentStaking: 200,
        currentStakingOf: [
            {
                account: accounts[0],
                deposit: 100,
                term: 1,
            },
            {
                account: accounts[2],
                deposit: 100,
                term: 1,
            },
        ],
        destinations: ['token1'],
        termReward: 1000,
        current: 1,
    },
    {
        case: 'Deposit reward 1000 (2nd)',
        sender: accounts[1],
        deposit: 1000,
        term: 1,

        currentStaking: 200,
        currentStakingOf: [
            {
                account: accounts[0],
                deposit: 100,
                term: 1,
            },
            {
                account: accounts[2],
                deposit: 100,
                term: 1,
            },
        ],
        termReward: 1000,
        current: 2,
    },
    {
        case: 'Account 0 get reward +1000',
        sender: accounts[0],
        expectedRewards: 1000,
        term: 1,

        currentStaking: 200,
        currentStakingOf: [
            {
                account: accounts[0],
                deposit: 100,
                term: 2,
            },
            {
                account: accounts[2],
                deposit: 100,
                term: 1,
            },
        ],
        termReward: 0,
        current: 3,
    },
    {
        case: 'Account 0 get reward +500',
        sender: accounts[0],
        expectedRewards: 500,
        term: 1,

        currentStaking: 200,
        currentStakingOf: [
            {
                account: accounts[0],
                deposit: 100,
                term: 3,
            },
            {
                account: accounts[2],
                deposit: 100,
                term: 1,
            },
        ],
        termReward: 0,
        current: 4,
    },
    {
        case: 'Account 2 get reward +500',
        sender: accounts[2],
        expectedRewards: 500,
        term: 1,

        currentStaking: 200,
        currentStakingOf: [
            {
                account: accounts[0],
                deposit: 100,
                term: 3,
            },
            {
                account: accounts[2],
                deposit: 100,
                term: 4,
            },
        ],
        termReward: 0,
        current: 5,
    },
    {
        case: 'Account 0 withdraw 100',
        sender: accounts[0],
        withdrawAmount: 100,

        currentStaking: 100,
        currentStakingOf: [
            {
                account: accounts[0],
                deposit: 0,
                term: 5,
            },
            {
                account: accounts[2],
                deposit: 100,
                term: 4,
            },
        ],
        destinations: [],
        termReward: 0,
        current: 5,
    },
    {
        case: 'Past next term.',
        sender: accounts[1],
        term: 1,

        currentStaking: 100,
        currentStakingOf: [
            {
                account: accounts[2],
                deposit: 100,
                term: 4,
            },
        ],
        termReward: 0,
        current: 6,
    },
    {
        case: 'Deposit reward 1000.',
        sender: accounts[1],
        deposit: 1000,
        term: 2,

        currentStaking: 100,
        currentStakingOf: [
            {
                account: accounts[2],
                deposit: 100,
                term: 4,
            },
        ],
        termReward: 0,
        current: 8,
    },
    {
        case: 'Past MAX_TERM + 1.',
        sender: accounts[1],
        term: MAX_TERM + 1,

        currentStaking: 100,
        currentStakingOf: [
            {
                account: accounts[2],
                deposit: 100,
                term: 4,
            },
        ],
        termReward: 0,
        current: MAX_TERM + 9,
    },
    {
        case: 'Account 2 get reward +1000.',
        sender: accounts[2],
        expectedRewards: 1000,

        currentStaking: 100,
        currentStakingOf: [
            {
                account: accounts[2],
                deposit: 100,
                term: MAX_TERM + 4,
            },
        ],
        termReward: 0,
        current: MAX_TERM + 9,
    },
    {
        case: 'Account 2 get reward +0.(unchanged)',
        sender: accounts[2],
        expectedRewards: 0,

        currentStaking: 100,
        currentStakingOf: [
            {
                account: accounts[2],
                deposit: 100,
                term: MAX_TERM + 9,
            },
        ],
        termReward: 0,
        current: MAX_TERM + 9,
    },
    {
        case: 'Past MAX_TERM.',
        sender: accounts[1],
        term: MAX_TERM + 1,

        currentStaking: 100,
        currentStakingOf: [
            {
                account: accounts[2],
                deposit: 100,
                term: MAX_TERM + 9,
            },
        ],
        termReward: 0,
        current: 2 * MAX_TERM + 10,
    },
    {
        case: 'Deposit reward 2000.',
        sender: accounts[1],
        deposit: 2000,
        term: MAX_TERM + 1,

        currentStaking: 100,
        currentStakingOf: [
            {
                account: accounts[2],
                deposit: 100,
                term: MAX_TERM + 9,
            },
        ],
        termReward: 0,
        current: 3 * MAX_TERM + 11,
    },
    {
        case: 'Deposit reward 2000.',
        sender: accounts[1],
        deposit: 2000,
        term: MAX_TERM + 1,

        currentStaking: 100,
        currentStakingOf: [
            {
                account: accounts[2],
                deposit: 100,
                term: MAX_TERM + 9,
            },
        ],
        termReward: 0,
        current: 4 * MAX_TERM + 12,
    },
    {
        case: 'Account 2 get reward +0.(unchanged2)',
        sender: accounts[2],
        expectedRewards: 0,

        currentStaking: 100,
        currentStakingOf: [
            {
                account: accounts[2],
                deposit: 100,
                term: 2 * MAX_TERM + 9,
            },
        ],
        termReward: 0,
        current: 4 * MAX_TERM + 12,
    },
    {
        case: 'Account 2 get reward +2000.',
        sender: accounts[2],
        expectedRewards: 2000,

        currentStaking: 100,
        currentStakingOf: [
            {
                account: accounts[2],
                deposit: 100,
                term: 3 * MAX_TERM + 9,
            },
        ],
        termReward: 0,
        current: 4 * MAX_TERM + 12,
    },
    {
        case: 'Account 2 get reward +2000.',
        sender: accounts[2],
        expectedRewards: 2000,

        currentStaking: 100,
        currentStakingOf: [
            {
                account: accounts[2],
                deposit: 100,
                term: 4 * MAX_TERM + 9,
            },
        ],
        termReward: 0,
        current: 4 * MAX_TERM + 12,
    },
    {
        case: 'Deposit ETH reward 60.',
        sender: accounts[1],
        rewardToken: 'ETH',
        deposit: 60,

        currentStaking: 0,
        currentStakingOf: [
            {
                account: accounts[2],
                deposit: 0,
                term: 0,
            },
        ],
        termReward: 0,
        current: 0,
    },
    {
        case: 'Deposit reward 5000.',
        sender: accounts[1],
        deposit: 5000,

        currentStaking: 100,
        currentStakingOf: [
            {
                account: accounts[2],
                deposit: 100,
                term: 4 * MAX_TERM + 9,
            },
        ],
        termReward: 0,
        current: 4 * MAX_TERM + 12,
    },
    {
        case: 'Account 0 stake ETH 10.',
        sender: accounts[0],
        rewardToken: 'ETH',
        stakeAmount: 10,

        currentStaking: 10,
        currentStakingOf: [
            {
                account: accounts[0],
                deposit: 10,
                term: 4 * MAX_TERM + 12,
            },
        ],
        destinations: [],
        termReward: 60,
        current: 4 * MAX_TERM + 12,
    },
    {
        case: 'Account 2 stake ETH 20.',
        sender: accounts[2],
        rewardToken: 'ETH',
        stakeAmount: 20,
        term: 1,

        currentStaking: 30,
        currentStakingOf: [
            {
                account: accounts[0],
                deposit: 10,
                term: 4 * MAX_TERM + 12,
            },
            {
                account: accounts[2],
                deposit: 20,
                term: 4 * MAX_TERM + 12,
            },
        ],
        destinations: ['token1'],
        termReward: 60,
        current: 4 * MAX_TERM + 13,
    },
    {
        case: 'skip term',
        sender: accounts[1],
        rewardToken: 'ETH',
        term: 1,
        currentStaking: 30,
        currentStakingOf: [
            {
                account: accounts[0],
                deposit: 10,
                term: 4 * MAX_TERM + 12,
            },
            {
                account: accounts[2],
                deposit: 20,
                term: 4 * MAX_TERM + 12,
            },
        ],
        termReward: 0,
        current: 4 * MAX_TERM + 14,
    },
    {
        case: 'Account 0 get reward ETH +20.',
        sender: accounts[0],
        rewardToken: 'ETH',
        expectedRewards: 20,

        currentStaking: 30,
        currentStakingOf: [
            {
                account: accounts[0],
                deposit: 10,
                term: 4 * MAX_TERM + 14,
            },
            {
                account: accounts[2],
                deposit: 20,
                term: 4 * MAX_TERM + 12,
            },
        ],
        termReward: 0,
        current: 4 * MAX_TERM + 14,
    },
    {
        case: 'Account 2 get reward ETH +40.',
        sender: accounts[2],
        rewardToken: 'ETH',
        expectedRewards: 40,

        currentStaking: 30,
        currentStakingOf: [
            {
                account: accounts[0],
                deposit: 10,
                term: 4 * MAX_TERM + 14,
            },
            {
                account: accounts[2],
                deposit: 20,
                term: 4 * MAX_TERM + 14,
            },
        ],
        termReward: 0,
        current: 4 * MAX_TERM + 14,
    },
    {
        case: 'Account 2 get reward +5000.',
        sender: accounts[2],
        expectedRewards: 5000,

        currentStaking: 100,
        currentStakingOf: [
            {
                account: accounts[2],
                deposit: 100,
                term: 4 * MAX_TERM + 14,
            },
        ],
        termReward: 0,
        current: 4 * MAX_TERM + 14,
    },
    {
        case: 'Go next term.',
        sender: accounts[2],
        term: 1,
        termReward: 0,
        current: 4 * MAX_TERM + 15,
    },
    {
        case: 'Account 2 vote 60.',
        sender: accounts[2],
        voteDepositAmount: 60,

        currentStaking: 100,
        currentStakingOf: [
            {
                account: accounts[2],
                deposit: 100, // and available ETH staking is 20
                withdrawable: 60,
                term: 4 * MAX_TERM + 14,
            },
        ],
        destinations: ['token1'],
        termReward: 0,
        current: 4 * MAX_TERM + 15,
    },
    {
        case: 'Account 2 stop voting 40.',
        sender: accounts[2],
        voteWithdrawAmount: 20,

        currentStaking: 100,
        currentStakingOf: [
            {
                account: accounts[2],
                deposit: 100, // and available ETH staking is 20
                withdrawable: 80,
                term: 4 * MAX_TERM + 14,
            },
        ],
        destinations: ['token1'],
        termReward: 0,
        current: 4 * MAX_TERM + 15,
    },
    {
        case: 'Account 2 stake token2 30.',
        sender: accounts[2],
        rewardToken: 'token2',
        stakeAmount: 30,

        currentStaking: 30,
        currentStakingOf: [
            {
                account: accounts[2],
                deposit: 30,
                withdrawable: 30,
                term: 4 * MAX_TERM + 15,
            },
        ],
        destinations: ['token1', 'token2'],
        termReward: 0,
        current: 4 * MAX_TERM + 15,
    },
    {
        case: 'Account 2 withdraw 100.',
        sender: accounts[2],
        withdrawAmount: 100,

        currentStaking: 0,
        currentStakingOf: [
            {
                account: accounts[2],
                deposit: 0, // and available ETH staking is 20 and token2 staking is 30
                withdrawable: 0,
                term: 4 * MAX_TERM + 15,
            },
        ],
        destinations: ['token2'],
        termReward: 0,
        current: 4 * MAX_TERM + 15,
    },
    {
        case: 'Account 2 stake 100.',
        sender: accounts[2],
        stakeAmount: 100,

        currentStaking: 100,
        currentStakingOf: [
            {
                account: accounts[2],
                deposit: 100, // and available ETH staking is 20 and token2 staking is 30
                withdrawable: 100,
                term: 4 * MAX_TERM + 15,
            },
        ],
        destinations: ['token1', 'token2'],
        termReward: 0,
        current: 4 * MAX_TERM + 15,
    },
];
