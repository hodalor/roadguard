import 'package:flutter/material.dart';

import 'app.dart';
import 'config/mobile_env.dart';
import 'services/firebase_bootstrap.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await MobileEnv.load();
  await FirebaseBootstrap.initialize();

  runApp(const RoadGuardApp());
}
