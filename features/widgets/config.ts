/** Must match the widget `name` declared in app.json's react-native-android-widget
 * plugin config, and the key used in the task handler's name→component map. */
export const WIDGET_NAME = 'LifeOSToday';

/**
 * Deep links each widget row opens (clickAction OPEN_URI). The `lifeos://`
 * scheme is registered via app.json's `scheme`, and expo-router resolves the
 * path — the triple slash keeps the first segment a path, not a URL host, so
 * `/tasks` isn't mis-parsed as host `tasks`.
 */
export const WIDGET_LINKS = {
  tasks: 'lifeos:///tasks',
  habits: 'lifeos:///habits',
  water: 'lifeos:///water-intake/history',
} as const;
