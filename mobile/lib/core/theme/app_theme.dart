import 'package:flutter/material.dart';

class AppTheme {
  static const Color brandNavy = Color(0xFF081A3A);
  static const Color brandOrange = Color(0xFFFF6A00);

  static ThemeData get lightTheme {
    return ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: brandOrange,
        primary: brandOrange,
        secondary: brandNavy,
      ),
      scaffoldBackgroundColor: const Color(0xFFF5F7FB),
      useMaterial3: true,
      appBarTheme: const AppBarTheme(
        backgroundColor: brandNavy,
        foregroundColor: Colors.white,
        centerTitle: true,
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
        ),
      ),
    );
  }
}
