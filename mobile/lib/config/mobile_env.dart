import 'package:flutter_dotenv/flutter_dotenv.dart';

class MobileEnv {
  static Future<void> load() async {
    try {
      await dotenv.load(fileName: '.env');
    } catch (_) {
      // Allow the app to start without a local .env file so the UI can still render.
    }
  }

  static String get appName => dotenv.maybeGet('APP_NAME') ?? 'RoadGuard Ghana';

  static String? get apiBaseUrl => dotenv.maybeGet('API_BASE_URL');

  static String? get firebaseProjectId => dotenv.maybeGet('FIREBASE_PROJECT_ID');
  static String? get firebaseMessagingSenderId => dotenv.maybeGet('FIREBASE_MESSAGING_SENDER_ID');
  static String? get firebaseStorageBucket => dotenv.maybeGet('FIREBASE_STORAGE_BUCKET');

  static String? get firebaseWebApiKey => dotenv.maybeGet('FIREBASE_WEB_API_KEY');
  static String? get firebaseWebAppId => dotenv.maybeGet('FIREBASE_WEB_APP_ID');
  static String? get firebaseAuthDomain => dotenv.maybeGet('FIREBASE_AUTH_DOMAIN');

  static String? get firebaseAndroidApiKey => dotenv.maybeGet('FIREBASE_ANDROID_API_KEY');
  static String? get firebaseAndroidAppId => dotenv.maybeGet('FIREBASE_ANDROID_APP_ID');

  static String? get firebaseIosApiKey => dotenv.maybeGet('FIREBASE_IOS_API_KEY');
  static String? get firebaseIosAppId => dotenv.maybeGet('FIREBASE_IOS_APP_ID');
  static String? get firebaseIosBundleId => dotenv.maybeGet('FIREBASE_IOS_BUNDLE_ID');
}
