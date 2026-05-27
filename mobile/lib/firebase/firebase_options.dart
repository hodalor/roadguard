import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb, TargetPlatform;

import '../config/mobile_env.dart';

class DefaultFirebaseOptions {
  static bool get isPlaceholder => !isConfigured;

  static bool get isConfigured {
    return _hasCoreFields &&
        _hasWebFields &&
        _hasAndroidFields &&
        _hasIosFields;
  }

  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not configured for this platform.',
        );
    }
  }

  static FirebaseOptions get web => FirebaseOptions(
    apiKey: MobileEnv.firebaseWebApiKey!,
    appId: MobileEnv.firebaseWebAppId!,
    messagingSenderId: MobileEnv.firebaseMessagingSenderId!,
    projectId: MobileEnv.firebaseProjectId!,
    authDomain: MobileEnv.firebaseAuthDomain!,
    storageBucket: MobileEnv.firebaseStorageBucket,
  );

  static FirebaseOptions get android => FirebaseOptions(
    apiKey: MobileEnv.firebaseAndroidApiKey!,
    appId: MobileEnv.firebaseAndroidAppId!,
    messagingSenderId: MobileEnv.firebaseMessagingSenderId!,
    projectId: MobileEnv.firebaseProjectId!,
    storageBucket: MobileEnv.firebaseStorageBucket,
  );

  static FirebaseOptions get ios => FirebaseOptions(
    apiKey: MobileEnv.firebaseIosApiKey!,
    appId: MobileEnv.firebaseIosAppId!,
    messagingSenderId: MobileEnv.firebaseMessagingSenderId!,
    projectId: MobileEnv.firebaseProjectId!,
    iosBundleId: MobileEnv.firebaseIosBundleId,
    storageBucket: MobileEnv.firebaseStorageBucket,
  );

  static bool get _hasCoreFields =>
      _hasValue(MobileEnv.firebaseProjectId) &&
      _hasValue(MobileEnv.firebaseMessagingSenderId);

  static bool get _hasWebFields =>
      _hasValue(MobileEnv.firebaseWebApiKey) &&
      _hasValue(MobileEnv.firebaseWebAppId) &&
      _hasValue(MobileEnv.firebaseAuthDomain);

  static bool get _hasAndroidFields =>
      _hasValue(MobileEnv.firebaseAndroidApiKey) &&
      _hasValue(MobileEnv.firebaseAndroidAppId);

  static bool get _hasIosFields =>
      _hasValue(MobileEnv.firebaseIosApiKey) &&
      _hasValue(MobileEnv.firebaseIosAppId) &&
      _hasValue(MobileEnv.firebaseIosBundleId);

  static bool _hasValue(String? value) => value != null && value.trim().isNotEmpty;
}
