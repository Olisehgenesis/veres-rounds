// // test-integration.ts
// import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
// import { privateKeyToAccount } from 'viem/accounts';
// import { celoAlfajores } from 'viem/chains';
// import { abi as SaccoManagerABI } from './artifacts/SaccoManager.json';
// import { abi as RoundManagerABI } from './artifacts/RoundManager.json';
// import { abi as VeresRoundsFactoryABI } from './artifacts/VeresRoundsFactory.json';
// import { abi as MockcUSDTokenABI } from './artifacts/MockcUSDToken.json';
// import fs from 'fs';
// import assert from 'assert';

// // Load deployed contract addresses
// const addresses = JSON.parse(fs.readFileSync('./deployed-addresses.json', 'utf8'));

// // Set up accounts - we need at least 8 accounts for a proper integration test
// const PRIVATE_KEYS = Array.from({ length: 8 }, (_, i) => 
//   process.env[`PRIVATE_KEY_${i + 1}`] || process.env.PRIVATE_KEY
// ) as `0x${string}`[];

// const accounts = PRIVATE_KEYS.map(privateKeyToAccount);

// // Set up clients
// const publicClient = createPublicClient({
//   chain: celoAlfajores,
//   transport: http(),
// });

// const walletClients = accounts.map(account => createWalletClient({
//   account,
//   chain: celoAlfajores,
//   transport: http(),
// }));

// // Helper function for waiting between transactions
// const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// async function runIntegrationTest() {
//   console.log('Running full integration test for Veres Rounds system...');
//   console.log('Using accounts:');
//   accounts.forEach((account, index) => {
//     console.log(`Account ${index + 1}:`, account.address);
//   });

//   const { mockCUSDAddress, saccoManagerAddress, roundManagerAddress, factoryAddress } = addresses;

//   // 1. Distribute tokens to all accounts
//   console.log('\n1. Distributing tokens to all test accounts...');
  
//   for (let i = 1; i < accounts.length; i++) {
//     await walletClients[0].writeContract({
//       address: mockCUSDAddress,
//       abi: MockcUSDTokenABI,
//       functionName: 'transfer',
//       args: [accounts[i].address, parseEther('1000')],
//     });
    
//     console.log(`Transferred 1000 cUSD to Account ${i + 1}`);
//   }
  
//   // 2. Approve spending for all accounts
//   console.log('\n2. Approving token spending for all accounts...');
  
//   for (let i = 0; i < accounts.length; i++) {
//     await walletClients[i].writeContract({
//       address: mockCUSDAddress,
//       abi: MockcUSDTokenABI,
//       functionName: 'approve',
//       args: [saccoManagerAddress, parseEther('500')],
//     });
    
//     await walletClients[i].writeContract({
//       address: mockCUSDAddress,
//       abi: MockcUSDTokenABI,
//       functionName: 'approve',
//       args: [roundManagerAddress, parseEther('500')],
//     });
    
//     console.log(`Approved spending for Account ${i + 1}`);
//   }
  
//   // 3. Create a new SACCO
//   console.log('\n3. Creating a new SACCO...');
  
//   const createSaccoTx = await walletClients[0].writeContract({
//     address: saccoManagerAddress,
//     abi: SaccoManagerABI,
//     functionName: 'createSacco',
//     args: [
//       'Uganda Village SACCO',
//       'A community savings group for rural Uganda',
//       'https://example.com/uganda-sacco.png',
//       parseEther('5'), // Lower creation fee
//       parseEther('2'), // Lower round fee
//       8, // 8 total rounds
//       parseEther('0.5'), // Lower late fine
//       parseEther('1'), // Lower waive fee amount
//       parseEther('0.5'), // Lower minimum contribution
//       14, // 2 weeks round duration
//     ],
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: createSaccoTx });
//   console.log('SACCO created with transaction:', createSaccoTx);
  
//   // 4. Register SACCO in the factory
//   console.log('\n4. Registering SACCO in the factory...');
  
//   const registerTx = await walletClients[0].writeContract({
//     address: factoryAddress,
//     abi: VeresRoundsFactoryABI,
//     functionName: 'registerDeployment',
//     args: [saccoManagerAddress, roundManagerAddress, 'Uganda Village SACCO'],
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: registerTx });
//   console.log('SACCO registered with transaction:', registerTx);
  
//   // 5. Add an admin to the SACCO
//   console.log('\n5. Adding an admin to the SACCO...');
  
//   const addAdminTx = await walletClients[0].writeContract({
//     address: saccoManagerAddress,
//     abi: SaccoManagerABI,
//     functionName: 'addAdmin',
//     args: [1n, accounts[1].address],
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: addAdminTx });
//   console.log('Admin added with transaction:', addAdminTx);
  
//   // 6. Multiple members join the SACCO
//   console.log('\n6. Multiple members joining the SACCO...');
  
//   for (let i = 2; i < accounts.length; i++) {
//     const joinSaccoTx = await walletClients[i].writeContract({
//       address: saccoManagerAddress,
//       abi: SaccoManagerABI,
//       functionName: 'joinSacco',
//       args: [1n],
//     });
    
//     await publicClient.waitForTransactionReceipt({ hash: joinSaccoTx });
//     console.log(`Account ${i + 1} joined the SACCO with transaction:`, joinSaccoTx);
    
//     // Wait a bit between transactions to avoid nonce issues
//     await sleep(1000);
//   }
  
//   // 7. Set up beneficiary queue
//   console.log('\n7. Setting up the beneficiary queue...');
  
//   const setupQueueTx = await walletClients[0].writeContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'setupBeneficiaryQueue',
//     args: [1n],
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: setupQueueTx });
//   console.log('Beneficiary queue set up with transaction:', setupQueueTx);
  
//   // 8. Check initial queue
//   console.log('\n8. Checking initial beneficiary queue...');
  
//   const initialQueue = await publicClient.readContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'getBeneficiaryQueue',
//     args: [1n],
//   });
  
//   console.log('Initial beneficiary queue:', initialQueue);
  
//   // 9. Shuffle the queue to randomize order
//   console.log('\n9. Shuffling the beneficiary queue...');
  
//   const shuffleTx = await walletClients[0].writeContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'shuffleQueue',
//     args: [1n],
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: shuffleTx });
//   console.log('Queue shuffled with transaction:', shuffleTx);
  
//   // 10. Auto-start the first round
//   console.log('\n10. Auto-starting the first round...');
  
//   const autoStartTx = await walletClients[0].writeContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'autoStartNextRound',
//     args: [
//       1n, // saccoId
//       parseEther('2'), // requiredContribution
//       parseEther('14'), // targetAmount (7 members x 2 cUSD)
//       14n, // durationInDays
//     ],
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: autoStartTx });
//   console.log('First round auto-started with transaction:', autoStartTx);
  
//   // 11. Get first round details
//   console.log('\n11. Getting first round details...');
  
//   const roundDetails = await publicClient.readContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'getRoundDetails',
//     args: [1n],
//   });
  
//   console.log('First round details:', roundDetails);
//   const firstBeneficiary = roundDetails[5]; // Beneficiary address
//   console.log('First beneficiary:', firstBeneficiary);
  
//   // 12. All members join the round
//   console.log('\n12. All members joining the round...');
  
//   for (let i = 0; i < accounts.length; i++) {
//     try {
//       const joinRoundTx = await walletClients[i].writeContract({
//         address: roundManagerAddress,
//         abi: RoundManagerABI,
//         functionName: 'joinRound',
//         args: [1n],
//       });
      
//       await publicClient.waitForTransactionReceipt({ hash: joinRoundTx });
//       console.log(`Account ${i + 1} joined the round with transaction:`, joinRoundTx);
      
//       // Wait a bit between transactions
//       await sleep(1000);
//     } catch (error) {
//       console.log(`Account ${i + 1} failed to join the round (might already be a participant):`, error.message);
//     }
//   }
  
//   // 13. All members contribute to the round (except the beneficiary)
//   console.log('\n13. Members contributing to the round...');
  
//   for (let i = 0; i < accounts.length; i++) {
//     // Skip if this account is the beneficiary
//     if (accounts[i].address === firstBeneficiary) {
//       console.log(`Account ${i + 1} is the beneficiary, skipping contribution`);
//       continue;
//     }
    
//     try {
//       const contributeTx = await walletClients[i].writeContract({
//         address: roundManagerAddress,
//         abi: RoundManagerABI,
//         functionName: 'contribute',
//         args: [1n],
//       });
      
//       await publicClient.waitForTransactionReceipt({ hash: contributeTx });
//       console.log(`Account ${i + 1} contributed with transaction:`, contributeTx);
      
//       // Wait a bit between transactions
//       await sleep(1000);
//     } catch (error) {
//       console.log(`Account ${i + 1} failed to contribute:`, error.message);
//     }
//   }
  
//   // 14. Check if target is reached
//   console.log('\n14. Checking if target is reached...');
  
//   const isTargetReached = await publicClient.readContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'isTargetReached',
//     args: [1n],
//   });
  
//   console.log('Is target reached?', isTargetReached);
  
//   // 15. Beneficiary claims payout
//   console.log('\n15. Beneficiary claiming payout...');
  
//   // Find which wallet client corresponds to the beneficiary
//   const beneficiaryIndex = accounts.findIndex(account => account.address === firstBeneficiary);
  
//   if (beneficiaryIndex !== -1) {
//     try {
//       const claimPayoutTx = await walletClients[beneficiaryIndex].writeContract({
//         address: roundManagerAddress,
//         abi: RoundManagerABI,
//         functionName: 'claimPayout',
//         args: [1n],
//       });
      
//       await publicClient.waitForTransactionReceipt({ hash: claimPayoutTx });
//       console.log(`Beneficiary (Account ${beneficiaryIndex + 1}) claimed payout with transaction:`, claimPayoutTx);
//     } catch (error) {
//       console.log('Beneficiary failed to claim payout:', error.message);
//     }
//   } else {
//     console.log('Beneficiary not found among test accounts');
//   }
  
//   // 16. Check round status after payout
//   console.log('\n16. Checking round status after payout...');
  
//   const roundStatusAfter = await publicClient.readContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'getRoundDetails',
//     args: [1n],
//   });
  
//   console.log('Round status after payout:', roundStatusAfter[8].toString());
  
//   // 17. Start the second round
//   console.log('\n17. Starting the second round...');
  
//   const secondRoundTx = await walletClients[0].writeContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'autoStartNextRound',
//     args: [
//       1n, // saccoId
//       parseEther('2'), // requiredContribution
//       parseEther('14'), // targetAmount
//       14n, // durationInDays
//     ],
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: secondRoundTx });
//   console.log('Second round started with transaction:', secondRoundTx);
  
//   // 18. Check second round details
//   console.log('\n18. Checking second round details...');
  
//   const secondRoundDetails = await publicClient.readContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'getRoundDetails',
//     args: [2n],
//   });
  
//   console.log('Second round details:', secondRoundDetails);
//   const secondBeneficiary = secondRoundDetails[5];
//   console.log('Second beneficiary:', secondBeneficiary);
  
//   // 19. Check that the beneficiary has been rotated
//   console.log('\n19. Checking that the beneficiary has been rotated...');
  
//   assert(firstBeneficiary !== secondBeneficiary, 'Beneficiary should have been rotated');
//   console.log('Beneficiary rotation successful!');
  
//   // 20. Check updated beneficiary queue
//   console.log('\n20. Checking updated beneficiary queue...');
  
//   const updatedQueue = await publicClient.readContract({
//     address: roundManagerAddress,
//     abi: RoundManagerABI,
//     functionName: 'getBeneficiaryQueue',
//     args: [1n],
//   });
  
//   console.log('Updated beneficiary queue:', updatedQueue);
  
//   // 21. Waive a fee for a member
//   console.log('\n21. Waiving a fee for a member...');
  
//   const waiveFeeTx = await walletClients[0].writeContract({
//     address: saccoManagerAddress,
//     abi: SaccoManagerABI,
//     functionName: 'waiveFee',
//     args: [1n, accounts[3].address],
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: waiveFeeTx });
//   console.log('Fee waived with transaction:', waiveFeeTx);
  
//   // 22. Apply a fine to a member
//   console.log('\n22. Applying a fine to a member...');
  
//   const applyFineTx = await walletClients[0].writeContract({
//     address: saccoManagerAddress,
//     abi: SaccoManagerABI,
//     functionName: 'applyFine',
//     args: [1n, accounts[4].address, parseEther('0.5')],
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: applyFineTx });
//   console.log('Fine applied with transaction:', applyFineTx);
  
//   // 23. Member pays fine
//   console.log('\n23. Member paying fine...');
  
//   const payFineTx = await walletClients[4].writeContract({
//     address: saccoManagerAddress,
//     abi: SaccoManagerABI,
//     functionName: 'payFine',
//     args: [1n],
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: payFineTx });
//   console.log('Fine paid with transaction:', payFineTx);
  
//   // 24. Get SACCO details at the end
//   console.log('\n24. Getting final SACCO details...');
  
//   const saccoDetails = await publicClient.readContract({
//     address: saccoManagerAddress,
//     abi: SaccoManagerABI,
//     functionName: 'getSaccoDetails',
//     args: [1n],
//   });
  
//   console.log('Final SACCO details:', saccoDetails);
  
//   // 25. Verify the SACCO in the factory
//   console.log('\n25. Verifying the SACCO in the factory...');
  
//   const verifyTx = await walletClients[0].writeContract({
//     address: factoryAddress,
//     abi: VeresRoundsFactoryABI,
//     functionName: 'verifyDeployment',
//     args: [saccoManagerAddress],
//   });
  
//   await publicClient.waitForTransactionReceipt({ hash: verifyTx });
//   console.log('SACCO verified with transaction:', verifyTx);
  
//   // 26. Check verification status
//   console.log('\n26. Checking verification status...');
  
//   const isVerified = await publicClient.readContract({
//     address: factoryAddress,
//     abi: VeresRoundsFactoryABI,
//     functionName: 'isVerified',
//     args: [saccoManagerAddress],
//   });
  
//   console.log('Is SACCO verified?', isVerified);
//   assert(isVerified === true, 'SACCO should be verified');

//   console.log('\nFull integration test completed successfully!');
//   console.log('Veres Rounds SACCO system is functioning as expected.');
// }

// // Execute the tests
// runIntegrationTest()
//   .then(() => {
//     console.log('Integration tests completed successfully');
//     process.exit(0);
//   })
//   .catch((error) => {
//     console.error('Integration tests failed:', error);
//     process.exit(1);
//   });