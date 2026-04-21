import 'package:flutter/foundation.dart';
import 'dart:io' show Platform;

class AppConfig {
  static String get baseUrl {
    if (kDebugMode) {
      // For Android emulators, 10.0.2.2 points to the host machine's localhost
      // For iOS and others, localhost works directly
      try {
        if (Platform.isAndroid) return "http://10.0.2.2:8000";
      } catch (e) {
        // Fallback if Platform is not available (web)
      }
      return "http://localhost:8000";
    }
    return "https://todo-backend-1lun.onrender.com";
  }
  static const String apiVersion = "v1";
}
