import React, { Component } from 'react';
import {Platform, StyleSheet, Div, Text, View, Picker, SectionList, Button, Dimensions} from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import {encode} from 'base64-arraybuffer';
import {LineChart} from 'react-native-chart-kit'

import {devutils} from '../devutils';

// This id allows to cancel subscription on notification
const TRANSACTION_ID = 'historicalDataTransaction';

export default class HistoryScreen extends Component {
  static navigationOptions = {
    title: 'History',
  };
  constructor(props) {
    super(props)
    this.manager = new BleManager;
    this.device = props.navigation.getParam('device');
    this.state = {
      historicalData: {},
      sensorId: "3",
      measurement: null,
      historicalDataAcc: null
    };

    this.didFocusSub = props.navigation.addListener(
      'didFocus',
      payload => {
        this.getHistoricalData();
      }
    )
    this.willBlurSub = props.navigation.addListener(
      'willBlur',
      payload => {
        this.manager.cancelTransaction(TRANSACTION_ID);
        this.device.cancelConnection();
      }
    )
  }

  getHistoricalData(){
    this.device.connect()
      .then((device) => {
        console.info("Discovering services and characteristics")
        return device.discoverAllServicesAndCharacteristics()
      })
      .then((device) => {
        console.info("Setting notifications")
        return this.setupNotifications(device)
      })
      .then(() => {
        console.info("Listening...")
      }, (error) => {
        console.error(error.message)
      })
  }

  async setupNotifications() {
    // set history start (from 8th entry)
    await this.device.writeCharacteristicWithResponseForService(
      devutils.info.serviceUUID, devutils.info.startRangeCharacteristicUUID, encode(Uint8Array.of(0, 8))
    );
    // set history stop (most recent entry)
    await this.device.writeCharacteristicWithResponseForService(
      devutils.info.serviceUUID, devutils.info.endRangeCharacteristicUUID, encode(Uint8Array.of(0, 0))
    )
    // Prepare to receive data
    this.device.monitorCharacteristicForService(devutils.info.serviceUUID, devutils.info.historicalDataCharacteristicUUID, (error, characteristic) => {
      if (error) {
        console.log(error.message)
        //TODO recognize not-errors (such as operation cancelled)
        return
      }
      this.setState((state, props) => {
        ({decodedData, acc} = devutils.decodeHistoricalData(characteristic.value, state.sensorId, state.historicalData, state.historicalDataAcc))
        return {historicalData: decodedData, historicalDataAcc: acc}
      })
    }, TRANSACTION_ID);

    // trigger data send
    await this.device.writeCharacteristicWithResponseForService(
      devutils.info.serviceUUID,
      devutils.info.sensorSelectorCharacteristicUUID,
      encode(Uint8Array.of(parseInt(this.state.sensorId), devutils.info.intervals.SECONDS))
    )
  }

  getSensorsItems() {
    return Object.keys(devutils.info.sensors).map(sensorId => {
      sensor = devutils.info.sensors[sensorId]
      measurementsDesc = sensor.measurements.join(', ')
      label = sensor.name + ' [' + measurementsDesc + ']'
      return <Picker.Item label={label} value={sensorId} />;
    })
  }

  getMeasurementsItems(sensorId) {
    return devutils.info.sensors[sensorId].measurements.map(measurement => {
      return <Picker.Item label={measurement} value={measurement} />;
    })
  }

  render() {
    ({sensorId, measurement, historicalData} = this.state)
    measurement = measurement || devutils.info.sensors[sensorId].measurements[0]
    console.log(historicalData)
    return (
      <View>
        <Picker selectedValue={this.state.sensorId} onValueChange={(sensorId) => {
          this.setState({sensorId, historicalData: {}, historicalDataAcc: null});
          this.manager.cancelTransaction(TRANSACTION_ID);
          this.setupNotifications();
        }}>
            {this.getSensorsItems()}
        </Picker>
        <Picker selectedValue={measurement} onValueChange={measurement => {
          this.setState({measurement});
        }}>
            {this.getMeasurementsItems(sensorId)}
        </Picker>
        {(historicalData[measurement] || []).length > 0 &&
          <LineChart
            data={{
              // labels: ['January', 'February', 'March', 'April', 'May', 'June'],
              datasets: [{
                data: historicalData[measurement]
              }]
            }}
            width={Dimensions.get('window').width}
            height={220}
            chartConfig={{
              backgroundColor: 'gray',
              decimalPlaces: 2, // optional, defaults to 2dp
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: {
                borderRadius: 16
              }
            }}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16
            }}
        />
      }
      </View>
    )
  }
}
