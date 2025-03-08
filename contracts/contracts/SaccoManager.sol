// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SaccoManager
 * @dev Manages SACCO creation, administration, and fee collection using cUSD.
 */
contract SaccoManager is Ownable, ReentrancyGuard {
    IERC20 public cUSD;
    uint256 public saccoCount;
    uint256 public platformFeePercentage = 5; // 5% platform fee
    
    enum SaccoStatus { Active, Paused, Completed, Terminated }
    
    struct Sacco {
        uint256 saccoId;
        string title;
        string description;
        string imageLink;
        uint256 creationFee;
        uint256 roundFee;
        uint256 totalRounds;
        address createdBy;
        uint256 createdOn;
        uint256 roundStart;
        uint256 roundsDone;
        uint256 lateFine;
        uint256 waiveFeeAmount;
        uint256 minimumContribution;
        uint256 saccoBalance;
        uint256 memberCount;
        uint256 roundDuration; // in days
        SaccoStatus status;
    }

    // Separate mapping for admins to avoid struct size limitations
    mapping(uint256 => mapping(address => bool)) public saccoAdmins;
    mapping(uint256 => Sacco) public saccos;
    mapping(address => uint256[]) public userSaccos;
    mapping(uint256 => address[]) public saccoMembers;
    mapping(uint256 => mapping(address => bool)) public waivedFees;
    mapping(uint256 => mapping(address => uint256)) public userFines;
    mapping(uint256 => mapping(address => uint256)) public userContributions;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public contributionsMade; // saccoId => roundNumber => user => hasContributed
    
    // Events
    event SaccoCreated(uint256 indexed saccoId, address indexed createdBy, string title);
    event AdminAdded(uint256 indexed saccoId, address indexed admin);
    event AdminRemoved(uint256 indexed saccoId, address indexed admin);
    event MemberAdded(uint256 indexed saccoId, address indexed member);
    event FeeUpdated(uint256 indexed saccoId, uint256 newRoundFee, uint256 newLateFine, uint256 newWaiveFee);
    event FeeWaived(uint256 indexed saccoId, address indexed member);
    event FineApplied(uint256 indexed saccoId, address indexed member, uint256 amount);
    event FinePaid(uint256 indexed saccoId, address indexed member, uint256 amount);
    event FundsWithdrawn(uint256 indexed saccoId, address indexed admin, uint256 amount);
    event FundsDeposited(uint256 indexed saccoId, address indexed depositor, uint256 amount);
    event SaccoStatusChanged(uint256 indexed saccoId, SaccoStatus newStatus);
    event PlatformFeeUpdated(uint256 newFeePercentage);
    event ContributionMade(uint256 indexed saccoId, uint256 indexed roundNumber, address indexed member, uint256 amount);
    event RoundAdvanced(uint256 indexed saccoId, uint256 newRoundNumber);

    modifier onlyAdmin(uint256 saccoId) {
        require(saccoAdmins[saccoId][msg.sender], "Not Sacco Admin");
        _;
    }

    modifier onlySaccoCreator(uint256 saccoId) {
        require(saccos[saccoId].createdBy == msg.sender, "Not Sacco Creator");
        _;
    }

    modifier saccoExists(uint256 saccoId) {
        require(saccoId > 0 && saccoId <= saccoCount, "Sacco does not exist");
        _;
    }

    modifier saccoActive(uint256 saccoId) {
        require(saccos[saccoId].status == SaccoStatus.Active, "Sacco is not active");
        _;
    }

    constructor(address _cUSD) Ownable(msg.sender) {
        cUSD = IERC20(_cUSD);
    }

    /**
     * @dev Creates a new SACCO with specified parameters
     */
    function createSacco(
        string memory _title,
        string memory _description,
        string memory _imageLink,
        uint256 _creationFee,
        uint256 _roundFee,
        uint256 _totalRounds,
        uint256 _lateFine,
        uint256 _waiveFeeAmount,
        uint256 _minimumContribution,
        uint256 _roundDuration
    ) external nonReentrant {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(_totalRounds > 0, "Total rounds must be positive");
        require(_roundDuration > 0, "Round duration must be positive");
        require(_minimumContribution > 0, "Minimum contribution must be positive");
        
        // Transfer creation fee from user to contract
        require(cUSD.transferFrom(msg.sender, address(this), _creationFee), "Creation fee payment failed");
        
        saccoCount++;
        
        Sacco storage newSacco = saccos[saccoCount];
        newSacco.saccoId = saccoCount;
        newSacco.title = _title;
        newSacco.description = _description;
        newSacco.imageLink = _imageLink;
        newSacco.creationFee = _creationFee;
        newSacco.roundFee = _roundFee;
        newSacco.totalRounds = _totalRounds;
        newSacco.createdBy = msg.sender;
        newSacco.createdOn = block.timestamp;
        newSacco.lateFine = _lateFine;
        newSacco.waiveFeeAmount = _waiveFeeAmount;
        newSacco.minimumContribution = _minimumContribution;
        newSacco.saccoBalance = _creationFee;
        newSacco.memberCount = 1; // Creator is the first member
        newSacco.roundDuration = _roundDuration * 1 days;
        newSacco.status = SaccoStatus.Active;
        
        // Add creator as admin
        saccoAdmins[saccoCount][msg.sender] = true;
        
        // Add SACCO to creator's list
        userSaccos[msg.sender].push(saccoCount);
        
        // Add creator as member
        saccoMembers[saccoCount].push(msg.sender);
        
        emit SaccoCreated(saccoCount, msg.sender, _title);
        emit AdminAdded(saccoCount, msg.sender);
        emit MemberAdded(saccoCount, msg.sender);
    }

    /**
     * @dev Adds a new admin to a SACCO
     */
    function addAdmin(uint256 saccoId, address admin) 
        external 
        saccoExists(saccoId) 
        onlyAdmin(saccoId) 
        saccoActive(saccoId) 
    {
        require(admin != address(0), "Invalid admin address");
        require(!saccoAdmins[saccoId][admin], "Already an admin");
        
        saccoAdmins[saccoId][admin] = true;
        emit AdminAdded(saccoId, admin);
    }

    /**
     * @dev Removes an admin from a SACCO
     */
    function removeAdmin(uint256 saccoId, address admin) 
        external 
        saccoExists(saccoId) 
        onlySaccoCreator(saccoId) 
        saccoActive(saccoId) 
    {
        require(admin != saccos[saccoId].createdBy, "Cannot remove creator as admin");
        require(saccoAdmins[saccoId][admin], "Not an admin");
        
        saccoAdmins[saccoId][admin] = false;
        emit AdminRemoved(saccoId, admin);
    }

    /**
     * @dev Joins a SACCO as a member
     */
    function joinSacco(uint256 saccoId) 
        external 
        nonReentrant 
        saccoExists(saccoId) 
        saccoActive(saccoId) 
    {
        Sacco storage sacco = saccos[saccoId];
        
        // Check if already a member
        bool isMember = false;
        for (uint256 i = 0; i < saccoMembers[saccoId].length; i++) {
            if (saccoMembers[saccoId][i] == msg.sender) {
                isMember = true;
                break;
            }
        }
        require(!isMember, "Already a member");
        
        // Pay round fee to join
        require(cUSD.transferFrom(msg.sender, address(this), sacco.roundFee), "Join fee payment failed");
        
        // Add member
        saccoMembers[saccoId].push(msg.sender);
        sacco.memberCount++;
        sacco.saccoBalance += sacco.roundFee;
        
        // Add SACCO to user's list
        userSaccos[msg.sender].push(saccoId);
        
        emit MemberAdded(saccoId, msg.sender);
        emit FundsDeposited(saccoId, msg.sender, sacco.roundFee);
    }

    /**
     * @dev Updates the fees for a SACCO
     */
    function updateFees(
        uint256 saccoId, 
        uint256 newRoundFee, 
        uint256 newLateFine,
        uint256 newWaiveFee
    ) 
        external 
        saccoExists(saccoId) 
        onlyAdmin(saccoId) 
        saccoActive(saccoId) 
    {
        Sacco storage sacco = saccos[saccoId];
        
        sacco.roundFee = newRoundFee;
        sacco.lateFine = newLateFine;
        sacco.waiveFeeAmount = newWaiveFee;
        
        emit FeeUpdated(saccoId, newRoundFee, newLateFine, newWaiveFee);
    }

    /**
     * @dev Allows an admin to waive fees for a specific member
     */
    function waiveFee(uint256 saccoId, address member) 
        external 
        saccoExists(saccoId) 
        onlyAdmin(saccoId) 
        saccoActive(saccoId) 
    {
        require(!waivedFees[saccoId][member], "Fee already waived");
        
        waivedFees[saccoId][member] = true;
        emit FeeWaived(saccoId, member);
    }

    /**
     * @dev Applies a fine to a member
     */
    function applyFine(uint256 saccoId, address member, uint256 amount) 
        external 
        saccoExists(saccoId) 
        onlyAdmin(saccoId) 
        saccoActive(saccoId) 
    {
        require(amount > 0, "Fine amount must be positive");
        
        userFines[saccoId][member] += amount;
        emit FineApplied(saccoId, member, amount);
    }

    /**
     * @dev Allows a member to pay their fine
     */
    function payFine(uint256 saccoId) 
        external 
        nonReentrant 
        saccoExists(saccoId) 
        saccoActive(saccoId) 
    {
        uint256 fineAmount = userFines[saccoId][msg.sender];
        require(fineAmount > 0, "No fines to pay");
        
        // Transfer fine from user to contract
        require(cUSD.transferFrom(msg.sender, address(this), fineAmount), "Fine payment failed");
        
        // Update SACCO balance and clear fine
        saccos[saccoId].saccoBalance += fineAmount;
        userFines[saccoId][msg.sender] = 0;
        
        emit FinePaid(saccoId, msg.sender, fineAmount);
        emit FundsDeposited(saccoId, msg.sender, fineAmount);
    }

    /**
     * @dev Allows an admin to withdraw funds from a SACCO
     */
    function withdrawFunds(uint256 saccoId, uint256 amount) 
        external 
        nonReentrant 
        saccoExists(saccoId) 
        onlyAdmin(saccoId) 
    {
        Sacco storage sacco = saccos[saccoId];
        require(sacco.saccoBalance >= amount, "Insufficient balance");
        
        // Calculate platform fee
        uint256 platformFee = (amount * platformFeePercentage) / 100;
        uint256 amountAfterFee = amount - platformFee;
        
        // Update balance
        sacco.saccoBalance -= amount;
        
        // Transfer funds
        require(cUSD.transfer(msg.sender, amountAfterFee), "Transfer to admin failed");
        require(cUSD.transfer(owner(), platformFee), "Platform fee transfer failed");
        
        emit FundsWithdrawn(saccoId, msg.sender, amount);
    }

    /**
     * @dev Allows members to make additional contributions to a SACCO
     */
    function makeContribution(uint256 saccoId, uint256 amount) 
        external 
        nonReentrant 
        saccoExists(saccoId) 
        saccoActive(saccoId) 
    {
        require(amount >= saccos[saccoId].minimumContribution, "Below minimum contribution");
        
        // Transfer funds from user to contract
        require(cUSD.transferFrom(msg.sender, address(this), amount), "Contribution failed");
        
        // Update SACCO balance
        saccos[saccoId].saccoBalance += amount;
        
        emit FundsDeposited(saccoId, msg.sender, amount);
    }

    /**
     * @dev Changes the status of a SACCO
     */
    function changeSaccoStatus(uint256 saccoId, SaccoStatus newStatus) 
        external 
        saccoExists(saccoId) 
        onlySaccoCreator(saccoId) 
    {
        saccos[saccoId].status = newStatus;
        emit SaccoStatusChanged(saccoId, newStatus);
    }

    /**
     * @dev Updates the platform fee percentage (only owner)
     */
    function updatePlatformFee(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 10, "Fee too high"); // Max 10%
        platformFeePercentage = newFeePercentage;
        emit PlatformFeeUpdated(newFeePercentage);
    }

    /**
     * @dev Retrieves details of a SACCO
     */
    function getSaccoDetails(uint256 saccoId) 
        external 
        view 
        saccoExists(saccoId) 
        returns (
            string memory title,
            string memory description,
            string memory imageLink,
            uint256 creationFee,
            uint256 roundFee,
            uint256 totalRounds,
            address createdBy,
            uint256 createdOn,
            uint256 roundStart,
            uint256 roundsDone,
            uint256 lateFine,
            uint256 waiveFeeAmount,
            uint256 minimumContribution,
            uint256 saccoBalance,
            uint256 memberCount,
            uint256 roundDuration,
            SaccoStatus status
        ) 
    {
        Sacco storage sacco = saccos[saccoId];
        
        return (
            sacco.title,
            sacco.description,
            sacco.imageLink,
            sacco.creationFee,
            sacco.roundFee,
            sacco.totalRounds,
            sacco.createdBy,
            sacco.createdOn,
            sacco.roundStart,
            sacco.roundsDone,
            sacco.lateFine,
            sacco.waiveFeeAmount,
            sacco.minimumContribution,
            sacco.saccoBalance,
            sacco.memberCount,
            sacco.roundDuration,
            sacco.status
        );
    }

    /**
     * @dev Gets the list of members in a SACCO
     */
    function getSaccoMembers(uint256 saccoId) 
        external 
        view 
        saccoExists(saccoId) 
        returns (address[] memory) 
    {
        return saccoMembers[saccoId];
    }

    /**
     * @dev Checks if a user is a member of a SACCO
     */
    function isMember(uint256 saccoId, address user) 
        external 
        view 
        saccoExists(saccoId) 
        returns (bool) 
    {
        for (uint256 i = 0; i < saccoMembers[saccoId].length; i++) {
            if (saccoMembers[saccoId][i] == user) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Checks if a user is an admin of a SACCO
     */
    function isAdmin(uint256 saccoId, address user) 
        external 
        view 
        saccoExists(saccoId) 
        returns (bool) 
    {
        return saccoAdmins[saccoId][user];
    }

    /**
     * @dev Gets the list of SACCOs a user is a member of
     */
    function getUserSaccos(address user) external view returns (uint256[] memory) {
        return userSaccos[user];
    }

    /**
     * @dev Gets the fine amount for a specific member in a SACCO
     */
    function getUserFine(uint256 saccoId, address user) 
        external 
        view 
        saccoExists(saccoId) 
        returns (uint256) 
    {
        return userFines[saccoId][user];
    }

    /**
     * @dev Registers a contribution for the current round
     */
    function registerContribution(uint256 saccoId, address member, uint256 amount) 
        external 
        saccoExists(saccoId) 
        onlyAdmin(saccoId) 
        saccoActive(saccoId) 
    {
        require(!contributionsMade[saccoId][saccos[saccoId].roundsDone][member], "Already contributed for this round");
        
        // Register contribution
        contributionsMade[saccoId][saccos[saccoId].roundsDone][member] = true;
        userContributions[saccoId][member] += amount;
        
        emit ContributionMade(saccoId, saccos[saccoId].roundsDone, member, amount);
    }

    /**
     * @dev Advances to the next round
     */
    function advanceRound(uint256 saccoId) 
        external 
        saccoExists(saccoId) 
        onlyAdmin(saccoId) 
        saccoActive(saccoId) 
    {
        Sacco storage sacco = saccos[saccoId];
        require(sacco.roundsDone < sacco.totalRounds, "All rounds completed");
        
        sacco.roundsDone++;
        
        emit RoundAdvanced(saccoId, sacco.roundsDone);
    }

    /**
     * @dev Checks if a member has contributed for the current round
     */
    function hasContributedForRound(uint256 saccoId, uint256 roundNumber, address member) 
        external 
        view 
        saccoExists(saccoId) 
        returns (bool) 
    {
        return contributionsMade[saccoId][roundNumber][member];
    }

    /**
     * @dev Gets the total contribution of a member
     */
    function getTotalContribution(uint256 saccoId, address member) 
        external 
        view 
        saccoExists(saccoId) 
        returns (uint256) 
    {
        return userContributions[saccoId][member];
    }
}