import React, { Component } from 'react';
import {Platform, StyleSheet, Div, Text, View, Picker, SectionList, Button} from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import {deviceInfo} from '../device_info';

export default class HistoryScreen extends Component {
  static navigationOptions = {
    title: 'History',
  };
  constructor(props) {
    super(props)
    this.manager = new BleManager;
    this.device = props.navigation.getParam('device');
    this.state = {
      historicalData: []
    };
  }

  getHistoricalData(device){
    device.connect()
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

  async setupNotifications(device) {
    for (const id in deviceInfo.sensors) {
      await device.writeCharacteristicWithResponseForService(
        deviceInfo.serviceUUID, deviceInfo.startRangeCharacteristicUUID, "AAg=" /* \x00\x08 in hex */
      )
      await device.writeCharacteristicWithResponseForService(
        deviceInfo.serviceUUID, deviceInfo.endRangeCharacteristicUUID, "AAA=" /* \x00\x00 in hex */
      )
      await device.writeCharacteristicWithResponseForService(
        deviceInfo.serviceUUID, deviceInfo.sensorSelectorCharacteristicUUID, "AwA=" /* \x03\x00 in hex */
      )

      device.monitorCharacteristicForService(deviceInfo.serviceUUID, deviceInfo.historicalDataCharacteristicUUID, (error, characteristic) => {
        if (error) {
          this.error(error.message)
          return
        }
        this.setState((state, props) => ({historicalData: state.historicalData.concat(characteristic.value)}))
        if(characteristic.value.length < 20)
          this.startScan()
      })
    }
  }

  componentDidMount() {
    this.manager.stopDeviceScan()
    this.getHistoricalData(this.device);
  }

  render() {
    return (
      <View>
        <Text>{"Historical data: " + this.state.historicalData}</Text>
      </View>
    )
  }
}