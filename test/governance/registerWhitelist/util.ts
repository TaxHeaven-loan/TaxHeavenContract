import BigNumber from 'bignumber.js';
import type {
    Erc20Instance,
    GovernanceInstance,
    TaxTokenInstance,
} from '../../../types/truffle-contracts';
import { Address, DECIMALS_OF_TAX_TOKEN, fromE0, toE0, ZERO_ADDRESS } from '../../util';
import { vote, lockInProposal, withdraw, getCoreParameters } from '../util';
import type { WhitelistParameter } from '../util';
import { stake } from '../../staking/util';
import { getStatus, getUserStatus } from '../../governance/util';

const OracleInterface = artifacts.require('OracleInterface');
const TaxToken = artifacts.require('TaxToken');
const Staking = artifacts.require('Staking');
const Lending = artifacts.require('Lending');

export const LogProposeUpdateWhiteList = 'LogProposeUpdateWhiteList';

export interface LogProposeUpdateWhiteListType extends Truffle.TransactionLog {
    event: typeof LogProposeUpdateWhiteList;
    args: {
        /* bytes32 indexed */ proposeId: string;
        /* uint256 */ preVoteLength: BN;
        /* uint256 */ totalVoteLength: BN;
        /* uint256 */ expirationLength: BN;
        /* uint256 */ minVote: BN;
        /* uint256 */ minVoteCore: BN;
        /* uint256 */ minCommit: BN;
        /* uint256 */ preVoteDeadline: BN;
        /* uint256 */ mainVoteDeadline: BN;
    };
}

export function isLogProposeUpdateWhiteListType(log: any): log is LogProposeUpdateWhiteListType {
    return log.event === LogProposeUpdateWhiteList;
}

export async function proposeRegisterWhitelist(
    account: Address,
    whitelistParameter: WhitelistParameter,
    configs: {
        governanceInstance: GovernanceInstance;
        taxTokenInstance: TaxTokenInstance;
        lendingTokenAddress?: Address;
    }
): Promise<{
    proposeId: string;
}> {
    const { governanceInstance, taxTokenInstance, lendingTokenAddress } = configs;
    const { tokenAddress, oracleAddress } = whitelistParameter;

    const totalSupply = toE0(await taxTokenInstance.totalSupply(), DECIMALS_OF_TAX_TOKEN);
    const { minimumCommitE0 } = await getCoreParameters({ governanceInstance });
    const appliedMinCommitE0 = totalSupply.times(minimumCommitE0);
    const lendingAddress = await taxTokenInstance.getLendingAddress();
    const lendingInstance = await Lending.at(lendingAddress);
    const stakingContractAddress = await lendingInstance.getStakingAddress();
    const stakingContractInstance = await Staking.at(stakingContractAddress);
    await stake(account, lendingTokenAddress ?? ZERO_ADDRESS, appliedMinCommitE0, {
        stakingContractInstance,
    });
    const res = await governanceInstance.proposeUpdateWhitelist(tokenAddress, oracleAddress, {
        from: account,
    });

    const targetLogs = res.logs.filter(isLogProposeUpdateWhiteListType);
    if (targetLogs.length === 0) {
        throw new Error('the log of LogProposeUpdateCoreParameters event was not emitted');
    }

    const { proposeId } = targetLogs[0].args;
    return { proposeId };
}

export const voteForRegisterWhitelist = vote;

export const lockInForRegisterWhitelist = lockInProposal;

export async function applyRegisterWhitelistProposal(
    account: Address,
    proposeId: string,
    configs: {
        governanceInstance: GovernanceInstance;
    }
) {
    const { governanceInstance } = configs;
    await governanceInstance.applyGovernanceForUpdateWhitelist(proposeId, { from: account });
}

export const withdrawForRegisterWhitelist = withdraw;

export const getUserStatusRegisterWhitelist = getUserStatus;

export const getStatusRegisterWhitelist = getStatus;

export async function getInfoRegisterWhitelist(
    proposeId: string,
    configs: {
        governanceInstance: GovernanceInstance;
    }
): Promise<WhitelistParameter> {
    const { governanceInstance } = configs;
    const {
        '0': tokenAddress,
        '1': oracleAddress,
    } = await governanceInstance.getInfoUpdateWhitelist(proposeId);
    return {
        tokenAddress,
        oracleAddress,
    };
}
