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
      
      // AUTO-REFRESH: Fetch tasks immediately so they appear in the list
      apiService.fetchTasks();

      // Show a SnackBar or Dialog
      if (message.notification != null) {
        final context = ScaffoldMessenger.maybeOf(navigatorKey.currentContext!);
        if (context != null) {
          context.showSnackBar(
            SnackBar(
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(message.notification!.title ?? 'Notification', style: const TextStyle(fontWeight: FontWeight.bold)),
                  Text(message.notification!.body ?? ''),
                ],
              ),
              backgroundColor: Colors.indigoAccent,
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 4),
              action: SnackBarAction(
                label: 'VIEW', 
                textColor: Colors.white, 
                onPressed: () => _handleNotificationClick(message.data, apiService),
              ),
            ),
          );
        }
      }
    });

    // 6. Handle notification clicks (Background -> Foreground)
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      _handleNotificationClick(message.data, apiService);
    });

    // 7. Handle initial message (Killed -> Foreground)
    _fcm.getInitialMessage().then((message) {
      if (message != null) {
        _handleNotificationClick(message.data, apiService);
      }
    });
  }

  static void _handleNotificationClick(Map<String, dynamic> data, ApiService apiService) async {
    if (data.containsKey('task_id')) {
      final taskId = int.tryParse(data['task_id'].toString());
      if (taskId != null) {
        // Force a refresh to ensure the task is in memory
        await apiService.fetchTasks();
        
        // Navigation logic: Open the task detail if possible
        // For now, we refresh everything, but you could add a jump-to-task logic here.
        debugPrint("Navigating to task ID: $taskId");
      }
    }
  }

  // Global navigator key to access context for SnackBars
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
}
