// scripts/deploy-direct.ts
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// Get private key
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('Private key not found in .env file');
  process.exit(1);
}

async function main() {
  console.log("Deploying VeresCUSD token to Base Sepolia...");

  // Set up account from private key
  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  
  // Create clients
  const publicClient = createPublicClient({
    chain: celoAlfajores,
    transport: http()
  });
  
  const walletClient = createWalletClient({
    account,
    chain: celoAlfajores,
    transport: http()
  });
  
  console.log("Deploying from account:", account.address);

  try {
    // Read the compiled contract
    const artifactPath = '../artifacts/contracts/VerescUSD.sol/VeresCUSD.json';
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    
    // Deploy the contract
    const deployHash = await walletClient.deployContract({
      abi: artifact.abi,
      bytecode: artifact.bytecode as `0x${string}`,
      args: ["Veres cUSD", "vCUSD", 18]
    });
    
    console.log("Deployment transaction sent. Hash:", deployHash);
    
    // Wait for deployment to complete
    const receipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
    const contractAddress = receipt.contractAddress;
    
    console.log("VeresCUSD deployed to:", contractAddress);
  } catch (error) {
    console.error("Deployment error:", error);
  }
}

// Run the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });