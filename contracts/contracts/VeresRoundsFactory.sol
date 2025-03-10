// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;

// import "@openzeppelin/contracts/access/Ownable.sol";

// /**
//  * @title VeresRoundsFactory
//  * @dev Factory contract to deploy and track SaccoManager and RoundManager instances
//  */
// contract VeresRoundsFactory is Ownable {
//     // Structs
//     struct DeploymentInfo {
//         address saccoManager;
//         address roundManager;
//         address deployer;
//         uint256 deployedAt;
//         string name;
//     }
    
//     // State variables
//     DeploymentInfo[] public deployments;
//     mapping(address => bool) public verifiedDeployments;
//     mapping(address => DeploymentInfo[]) public deployerToDeployments;
//     mapping(address => uint256) public deploymentCounts;
    
//     // Events
//     event DeploymentCreated(address indexed saccoManager, address indexed roundManager, address indexed deployer);
//     event DeploymentVerified(address indexed saccoManager, address indexed verifier);
    
//     constructor() Ownable(msg.sender) {}
    
//     /**
//      * @dev Registers a new deployment of SaccoManager and RoundManager
//      */
//     function registerDeployment(
//         address saccoManager, 
//         address roundManager, 
//         string memory name
//     ) external {
//         require(saccoManager != address(0), "Invalid SaccoManager address");
//         require(roundManager != address(0), "Invalid RoundManager address");
//         require(bytes(name).length > 0, "Name cannot be empty");
        
//         // Create deployment info
//         DeploymentInfo memory newDeployment = DeploymentInfo({
//             saccoManager: saccoManager,
//             roundManager: roundManager,
//             deployer: msg.sender,
//             deployedAt: block.timestamp,
//             name: name
//         });
        
//         // Add to deployments
//         deployments.push(newDeployment);
//         deployerToDeployments[msg.sender].push(newDeployment);
//         deploymentCounts[msg.sender]++;
        
//         emit DeploymentCreated(saccoManager, roundManager, msg.sender);
//     }
    
//     /**
//      * @dev Verifies a deployment (only owner)
//      */
//     function verifyDeployment(address saccoManager) external onlyOwner {
//         require(saccoManager != address(0), "Invalid SaccoManager address");
        
//         verifiedDeployments[saccoManager] = true;
//         emit DeploymentVerified(saccoManager, msg.sender);
//     }
    
//     /**
//      * @dev Gets all deployments for a specific deployer
//      */
//     function getDeploymentsByDeployer(address deployer) external view returns (DeploymentInfo[] memory) {
//         return deployerToDeployments[deployer];
//     }
    
//     /**
//      * @dev Gets the total number of deployments
//      */
//     function getTotalDeployments() external view returns (uint256) {
//         return deployments.length;
//     }
    
//     /**
//      * @dev Gets a deployment by index
//      */
//     function getDeployment(uint256 index) external view returns (
//         address saccoManager,
//         address roundManager,
//         address deployer,
//         uint256 deployedAt,
//         string memory name,
//         bool isVerified
//     ) {
//         require(index < deployments.length, "Index out of bounds");
        
//         DeploymentInfo memory deployment = deployments[index];
//         return (
//             deployment.saccoManager,
//             deployment.roundManager,
//             deployment.deployer,
//             deployment.deployedAt,
//             deployment.name,
//             verifiedDeployments[deployment.saccoManager]
//         );
//     }
    
//     /**
//      * @dev Checks if a deployment is verified
//      */
//     function isVerified(address saccoManager) external view returns (bool) {
//         return verifiedDeployments[saccoManager];
//     }
// }