import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'api_service.dart';

class NotificationService {
  static final FirebaseMessaging _fcm = FirebaseMessaging.instance;

  static Future<void> initialize(ApiService apiService) async {
    // 1. Request Permission (Crucial for iOS)
    NotificationSettings settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      debugPrint('User granted notification permission');
      
      // 2. Get the Token
      String? token = await _fcm.getToken();
      if (token != null) {
        debugPrint('FCM Token: $token');
        // 3. Send it to the backend via ApiService
        await apiService.updateFcmToken(token);
      }

      // 4. Listen for token refreshes
      _fcm.onTokenRefresh.listen((newToken) async {
        await apiService.updateFcmToken(newToken);
      });
    } else {
      debugPrint('User declined or has not accepted notification permission');
    }

    // 5. Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint('Received foreground message: ${message.notification?.title}');
      // You can show a local notification here or a SnackBar
    });
  }
}
