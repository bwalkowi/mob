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
Składa się z 2 ekranów:
- `Scan` - ekran, na którym można dokonać wyboru urządzenia 
z pośród tych wykrytych oraz wyświetlane są bieżące pomiary jego czujników,
- `History` - erkan, na którym można wybrać czujnik i wyświetlić
historię jego pomiarów w wybranym zakresie w formie wykresu.

### BLE

Do obsługi **Bluetooth Low Energy** wykorzystana została biblioteka [react-native-ble-plx](https://github.com/Polidea/react-native-ble-plx). 
Dostarcza ona API bardzo podobne do tego, które jest dostępne w androidzie z poziomu języka java czy kotlin.

Przed rozpoczęciem skanowania w poszukiwaniu urządzeń tworzony jest `BleManager`:
```javascript
import { BleManager } from 'react-native-ble-plx';

...

export default class ScanScreen extends Component {
    constructor(props) {
        ...
        this.manager = new BleManager()
        ...
    }
    ...
}
```

Następnie z jego wykorzystaniem startowane jest skanowanie. 
W tym celu wywoływana jest na instancji `BleManager` metoda `startDeviceScan`
przyjmująca 3 parametry:
- `UUIDs` - lista zawierająca UUID serwisów występujących w urządzeniach, których pakiety należy odbierać. W celu odbierania wszystkich pakietów należy podać `null`,
- `ScanOptions` - opcje skanowania zależne od platformy (android/ios),
- `listener` - callback wołany przy każdym odebraniu kolejnego pakietu. 
Otrzymuje on 2 argumenty: 
    - `error` - błąd jeśli takowy wystąpił. W przeciwnym wypadku jest to `null`,
    - `device` - obiekt zawierający informacje o urządzeniu wysyłającym pakiet. Korzystając z niego można się z danym urządzeniem połączyć.

Ponieważ nie udało się filtrować nasłuchiwanych pakietów po `UUID` serwisu 
(każdy obiekt `device` miał ustawione pole `device.serviceUUIDs` na `null`)
to odbierane są wszystkie pakiety i sprawdzane jest czy urządzenie 
nazywa się `DigitalTherm`. 
Jeśli tak to dodawane jest do listy "znalezionych" urządzeń. 
W przypadku gdy jest to również to samo urządzenie, 
z którego obecnie klient chce pobierać pomiary 
(wybrane z listy przez użytkownika) 
to dekodowane i wyświetlane są dane zawarte w `device.manufacturerData`.

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

W celu połączenia się z urządzeniem i pobrania historycznych danych
zatrzymywany jest skan (w momencie przechodzenia w ekranu `Scan` do `History`). 
Następnie wywoływana jest funkcja `connect` na instancji `Device` 
uzyskanej podczas skanowania. Po połączeniu wykrywane są najpierw 
serwisy i charakterystyki (`discoverAllServicesAndCharacteristics()`).
Na koniec pobierane są historyczne dane w postaci notyfikacji (`setupNotifications()`).

```javascript
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
```

Aby odebrać historyczne dane najpierw wpisywany jest, korzystając z 2 i 3 charakterystyki,
okres czasu (początek i koniec), z którego te dane mają być wysyłane.
Następnie przygotowując się na odbiór danych rozpoczyna się monitorować 
4 charakterystykę. Podaje się przy tym callback, który będzie wołany przy odebraniu kolejnych
pakietów (20B, które są dekodowane i dodawane do wykresów).
Na koniec korzystając z 1 charakterystyki definiuje się, z którego sensora mają być pobierane dane. 
Wysyłanie danych następuje zaraz po wpisaniu do tej charakterystyki wybranej wartości.

```javascript
async setupNotifications() {
  ...

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
      return
    }
    this.setState((state, props) => {
      ...
      ({decodedData, acc, allDecoded} = devutils.decodeHistoricalData(characteristic.value, sensorId, historicalData, historicalDataAcc, toLoad))
      ...
    })
  }, TRANSACTION_ID);

  // trigger data send
  await device.writeCharacteristicWithResponseForService(
    devutils.info.serviceUUID,
    devutils.info.sensorSelectorCharacteristicUUID,
    encode(Uint8Array.of(parseInt(this.state.sensorId), devutils.info.intervals[this.state.loadInterval]))
  )
}
```

Po odebraniu wszystkich danych i powrocie do widoku pomiarów bieżących
skan jest rozpoczynany ponownie.

### Wykresy

Do sporządzenia wykresów wykorzystana została biblioteka [react-native-chart-kit
](https://github.com/indiespirit/react-native-chart-kit).


## Autorzy

Bartosz Błaszków, Mateusz Front, Bartosz Walkowicz
