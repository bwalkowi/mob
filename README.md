# Kwiatoczujnik

Aplikacja zbierająca odczyty z urządzenia IoT do doniczek kwiatowych

## Uruchamianie

```
npm install
react-native run-android
```

Można również użyć pliku apk przypiętego do Release na GitHubie

## Implementacja 

Aplikacja została napisana w technologii `react-native`. 

... % TODO  coś ogólnie o apce, że ma 2 screeny, o przełączaniu między nimi i focusowaniu/montowaniu (`componentDidMount` i `didFocusSub`) - tak żeby pokazać jak się to w reactcie robi

### BLE

Do obsługi **Bluetooth Low Energy** wykorzystana została biblioteka [react-native-ble-plx](https://github.com/Polidea/react-native-ble-plx). 
Dostarcza ona API bardzo podobne do tego, które jest dostępne w androidzie z poziomu języka java czy kotlin.

... % TODO rozwin ble, jak sa pobierane manufacturerData, łączenie się, itd

```javascript
startScan(){
    this.manager.startDeviceScan(null, null, (error, device) => {
      if(error){
        this.error(error.message)
        this.startScan()
        return
      }

      if(device.name == "DigitalTherm"){
        console.log('Found device: ' + device.id)

        ...

        if(device.id === this.state.selectedDevice)
          this.setState({measurements: devutils.decodeMeasurements(device.manufacturerData)})
      }
    });
}

```

### Wykresy
... % TODO coś o libce do wykresów i że dane przychodzą w innej endianness niż przy manufacturerData (i co 30 jest gubiony ...)

## Autorzy

Bartosz Błaszków, Mateusz Front, Bartosz Walkowicz
