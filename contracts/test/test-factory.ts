// // test-factory.ts
// import { createPublicClient, createWalletClient, http } from 'viem';
// import { privateKeyToAccount } from 'viem/accounts';
// import { celoAlfajores } from 'viem/chains';
// import { abi as VeresRoundsFactoryABI } from './artifacts/VeresRoundsFactory.json';
// import fs from 'fs';
// import assert from 'assert';

// // Load deployed contract addresses
// const addresses = JSON.parse(fs.readFileSync('./deployed-addresses.json', 'utf8'));

// // Set up accounts
// const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
// const PRIVATE_KEY_2 = process.env.PRIVATE_KEY_2 as `0x${string}`;

// const account1 = privateKeyToAccount(PRIVATE_KEY);
// const account2 = privateKeyToAccount(PRIVATE_KEY_2);

// // Set up clients
// const publicClient = createPublicClient({
//   chain: celoAlfajores,
//   transport: http(),
// });

// const walletClient1 = createWalletClient({
//   account: account1,
//   chain: celoAlfajores,
//   transport: http(),
// });

// const walletClient2 = createWalletClient({
//   account: account2,
//   chain: celoAlfajores,
//   transport: http(),
// });

// async function testVeresRoundsFactory() {
//   console.log('Testing VeresRoundsFactory contract...');
//   console.log('Using accounts:');
//   console.log('Account 1 (Owner):', account1.address);
//   console.log('Account 2 (User):', account2.address);

//   const { saccoManagerAddress, roundManagerAddress, factoryAddress } = addresses;

//   // 1. Register a new deployment in the factory
//   console.log('\n1. Registering a new deployment in the factory...');
  
//   const registerTx = await walletClient2.writeContract({
//     address: factoryAddress,
//     abi: VeresRoundsFactoryABI,
//     functionName: 'registerDeployment',
//     args: [saccoManagerAddress, roundManagerAddress, 'Test Deployment from Account 2'],
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: registerTx });
//   console.log('Deployment registered with transaction:', registerTx);
  
//   // 2. Get total deployments count
//   console.log('\n2. Getting total deployments count...');
  
//   const totalDeployments = await publicClient.readContract({
//     address: factoryAddress,
//     abi: VeresRoundsFactoryABI,
//     functionName: 'getTotalDeployments',
//   });
  
//   console.log('Total deployments:', totalDeployments.toString());
//   assert(totalDeployments >= 2n, 'There should be at least 2 deployments');
  
//   // 3. Get deployment by index
//   console.log('\n3. Getting deployment by index...');
  
//   const deployment1 = await publicClient.readContract({
//     address: factoryAddress,
//     abi: VeresRoundsFactoryABI,
//     functionName: 'getDeployment',
//     args: [0n],
//   });
  
//   console.log('Deployment 1:', deployment1);
  
//   // 4. Verify a deployment
//   console.log('\n4. Verifying a deployment...');
  
//   const verifyTx = await walletClient1.writeContract({
//     address: factoryAddress,
//     abi: VeresRoundsFactoryABI,
//     functionName: 'verifyDeployment',
//     args: [saccoManagerAddress],
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: verifyTx });
//   console.log('Deployment verified with transaction:', verifyTx);
  
//   // 5. Check if deployment is verified
//   console.log('\n5. Checking if deployment is verified...');
  
//   const isVerified = await publicClient.readContract({
//     address: factoryAddress,
//     abi: VeresRoundsFactoryABI,
//     functionName: 'isVerified',
//     args: [saccoManagerAddress],
//   });
  
//   console.log('Is deployment verified?', isVerified);
//   assert(isVerified === true, 'Deployment should be verified');

//   // 6. Get deployments by deployer
//   console.log('\n6. Getting deployments by deployer...');
  
//   const deployerDeployments = await publicClient.readContract({
//     address: factoryAddress,
//     abi: VeresRoundsFactoryABI,
//     functionName: 'getDeploymentsByDeployer',
//     args: [account2.address],
//   });
  
//   console.log('Deployments by account2:', deployerDeployments);
//   assert(deployerDeployments.length > 0, 'Account2 should have at least one deployment');

//   // 7. Get deployment count by deployer
//   console.log('\n7. Getting deployment count by deployer...');
  
//   const deploymentCount = await publicClient.readContract({
//     address: factoryAddress,
//     abi: VeresRoundsFactoryABI,
//     functionName: 'deploymentCounts',
//     args: [account2.address],
//   });
  
//   console.log('Deployment count for account2:', deploymentCount.toString());
//   assert(deploymentCount >= 1n, 'Account2 should have at least 1 deployment');
  
//   console.log('\nAll VeresRoundsFactory tests completed successfully!');
// }

// // Execute the tests
// testVeresRoundsFactory()
//   .then(() => {
//     console.log('VeresRoundsFactory tests completed successfully');
//     process.exit(0);
//   })
//   .catch((error) => {
//     console.error('VeresRoundsFactory tests failed:', error);
//     process.exit(1);
//   });