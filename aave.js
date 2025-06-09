/*
文档 ：https://aave.com/docs/developers/smart-contracts/pool

链上调用：https://bscscan.com/address/0x6807dc923806fE8Fd134338EABCA509979a7e0cB#readProxyContract

获取支持的抵押和借币列表：getReservesList
获取抵押和借币的配置信息：getReserveData

ethers版本 v6
*/

import { ethers } from 'ethers';

// 连接到 BSC 网络
const provider = new ethers.JsonRpcProvider('https://rpc.ankr.com/bsc/b6068bd5d31b3b5a59f4298268d10f30cdf4ca2ddf87bc25e99f5498bff95b56');

// BSC 上的 AaveProtocolDataProvider 合约地址
const aaveProtocolDataProviderAddress = '0x6807dc923806fE8Fd134338EABCA509979a7e0cB';

// AaveProtocolDataProvider 合约 ABI
const aaveProtocolDataProviderABI = [
    'function getReservesList() view returns (address[])',
    'function getReserveData(address asset) view returns (uint256, uint128, uint128, uint128, uint128, uint40, uint16, address, address, address, address, uint128,uint128,uint128, uint128)',
  ];

const erc20ABI = [
  'function symbol() view returns (string)',
]

// 创建合约实例
const aaveProtocolDataProvider = new ethers.Contract(
  aaveProtocolDataProviderAddress,
  aaveProtocolDataProviderABI,
  provider
);

async function getSymbol(reserveAddress) {
  const erc20 = new ethers.Contract(reserveAddress,erc20ABI,provider)
  const symbol = await erc20.symbol();
  return symbol
}

function getValue(data, mask, shift = 0) {
  return Number((data >> BigInt(shift)) & mask);
}

function parseAaveConfig(bigNumber) {
  const data = BigInt(bigNumber);
  
  const masks = {
    ltv: 0xFFFFn,                    // bit 0-15
    liqThreshold: 0xFFFFn,           // bit 16-31
    liqBonus: 0xFFFFn,               // bit 32-47
    decimals: 0xFFn,                 // bit 48-55
    isActive: 0x1n,                  // bit 56
    isFrozen: 0x1n,                  // bit 57
    borrowingEnabled: 0x1n,          // bit 58
    stableBorrowRateEnabled: 0x1n,   // bit 59
    isPaused: 0x1n,                  // bit 60
    isolationModeEnabled: 0x1n,      // bit 61
    siloedBorrowingEnabled: 0x1n,    // bit 62
    flashloaningEnabled: 0x1n,       // bit 63
    reserveFactor: 0xFFFFn,          // bit 64-79
    borrowCap: 0xFFFFFFFFFFFFn,      // bit 80-115
    supplyCap: 0xFFFFFFFFFFFFn,      // bit 116-151
    liquidationProtocolFee: 0xFFFFn, // bit 152-167
    eModeCategory: 0xFFn,            // bit 168-175
    unbackedMintCap: 0xFFFFFFFFFFFFn,// bit 176-211
    debtCeiling: 0xFFFFFFFFFFFFn,    // bit 212-251
    virtualAccountingEnabled: 0x1n   // bit 252
  };

  const result = {
    ltv: getValue(data, masks.ltv) / 10000,                    
    liqThreshold: getValue(data, masks.liqThreshold, 16) / 10000,  
    liqBonus: getValue(data, masks.liqBonus, 32) / 10000 ,   
    decimals: getValue(data, masks.decimals, 48),
    isActive: Boolean(getValue(data, masks.isActive, 56)),
    isFrozen: Boolean(getValue(data, masks.isFrozen, 57)),
    borrowingEnabled: Boolean(getValue(data, masks.borrowingEnabled, 58)),
    stableBorrowRateEnabled: Boolean(getValue(data, masks.stableBorrowRateEnabled, 59)),
    isPaused: Boolean(getValue(data, masks.isPaused, 60)),
    isolationModeEnabled: Boolean(getValue(data, masks.isolationModeEnabled, 61)),
    siloedBorrowingEnabled: Boolean(getValue(data, masks.siloedBorrowingEnabled, 62)),
    flashloaningEnabled: Boolean(getValue(data, masks.flashloaningEnabled, 63)),
    reserveFactor: getValue(data, masks.reserveFactor, 64) / 100,
    borrowCap: getValue(data, masks.borrowCap, 80),
    supplyCap: getValue(data, masks.supplyCap, 116),
    liquidationProtocolFee: getValue(data, masks.liquidationProtocolFee, 152) / 100,
    eModeCategory: getValue(data, masks.eModeCategory, 168),
    unbackedMintCap: getValue(data, masks.unbackedMintCap, 176),
    debtCeiling: getValue(data, masks.debtCeiling, 212),
    virtualAccountingEnabled: Boolean(getValue(data, masks.virtualAccountingEnabled, 252))
  };

  return result;
}

async function getReservesList() {
  const reserves = await aaveProtocolDataProvider.getReservesList();
  return reserves
}

async function getReserveData(reserveAddress) {
  const res = await aaveProtocolDataProvider.getReserveData(reserveAddress);
  const symbol = await getSymbol(reserveAddress);
  return{
    symbol : symbol,
    address : reserveAddress,
    config: parseAaveConfig(res[0]),
    supplyAPY: (Number(res[2]) / 1e27) * 100,
    variableBorrowAPY: (Number(res[3]) / 1e27) * 100,
    stableBorrowAPY: (Number(res[4]) / 1e27) * 100
  }
}

// 调用
const reserves = await getReservesList();
const reserveData = await getReserveData(reserves[0]);
console.log('reserves',reserves);
console.log('reserveData',reserveData);
