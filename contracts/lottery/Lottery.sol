// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.1;

import "./LotteryInterface.sol";
import "../../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../node_modules/@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "../../node_modules/@openzeppelin/contracts/math/SafeMath.sol";
import "../token/TaxTokenInterface.sol";
import "../lending/LendingInterface.sol";

contract Lottery is LotteryInterface {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /* ========== CONSTANT VARIABLES ========== */

    address internal immutable _taxTokenAddress;
    address internal immutable _lendingAddress;
    uint256 internal immutable _minBet;
    uint256 internal immutable _jackpotProbE8;

    /* ========== STATE VARIABLES ========== */

    mapping(address => uint256) internal _lottery; // userAddress => block.number
    address[] internal _winnerList;
    uint256[] internal _winnerPotSize;

    /* ========== EVENTS ========== */

    event WinJackpot(address userAddress, uint256 potSize);

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address taxTokenAddress,
        address lendingAddress,
        uint256 minBet,
        uint256 jackpotProbE8
    ) {
        _taxTokenAddress = taxTokenAddress;
        _lendingAddress = lendingAddress;
        _minBet = minBet; // 1 * 10**18 when 1ETH
        require(jackpotProbE8 < 10**8, "probability must be less than 100%");
        _jackpotProbE8 = jackpotProbE8; // 1* 10**5 when 0.1%
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
     * @notice Call depositEth() in lending contract with lottery.
     */
    function depositEthAndBorrowWithLottery() external payable override {
        uint256 amount = msg.value;
        uint256 prevBlocknumber = _lottery[msg.sender];
        uint256 potSize = TaxTokenInterface(_taxTokenAddress).balanceOf(address(this));
        if (potSize > 0 && prevBlocknumber > 0 && prevBlocknumber < block.number) {
            uint256 entropy = uint256(
                keccak256(abi.encode(blockhash(prevBlocknumber + 1), msg.sender))
            );
            // winner takes all the pot
            if (entropy <= uint256(-1).div(10**8).mul(_jackpotProbE8)) {
                _addWinnerList(msg.sender, potSize);
                potSize = 0;
                emit WinJackpot(msg.sender, potSize);
            }
        }
        _lottery[msg.sender] = amount >= _minBet ? block.number : 0;
        LendingInterface(_lendingAddress).depositEth{value: amount}();
        LendingInterface(_lendingAddress).borrow(address(0), amount - amount / 200);
        uint256 totalReward = TaxTokenInterface(_taxTokenAddress).balanceOf(address(this)) -
            potSize;
        ERC20(_taxTokenAddress).safeTransfer(msg.sender, totalReward);
    }

    /* ========== INTERNAL FUNCTIONS ========== */

    function _addWinnerList(address userAddress, uint256 potSize) internal {
        _winnerList.push(userAddress);
        _winnerPotSize.push(potSize);
    }

    /* ========== CALL FUNCTIONS ========== */

    function getConfigs() external view override returns (uint256 minBet, uint256 jackpotProbE8) {
        minBet = _minBet;
        jackpotProbE8 = _jackpotProbE8;
    }
}
