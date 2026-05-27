import 'package:firebase_messaging/firebase_messaging.dart';

import 'firebase_bootstrap.dart';

class NotificationSetupResult {
  const NotificationSetupResult({
    required this.isReady,
    required this.statusLabel,
    required this.fcmToken,
  });

  final bool isReady;
  final String statusLabel;
  final String? fcmToken;
}

class PushNotificationService {
  PushNotificationService._();

  static final PushNotificationService instance = PushNotificationService._();

  FirebaseMessaging get _messaging => FirebaseMessaging.instance;

  Future<NotificationSetupResult> initialize() async {
    if (!FirebaseBootstrap.isConfigured) {
      return const NotificationSetupResult(
        isReady: false,
        statusLabel: 'Firebase config pending',
        fcmToken: null,
      );
    }

    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    final token = await _messaging.getToken();

    return NotificationSetupResult(
      isReady: settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional,
      statusLabel: settings.authorizationStatus.name,
      fcmToken: token,
    );
  }
}
