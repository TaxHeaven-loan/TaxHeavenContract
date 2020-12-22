// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.1;

interface LotteryInterface {
    function depositEthAndBorrowWithLottery() external payable;

    function getConfigs() external view returns (uint256 minBet, uint256 jackpotProbE8);
}
