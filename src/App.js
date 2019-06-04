import {createStackNavigator, createAppContainer} from 'react-navigation';
import ScanScreen from './screens/Scan'
import HistoryScreen from './screens/History'

const MainNavigator = createStackNavigator({
  Home: {screen: ScanScreen},
  History: {screen: HistoryScreen},
});

const App = createAppContainer(MainNavigator);

export default App;