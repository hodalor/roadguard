import 'package:firebase_core/firebase_core.dart';

import '../firebase/firebase_options.dart';

class FirebaseBootstrap {
  static bool get isConfigured => !DefaultFirebaseOptions.isPlaceholder;

  static Future<bool> initialize() async {
    if (!isConfigured) {
      return false;
    }

    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp(
          options: DefaultFirebaseOptions.currentPlatform,
        );
      }

      return true;
    } catch (_) {
      return false;
    }
  }
}
