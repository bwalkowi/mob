/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {Component} from 'react';
import {Platform, StyleSheet, Div, Text, View, Picker} from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import {PermissionsAndroid} from 'react-native';

async function requestPermissions() {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      {
        title: 'BT Permission',
        message:
          'Gimmie BT',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('You can use the location');
    } else {
      console.log('Coarse location permission denied');
    }
  } catch (err) {
    console.warn(err);
  }
}

type Props = {};
export default class App extends Component<Props> {
  constructor() {
    super()
    this.manager = new BleManager()
    this.state = {
      info: "", 
      foundDevices: [],
      selectedDevice: null,
      measurments: {}, 
    }

    this.serviceUUID = "0000ABCE-1212-EFDE-1523-785FEF13D123"
    this.sensorSelectorCharacteristicUUID = "0000BEA0-1212-EFDE-1523-785FEF13D123"
    this.startRangeCharacteristicUUID = "0000BEA1-1212-EFDE-1523-785FEF13D123"
    this.endRangeCharacteristicUUID = "0000BEA2-1212-EFDE-1523-785FEF13D123"
    this.historicalDataCharacteristicUUID = "0000BEA3-1212-EFDE-1523-785FEF13D123"

    this.sensors = {
      1: {name: "SHT31", measurments: ["Temperatura", "Wilgotność"]},
      3: {name: "TSL2561", measurments: ["Jasność", "Jasność [ir]"]},
      4: {name: "BME280", measurments: ["Temperatura", "Wilgotność", "Ciśnienie"]},
      5: {name: "MLX90614", measurments: ["Temperatura obiektu", "Temperatura otoczenia"]},
      6: {name: "Capsense", measurments: ["Przewodność elektryczna gleby"]},
      7: {name: "EC", measurments: ["?"]},
      8: {name: "WS1080", measurments: ["Prędkość wiatru", "Opady", "Kierunek wiatru"]}
    }

  }

  info(message) {
    this.setState({info: message})
  }

  error(message) {
    this.setState({info: "ERROR: " + message})
  }

  updateMeasurments(key, value) {
    this.setState({measurments: {...this.state.measurments, [key]: value}})
  }

  componentWillMount() {
    if (Platform.OS === 'ios') {
      this.manager.onStateChange((state) => {
        if (state === 'PoweredOn') this.startScan()
      })
    } else {
      requestPermissions()
      this.startScan()
    }
    this.info("Scanning...")
  }

  startScan() {
    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        this.error(error.message)
        this.startScan()
        return
      }

      if(device.name == "DigitalTherm"){
        console.log(device)

        if(this.state.foundDevices.indexOf(device.id) == -1){
          this.setState({foundDevices: this.state.foundDevices.concat(device.id)})
          return
        }

        if(device.id == this.state.selectedDevice){
          data = device.manufacturerData
          this.info("Got: " + data)

          this.updateMeasurments("SHT31", [Math.floor(Math.random() * 100) + 1, Math.floor(Math.random() * 100) + 1])
        }
      }
    });
  }

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>Welcome to React Native!</Text>
        <View style={styles.pickerContainer}>
          <Text style={{fontSize: 17, margin: 10}}>Selected device: </Text>
          <Picker
            selectedValue={this.state.selectedDevice || "None"}
            style={styles.picker}
            onValueChange={(itemValue, itemIndex) =>
              this.setState({selectedDevice: itemValue, values: {}})
            }>
            {this.state.foundDevices.map((mac_id) => {
              return <Picker.Item label={mac_id} value={mac_id} />
            })}
          </Picker>
        </View>
        <Text>{this.state.info}</Text>
        {Object.values(this.sensors).map((sensor) => {
            return <View key={sensor.name}>
                     <Text>{sensor.name + ":"}</Text>
                     {sensor.measurments.map((item, idx) => {
                         return <Text>{"   " + item + ": " + (this.state.measurments[sensor.name] ? this.state.measurments[sensor.name][idx] : "-")}</Text>
                     })}
                   </View>
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
  pickerContainer: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: 'white',
    paddingVertical: 10
  },
  picker: {
    height: 50, 
    width: 180,
    justifyContent: 'center'
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});
