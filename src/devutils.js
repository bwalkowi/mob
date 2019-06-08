import {decode} from 'base64-arraybuffer';

const info = {
    serviceUUID: "0000ABCE-1212-EFDE-1523-785FEF13D123",
    sensorSelectorCharacteristicUUID: "0000BEA0-1212-EFDE-1523-785FEF13D123",
    startRangeCharacteristicUUID: "0000BEA1-1212-EFDE-1523-785FEF13D123",
    endRangeCharacteristicUUID: "0000BEA2-1212-EFDE-1523-785FEF13D123",
    historicalDataCharacteristicUUID: "0000BEA3-1212-EFDE-1523-785FEF13D123",

    sensors: {
      1: {name: "SHT31", measurements: ["Temperatura", "Wilgotność"]},
      3: {name: "TSL2561", measurements: ["Jasność", "Jasność [ir]"]},
      4: {name: "BME280", measurements: ["Temperatura", "Wilgotność", "Ciśnienie"]},
      5: {name: "MLX90614", measurements: ["Temperatura obiektu", "Temperatura otoczenia"]},
      6: {name: "Capsense", measurements: ["Wilgotność gleby"]},
      7: {name: "EC", measurements: ["Przewodniość elektryczna gleby"]},
      8: {name: "WS1080", measurements: ["Prędkość wiatru", "Opady", "Kierunek wiatru"]}
    },

    intervals: {
      SECONDS: 0,
      MINUTES: 1,
      HOURS: 2
    }
}

const decodeMeasurements = (encodedMeasurements) => {
  buffer = decode(encodedMeasurements)
  bytes = new Uint8Array(buffer)

  idx = 3  // first 3 bytes are irrelevant
  decodedMeasurements = {}
  while(idx < buffer.byteLength){
    sensorId = bytes[idx++]
    nextIdx = idx + 2*info.sensors[sensorId].measurements.length
    decodedMeasurements[sensorId] = new Uint16Array(buffer.slice(idx, nextIdx))
    idx = nextIdx
  }

  return decodedMeasurements
}

const decodeHistoricalData = (encodedData, sensorId, decodedData, acc) => {
  console.log(encodedData)
  acc = acc || new ArrayBuffer()
  buffer = new Uint8Array([...new Uint8Array(acc), ...new Uint8Array(decode(encodedData))]).buffer
  measurements = info.sensors[sensorId].measurements
  idx = 0
  mIdx = 0
  while(idx + 2 < buffer.byteLength){
    measurement = measurements[mIdx]
    decodedData[measurement] = [...(decodedData[measurement] || []), ...(new Uint16Array(buffer.slice(idx, idx+2)))]
    idx = idx + 2
    mIdx = (mIdx + 1)%measurements.length
  }
  return {decodedData, acc: buffer.slice(idx)}
}

export const devutils = {
  info: info,
  decodeMeasurements: decodeMeasurements,
  decodeHistoricalData: decodeHistoricalData
}
