// scripts/deploy-verescUSD.ts
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { execSync } from 'child_process';

// Load environment variables from .env file
dotenv.config();

// Check if main wallet private key is available
const MAIN_PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!MAIN_PRIVATE_KEY) {
  console.error('Main wallet private key not found in .env file. Please add PRIVATE_KEY=0x... to your .env file.');
  process.exit(1);
}

// Development wallet addresses
const DEV_WALLETS = [
  '0xd7b8CD75Dc08b3a7f14d794F6BB66B3ECDcCb0b9',
  '0x872EcD4104C8Ddf917F44398d700a55700bfb1ea',
  '0xCC2112BD38600ce50a6A16826217b319B98687A9',
  '0x7Bd8671955229C3190D3742d9E6f1fc6404dAB50',
  '0x8De1D45462570Fad5B11b341B81450dA0BCD7c26'
];

async function main() {
  console.log('Starting veresCUSD token deployment and distribution...');
  
  // Set up the main account
  const account = privateKeyToAccount(MAIN_PRIVATE_KEY as `0x${string}`);
  
  // Set up clients
  const publicClient = createPublicClient({
    chain: celoAlfajores,
    transport: http(),
  });
  
  const walletClient = createWalletClient({
    account,
    chain: celoAlfajores,
    transport: http(),
  });
  
  console.log('Deployer address:', account.address);
  
  try {
    // First make sure the contract exists
    const contractPath = './contracts/VeresCUSD.sol';
    if (!fs.existsSync(contractPath)) {
      console.log('Contract file not found. Creating it...');
      
      // Create contracts directory if it doesn't exist
      if (!fs.existsSync('./contracts')) {
        fs.mkdirSync('./contracts');
      }
      
      // Create the VeresCUSD contract file
      fs.writeFileSync(contractPath, `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VeresCUSD
 * @dev A mock cUSD token for the Veres Rounds system
 */
contract VeresCUSD is ERC20, Ownable {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _decimals = decimals_;
        
        // Mint 1,000,000 tokens to the deployer for distribution
        _mint(msg.sender, 1_000_000 * 10**decimals_);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Function to mint tokens to a specific address (for testing)
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}`);
      
      console.log('VeresCUSD.sol contract created successfully');
    }
    
    // Compile the contract with Hardhat
    console.log('Compiling contracts...');
    execSync('npx hardhat compile', { stdio: 'inherit' });
    
    // Find the artifact file
    let artifactPath = './artifacts/contracts/VeresCUSD.sol/VeresCUSD.json';
    
    if (!fs.existsSync(artifactPath)) {
      // Try alternative case
      artifactPath = './artifacts/contracts/verescUSD.sol/VeresCUSD.json';
      
      if (!fs.existsSync(artifactPath)) {
        throw new Error('Artifact file not found. Compilation might have failed.');
      }
    }
    
    console.log(`Using artifact at: ${artifactPath}`);
    
    // Read the artifact
    const artifactContent = fs.readFileSync(artifactPath, 'utf8');
    const artifact = JSON.parse(artifactContent);
    
    if (!artifact.abi || !artifact.bytecode) {
      throw new Error('ABI or bytecode missing from artifact. Compilation might have failed.');
    }
    
    const abi = artifact.abi;
    const bytecode = artifact.bytecode;
    
    // Log bytecode existence for debugging
    console.log(`Bytecode found: ${bytecode.substring(0, 50)}...`);
    
    // Deploy the VeresCUSD token
    console.log('Deploying VeresCUSD token...');
    
    const deployHash = await walletClient.deployContract({
      abi,
      bytecode: bytecode as `0x${string}`,
      args: ["Veres cUSD", "vCUSD", 18],
    });
    
    console.log('Deployment transaction sent. Hash:', deployHash);
    console.log('Waiting for deployment to complete...');
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
    const contractAddress = receipt.contractAddress as `0x${string}`;
    
    if (!contractAddress) {
      throw new Error('Contract address not found in transaction receipt');
    }
    
    console.log(`VeresCUSD token deployed at: ${contractAddress}`);
    
    // Save the contract address to a file
    const contractInfo = {
      name: "Veres cUSD",
      symbol: "vCUSD",
      decimals: 18,
      address: contractAddress,
      deployedAt: new Date().toISOString(),
      deployer: account.address,
      network: "celoAlfajores"
    };
    
    fs.writeFileSync(
      './veres-cusd-address.json', 
      JSON.stringify(contractInfo, null, 2)
    );
    
    console.log('Token contract info saved to veres-cusd-address.json');
    
    // Distribute tokens to dev wallets (200 tokens each)
    console.log('\nDistributing tokens to development wallets...');
    
    for (let i = 0; i < DEV_WALLETS.length; i++) {
      const wallet = DEV_WALLETS[i] as `0x${string}`;
      const amount = parseEther('200'); // 200 tokens with 18 decimals
      
      console.log(`Sending 200 vCUSD to ${wallet}...`);
      
      const transferHash = await walletClient.writeContract({
        address: contractAddress,
        abi,
        functionName: 'transfer',
        args: [wallet, amount]
      });
      
      await publicClient.waitForTransactionReceipt({ hash: transferHash });
      console.log(`✓ Transfer successful. Transaction hash: ${transferHash}`);
    }
    
    // Check and log final balances
    console.log('\nVerifying final token balances:');
    
    for (let i = 0; i < DEV_WALLETS.length; i++) {
      const wallet = DEV_WALLETS[i] as `0x${string}`;
      const balance = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: 'balanceOf',
        args: [wallet]
      }) as bigint; // Cast to bigint for formatEther
      
      console.log(`Wallet ${i+1} (${wallet}): ${formatEther(balance)} vCUSD`);
    }
    
    const deployerBalance = await publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: 'balanceOf',
      args: [account.address]
    }) as bigint; // Cast to bigint for formatEther
    
    console.log(`Deployer (${account.address}): ${formatEther(deployerBalance)} vCUSD`);
    console.log('\nToken distribution completed successfully!');
    
  } catch (error) {
    console.error('Error during deployment or distribution:', error);
    process.exit(1);
  }
}

// Execute the main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });