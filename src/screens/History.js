import React, { Component } from 'react';
import {Platform, StyleSheet, Div, Text, View, Picker, SectionList, Button, TextInput, Dimensions} from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import {encode} from 'base64-arraybuffer';
import {LineChart} from 'react-native-chart-kit'

import {devutils} from '../devutils';

// This id allows to cancel subscription on notification
const TRANSACTION_ID = 'historicalDataTransaction';
const LOAD_SIZE = 8

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
      historicalDataAcc: null,
      loading: true,
      toLoad: LOAD_SIZE,
      loadInterval: "SECONDS"
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
        return this.setupNotifications()
      })
      .then(() => {
        console.info("Listening...")
      }, (error) => {
        console.error(error.message)
      })
  }

  async setupNotifications() {
    this.setState({loading: true, historicalData: {}, historicalDataAcc: null});
    ({device} = this)
    // set history start
    await device.writeCharacteristicWithResponseForService(
      devutils.info.serviceUUID, devutils.info.startRangeCharacteristicUUID, encode(Uint8Array.of(0, this.state.toLoad))
    );
    // set history stop
    await device.writeCharacteristicWithResponseForService(
      devutils.info.serviceUUID, devutils.info.endRangeCharacteristicUUID, encode(Uint8Array.of(0, 0))
    )
    // Prepare to receive data
    device.monitorCharacteristicForService(devutils.info.serviceUUID, devutils.info.historicalDataCharacteristicUUID, (error, characteristic) => {
      if (error) {
        console.log(error.message)
        //TODO recognize not-errors (such as operation cancelled)
        return
      }
      this.setState((state, props) => {
        ({sensorId, historicalData, historicalDataAcc, toLoad} = state);
        ({decodedData, acc, allDecoded} = devutils.decodeHistoricalData(characteristic.value, sensorId, historicalData, historicalDataAcc, toLoad))
        return {historicalData: decodedData, historicalDataAcc: acc, loading: !allDecoded}
      })
    }, TRANSACTION_ID);

    console.log("data send")
    // trigger data send
    await device.writeCharacteristicWithResponseForService(
      devutils.info.serviceUUID,
      devutils.info.sensorSelectorCharacteristicUUID,
      encode(Uint8Array.of(parseInt(this.state.sensorId), devutils.info.intervals[this.state.loadInterval]))
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
    let {sensorId, measurement, historicalData, toLoad} = this.state;
    measurement = measurement || devutils.info.sensors[sensorId].measurements[0];
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
        <Picker selectedValue={this.state.loadInterval} onValueChange={loadInterval => {
          this.setState({historicalData: {}, historicalDataAcc: null, loadInterval});
          this.manager.cancelTransaction(TRANSACTION_ID);
          this.setupNotifications();
        }}>
            {Object.keys(devutils.info.intervals).map(i => <Picker.Item label={i.toLowerCase()} value={i} />)}
        </Picker>
        <View style={{ flexDirection:'row' }}>
          <Text style={{fontSize: 17, margin: 8}}>
            Entries:
          </Text>
          <TextInput
            value = {"" + toLoad}
            keyboardType = 'numeric'
            onSubmitEditing={() => {
              this.manager.cancelTransaction(TRANSACTION_ID);
              this.setupNotifications();
            }}
            onChangeText={value => this.setState({toLoad: parseInt(value) || ""})}
            style={{backgroundColor: "lightgray", width: 40}}
          />
        </View>
        {(historicalData[measurement] || []).length > 0 &&
          <View>
            <LineChart
              data={{
                labels: [...historicalData[measurement].keys()].map(x => -x).reverse(),
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
        </View>
      }
      </View>
    )
  }
}
