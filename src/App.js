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
      foundDevices: {},
      selectedDevice: null,
      measurments: {}, 
      historicalData: []
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

  componentWillMount() {
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
        console.log(device)

        this.setState({foundDevices: {...this.state.foundDevices, [device.id]: {device: device, timestamp: Date.now()}}})
        if(device.id == this.state.selectedDevice)
          this.setState({measurments: this.decodeMeasurments(device.manufacturerData)})
      }
    });
  }

  decodeMeasurments(encodedMeasurments){
    buffer = decode(encodedMeasurments)
    bytes = new Int8Array(buffer)

    idx = 3  // first 3 bytes are irrelevant
    decodedMeasurments = {}
    while(idx < buffer.byteLength){
      sensor_id = bytes[idx++]
      next_idx = idx + 2*this.sensors[sensor_id].measurments.length
      decodedMeasurments[sensor_id] = new Int16Array(buffer.slice(idx, next_idx))
      idx = next_idx
    }

    return decodedMeasurments
  }

  getHistoricalData(device){
    this.manager.stopDeviceScan()
    device.connect()
      .then((device) => {
        this.info("Discovering services and characteristics")
        return device.discoverAllServicesAndCharacteristics()
      })
      .then((device) => {
        this.info("Setting notifications")
        return this.setupNotifications(device)
      })
      .then(() => {
        this.info("Listening...")
      }, (error) => {
        this.error(error.message)
        this.startScan()
      })            
  }

  async setupNotifications(device) {
    for (const id in this.sensors) {
      await device.writeCharacteristicWithResponseForService(
        this.serviceUUID, this.startRangeCharacteristicUUID, "AAg=" /* \x00\x08 in hex */
      )
      await device.writeCharacteristicWithResponseForService(
        this.serviceUUID, this.endRangeCharacteristicUUID, "AAA=" /* \x00\x00 in hex */
      )
      await device.writeCharacteristicWithResponseForService(
        this.serviceUUID, this.sensorSelectorCharacteristicUUID, "AwA=" /* \x03\x00 in hex */
      )

      device.monitorCharacteristicForService(this.serviceUUID, this.historicalDataCharacteristicUUID, (error, characteristic) => {
        if (error) {
          this.error(error.message)
          this.startScan()
          return
        }
        this.setState({historicalData: this.state.historicalData.concat(characteristic.value)})
        if(characteristic.value.length < 20)
          this.startScan()
      })
    }
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
            sensor = this.sensors[sensor_id]
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
            this.getHistoricalData(dev.device)
          }}
          disabled={this.state.selectedDevice == null}
          title="History"
          color="#841584"
          accessibilityLabel="Show history"
        />
        <Text style={styles.welcome}>{"Historical data: " + this.state.historicalData}</Text>
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
