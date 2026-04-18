import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppThemeColors {
  final Color background;
  final Color card;
  final Color text;
  final Color textDim;
  final Color inputBg;
  final Color divider;
  final Color primary;
  final bool isDark;

  const AppThemeColors({
    required this.background,
    required this.card,
    required this.text,
    required this.textDim,
    required this.inputBg,
    required this.divider,
    required this.primary,
    required this.isDark,
  });

  static const dark = AppThemeColors(
    background: Color(0xFF0F172A),
    card: Color(0xFF1E293B),
    text: Colors.white,
    textDim: Colors.white54,
    inputBg: Colors.black26,
    divider: Colors.white10,
    primary: Color(0xFF6366F1),
    isDark: true,
  );

  static const light = AppThemeColors(
    background: Color(0xFFF8FAFC),
    card: Colors.white,
    text: Color(0xFF0F172A),
    textDim: Colors.black54,
    inputBg: Colors.black12,
    divider: Colors.black12,
    primary: Color(0xFF6366F1),
    isDark: false,
  );
}

class ThemeProvider extends ChangeNotifier {
  AppThemeColors _currentTheme = AppThemeColors.dark;
  AppThemeColors get theme => _currentTheme;
  bool get isDark => _currentTheme.isDark;

  ThemeProvider() {
    _loadTheme();
  }

  Future<void> _loadTheme() async {
    final prefs = await SharedPreferences.getInstance();
    final isDarkPref = prefs.getBool('isDark') ?? true;
    _currentTheme = isDarkPref ? AppThemeColors.dark : AppThemeColors.light;
    notifyListeners();
  }

  Future<void> toggleTheme() async {
    _currentTheme = isDark ? AppThemeColors.light : AppThemeColors.dark;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('isDark', isDark);
  }
}
