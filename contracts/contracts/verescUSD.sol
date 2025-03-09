// SPDX-License-Identifier: MIT
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
}