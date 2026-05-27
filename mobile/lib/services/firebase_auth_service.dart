import 'package:firebase_auth/firebase_auth.dart';

import 'firebase_bootstrap.dart';

class FirebaseAuthService {
  FirebaseAuthService._();

  static final FirebaseAuthService instance = FirebaseAuthService._();

  FirebaseAuth get _auth => FirebaseAuth.instance;

  Stream<User?> authStateChanges() => _auth.authStateChanges();

  User? get currentUser => FirebaseBootstrap.isConfigured ? _auth.currentUser : null;

  Future<UserCredential?> signInAnonymously() async {
    if (!FirebaseBootstrap.isConfigured) {
      return null;
    }

    return _auth.signInAnonymously();
  }

  Future<void> signOut() async {
    if (!FirebaseBootstrap.isConfigured) {
      return;
    }

    await _auth.signOut();
  }
}
