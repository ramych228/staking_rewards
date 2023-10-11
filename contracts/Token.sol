//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract Token is ERC20, Ownable {
    uint256 maxTotalSupply;

    constructor(
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {
    }

    function mint(address to, uint256 amount) public onlyOwner {        
        _mint(to, amount);
    }

    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
}