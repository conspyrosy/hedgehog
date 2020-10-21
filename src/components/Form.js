import React, {Component} from 'react';
const dateFormat = require('dateformat');
const { ChainId, Token, WETH, Fetcher, Route } = require('@uniswap/sdk');
const { getChartData } = require('./../utils/getChartData');
const supportedPairs = require('./../constants/supportedPairs.json'); //hardcoded for now...

class Form extends Component {
    state = {
        priceFactor: 2,
        optionsExpiry: 1603440000,
        callIndex: 0,
        putIndex: 0,
        callTokensNeeded: 0,
        putTokensNeeded: 0,
        currentPrice: 1,
        pairIndex: 0
    }

    componentDidMount() {
        this.recalculateChartData();

        //todo: this should update periodically
        this.fetchUniswapPoolPrice();
    }

    componentDidUpdate(prevProps, prevState) {
        if(JSON.stringify(prevProps) !== JSON.stringify(this.props) || JSON.stringify(prevState) !== JSON.stringify(this.state)) {
            this.recalculateChartData();
        }
    }

    fetchUniswapPoolPrice() {
        const token = new Token(ChainId.MAINNET, supportedPairs[this.state.pairIndex].token1, 6);

        Fetcher.fetchPairData(token, WETH[token.chainId]).then(
            pair => {
                const route = new Route([pair], WETH[token.chainId])
                const currentPrice = parseFloat(route.midPrice.toFixed(2).toString());
                this.setState({ currentPrice });
            }
        )
    }

    setPriceFactor(priceFactor) {
        this.setState({
            priceFactor
        });
    };

    setOptionsExpiry(event) {
        const optionsExpiry = event.target.value;
        this.setState({
            optionsExpiry,
            putIndex: 0,
            callIndex: 0
        });
    }

    /**
     * Set index of put or call
     * @param isPut true to set put index, false for call index
     */
    setOptionIndex(event, isPut) {
        const attributeName = isPut ? "putIndex" : "callIndex";
        this.setState({
            [attributeName]: parseInt(event.target.value),
        });
    }

    recalculateChartData() {
        //settings
        const { priceFactor, optionsExpiry, putIndex, callIndex, currentPrice } = this.state;
        const { optionsData, updateChartData } = this.props;

        const relevantPutOption = optionsData[optionsExpiry].puts[putIndex];
        const relevantCallOption = optionsData[optionsExpiry].calls[callIndex];
        const putStrikePrice = !relevantPutOption ? -1 : relevantPutOption.strikePrice.value;
        const callStrikePrice = !relevantCallOption ? -1 : relevantCallOption.strikePrice.value;

        //opyn price data. hardcoded for now...
        const putCost = 15;
        const callCost = 12.5;

        const chartData = getChartData({
            priceFactor,
            currentPrice,
            callStrikePrice,
            putStrikePrice,
            callCost,
            putCost
        });

        updateChartData(chartData);
    }

    render() {
        const { optionsData } = this.props;
        const { priceFactor, optionsExpiry, callTokensNeeded, putTokensNeeded } = this.state;

        return (
            <div className="options-form">
                <div className="label-holder">
                    <label htmlFor="pool">Pick a pool:</label>
                </div>

                <select name="pool" id="pool" className="form-control">
                    <option value="ethusdc">ETH-USDC</option>
                </select>

                <br/>

                <div className="label-holder">
                    <label htmlFor="priceFactor">Price Change to Hedge:</label>
                </div>

                <div className="button-group">
                    <button className={priceFactor === 2 ? "selected" : ""}
                            onClick={() => this.setPriceFactor(2)}>2x
                    </button>
                    <button className={priceFactor === 3 ? "selected" : ""}
                            onClick={() => this.setPriceFactor(3)}>3x
                    </button>
                    <button className={priceFactor === 4 ? "selected" : ""}
                            onClick={() => this.setPriceFactor(4)}>4x
                    </button>
                    <button className={priceFactor === 5 ? "selected" : ""}
                            onClick={() => this.setPriceFactor(5)}>5x
                    </button>
                </div>

                <div className="label-holder">
                    <label htmlFor="expiry">Options Expiry Date:</label>
                </div>

                <select name="expiry" id="expiry" className="form-control" value={optionsExpiry}
                        onChange={(evt) => this.setOptionsExpiry(evt)}>
                    {
                        Object.keys(optionsData).map(
                            key => (
                                <option value={key}>{dateFormat(new Date(key * 1000), "d mmmm yyyy h:MM")}</option>
                            )
                        )
                    }
                </select>

                <div className="label-holder">
                    <label htmlFor="call">Call Strike Price:</label>
                </div>

                <select name="call" id="call" className="form-control" onChange={(evt) => this.setOptionIndex(evt, false)}>
                    {
                        optionsData[optionsExpiry].calls < 1 ?
                            <option value="-1" disabled="disabled">No calls available</option>
                        :
                        optionsData[optionsExpiry].calls.map(
                            (call, index) => <option value={index}>{call.strikePrice.value}</option>
                        )
                    }
                </select>

                <div className="label-holder">
                    <label htmlFor="put">Put Strike Price:</label>
                </div>

                <select name="put" id="put" className="form-control" onChange={(evt) => this.setOptionIndex(evt, true)}>
                    {
                        optionsData[optionsExpiry].puts < 1 ?
                            <option value="-1" disabled="disabled">No puts available</option>
                            :
                            optionsData[optionsExpiry].puts.map(
                                (put, index) => <option value={index}>{put.strikePrice.value}</option>
                            )
                    }
                </select>

                <div className="label-holder">
                    <label htmlFor="call-tokens-amount">Call oTokens to Buy:</label>
                </div>

                <input className="form-control" name="call-tokens-amount" value={callTokensNeeded} disabled/>

                <div className="label-holder">
                    <label htmlFor="put-tokens-amount">Put oTokens to Buy:</label>
                </div>

                <input className="form-control" name="put-tokens-amount" value={putTokensNeeded} disabled/>
            </div>
        )
    }
}

export default Form;