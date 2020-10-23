import React, { Component, Fragment } from 'react';
import Form from './Form';
import Highcharts from 'highcharts';
import HighchartsReact from "highcharts-react-official";
const Web3 = require("web3");
const OpynConnector = require('opyn-connector');
const { getRestructuredOptions } = require('../utils/opynUtils');

class App extends Component {
    state = {
        chartData: {},
        ethereum: {},
        optionsData: {},
        priceData: {
            timestamp: 0,
            callCost: 0,
            putCost: 0,
            callsNeeded: 0,
            putsNeeded: 0,
        }
    }

    calculateOptionsCost() {
        const { callCost, putCost, callsNeeded, putsNeeded } = this.state.priceData;

        const calculateOptionCost = (cost, amountOfOptions) => {
            if(!cost || !amountOfOptions) {
                return 0;
            }
            return (cost / 1000000) * amountOfOptions;
        }

        return calculateOptionCost(callCost, callsNeeded) + calculateOptionCost(putCost, putsNeeded);
    }

    chartDataToDisplay() {
        if(Object.keys(this.state.chartData).length > 0) {
            let chartDataToDisplay = {...this.state.chartData};
            chartDataToDisplay.series = [...chartDataToDisplay.series]
            chartDataToDisplay.series.push({
                name: 'Options Cost',
                data: chartDataToDisplay.series[0].data.map(point => this.calculateOptionsCost())
            });
            return chartDataToDisplay;
        }
        return {};
    }

    componentDidMount() {
        //for some reason metamask doesnt like batch requests... using infura
        const infuraweb3 = new Web3(
            new Web3.providers.HttpProvider(`https://mainnet.infura.io/v3/3425960a247b4ae9b94e7d0e51c1bef0`)
        );
        const opynConnector = new OpynConnector({ web3: infuraweb3 });
        this.setState({
            ethereum: {
                web3: infuraweb3,
            },
            chartData: {},
            opynConnector,
        });
        this.setState({ optionRequestState: "LOADING" })
        opynConnector.init().then(
            result => {
                const optionsData = getRestructuredOptions(result);
                this.setState({
                    optionRequestState: "SUCCESS",
                    optionsData
                })
            }
        ).catch(
            err => this.setState({ optionRequestState: "FAILED" })
        );
    }

    //take timestamp in case we get requests back out of order
    updatePriceData(timestamp, priceData) {
        if(timestamp > this.state.priceData.timestamp) {
            this.setState({
                priceData
            });
        }
    }

    updateChartData(chartData) {
        this.setState({ chartData })
    }

    getErrorMessage() {
        if(!this.state.ethereum.web3) {
            return "Failed to get web3 provider";
        } else if(this.state.optionRequestState === "LOADING") {
            return "Loading options... this may take up to 30 seconds"
        } else if(this.state.optionRequestState === "FAILED") {
            return "Failed to fetch option data. Refresh to try again"
        }
    }

    render() {
        const { optionsData, ethereum, optionRequestState, opynConnector } = this.state;

        return (
            <div className="App">
                <div className="main">
                    <div className="navbar">
                        <div className="logo"/>
                    </div>
                    <div className="page-content">
                        { ethereum.web3 && optionRequestState === "SUCCESS" ?
                            <Fragment>
                                <div className="container">
                                    <Form optionsData={optionsData}
                                          updateChartData={(value) => this.updateChartData(value)}
                                          updatePriceData={(timestamp, priceData) => this.updatePriceData(timestamp, priceData)}
                                          opynConnector={opynConnector}
                                    />
                                </div>
                                <div className="container">
                                    The chart below assumes you are providing 1 ETH of value to the pool. 0.5 ETH and 0.5 ETH worth of USDC.
                                    <HighchartsReact highcharts={Highcharts} options={this.chartDataToDisplay()}/>
                                </div>
                            </Fragment>
                            :
                            <div className="container">
                                {this.getErrorMessage()}
                            </div>
                        }
                    </div>
                    <div className="footer">
                        <a href="https://github.com/conspyrosy/hedgehog">Contribute</a>
                    </div>
                </div>
            </div>
        );
    }
}

export default App;
