const merge = require('deepmerge')

const ethAndWeth = ["0x0000000000000000000000000000000000000000", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"];

const generateOptionKey = (strike, underlying) => {
    strike = strike.toLowerCase();
    underlying = underlying.toLowerCase();

    if(strike === ethAndWeth[1]) {
        strike = ethAndWeth[0];
    }

    if(underlying === ethAndWeth[1]) {
        underlying = ethAndWeth[1];
    }

    return strike > underlying ? strike + underlying : underlying + strike;
}

const getRestructuredOptions = (data) => {
    let restructured = {};

    data.forEach(
        option => {
            const {strike, underlying, expiry} = option;
            const optionKey = generateOptionKey(strike, underlying);

            if (restructured[optionKey] === undefined) {
                restructured[optionKey] = {};
            }

            if (restructured[optionKey][expiry] === undefined) {
                restructured[optionKey][expiry] = [];
            }

            restructured[optionKey][expiry].push(option);
        }
    );

    return restructured;
}

const getOptionsForPair = (optionsList, strike, underlying) => {
    strike = strike.toLowerCase();
    underlying = underlying.toLowerCase();

    //since for eth pairs we also need to check for weth, we form a list of keys we need and merge them after
    const keys = [];

    if(ethAndWeth.includes(strike)) {
        keys.push(generateOptionKey(underlying, ethAndWeth[0]));
        keys.push(generateOptionKey(underlying, ethAndWeth[1]));
    } else if(ethAndWeth.includes(underlying)) {
        keys.push(generateOptionKey(strike, ethAndWeth[0]));
        keys.push(generateOptionKey(strike, ethAndWeth[1]));
    } else {
        keys.push(generateOptionKey(strike, underlying));
    }

    //return merged if 2 values, else merge with empty i.e. return first
    return merge(optionsList[keys[0]], (optionsList[keys[1]] || {}));
}

const getCallStrikePrice = call => {
    const strikePrice = 1 / (call.strikePrice * Math.pow(10, call.decimals));
    //todo math.round is a hack due to floating point precision... fix
    return Math.round(strikePrice);
}

const getPutStrikePrice = put => {
    const strikePrice = put.strikePrice * Math.pow(10, put.decimals);
    //todo math.round is a hack due to floating point precision... fix
    return Math.round(strikePrice);
}

module.exports = {
    generateOptionKey,
    getOptionsForPair,
    getRestructuredOptions,
    getCallStrikePrice,
    getPutStrikePrice
}