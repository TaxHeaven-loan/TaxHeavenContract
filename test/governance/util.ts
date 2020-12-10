import BigNumber from 'bignumber.js';
import type {
    Erc20Instance,
    LendingInstance,
    TestTokenInstance,
    TaxTokenInstance,
    StakingInstance,
    GovernanceInstance,
} from '../../types/truffle-contracts';
import { prepareTestToken, deposit as depositForLending } from '../lending/util';
import { stake } from '../staking/util';
import { getConfigs } from '../taxToken/util';
import { DECIMALS_OF_TAX_TOKEN, Address, fromE0, toE0, ZERO_ADDRESS } from '../util';

export type ProposalStatus = {
    proposeId: string;
    currentApprovalVoteSum: BigNumber;
    currentDenialVoteSum: BigNumber;
    appliedMinimumVote: BigNumber;
    preVoteDeadline: number;
    mainVoteDeadline: number;
    expiration: number;
    lockin: boolean;
    applied: boolean;
};

export type CoreParameter = {
    preVoteLength: number;
    totalVoteLength: number; // more than preVoteLength
    expirationLength: number;
    minVote: BigNumber.Value; // more than minCommit
    minVoteCore: BigNumber.Value; // more than minCommit
    minCommit: BigNumber.Value;
};

export type WhitelistParameter = {
    tokenAddress: Address;
    oracleAddress: Address; // non-zero address
};

export type DelistParameter = {
    tokenAddress: Address;
};

export type IncentiveFundParameter = {
    allocation: Record<Address, BigNumber.Value>;
};

const OracleInterface = artifacts.require('OracleInterface');
const TaxToken = artifacts.require('TaxToken');
const Staking = artifacts.require('Staking');
const Lending = artifacts.require('Lending');
const Governance = artifacts.require('Governance');

/**
 * @example
 *  const taxTokenInstance = await TaxToken.new();
 *  await deployGovernanceContract(
 *      accounts[0],
 *      taxTokenInstance.address,
 *      {
 *          preVoteLength: 7 * DAYS,
 *          totalVoteLength: 14 * DAYS,
 *          expirationLength: 1 * DAYS,
 *          minVote: 0.05,
 *          minVoteCore: 0.1,
 *          minCommit: 0.0001,
 *      }
 *  );
 */
export async function deployGovernanceContract(
    taxTokenOwner: Address,
    taxTokenInstance: TaxTokenInstance,
    coreParameters: CoreParameter
) {
    const {
        preVoteLength,
        totalVoteLength,
        expirationLength,
        minVote,
        minVoteCore,
        minCommit,
    } = coreParameters;
    const governanceInstance = await Governance.new(
        taxTokenInstance.address,
        preVoteLength,
        totalVoteLength,
        expirationLength,
        fromE0(minVote, 4),
        fromE0(minVoteCore, 4),
        fromE0(minCommit, 4),
        { from: taxTokenOwner }
    );

    await taxTokenInstance.updateGovernanceAddress(governanceInstance.address, {
        from: taxTokenOwner,
    });

    const lendingContractAddress = await taxTokenInstance.getLendingAddress();
    const lendingContractInstance = await Lending.at(lendingContractAddress);
    const stakingContractAddress = await lendingContractInstance.getStakingAddress();
    const stakingContractInstance = await Staking.at(stakingContractAddress);
    await stakingContractInstance.updateGovernanceAddress(governanceInstance.address, {
        from: taxTokenOwner,
    });

    return governanceInstance;
}

export async function vote(
    account: Address,
    proposeId: string,
    approval: boolean,
    amount: BigNumber.Value,
    configs: {
        governanceInstance: GovernanceInstance;
        taxTokenInstance: TaxTokenInstance;
        lendingTokenAddress?: Address;
    }
) {
    const { governanceInstance, taxTokenInstance, lendingTokenAddress } = configs;
    const lendingAddress = await taxTokenInstance.getLendingAddress();
    const lendingInstance = await Lending.at(lendingAddress);
    const stakingContractAddress = await lendingInstance.getStakingAddress();
    const stakingContractInstance = await Staking.at(stakingContractAddress);
    await stake(account, lendingTokenAddress ?? ZERO_ADDRESS, amount, {
        stakingContractInstance,
    });
    await governanceInstance.vote(proposeId, approval, fromE0(amount, DECIMALS_OF_TAX_TOKEN), {
        from: account,
    });
}

export async function lockInProposal(
    account: Address,
    proposeId: string,
    configs: {
        governanceInstance: GovernanceInstance;
    }
) {
    const { governanceInstance } = configs;
    await governanceInstance.lockinProposal(proposeId, { from: account });
}

export async function withdraw(
    account: Address,
    proposeId: string,
    configs: {
        governanceInstance: GovernanceInstance;
    }
) {
    const { governanceInstance } = configs;
    await governanceInstance.withdraw(proposeId, { from: account });
}

export async function getCoreParameters(configs: { governanceInstance: GovernanceInstance }) {
    const { governanceInstance } = configs;
    const {
        '0': preVoteLength,
        '1': totalVoteLength,
        '2': expirationLength,
        '3': minimumVoteE4,
        '4': minimumVoteCoreE4,
        '5': minimumCommitE4,
    } = await governanceInstance.getCoreParameters();
    assert(preVoteLength.toString() !== '0');
    assert(totalVoteLength.toString() !== '0');
    assert(expirationLength.toString() !== '0');
    assert(minimumVoteE4.toString() !== '0');
    assert(minimumVoteCoreE4.toString() !== '0');
    assert(minimumCommitE4.toString() !== '0');
    return {
        preVoteLength: preVoteLength.toNumber(),
        totalVoteLength: totalVoteLength.toNumber(),
        expirationLength: expirationLength.toNumber(),
        minimumVoteE0: toE0(minimumVoteE4, 4),
        minimumVoteCoreE0: toE0(minimumVoteCoreE4, 4),
        minimumCommitE0: toE0(minimumCommitE4, 4),
    };
}

export async function getUserStatus(
    account: Address,
    proposeId: string,
    configs: {
        governanceInstance: GovernanceInstance;
    }
) {
    const { governanceInstance } = configs;
    const { '0': approvalAmount, '1': denialAmount } = await governanceInstance.getUserStatus(
        proposeId,
        account
    );
    return {
        approvalAmount: toE0(approvalAmount, DECIMALS_OF_TAX_TOKEN),
        denialAmount: toE0(denialAmount, DECIMALS_OF_TAX_TOKEN),
    };
}

export async function getStatus(
    proposeId: string,
    configs: {
        governanceInstance: GovernanceInstance;
    }
) {
    const { governanceInstance } = configs;
    const {
        '0': preVoteDeadline,
        '1': mainVoteDeadline,
        '2': appliedMinimumVote,
        '3': currentApprovalVoteSum,
        '4': currentDenialVoteSum,
        '5': isLockedIn,
        '6': isApplied,
    } = await governanceInstance.getStatus(proposeId);
    return {
        preVoteDeadline: preVoteDeadline.toNumber(),
        mainVoteDeadline: mainVoteDeadline.toNumber(),
        appliedMinimumVoteE0: toE0(appliedMinimumVote, DECIMALS_OF_TAX_TOKEN),
        currentApprovalVoteSumE0: toE0(currentApprovalVoteSum, DECIMALS_OF_TAX_TOKEN),
        currentDenialVoteSumE0: toE0(currentDenialVoteSum, DECIMALS_OF_TAX_TOKEN),
        isLockedIn,
        isApplied,
    };
}

export async function getProposals(
    offset: number,
    limit: number,
    configs: {
        governanceInstance: GovernanceInstance;
    }
) {
    const { governanceInstance } = configs;
    const encodedProposals = await governanceInstance.getProposals(offset, limit);

    const proposals = new Array<ProposalStatus>();
    for (let i = 0; i < encodedProposals.length; i += 3) {
        const proposeId = encodedProposals[i];
        const votingResult = new BigNumber(encodedProposals[i + 1]).toString(2).padStart(256, '0');
        const otherProposalStatus = new BigNumber(encodedProposals[i + 2])
            .toString(2)
            .padStart(256, '0');

        const currentApprovalVoteSum = toE0(
            '0b' + votingResult.substr(0, 128),
            DECIMALS_OF_TAX_TOKEN
        );
        const currentDenialVoteSum = toE0(
            '0b' + votingResult.substr(128, 128),
            DECIMALS_OF_TAX_TOKEN
        );
        const appliedMinimumVote = toE0(
            '0b' + otherProposalStatus.substr(0, 128),
            DECIMALS_OF_TAX_TOKEN
        );
        const preVoteDeadline = Number('0b' + otherProposalStatus.substr(128, 32));
        const mainVoteDeadline = Number('0b' + otherProposalStatus.substr(128 + 32, 32));
        const expiration = Number('0b' + otherProposalStatus.substr(128 + 32 + 32, 32));
        const lockin = Number('0b' + otherProposalStatus.substr(128 + 32 + 32 + 32, 8)) === 1;
        const applied = Number('0b' + otherProposalStatus.substr(128 + 32 + 32 + 32 + 8, 8)) === 1;

        const proposal = {
            proposeId,
            currentApprovalVoteSum,
            currentDenialVoteSum,
            appliedMinimumVote,
            preVoteDeadline,
            mainVoteDeadline,
            expiration,
            lockin,
            applied,
        };

        proposals.push(proposal);
    }

    return proposals;
}

export default {
    deployGovernanceContract,
    getUserStatus,
    getStatus,
};
