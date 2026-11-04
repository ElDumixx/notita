/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'NotitaWidget',
  displayName: 'Notita',
  icon: '../../assets/icons/ios/original.png',
  deploymentTarget: '17.0',
  colors: {
    $accent: '#7466E3',
    $widgetBackground: '#FFFFFF',
  },
  frameworks: ['SwiftUI', 'WidgetKit', 'AppIntents'],
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
