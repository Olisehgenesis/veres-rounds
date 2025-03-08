// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ISaccoManager {
    function isAdmin(uint256 saccoId, address user) external view returns (bool);
    function isMember(uint256 saccoId, address user) external view returns (bool);
    function getSaccoMembers(uint256 saccoId) external view returns (address[] memory);
    function waiveFee(uint256 saccoId, address member) external;
    function applyFine(uint256 saccoId, address member, uint256 amount) external;
    function registerContribution(uint256 saccoId, address member, uint256 amount) external;
    function advanceRound(uint256 saccoId) external;
    function hasContributedForRound(uint256 saccoId, uint256 roundNumber, address member) external view returns (bool);
}

/**
 * @title RoundManager
 * @dev Handles savings and loan rounds for SACCOs.
 */
contract RoundManager is ReentrancyGuard {
    IERC20 public cUSD;
    ISaccoManager public saccoManager;
    uint256 public roundCount;
    
    enum RoundStatus { NotStarted, Active, Completed, Cancelled }
    
    struct RoundParticipant {
        bool hasJoined;
        bool hasContributed;
        bool hasClaimed;
        uint256 contributionAmount;
        uint256 payoutAmount;
        uint256 timestamp;
    }
    
    struct Round {
        uint256 roundId;
        uint256 saccoId;
        uint256 startTime;
        uint256 endTime;
        uint256 requiredContribution;
        uint256 totalContributed;
        address beneficiary;
        uint256 targetAmount;
        uint256 participantCount;
        RoundStatus status;
    }

    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(address => RoundParticipant)) public roundParticipants;
    mapping(uint256 => address[]) public roundParticipantList;
    mapping(uint256 => uint256[]) public saccoRounds;
    
    // Events
    event RoundCreated(uint256 indexed roundId, uint256 indexed saccoId, address indexed creator);
    event RoundStarted(uint256 indexed roundId, uint256 indexed saccoId, uint256 startTime, uint256 endTime);
    event RoundJoined(uint256 indexed roundId, address indexed participant);
    event ContributionMade(uint256 indexed roundId, address indexed contributor, uint256 amount);
    event PayoutClaimed(uint256 indexed roundId, address indexed beneficiary, uint256 amount);
    event RoundStatusChanged(uint256 indexed roundId, RoundStatus newStatus);
    event BeneficiaryChanged(uint256 indexed roundId, address indexed newBeneficiary);

    modifier onlySaccoAdmin(uint256 saccoId) {
        require(saccoManager.isAdmin(saccoId, msg.sender), "Not Sacco Admin");
        _;
    }

    modifier roundExists(uint256 roundId) {
        require(roundId > 0 && roundId <= roundCount, "Round does not exist");
        _;
    }

    modifier roundActive(uint256 roundId) {
        require(rounds[roundId].status == RoundStatus.Active, "Round is not active");
        _;
    }
    
    modifier onlyBeneficiary(uint256 roundId) {
        require(msg.sender == rounds[roundId].beneficiary, "Not the beneficiary");
        _;
    }

    constructor(address _cUSD, address _saccoManager) {
        cUSD = IERC20(_cUSD);
        saccoManager = ISaccoManager(_saccoManager);
    }

    /**
     * @dev Creates a new round for a SACCO
     */
    function createRound(
        uint256 saccoId, 
        uint256 requiredContribution,
        uint256 targetAmount,
        uint256 durationInDays
    ) 
        external 
        onlySaccoAdmin(saccoId) 
    {
        require(requiredContribution > 0, "Required contribution must be positive");
        require(targetAmount > 0, "Target amount must be positive");
        require(durationInDays > 0, "Duration must be positive");
        
        roundCount++;
        
        Round storage newRound = rounds[roundCount];
        newRound.roundId = roundCount;
        newRound.saccoId = saccoId;
        newRound.requiredContribution = requiredContribution;
        newRound.targetAmount = targetAmount;
        newRound.status = RoundStatus.NotStarted;
        
        // Add to SACCO's rounds
        saccoRounds[saccoId].push(roundCount);
        
        emit RoundCreated(roundCount, saccoId, msg.sender);
    }

    /**
     * @dev Starts a round and sets the beneficiary
     */
    function startRound(uint256 roundId, address beneficiary, uint256 durationInDays) 
        external 
        roundExists(roundId) 
        onlySaccoAdmin(rounds[roundId].saccoId) 
    {
        Round storage round = rounds[roundId];
        require(round.status == RoundStatus.NotStarted, "Round not in NotStarted state");
        require(saccoManager.isMember(round.saccoId, beneficiary), "Beneficiary must be a SACCO member");
        
        round.beneficiary = beneficiary;
        round.startTime = block.timestamp;
        round.endTime = block.timestamp + (durationInDays * 1 days);
        round.status = RoundStatus.Active;
        
        emit RoundStarted(roundId, round.saccoId, round.startTime, round.endTime);
        emit BeneficiaryChanged(roundId, beneficiary);
        emit RoundStatusChanged(roundId, RoundStatus.Active);
    }

    /**
     * @dev Allows a SACCO member to join a round
     */
    function joinRound(uint256 roundId) 
        external 
        roundExists(roundId) 
        roundActive(roundId) 
    {
        Round storage round = rounds[roundId];
        require(saccoManager.isMember(round.saccoId, msg.sender), "Not a SACCO member");
        require(!roundParticipants[roundId][msg.sender].hasJoined, "Already joined this round");
        
        // Add participant
        roundParticipants[roundId][msg.sender] = RoundParticipant({
            hasJoined: true,
            hasContributed: false,
            hasClaimed: false,
            contributionAmount: 0,
            payoutAmount: 0,
            timestamp: block.timestamp
        });
        
        roundParticipantList[roundId].push(msg.sender);
        round.participantCount++;
        
        emit RoundJoined(roundId, msg.sender);
    }

    /**
     * @dev Makes a contribution to the round
     */
    function contribute(uint256 roundId) 
        external 
        nonReentrant 
        roundExists(roundId) 
        roundActive(roundId) 
    {
        Round storage round = rounds[roundId];
        RoundParticipant storage participant = roundParticipants[roundId][msg.sender];
        
        require(participant.hasJoined, "Not a participant in this round");
        require(!participant.hasContributed, "Already contributed to this round");
        require(block.timestamp <= round.endTime, "Round contribution period ended");
        
        // Transfer contribution from user to contract
        require(cUSD.transferFrom(msg.sender, address(this), round.requiredContribution), "Contribution failed");
        
        // Update participant and round data
        participant.hasContributed = true;
        participant.contributionAmount = round.requiredContribution;
        participant.timestamp = block.timestamp;
        round.totalContributed += round.requiredContribution;
        
        emit ContributionMade(roundId, msg.sender, round.requiredContribution);
        
        // Check if target amount reached
        if (round.totalContributed >= round.targetAmount) {
            _processPayout(roundId);
        }
    }

    /**
     * @dev Internal function to process payout when target is reached
     */
    function _processPayout(uint256 roundId) internal {
        Round storage round = rounds[roundId];
        
        // Make payout available for beneficiary
        roundParticipants[roundId][round.beneficiary].payoutAmount = round.totalContributed;
    }

    /**
     * @dev Allows the beneficiary to claim their payout
     */
    function claimPayout(uint256 roundId) 
        external 
        nonReentrant 
        roundExists(roundId) 
        onlyBeneficiary(roundId) 
    {
        Round storage round = rounds[roundId];
        RoundParticipant storage beneficiary = roundParticipants[roundId][msg.sender];
        
        require(round.status == RoundStatus.Active, "Round not active");
        require(beneficiary.payoutAmount > 0, "No payout available");
        require(!beneficiary.hasClaimed, "Already claimed payout");
        
        uint256 payoutAmount = beneficiary.payoutAmount;
        beneficiary.hasClaimed = true;
        
        // Transfer funds to beneficiary
        require(cUSD.transfer(msg.sender, payoutAmount), "Payout transfer failed");
        
        emit PayoutClaimed(roundId, msg.sender, payoutAmount);
        
        // If beneficiary has claimed, mark round as completed
        round.status = RoundStatus.Completed;
        emit RoundStatusChanged(roundId, RoundStatus.Completed);
    }

    /**
     * @dev Applies fines to participants who didn't contribute
     */
    function applyLateFines(uint256 roundId) 
        external 
        roundExists(roundId) 
        onlySaccoAdmin(rounds[roundId].saccoId) 
    {
        Round storage round = rounds[roundId];
        require(block.timestamp > round.endTime, "Round still in progress");
        require(round.status == RoundStatus.Active, "Round not active");
        
        for (uint256 i = 0; i < roundParticipantList[roundId].length; i++) {
            address participant = roundParticipantList[roundId][i];
            RoundParticipant storage participantData = roundParticipants[roundId][participant];
            
            if (participantData.hasJoined && !participantData.hasContributed) {
                // Apply fine through SaccoManager
                saccoManager.applyFine(round.saccoId, participant, round.requiredContribution / 4); // 25% of required contribution
            }
        }
    }

    /**
     * @dev Changes the beneficiary of a round
     */
    function changeBeneficiary(uint256 roundId, address newBeneficiary) 
        external 
        roundExists(roundId) 
        onlySaccoAdmin(rounds[roundId].saccoId) 
    {
        Round storage round = rounds[roundId];
        require(round.status == RoundStatus.Active, "Round not active");
        require(roundParticipants[roundId][round.beneficiary].payoutAmount == 0, "Payout already assigned");
        require(saccoManager.isMember(round.saccoId, newBeneficiary), "Not a SACCO member");
        
        round.beneficiary = newBeneficiary;
        emit BeneficiaryChanged(roundId, newBeneficiary);
    }

    /**
     * @dev Cancels a round (only if no payouts have been made)
     */
    function cancelRound(uint256 roundId) 
        external 
        roundExists(roundId) 
        onlySaccoAdmin(rounds[roundId].saccoId) 
    {
        Round storage round = rounds[roundId];
        require(round.status == RoundStatus.Active, "Round not active");
        
        // Ensure no payouts have been claimed
        require(
            !roundParticipants[roundId][round.beneficiary].hasClaimed,
            "Payout already claimed"
        );
        
        // Refund all contributions
        for (uint256 i = 0; i < roundParticipantList[roundId].length; i++) {
            address participant = roundParticipantList[roundId][i];
            RoundParticipant storage participantData = roundParticipants[roundId][participant];
            
            if (participantData.hasContributed && participantData.contributionAmount > 0) {
                require(cUSD.transfer(participant, participantData.contributionAmount), "Refund failed");
            }
        }
        
        round.status = RoundStatus.Cancelled;
        emit RoundStatusChanged(roundId, RoundStatus.Cancelled);
    }

    /**
     * @dev Completes a round manually
     */
    function completeRound(uint256 roundId) 
        external 
        roundExists(roundId) 
        onlySaccoAdmin(rounds[roundId].saccoId) 
    {
        Round storage round = rounds[roundId];
        require(round.status == RoundStatus.Active, "Round not active");
        require(block.timestamp > round.endTime, "Round still in progress");
        
        round.status = RoundStatus.Completed;
        emit RoundStatusChanged(roundId, RoundStatus.Completed);
    }

    /**
     * @dev Gets the list of participants in a round
     */
    function getRoundParticipants(uint256 roundId) 
        external 
        view 
        roundExists(roundId) 
        returns (address[] memory) 
    {
        return roundParticipantList[roundId];
    }

    /**
     * @dev Gets all rounds for a specific SACCO
     */
    function getSaccoRounds(uint256 saccoId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return saccoRounds[saccoId];
    }

    /**
     * @dev Gets detailed round information
     */
    function getRoundDetails(uint256 roundId) 
        external 
        view 
        roundExists(roundId) 
        returns (
            uint256 saccoId,
            uint256 startTime,
            uint256 endTime,
            uint256 requiredContribution,
            uint256 totalContributed,
            address beneficiary,
            uint256 targetAmount,
            uint256 participantCount,
            RoundStatus status
        ) 
    {
        Round storage round = rounds[roundId];
        
        return (
            round.saccoId,
            round.startTime,
            round.endTime,
            round.requiredContribution,
            round.totalContributed,
            round.beneficiary,
            round.targetAmount,
            round.participantCount,
            round.status
        );
    }

    /**
     * @dev Gets participant details for a round
     */
    function getParticipantDetails(uint256 roundId, address participant) 
        external 
        view 
        roundExists(roundId) 
        returns (
            bool hasJoined,
            bool hasContributed,
            bool hasClaimed,
            uint256 contributionAmount,
            uint256 payoutAmount,
            uint256 timestamp
        ) 
    {
        RoundParticipant storage participantData = roundParticipants[roundId][participant];
        
        return (
            participantData.hasJoined,
            participantData.hasContributed,
            participantData.hasClaimed,
            participantData.contributionAmount,
            participantData.payoutAmount,
            participantData.timestamp
        );
    }

    /**
     * @dev Allows beneficiary to make a custom contribution
     */
    function makeCustomContribution(uint256 roundId, uint256 amount) 
        external 
        nonReentrant 
        roundExists(roundId) 
        roundActive(roundId) 
    {
        Round storage round = rounds[roundId];
        RoundParticipant storage participant = roundParticipants[roundId][msg.sender];
        
        require(participant.hasJoined, "Not a participant in this round");
        require(!participant.hasContributed, "Already contributed to this round");
        require(block.timestamp <= round.endTime, "Round contribution period ended");
        require(amount >= round.requiredContribution, "Below required contribution");
        
        // Transfer contribution from user to contract
        require(cUSD.transferFrom(msg.sender, address(this), amount), "Contribution failed");
        
        // Update participant and round data
        participant.hasContributed = true;
        participant.contributionAmount = amount;
        participant.timestamp = block.timestamp;
        round.totalContributed += amount;
        
        emit ContributionMade(roundId, msg.sender, amount);
        
        // Check if target amount reached
        if (round.totalContributed >= round.targetAmount) {
            _processPayout(roundId);
        }
    }

    /**
     * @dev Gets round completion progress
     */
    function getRoundProgress(uint256 roundId) 
        external 
        view 
        roundExists(roundId) 
        returns (uint256 percentage) 
    {
        Round storage round = rounds[roundId];
        
        if (round.targetAmount == 0) return 0;
        
        return (round.totalContributed * 100) / round.targetAmount;
    }

    /**
     * @dev Checks if a round's target amount has been reached
     */
    function isTargetReached(uint256 roundId) 
        external 
        view 
        roundExists(roundId) 
        returns (bool) 
    {
        Round storage round = rounds[roundId];
        return round.totalContributed >= round.targetAmount;
    }

    /**
     * @dev Checks if a round has expired
     */
    function isRoundExpired(uint256 roundId) 
        external 
        view 
        roundExists(roundId) 
        returns (bool) 
    {
        Round storage round = rounds[roundId];
        return block.timestamp > round.endTime;
    }

    /**
     * @dev Get number of active rounds in a SACCO
     */
    function getActiveRoundsCount(uint256 saccoId) 
        external 
        view 
        returns (uint256 count) 
    {
        uint256[] memory sRounds = saccoRounds[saccoId];
        
        for (uint256 i = 0; i < sRounds.length; i++) {
            if (rounds[sRounds[i]].status == RoundStatus.Active) {
                count++;
            }
        }
        
        return count;
    }

    /**
     * @dev Extends the duration of an active round
     */
    function extendRoundDuration(uint256 roundId, uint256 additionalDays) 
        external 
        roundExists(roundId) 
        onlySaccoAdmin(rounds[roundId].saccoId) 
        roundActive(roundId) 
    {
        require(additionalDays > 0, "Additional days must be positive");
        
        Round storage round = rounds[roundId];
        round.endTime += additionalDays * 1 days;
        
        emit RoundStarted(roundId, round.saccoId, round.startTime, round.endTime);
    }
}