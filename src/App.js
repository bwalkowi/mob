/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {Component} from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import { BleManager } from 'react-native-ble-plx';


type Props = {};
export default class App extends Component<Props> {
  constructor() {
    super()
    this.manager = new BleManager()
    this.state = {info: "", values: {}}

    this.serviceUUID = "0000ABCE-1212-EFDE-1523-785FEF13D123"
    this.sonsorSelectorCharacteristicUUID = "0000BEA0-1212-EFDE-1523-785FEF13D123"
    this.startRangeCharacteristicUUID = "0000BEA1-1212-EFDE-1523-785FEF13D123"
    this.endRangeCharacteristicUUID = "0000BEA2-1212-EFDE-1523-785FEF13D123"
    this.historicalDataCharacteristicUUID = "0000BEA3-1212-EFDE-1523-785FEF13D123"
 
    this.sensors = {
      0: "Temperatura",
      1: "Wilgotność",
      2: "Jasność",
      3: "Ciśnienie",
      4: "Prędkość wiatru"
    }
  }

  info(message) {
    this.setState({info: message})
  }

  error(message) {
    this.setState({info: "ERROR: " + message})
  }

  updateValue(key, value) {
    this.setState({values: {...this.state.values, [key]: value}})
  }

  componentWillMount() {
    if (Platform.OS === 'ios') {
      this.manager.onStateChange((state) => {
        if (state === 'PoweredOn') this.startScan()
      })
    } else {
      this.startScan()
    }
    this.info("Scanning...")
  }

  startScan() {
    this.manager.startDeviceScan([this.serviceUUID],
                                 null, (error, device) => {
      console.log(device)

      // should be after if(error)
      this.updateValue(0, 111)

      if (error) {
        this.error(error.message)
        this.startScan()
        return
      }

      data = device.manufacturerData
      this.info("Got: " + data)
    });
  }

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>Welcome to React Native!</Text>
        <Text>{this.state.info}</Text>
        {Object.keys(this.sensors).map((key) => {
          return <Text key={key}>
                   {this.sensors[key] + ": " + (this.state.values[key] || "-")}
                 </Text>
        })}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});
