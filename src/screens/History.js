import React, { Component } from 'react';
import {Platform, StyleSheet, Div, Text, View, Picker, SectionList, Button} from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import {encode} from 'base64-arraybuffer';
import {deviceInfo} from '../device_info';

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
      historicalData: "",
      sensorId: 3,
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
      deviceInfo.serviceUUID, deviceInfo.startRangeCharacteristicUUID, encode(Uint8Array.of(0, 8))
    );
    // set history stop (most recent entry)
    await this.device.writeCharacteristicWithResponseForService(
      deviceInfo.serviceUUID, deviceInfo.endRangeCharacteristicUUID, encode(Uint8Array.of(0, 0))
    )
    // Prepare to receive data
    this.device.monitorCharacteristicForService(deviceInfo.serviceUUID, deviceInfo.historicalDataCharacteristicUUID, (error, characteristic) => {
      if (error) {
        console.log(error.message)
        //TODO recognize not-errors (such as operation cancelled)
        return
      }
      this.setState((state, props) => ({ historicalData: state.historicalData.concat(characteristic.value) }))
    }, TRANSACTION_ID);

    // trigger data send
    await this.device.writeCharacteristicWithResponseForService(
      deviceInfo.serviceUUID,
      deviceInfo.sensorSelectorCharacteristicUUID,
      encode(Uint8Array.of(this.state.sensorId, deviceInfo.intervals.SECONDS))
    )
  }

  getSensorsItems() {
    return Object.keys(deviceInfo.sensors).map((sensor_id) => {
      sensor = deviceInfo.sensors[sensor_id]
      measurments_desc = sensor.measurments.join(', ')
      label = sensor.name + ' [' + measurments_desc + ']'
      return <Picker.Item label={label} value={sensor_id} />;
    })
  }

  render() {
    return (
      <View>
        <Picker selectedValue={this.state.sensorId} onValueChange={(sensorId) => {
          this.setState({sensorId, historicalData: ""});
          this.manager.cancelTransaction(TRANSACTION_ID);
          this.setupNotifications();
        }}>
            {this.getSensorsItems()}
        </Picker>
        <Text>{"Historical data: " + this.state.historicalData}</Text>
      </View>
    )
  }
}