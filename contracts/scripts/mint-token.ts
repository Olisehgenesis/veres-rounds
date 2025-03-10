// scripts/mint-vcusd-to-wallets.ts
import { createPublicClient, createWalletClient, http, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celoAlfajores } from 'viem/chains';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// VeresCUSD token address on celo alfajores
const VCUSD_TOKEN_ADDRESS = '0xbDF781f1FED2382Be8D28969363554d18389ECF0';

// Development wallet addresses to mint tokens to
const DEV_WALLETS = [
  '0xd7b8CD75Dc08b3a7f14d794F6BB66B3ECDcCb0b9',
  '0x872EcD4104C8Ddf917F44398d700a55700bfb1ea',
  '0xCC2112BD38600ce50a6A16826217b319B98687A9',
  '0x7Bd8671955229C3190D3742d9E6f1fc6404dAB50',
  '0x8De1D45462570Fad5B11b341B81450dA0BCD7c26'
];

// Full token ABI including mint function
const TOKEN_ABI = [
  // Read functions
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
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }]
  },
  // Write functions
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: []
  },
  // Error
  {
    type: 'error',
    name: 'ERC20InsufficientBalance',
    inputs: [
      { name: 'sender', type: 'address' },
      { name: 'balance', type: 'uint256' },
      { name: 'needed', type: 'uint256' }
    ]
  }
];

// Function to properly format amount based on token decimals (6 for stablecoins)
function parseAmount(amount: number, decimals: number): bigint {
  // Format with the correct number of decimals
  const multiplier = 10 ** decimals;
  return BigInt(Math.floor(amount * multiplier));
}

// Function to generate a random amount between 100 and 200
function getRandomAmount(decimals: number): bigint {
  // Random number between 100 and 200
  const randomNumber = 100 + Math.random() * 100;
  // Round to 2 decimal places
  const roundedNumber = Math.round(randomNumber * 100) / 100;
  // Convert to bigint with the correct number of decimals
  return parseAmount(roundedNumber, decimals);
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
    chain: celoAlfajores,
    transport: http()
  });

  const walletClient = createWalletClient({
    account,
    chain: celoAlfajores,
    transport: http()
  });

  console.log(`Minting vCUSD tokens to development wallets as owner: ${account.address}`);

  try {
    // Check symbol and decimals to verify connection
    const tokenSymbol = await publicClient.readContract({
      address: VCUSD_TOKEN_ADDRESS as `0x${string}`,
      abi: TOKEN_ABI,
      functionName: 'symbol'
    });

    const tokenDecimals = await publicClient.readContract({
      address: VCUSD_TOKEN_ADDRESS as `0x${string}`,
      abi: TOKEN_ABI,
      functionName: 'decimals'
    }) as number;

    console.log(`Connected to ${tokenSymbol} token at ${VCUSD_TOKEN_ADDRESS}`);
    console.log(`Token has ${tokenDecimals} decimals`);
    
    // Mint tokens to each wallet
    console.log('\nMinting random amounts between 100-200 tokens to each development wallet...');
    let totalMinted = BigInt(0);
    
    // Also mint a large amount (1M) to the owner if requested
    const shouldMintToOwner = false; // Set to true if you want to mint to owner
    if (shouldMintToOwner) {
      const ownerAmount = parseAmount(1000000, tokenDecimals); // 1 million tokens
      
      console.log(`\nMinting ${formatUnits(ownerAmount, tokenDecimals)} ${tokenSymbol} to owner ${account.address}...`);
      
      const ownerMintTx = await walletClient.writeContract({
        address: VCUSD_TOKEN_ADDRESS as `0x${string}`,
        abi: TOKEN_ABI,
        functionName: 'mint',
        args: [account.address, ownerAmount]
      });
      
      await publicClient.waitForTransactionReceipt({ hash: ownerMintTx });
      console.log(`✓ Minted ${formatUnits(ownerAmount, tokenDecimals)} ${tokenSymbol} to owner successfully.`);
      
      totalMinted += ownerAmount;
    }

    for (let i = 0; i < DEV_WALLETS.length; i++) {
      const wallet = DEV_WALLETS[i] as `0x${string}`;
      const amount = getRandomAmount(tokenDecimals);
      totalMinted += amount;
      
      try {
        console.log(`\nMinting to wallet ${i+1}: ${wallet}`);
        console.log(`Amount: ${formatUnits(amount, tokenDecimals)} ${tokenSymbol}`);

        // Check existing balance
        const existingBalance = await publicClient.readContract({
          address: VCUSD_TOKEN_ADDRESS as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'balanceOf',
          args: [wallet]
        }) as bigint;

        console.log(`Current balance: ${formatUnits(existingBalance, tokenDecimals)} ${tokenSymbol}`);

        // Mint tokens
        const mintTx = await walletClient.writeContract({
          address: VCUSD_TOKEN_ADDRESS as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'mint',
          args: [wallet, amount]
        });

        console.log(`Transaction sent. Hash: ${mintTx}`);
        
        // Wait for transaction to complete
        const receipt = await publicClient.waitForTransactionReceipt({ hash: mintTx });
        console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

        // Check new balance
        const newBalance = await publicClient.readContract({
          address: VCUSD_TOKEN_ADDRESS as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: 'balanceOf',
          args: [wallet]
        }) as bigint;

        console.log(`New balance: ${formatUnits(newBalance, tokenDecimals)} ${tokenSymbol}`);

      } catch (error) {
        console.error(`Error minting tokens to ${wallet}:`, error);
      }
    }

    console.log(`\nMinting complete!`);
    console.log(`Total minted: ${formatUnits(totalMinted, tokenDecimals)} ${tokenSymbol}`);

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