// Custom entry point (package.json "main") — required so the Android home-screen
// widget's task handler is registered alongside the normal app bootstrap.
// `expo-router/entry` still does all the usual expo-router + registerRootComponent
// wiring; we just also register the widget task handler on top of it.
import 'expo-router/entry';

import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { widgetTaskHandler } from './features/widgets/widget-task-handler';

registerWidgetTaskHandler(widgetTaskHandler);
