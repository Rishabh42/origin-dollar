// Script for sending a governance proposal.
// This can be sent by any account, but the script uses the deployer account
// for simplicity since it is already configured in buidler.
//
// Usage:
//  - Setup your environment
//      export BUIDLER_NETWORK=mainnet
//      export DEPLOYER_PK=<pk>
//      export PREMIUM_GAS=<percentage extra>
//      export PROVIDER_URL=<url>
//  - Run:
//      node propose.js --<action>
//

const { ethers, getNamedAccounts } = require("@nomiclabs/buidler");
const { utils } = require("ethers");

const { isMainnet, isRinkeby } = require("../../test/helpers.js");
const { proposeArgs } = require("../../utils/governor");
const { getTxOpts } = require("../../utils/tx");

// Wait for 3 blocks confirmation on Mainnet/Rinkeby.
const NUM_CONFIRMATIONS = isMainnet || isRinkeby ? 3 : 0;

// Returns the arguments to use for sending a proposal to call harvest() on the vault.
async function proposeHarvestArgs() {
  const vaultProxy = await ethers.getContract("VaultProxy");
  const vaultAdmin = await ethers.getContractAt(
    "VaultAdmin",
    vaultProxy.address
  );

  const args = await proposeArgs([
    {
      contract: vaultAdmin,
      signature: "harvest()",
    },
  ]);
  const description = "Call harvest";
  return { args, description };
}

// Returns the arguments to use for sending a proposal to call setUniswapAddr(address) on the vault.
async function proposeSetUniswapAddrArgs(config) {
  const vaultProxy = await ethers.getContract("VaultProxy");
  const vaultAdmin = await ethers.getContractAt(
    "VaultAdmin",
    vaultProxy.address
  );

  const args = await proposeArgs([
    {
      contract: vaultAdmin,
      signature: "setUniswapAddr(address)",
      args: [config.address],
    },
  ]);
  const description = "Call setUniswapAddr";
  return { args, description };
}

// Returns the argument to use for sending a proposal to upgrade VaultCore.
async function proposeUpgradeVaultCoreArgs(config) {
  const vaultProxy = await ethers.getContract("VaultProxy");

  const args = await proposeArgs([
    {
      contract: vaultProxy,
      signature: "upgradeTo(address)",
      args: [config.address],
    },
  ]);
  const description = "Upgrade VaultCore";
  return { args, description };
}

// Returns the arguments to use for sending a proposal call to upgrade to a new MicOracle.
// See migration 11_new_mix_oracle for reference.
async function proposeUpgradeOracleArgs() {
  const vaultProxy = await ethers.getContract("VaultProxy");
  const vaultAdmin = await ethers.getContractAt(
    "VaultAdmin",
    vaultProxy.address
  );
  const mixOracle = await ethers.getContract("MixOracle");
  const uniswapOracle = await ethers.getContract("OpenUniswapOracle");

  const args = await proposeArgs([
    {
      contract: mixOracle,
      signature: "claimGovernance()",
    },
    {
      contract: uniswapOracle,
      signature: "claimGovernance()",
    },
    {
      contract: vaultAdmin,
      signature: "setPriceProvider(address)",
      args: [mixOracle.address],
    },
  ]);
  const description = "New MixOracle";
  return { args, description };
}

// Returns the arguments to use for sending a proposal call to upgrade the vault's strategies.
// See migration 13_three_pool_strategies and 14_compound_dai_strategy for reference.
async function proposeStrategiesUpgradeArgs() {
  const oldCompoundStrategyAddress =
    "0x47211B1D1F6Da45aaEE06f877266E072Cf8BaA74";
  const vaultProxy = await ethers.getContract("VaultProxy");
  const vaultAdmin = await ethers.getContractAt(
    "VaultAdmin",
    vaultProxy.address
  );
  const curveUSDCStrategyProxy = await ethers.getContract(
    "CurveUSDCStrategyProxy"
  );
  const curveUSDCStrategy = await ethers.getContractAt(
    "CurveUSDCStrategy",
    curveUSDCStrategyProxy.address
  );
  const curveUSDTStrategyProxy = await ethers.getContract(
    "CurveUSDTStrategyProxy"
  );
  const curveUSDTStrategy = await ethers.getContractAt(
    "CurveUSDTStrategy",
    curveUSDTStrategyProxy.address
  );
  const compoundStrategyProxy = await ethers.getContract(
    "CompoundStrategyProxy"
  );
  const compoundStrategy = await ethers.getContractAt(
    "CompoundStrategy",
    compoundStrategyProxy.address
  );

  const args = await proposeArgs([
    {
      contract: curveUSDCStrategy,
      signature: "claimGovernance()",
    },
    {
      contract: curveUSDTStrategy,
      signature: "claimGovernance()",
    },
    {
      contract: compoundStrategy,
      signature: "claimGovernance()",
    },
    {
      contract: vaultAdmin,
      signature: "removeStrategy(address)",
      args: [oldCompoundStrategyAddress],
    },
    // Note: Set strategies weight to 100%. It does not matter because each strategy only supports a single asset.
    {
      contract: vaultAdmin,
      signature: "addStrategy(address,uint256)",
      args: [curveUSDTStrategyProxy.address, utils.parseUnits("1", 18)],
    },
    {
      contract: vaultAdmin,
      signature: "addStrategy(address,uint256)",
      args: [curveUSDCStrategyProxy.address, utils.parseUnits("1", 18)],
    },
    {
      contract: vaultAdmin,
      signature: "addStrategy(address,uint256)",
      args: [compoundStrategyProxy.address, utils.parseUnits("1", 18)],
    },
  ]);
  const description = "Strategies upgrade";
  return { args, description };
}

async function main(config) {
  const governor = await ethers.getContract("Governor");
  const { deployerAddr } = await getNamedAccounts();
  const sDeployer = ethers.provider.getSigner(deployerAddr);

  let proposalCount = await governor.proposalCount();
  console.log("Current proposal count=", proposalCount.toString());

  let argsMethod;
  if (config.harvest) {
    console.log("Harvest proposal");
    argsMethod = proposeHarvestArgs;
  } else if (config.setUniswapAddr) {
    console.log("setUniswapAddr proposal");
    argsMethod = proposeSetUniswapAddrArgs;
  } else if (config.upgradeVaultCore) {
    console.log("upgradeVaultCore proposal");
    argsMethod = proposeUpgradeVaultCoreArgs;
  } else if (config.upgradeOracle) {
    console.log("upgradeOracle proposal");
    argsMethod = proposeUpgradeOracleArgs;
  } else if (config.upgradeStrategies) {
    console.log("upgradeStrategies proposal");
    argsMethod = proposeStrategiesUpgradeArgs;
  } else {
    console.error("An action must be specified on the command line.");
    return;
  }
  const { args, description } = await argsMethod(config);

  if (config.doIt) {
    console.log("Sending a tx calling propose() on", governor.address);
    let transaction;
    transaction = await governor
      .connect(sDeployer)
      .propose(...args, description, await getTxOpts());
    console.log("Sent. tx hash:", transaction.hash);
    console.log("Waiting for confirmation...");
    await ethers.provider.waitForTransaction(
      transaction.hash,
      NUM_CONFIRMATIONS
    );
    console.log("Propose tx confirmed");
  } else {
    console.log("Would send a tx to call propose() on", governor.address);
    console.log("args:", args);
  }

  const newProposalId = await governor.proposalCount();
  console.log("New proposal count=", newProposalId.toString());
  console.log(
    `Next step: call the following method on the governor at ${governor.address} via multi-sig`
  );
  console.log(`   queue(${newProposalId.toString()})`);
  console.log("Done");
}

// Util to parse command line args.
function parseArgv() {
  const args = {};
  for (const arg of process.argv) {
    const elems = arg.split("=");
    const key = elems[0];
    const val = elems.length > 1 ? elems[1] : true;
    args[key] = val;
  }
  return args;
}

// Parse config.
const args = parseArgv();
const config = {
  // dry run mode vs for real.
  doIt: args["--doIt"] === "true" || false,
  address: args["--address"],
  harvest: args["--harvest"],
  setUniswapAddr: args["--setUniswapAddr"],
  upgradeVaultCore: args["--upgradeVaultCore"],
  upgradeOracle: args["--upgradeOracle"],
  upgradeStrategies: args["--ugradeStrategies"],
};
console.log("Config:");
console.log(config);

// Validate arguments.
if (config.address) {
  if (!utils.isAddress(config.address)) {
    throw new Error(`Invalid Ethereum address ${config.address}`);
  }
}

// Run the job.
main(config)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
