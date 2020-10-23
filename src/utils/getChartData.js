import { getCallStrikePrice, getPutStrikePrice } from './opynUtils';

//these reflect a factor of the price e.g. 2 means 2x or 0.5x
const points = [1.25, 1.5, 1.75, 2, 3, 4, 5];

const calculateImpermanentLoss = priceFactor => Math.abs(2 * (Math.sqrt(priceFactor) / (priceFactor + 1)) - 1);

const addOptionStrikePriceToPoints = (pointsOfInterest, isCall, currentPrice, strikePrice) => {
    const absolutePrices = pointsOfInterest.map(point => point.absolutePrice);

    const isLargerThan = (x) => (number) => number > x;

    //we need to put in the put price and call price into the price points at the right index
    if (!absolutePrices.includes(strikePrice)) {
        const indexToInsertAt = absolutePrices.findIndex(isLargerThan(strikePrice));
        const priceFactor = strikePrice / currentPrice;
        pointsOfInterest.splice(indexToInsertAt, 0, {
            priceFactor,
            absolutePrice: strikePrice,
            impermanentLoss: calculateImpermanentLoss(priceFactor),
            identifier: isCall ? 'callStrike' : 'putStrike'
        });
    }
}

const calculateOptionReturn = (pointsOfInterest, isCall) => {
    const identifier = isCall ? 'callStrike' : 'putStrike';
    const strikePrice = pointsOfInterest.filter(point => point.identifier === identifier).map(point => point.absolutePrice);

    //if a strike for the option exists calculate the returns for that option
    if(strikePrice.length > 0) {
        //populate all points with options return values
        pointsOfInterest.forEach(
            point => {
                if(isCall) {
                    point.callReturn = point.absolutePrice <= strikePrice[0] ? 0 : point.absolutePrice - strikePrice[0];
                } else {
                    point.putReturn = point.absolutePrice >= strikePrice[0] ? 0 : strikePrice[0] - point.absolutePrice;
                }
            }
        )
    }
}

const calculateOptionReturns = (pointsOfInterest) => {
    calculateOptionReturn(pointsOfInterest, true);
    calculateOptionReturn(pointsOfInterest, false);
}

/**
 * This gets the points on the x-axis which we want to plot. It uses the "points" array to find price
 * points in the range we care about
 *
 * @param maxFactor max price factor we care about e.g. 2 means 0.5x - , 3 means 0.33x - 3x etc
 * @param price current price of asset
 * @param callPrice strike price of call - this point is plotted
 * @param putPrice strike price of put - this point is plotted
 * @returns a list of price points, with each having a price, price factor (ratio to current price) and impermanentloss
 */
const getPricePoints = (maxFactor, price, callPrice, putPrice) => {
    const relevantPoints = points.filter(value => value <= maxFactor).map(value => ({
        priceFactor: value,
        impermanentLoss: calculateImpermanentLoss(value)
    }));

    const inversePoints = [...relevantPoints].reverse().map(
        value => ({
            ...value,
            priceFactor: 1 / value.priceFactor
        })
    )

    const addAbsolutePrice = pointsOfInterest => pointsOfInterest.map(point => ({
            ...point,
            absolutePrice: point.priceFactor * price
        })
    );

    let pointsOfInterest = [
        addAbsolutePrice(inversePoints),
        { priceFactor: 1, impermanentLoss: 0, absolutePrice: price },
        addAbsolutePrice(relevantPoints)
    ].flat();

    if (callPrice) {
        addOptionStrikePriceToPoints(pointsOfInterest, true, price, callPrice);
    }

    if (putPrice) {
        addOptionStrikePriceToPoints(pointsOfInterest, false, price, putPrice);
    }

    //we avoid doing this until all points are generated otherwise we will have missing data for some points
    calculateOptionReturns(pointsOfInterest);

    return pointsOfInterest;
};

const getPriceChangeLabelForAxis = (currentPrice, point) => {
    const priceChangePercentage = ((point.priceFactor - 1) * 100);
    if(priceChangePercentage === 0) {
        return '';
    } else if(priceChangePercentage > 0) {
        return '<br />(+' + priceChangePercentage.toFixed(1).toString() + '%)';
    } else {
        return '<br />(' + priceChangePercentage.toFixed(1).toString()  + '%)';
    }
}

/**
 * Generates the chart data from the relevant inputs
 *
 * @param priceFactor the factor of change in price we care about. e.g. 2 means 0.5x - 2x
 * @param currentPrice the current price of the pair
 * @param callStrikePrice the strike price of the call we are hedging with (-1 if no call used)
 * @param putStrikePrice the strike price of the put we are hedging with (-1 if no put used)
 * @param callCost the cost of a single call option
 * @param putCost the cost of a single put option
 * @param opynConnector an instance of OpynConnector so we can fetch prices of options
 */
const getChartAndPurchaseData = ({
      priceFactor,
      currentPrice,
      callOption,
      putOption,
      onPriceUpdate,
      opynConnector
}) => {
    const callStrikePrice = !callOption ? undefined : getCallStrikePrice(callOption);
    const putStrikePrice = !putOption ? undefined : getPutStrikePrice(putOption);

    const pointsOfInterest = getPricePoints(priceFactor, currentPrice, callStrikePrice, putStrikePrice);

    let putsNeeded = 0;
    if(pointsOfInterest[0].putReturn > 0) {
        putsNeeded = pointsOfInterest[0].impermanentLoss * currentPrice / pointsOfInterest[0].putReturn;
    }

    let callsNeeded = 0;
    if(pointsOfInterest[pointsOfInterest.length - 1].callReturn > 0) {
        callsNeeded = pointsOfInterest[pointsOfInterest.length - 1].impermanentLoss * currentPrice / pointsOfInterest[pointsOfInterest.length - 1].callReturn;
    }

    const chartData = {
        chart: {
            type: 'spline'
        },
        title: {
            text: 'Profit/Loss'
        },
        series: [
            {
                name: 'Impermanent Loss',
                data: pointsOfInterest.map(point => point.impermanentLoss * currentPrice)
            },
            /*
            {
                name: 'Net Profit',
                data: calculatePutReturns().map((val, id) => val + calculateCallReturns()[id] + costOfOptions - (absoluteImpermanentLoss[id] || 0))
            }
            */
        ],
        xAxis: {
            categories: pointsOfInterest.map(point => {
                return point.absolutePrice.toPrecision(5).toString() + getPriceChangeLabelForAxis(currentPrice, point)
            }),
            title: {
                text: "Price (USDC)"
            }
        },
        yAxis: {
            title: {
                text: "Profit/Loss (USDC)"
            }
        },
    };

    const timestamp = Date.now();

    //if undefined, resolve promise to 0 else get price
    const getOptionsPricesAsync = () => {
        const getPriceOrResolveToZero = (option, isCall, amountOptionsToBuy) => {
            if(option) {
                return opynConnector.getPriceOfPurchase(option, isCall, amountOptionsToBuy);
            }
            return new Promise((resolve) => {
                resolve(0)
            });
        }

        return [
            getPriceOrResolveToZero(callOption, true, 1),
            getPriceOrResolveToZero(putOption, false, 1)
        ];
    }

    //publish result to state async
    Promise.all(getOptionsPricesAsync()).then(
        ([callCost, putCost]) => {
            const priceData = {
                timestamp,
                callCost,
                putCost,
                callsNeeded,
                putsNeeded,
            }
            onPriceUpdate(timestamp, priceData)
        }
    )

    if(putStrikePrice) {
        chartData.series.push({
            name: 'Put Returns',
            data: pointsOfInterest.map(point => putsNeeded * point.putReturn)
        });
    }

    if(callStrikePrice) {
        chartData.series.push({
            name: 'Call Returns',
            data: pointsOfInterest.map(point => callsNeeded * point.callReturn)
        });
    }

    return {
        chartData,
        optionsRequired: {
            callsNeeded,
            putsNeeded
        }
    };
}

export default getChartAndPurchaseData;