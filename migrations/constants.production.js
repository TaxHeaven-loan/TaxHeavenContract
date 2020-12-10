const MINUTES = 60;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;

// LendingToken
const decimalsOfLendingToken = 8;

// LendingTokenOracle
const lendingTokenPriceE0 = 500;
const decimalsOfLendingTokenPrice = 8;

// TaxToken
const decimalsOfTaxToken = 18;
const decimalsOfFundRate = 8;
const developerFundRateE0 = 0.05;
const incentiveFundRateE0 = 0.1;
const halvingStartLendingValueE0 = 200000000;
const maxTotalSupply = 1000000000;
const initialMintUnitE0 = 1;
const interestE0 = 0.005;

// Staking
const dividendInterval = 1 * DAYS;

// Governance
const preVoteLength = 7 * DAYS;
const totalVoteLength = 14 * DAYS;
const expirationLength = 3 * DAYS;
const minVoteE0 = 0.025;
const minVoteCoreE0 = 0.05;
const minCommitE0 = 0.0001;

module.exports = {
  decimalsOfLendingToken,
  lendingTokenPriceE0,
  decimalsOfLendingTokenPrice,
  decimalsOfTaxToken,
  decimalsOfFundRate,
  developerFundRateE0,
  incentiveFundRateE0,
  halvingStartLendingValueE0,
  maxTotalSupply,
  initialMintUnitE0,
  interestE0,
  dividendInterval,
  preVoteLength,
  totalVoteLength,
  expirationLength,
  minVoteE0,
  minVoteCoreE0,
  minCommitE0
};
