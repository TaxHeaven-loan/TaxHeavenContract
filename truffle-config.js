/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * trufflesuite.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like @truffle/hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura accounts
 * are available for free at: infura.io/register.
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */

require('ts-node/register');

require('dotenv').config();

const { PROVIDER_URL, INFURA_PROJECT_ID, PRIVATE_KEY, MNEMONIC } = process.env;

const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
    },
    coverage: {
      host: '127.0.0.1',
      port: 8555,
      network_id: '5777',
      gas: 10000000,
    },
    ropsten: {
      provider: () =>
        new HDWalletProvider(
          PRIVATE_KEY ? [PRIVATE_KEY] : MNEMONIC,
          PROVIDER_URL || `https://ropsten.infura.io/v3/${INFURA_PROJECT_ID}`
        ),
      network_id: 3,
      gas: 6500000,
      // gasPrice: 2_000_000_000,
      confirmations: 1,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
    mainnet: {
      provider: () =>
        new HDWalletProvider(
          PRIVATE_KEY ? [PRIVATE_KEY] : MNEMONIC,
          PROVIDER_URL || `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`
        ),
      network_id: 1,
      gas: 6500000,
      // gasPrice: 22_000_000_000,
      confirmations: 1,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
    bscTestnet: {
      provider: () => new HDWalletProvider(PRIVATE_KEY ? [PRIVATE_KEY] : MNEMONIC, `https://data-seed-prebsc-1-s1.binance.org:8545`),
      network_id: 97,
      confirmations: 1,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    bsc: {
      provider: () => new HDWalletProvider(PRIVATE_KEY ? [PRIVATE_KEY] : MNEMONIC, `https://bsc-dataseed1.binance.org`),
      network_id: 56,
      confirmations: 1,
      timeoutBlocks: 200,
      skipDryRun: true
    },
  },
  plugins: ['solidity-coverage'],
  mocha: {
    // reporter: 'eth-gas-reporter',
    // reporterOptions: {
    //   currency: 'USD',
    //   outputFile: `./reporter/used_gas.txt`,
    //   noColors: true,
    // },
    timeout: 100000
  },
  compilers: {
    solc: {
      version: "0.7.1",
      // docker: true,
      settings: {
        optimizer: {
          enabled: true,
          runs: 20000
        },
        evmVersion: "constantinople"
      }
    }
  },
  test_file_extension_regexp: /.*\.(ts|js)$/,
};
