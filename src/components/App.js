import React, { Component } from 'react';
import Form from './Form';
import Highcharts from 'highcharts';
import HighchartsReact from "highcharts-react-official";
const optionsData = require('./../constants/mocks/optionsMock.json');

class App extends Component {
    state = {
        chartData: {},
        optionsData,
        optionsPriceData: {
            putCost: 5, //opyn price data
            callCost: 5,
        },
        uniswapData: {
            currentPrice: 380, //uniswap price data
        }
    }

    updateChartData(chartData) {
        this.setState({ chartData }, () => console.log(this.state))
    }

    render() {
        const { optionsData, optionsPriceData, uniswapData, chartData } = this.state;

        return (
            <div className="App">
                <div className="main">
                    <div className="navbar">
                        <div className="logo"/>
                    </div>
                    <div className="page-content">
                        <div className="container">
                            <Form optionsData={optionsData}
                                  optionsPriceData={optionsPriceData}
                                  uniswapData={uniswapData}
                                  updateChartData={(value) => this.updateChartData(value)}
                            />
                        </div>
                        <div className="container">
                            <HighchartsReact highcharts={Highcharts} options={chartData}/>
                        </div>
                    </div>
                    <div className="footer">
                        hey
                    </div>
                </div>
            </div>
        );
    }
}

export default App;
