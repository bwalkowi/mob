/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {Component} from 'react';
import {Platform, StyleSheet, Div, Text, View, Picker, SectionList, Button} from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import {PermissionsAndroid} from 'react-native';
import {decode} from 'base64-arraybuffer';

import {deviceInfo} from '../device_info';

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

export default class ScanScreen extends Component {
  static navigationOptions = {
    title: 'Scanning',
  };
  constructor(props) {
    super()
    this.manager = new BleManager()
    this.state = {
      info: "", 
      foundDevices: {},
      selectedDevice: null,
      measurments: {}, 
      historicalData: []
    }

    this.didFocusSub = props.navigation.addListener(
      'didFocus',
      payload => {
        console.log("Start scan");
        this.startScan();
      }
    )
    this.willBlurSub = props.navigation.addListener(
      'willBlur',
      payload => {
        console.log("Stop scan");
        this.manager.stopDeviceScan();
      }
    )
  }

  info(message) {
    this.setState({info: message})
  }

  error(message) {
    this.setState({info: "ERROR: " + message})
  }

  componentDidMount() {
    if (Platform.OS === 'ios') {
      this.manager.onStateChange((state) => {
        if (state === 'PoweredOn') this.startScan()
      })
    } else {
      requestPermissions()
      this.startScan()
    }

    this._interval = setInterval(() => {
      // TODO clear expired diveces
    }, 5000);
    this.info("Scanning...")
  }

  componentWillUnmount() {
    clearInterval(this._interval);
  }

  startScan() {
    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        this.error(error.message)
        this.startScan()
        return
      }

      if(device.name == "DigitalTherm"){
        console.log('Found device: ' + device.id)

        this.setState((state, props) => ({
          foundDevices: {
            ...state.foundDevices,
            [device.id]: {
              device: device, timestamp: Date.now()
            }
          }
        }));
        if(device.id === this.state.selectedDevice)
          this.setState({measurments: this.decodeMeasurments(device.manufacturerData)})
      }
    });
  }

  decodeMeasurments(encodedMeasurments){
    buffer = decode(encodedMeasurments)
    bytes = new Uint8Array(buffer)

    idx = 3  // first 3 bytes are irrelevant
    decodedMeasurments = {}
    while(idx < buffer.byteLength){
      sensor_id = bytes[idx++]
      next_idx = idx + 2*deviceInfo.sensors[sensor_id].measurments.length
      decodedMeasurments[sensor_id] = new Uint16Array(buffer.slice(idx, next_idx))
      idx = next_idx
    }

    return decodedMeasurments
  }


  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>{this.state.info}</Text>
        <View style={styles.pickerContainer}>
          <Text style={{fontSize: 17, margin: 10}}>Selected device: </Text>
          <Picker
            selectedValue={this.state.selectedDevice || "None"}
            style={styles.picker}
            onValueChange={(itemValue, itemIndex) => {
              dev = this.state.foundDevices[itemValue]
              this.setState({
                selectedDevice: itemValue,
                measurments: this.decodeMeasurments(dev.device.manufacturerData)
              })
            }}>
            {Object.keys(this.state.foundDevices).map((mac_id) => {
              return <Picker.Item label={mac_id} value={mac_id} />
            })}
          </Picker>
        </View>
        <Text style={{fontSize: 18, paddingTop: 10, paddingBottom: 10}}>Measurments!!!!</Text>
        <SectionList
          sections={Object.keys(this.state.measurments).map((sensor_id) => {
            sensor = deviceInfo.sensors[sensor_id]
            measurments = this.state.measurments[sensor_id]
            return {title: sensor.name, data: sensor.measurments.map((item, idx) => {
              return item + ": " + measurments[idx]
            })}
          })}
          renderItem={({item}) => <Text style={styles.item}>{item}</Text>}
          renderSectionHeader={({section}) => <Text style={styles.sectionHeader}>{section.title}</Text>}
          keyExtractor={(item, index) => index}
        />
        <Button
          onPress={() => {
            dev = this.state.foundDevices[this.state.selectedDevice]
            this.props.navigation.navigate('History', dev)
          }}
          disabled={this.state.selectedDevice == null}
          title="History"
          color="#841584"
          accessibilityLabel="Show history"
        />
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
    marginBottom: 10
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
  sectionHeader: {
    paddingTop: 2,
    paddingLeft: 10,
    paddingRight: 10,
    paddingBottom: 2,
    fontSize: 14,
    fontWeight: 'bold',
    backgroundColor: 'rgba(247,247,247,1.0)',
  },
  item: {
    padding: 10,
    fontSize: 18,
    height: 44,
  },
});
