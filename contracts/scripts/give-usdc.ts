// scripts/give-usdc.ts
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// VeresCUSD token address on Base Sepolia
const VCUSD_TOKEN_ADDRESS = '0x0a808202BC2E35c6E903B0D1C84A0a03a08ADFF4';

// Development wallet addresses to distribute tokens to
const DEV_WALLETS = [
  '0xd7b8CD75Dc08b3a7f14d794F6BB66B3ECDcCb0b9',
  '0x872EcD4104C8Ddf917F44398d700a55700bfb1ea',
  '0xCC2112BD38600ce50a6A16826217b319B98687A9',
  '0x7Bd8671955229C3190D3742d9E6f1fc6404dAB50',
  '0x8De1D45462570Fad5B11b341B81450dA0BCD7c26'
];

// Token ABI (proper format for Viem)
const TOKEN_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }]
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
];

// Function to generate a random amount between 100 and 200
function getRandomAmount(): bigint {
  // Random number between 100 and 200
  const randomNumber = 100 + Math.random() * 100;
  // Round to 2 decimal places
  const roundedNumber = Math.round(randomNumber * 100) / 100;
  // Convert to bigint with 18 decimals
  return parseEther(roundedNumber.toString());
}

async function main() {
  // Get private key from environment variables
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    console.error('Private key not found in .env file');
    process.exit(1);
  }

  // Set up account
  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

  // Set up clients
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http()
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http()
  });

  console.log(`Distributing random vCUSD tokens from ${account.address}`);

  try {
    // Check sender balance
    const tokenSymbol = await publicClient.readContract({
      address: VCUSD_TOKEN_ADDRESS as `0x${string}`,
      abi: TOKEN_ABI,
      functionName: 'symbol'
    });

    const senderBalance = await publicClient.readContract({
      address: VCUSD_TOKEN_ADDRESS as `0x${string}`,
      abi: TOKEN_ABI,
      functionName: 'balanceOf',
      args: [account.address]
    }) as bigint;

    console.log(`Your ${tokenSymbol} balance: ${formatEther(senderBalance)}`);
    
    // Approximately calculate max needed (200 * number of wallets)
    const estimatedMaxNeeded = parseEther('200') * BigInt(DEV_WALLETS.length);
    
    // Check if we have enough balance (rough estimate)
    if (senderBalance < estimatedMaxNeeded) {
      console.error(`Potentially insufficient balance. You have ${formatEther(senderBalance)} but might need up to ${formatEther(estimatedMaxNeeded)}`);
      console.log('Continuing anyway as we\'re sending random amounts...');
    }

    // Distribute tokens to each wallet
    console.log(`\nSending random amounts between 100-200 ${tokenSymbol} to each development wallet...`);
    let totalSent = BigInt(0);

    for (let i = 0; i < DEV_WALLETS.length; i++) {
      const wallet = DEV_WALLETS[i] as `0x${string}`;
      const amount = getRandomAmount();
      totalSent += amount;
      
      try {
        console.log(`\nTransferring to wallet ${i+1}: ${wallet}`);
        console.log(`Amount: ${formatEther(amount)} ${tokenSymbol}`);

        // Check existing balance
        const existingBalance = await publicClient.readContract({
          address: VCUSD_TOKEN_ADDRESS as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'balanceOf',
          args: [wallet]
        }) as bigint;

        console.log(`Current balance: ${formatEther(existingBalance)} ${tokenSymbol}`);

        // Send tokens
        const transferHash = await walletClient.writeContract({
          address: VCUSD_TOKEN_ADDRESS as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'transfer',
          args: [wallet, amount]
        });

        console.log(`Transaction sent. Hash: ${transferHash}`);
        
        // Wait for transaction to complete
        const receipt = await publicClient.waitForTransactionReceipt({ hash: transferHash });
        console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

        // Check new balance
        const newBalance = await publicClient.readContract({
          address: VCUSD_TOKEN_ADDRESS as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'balanceOf',
          args: [wallet]
        }) as bigint;

        console.log(`New balance: ${formatEther(newBalance)} ${tokenSymbol}`);

      } catch (error) {
        console.error(`Error sending tokens to ${wallet}:`, error);
      }
    }

    // Check remaining balance of sender
    const remainingBalance = await publicClient.readContract({
      address: VCUSD_TOKEN_ADDRESS as `0x${string}`,
      abi: TOKEN_ABI,
      functionName: 'balanceOf',
      args: [account.address]
    }) as bigint;

    console.log(`\nDistribution complete!`);
    console.log(`Total sent: ${formatEther(totalSent)} ${tokenSymbol}`);
    console.log(`Your remaining ${tokenSymbol} balance: ${formatEther(remainingBalance)}`);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });