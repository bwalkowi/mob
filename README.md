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

### Wykresy
... % TODO coś o libce do wykresów i że dane przychodzą w innej endianness niż przy manufacturerData (i co 30 jest gubiony ...)

## Autorzy

Bartosz Błaszków, Mateusz Front, Bartosz Walkowicz
