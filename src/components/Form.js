import React, {Component} from 'react';
import { ChainId, Token, WETH, Fetcher, Route } from '@uniswap/sdk';
import dateFormat from 'dateformat';
import getChartAndPurchaseData from '../utils/getChartData'; //hardcoded for now...
import {
    getOptionsForPair,
    generateOptionKey,
    getCallStrikePrice,
    getPutStrikePrice
} from '../utils/opynUtils';
import supportedPairs from './../constants/supportedPairs.json';

class Form extends Component {
    state = {
        currentPair: supportedPairs[0],
        priceFactor: 2,
        optionsExpiry: Object.keys(this.props.optionsData[generateOptionKey(supportedPairs[0].token0,supportedPairs[0].token1)])[0],
        callIndex: 0,
        putIndex: 0,
        callsNeeded: 0,
        putsNeeded: 0,
        currentPrice: 1,
        pairIndex: 0
    }

    componentDidMount() {
        this.recalculateChartData();

        //todo: this should update periodically to keep price fresh
        this.fetchUniswapPoolPrice();
    }

    componentDidUpdate(prevProps, prevState) {
        const { opynConnector: a, ...prevPropsNoConnector } = prevProps;
        const { opynConnector: b, ...propsNoConnector } = this.props;

        if(JSON.stringify(prevPropsNoConnector) !== JSON.stringify(propsNoConnector) || JSON.stringify(prevState) !== JSON.stringify(this.state)) {
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
        const { optionsData, updateChartData, opynConnector } = this.props;

        const putOption = this.getPutOptions()[putIndex];
        const callOption = this.getCallOptions()[callIndex];

        const {
            chartData,
            optionsRequired: {
                callsNeeded,
                putsNeeded
            }
        } = getChartAndPurchaseData({
            priceFactor,
            currentPrice,
            callOption,
            putOption,
            onPriceUpdate: this.props.updatePriceData,
            opynConnector
        });

        this.setState({
            callsNeeded,
            putsNeeded
        });

        updateChartData(chartData);
    }

    getCallOptions() {
        const { currentPair, optionsExpiry } = this.state;
        const { optionsData } = this.props;
        const callOptions = getOptionsForPair(optionsData, currentPair.token0, currentPair.token1)[optionsExpiry];
        if(callOptions) {
            return callOptions.filter(option => option.underlying === '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
        }
        return [];
    }

    getPutOptions() {
        const { currentPair, optionsExpiry } = this.state;
        const { optionsData } = this.props;
        const putOptions = getOptionsForPair(optionsData, currentPair.token0, currentPair.token1)[optionsExpiry];
        if(putOptions) {
            return putOptions.filter(option => option.underlying !== '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
        }
        return [];
    }

    render() {
        const { optionsData } = this.props;
        const { priceFactor, optionsExpiry, callsNeeded, putsNeeded, currentPair } = this.state;

        return (
            <div className="options-form">
                <div className="label-holder">
                    <label htmlFor="pool">Pick a pool:</label>
                </div>

                <select name="pool" id="pool" className="form-control">
                    {supportedPairs.map(
                        (pair, index) => (
                            <option value={index}>{pair.token0_name + "-" + pair.token1_name}</option>
                        )
                    )}
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
                        Object.keys(getOptionsForPair(optionsData, currentPair.token0, currentPair.token1)).map(
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
                        this.getCallOptions().length < 1 ?
                            <option value="-1" disabled="disabled">No calls available</option>
                        :
                        this.getCallOptions().map(
                            (call, index) => <option value={index}>{getCallStrikePrice(call)}</option>
                        )
                    }
                </select>

                <div className="label-holder">
                    <label htmlFor="put">Put Strike Price:</label>
                </div>

                <select name="put" id="put" className="form-control" onChange={(evt) => this.setOptionIndex(evt, true)}>
                    {
                        this.getPutOptions().length < 1 ?
                            <option value="-1" disabled="disabled">No puts available</option>
                            :
                            this.getPutOptions().map(
                                (put, index) => <option value={index}>{getPutStrikePrice(put)}</option>
                            )
                    }
                </select>

                <div className="label-holder">
                    <label htmlFor="call-tokens-amount">Call options to Buy:</label>
                </div>

                <input className="form-control" name="call-tokens-amount" value={callsNeeded} disabled/>

                <div className="label-holder">
                    <label htmlFor="put-tokens-amount">Put options to Buy:</label>
                </div>

                <input className="form-control" name="put-tokens-amount" value={putsNeeded} disabled/>
            </div>
        )
    }
}

export default Form;