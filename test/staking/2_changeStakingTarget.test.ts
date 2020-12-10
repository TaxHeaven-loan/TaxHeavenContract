import Web3 from 'web3';
import BigNumber from 'bignumber.js';
import { init, ContractInterfaces } from '../init';
import { advanceTime, expectRevert, fromE0, INTERVAL, toE0, ZERO_ADDRESS } from '../util';
import { getBalance, transferToken } from './util';

declare const web3: Web3;

contract('Staking', (accounts) => {
    const deployer = accounts[0];
    const manager = accounts[1];
    const sender = accounts[2];

    let contracts: ContractInterfaces;
    before(async () => {
        contracts = await init({ deployer, interval: INTERVAL });
        await contracts.rewardTokenContract.mint(1000000, { from: manager });
        await contracts.stakingTokenContract.mint(1000000, { from: sender });
    });

    describe('changeStakingTarget', async () => {
        it('works well', async () => {
            const { stakingTokenContract, stakingContract, rewardTokenContract } = contracts;

            const stakeAmount = 100;
            const changeStakeAmount = 100;
            const withdrawAmount = 100;
            const rewardTokenAddress = rewardTokenContract.address;
            const ethAddress = ZERO_ADDRESS; // ETH

            // staking
            await stakingTokenContract.approve(stakingContract.address, stakeAmount, {
                from: sender,
            });
            await stakingContract.stake(rewardTokenAddress, stakeAmount, {
                from: sender,
            });

            // deposit (ERC20)
            const erc20Reward = 1000;
            await rewardTokenContract.transfer(stakingContract.address, erc20Reward, {
                from: manager,
            });
            await advanceTime(INTERVAL * 2);

            // changeStakeTarget
            await stakingContract.changeStakeTarget(
                rewardTokenAddress,
                ethAddress,
                changeStakeAmount,
                { from: sender }
            );

            // getVoteNum
            const voteNum = await stakingContract.getVoteNum(sender);
            assert.equal(
                voteNum.toString(),
                stakeAmount.toString(),
                'the amount of votes differ from expected'
            );

            // deposit (ETH)
            const ethReward = fromE0(0.1, 18);
            await transferToken(ethAddress, manager, stakingContract.address, ethReward);
            await advanceTime(INTERVAL * 2);

            // withdraw
            await stakingContract.withdraw(ethAddress, withdrawAmount, {
                from: sender,
            });

            // receiveReward (ERC20)
            {
                const beforeBalance = await rewardTokenContract.balanceOf(sender);
                await stakingContract.receiveReward(rewardTokenAddress, {
                    from: sender,
                });
                const afterBalance = await rewardTokenContract.balanceOf(sender);
                assert.equal(
                    afterBalance.sub(beforeBalance).toString(),
                    erc20Reward.toString(),
                    'do not match expected rewards (ERC20)'
                );
            }

            // receiveReward (ETH)
            {
                const beforeBalance = await getBalance(ZERO_ADDRESS, sender);
                await stakingContract.receiveReward(ethAddress, {
                    from: sender,
                    gasPrice: 0,
                });
                const afterBalance = await getBalance(ZERO_ADDRESS, sender);
                assert.equal(
                    new BigNumber(afterBalance).minus(beforeBalance).toString(),
                    ethReward.toString(),
                    'do not match expected rewards (ETH)'
                );
            }

            // withdraw (reverts)
            try {
                await stakingContract.withdraw(rewardTokenAddress, 1, {
                    from: sender,
                });
            } catch (err) {
                if (expectRevert(err.message, 'underflow the amount of votes')) return;
                assert.fail(`fail to withdraw: ${err.message}`);
            }

            assert.fail(`an error was expected, but it was successful`);
        });
    });
});
