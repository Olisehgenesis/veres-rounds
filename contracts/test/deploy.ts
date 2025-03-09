// // deploy.ts
// import { createPublicClient, createWalletClient, http } from 'viem';
// import { privateKeyToAccount } from 'viem/accounts';
// import { celoAlfajores } from 'viem/chains';
// import { abi as SaccoManagerABI } from '../artifacts/contracts/SaccoManager.sol/SaccoManager.json';
// import { abi as RoundManagerABI } from '../artifacts/contracts/VeresRoundsFactory.sol/VeresRoundsFactory.json';
// import { abi as VeresRoundsFactoryABI } from './artifacts/VeresRoundsFactory.json';
// import { abi as MockcUSDTokenABI } from './artifacts/MockcUSDToken.json';
// import { bytecode as SaccoManagerBytecode } from './artifacts/SaccoManager.json';
// import { bytecode as RoundManagerBytecode } from './artifacts/RoundManager.json';
// import { bytecode as VeresRoundsFactoryBytecode } from './artifacts/VeresRoundsFactory.json';
// import { bytecode as MockcUSDTokenBytecode } from './artifacts/MockcUSDToken.json';
// import dotenv from 'dotenv';

// dotenv.config();

// // Set up the private key and account
// const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
// const account = privateKeyToAccount(PRIVATE_KEY);

// // Set up the client
// const publicClient = createPublicClient({
//   chain: celoAlfajores,
//   transport: http(),
// });

// const walletClient = createWalletClient({
//   account,
//   chain: celoAlfajores,
//   transport: http(),
// });

// async function deployContracts() {
//   console.log('Deploying contracts with account:', account.address);

//   // 1. Deploy the mock cUSD token first
//   console.log('Deploying MockcUSDToken...');
//   const mockCUSDHash = await walletClient.deployContract({
//     abi: MockcUSDTokenABI,
//     bytecode: MockcUSDTokenBytecode as `0x${string}`,
//     args: ['Mock cUSD', 'mcUSD', 18],
//   });

//   const mockCUSDTxReceipt = await publicClient.waitForTransactionReceipt({ 
//     hash: mockCUSDHash 
//   });
//   const mockCUSDAddress = mockCUSDTxReceipt.contractAddress as `0x${string}`;
//   console.log('MockcUSDToken deployed at:', mockCUSDAddress);

//   // 2. Deploy SaccoManager
//   console.log('Deploying SaccoManager...');
//   const saccoManagerHash = await walletClient.deployContract({
//     abi: SaccoManagerABI,
//     bytecode: SaccoManagerBytecode as `0x${string}`,
//     args: [mockCUSDAddress],
//   });

//   const saccoManagerTxReceipt = await publicClient.waitForTransactionReceipt({ 
//     hash: saccoManagerHash 
//   });
//   const saccoManagerAddress = saccoManagerTxReceipt.contractAddress as `0x${string}`;
//   console.log('SaccoManager deployed at:', saccoManagerAddress);

//   // 3. Deploy RoundManager
//   console.log('Deploying RoundManager...');
//   const roundManagerHash = await walletClient.deployContract({
//     abi: RoundManagerABI,
//     bytecode: RoundManagerBytecode as `0x${string}`,
//     args: [mockCUSDAddress, saccoManagerAddress],
//   });

//   const roundManagerTxReceipt = await publicClient.waitForTransactionReceipt({ 
//     hash: roundManagerHash 
//   });
//   const roundManagerAddress = roundManagerTxReceipt.contractAddress as `0x${string}`;
//   console.log('RoundManager deployed at:', roundManagerAddress);

//   // 4. Deploy VeresRoundsFactory
//   console.log('Deploying VeresRoundsFactory...');
//   const factoryHash = await walletClient.deployContract({
//     abi: VeresRoundsFactoryABI,
//     bytecode: VeresRoundsFactoryBytecode as `0x${string}`,
//     args: [],
//   });

//   const factoryTxReceipt = await publicClient.waitForTransactionReceipt({ 
//     hash: factoryHash 
//   });
//   const factoryAddress = factoryTxReceipt.contractAddress as `0x${string}`;
//   console.log('VeresRoundsFactory deployed at:', factoryAddress);

//   // 5. Register deployment in the factory
//   console.log('Registering deployment in the factory...');
//   await walletClient.writeContract({
//     address: factoryAddress,
//     abi: VeresRoundsFactoryABI,
//     functionName: 'registerDeployment',
//     args: [saccoManagerAddress, roundManagerAddress, 'Veres Rounds Test Deployment'],
//   });

//   console.log('Deployment registered in the factory');

//   return { 
//     mockCUSDAddress, 
//     saccoManagerAddress, 
//     roundManagerAddress, 
//     factoryAddress 
//   };
// }

// // Execute the deployment
// deployContracts()
//   .then((addresses) => {
//     console.log('All contracts deployed successfully:');
//     console.log(addresses);
    
//     // Save addresses to a file for future reference
//     const fs = require('fs');
//     fs.writeFileSync(
//       './deployed-addresses.json', 
//       JSON.stringify(addresses, null, 2)
//     );
    
//     console.log('Addresses saved to deployed-addresses.json');
//     process.exit(0);
//   })
//   .catch((error) => {
//     console.error('Deployment failed:', error);
//     process.exit(1);
//   });