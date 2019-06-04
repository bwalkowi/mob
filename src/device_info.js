export const deviceInfo = {
    serviceUUID: "0000ABCE-1212-EFDE-1523-785FEF13D123",
    sensorSelectorCharacteristicUUID: "0000BEA0-1212-EFDE-1523-785FEF13D123",
    startRangeCharacteristicUUID: "0000BEA1-1212-EFDE-1523-785FEF13D123",
    endRangeCharacteristicUUID: "0000BEA2-1212-EFDE-1523-785FEF13D123",
    historicalDataCharacteristicUUID: "0000BEA3-1212-EFDE-1523-785FEF13D123",

    sensors: {
      1: {name: "SHT31", measurments: ["Temperatura", "Wilgotność"]},
      3: {name: "TSL2561", measurments: ["Jasność", "Jasność [ir]"]},
      4: {name: "BME280", measurments: ["Temperatura", "Wilgotność", "Ciśnienie"]},
      5: {name: "MLX90614", measurments: ["Temperatura obiektu", "Temperatura otoczenia"]},
      6: {name: "Capsense", measurments: ["Przewodność elektryczna gleby"]},
      7: {name: "EC", measurments: ["?"]},
      8: {name: "WS1080", measurments: ["Prędkość wiatru", "Opady", "Kierunek wiatru"]}
    }
}