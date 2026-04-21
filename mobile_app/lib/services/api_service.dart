import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../config.dart';
import '../models/task.model.dart';
import '../models/user.model.dart';

class ApiService extends ChangeNotifier {
  List<TaskModel> _tasks = [];
  List<MemberModel> _members = [];
  bool _isLoading = false;
  String? _token;
  UserModel? _user;
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    serverClientId: '1060605959840-f76ettkbg62idbr4s03lv22bp0hesu7f.apps.googleusercontent.com',
    // clientId is only needed on iOS; on Android, Play Services auto-resolves via SHA-1
    clientId: Platform.isIOS ? '1060605959840-0bbrdem82hpufeij1fr3be9v3vn5olbl.apps.googleusercontent.com' : null,
    scopes: ['email', 'profile'],
  );

  List<TaskModel> get tasks => _tasks;
  List<MemberModel> get members => _members;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _token != null;
  UserModel? get user => _user;

  Map<String, String> get _headers => {
        "Content-Type": "application/json",
        if (_token != null) "Authorization": "Bearer $_token",
      };

  ApiService() {
    _loadToken();
  }

  Future<void> _loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    final savedToken = prefs.getString('auth_token');
    if (savedToken != null) {
      _token = savedToken;
      await fetchUserProfile();
    }
  }

  Future<bool> login(String username) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await http.post(
        Uri.parse("${AppConfig.baseUrl}/auth/dev"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"username": username}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _token = data['access_token'];
        _user = UserModel.fromJson(data['user']);
        
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', _token!);

        await fetchTasks();
        await fetchMembers();
        return true;
      }
    } catch (e) {
      debugPrint("Login Error: $e");
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  Future<bool> loginWithGoogle() async {
    _isLoading = true;
    notifyListeners();

    try {
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        _isLoading = false;
        notifyListeners();
        return false;
      }

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final String? idToken = googleAuth.idToken;

      if (idToken == null) {
        _isLoading = false;
        notifyListeners();
        return false;
      }

      final response = await http.post(
        Uri.parse("${AppConfig.baseUrl}/auth/google"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"token": idToken}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _token = data['access_token'];
        _user = UserModel.fromJson(data['user']);
        
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', _token!);

        await fetchTasks();
        await fetchMembers();
        return true;
      }
    } catch (e) {
      debugPrint("Google Login Error: $e");
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  Future<void> fetchUserProfile() async {
    if (!isAuthenticated) return;
    try {
      final response = await http.get(
        Uri.parse("${AppConfig.baseUrl}/users/me"),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        _user = UserModel.fromJson(jsonDecode(response.body));
        await fetchTasks();
        await fetchMembers();
      } else {
        await logout();
      }
    } catch (e) {
      await logout();
    }
  }

  Future<void> fetchMembers() async {
    if (!isAuthenticated) return;
    try {
      final response = await http.get(
        Uri.parse("${AppConfig.baseUrl}/teams/members"),
        headers: _headers,
      );
      if (response.statusCode == 200) {
        List<dynamic> data = jsonDecode(response.body);
        _members = data.map((item) => MemberModel.fromJson(item)).toList();
        notifyListeners();
      }
    } catch (e) {
      debugPrint("Fetch Members Error: $e");
    }
  }

  Future<void> fetchTasks() async {
    if (!isAuthenticated) return;
    _isLoading = true;
    notifyListeners();

    try {
      final response = await http.get(
        Uri.parse("${AppConfig.baseUrl}/tasks/"),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        List<dynamic> data = jsonDecode(response.body);
        _tasks = data.map((item) => TaskModel.fromJson(item)).toList();
      }
    } catch (e) {
      debugPrint("API Error: $e");
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createTask(String title, String? description, DateTime? createdAt, int? assigneeId) async {
    if (!isAuthenticated) return false;
    try {
      final response = await http.post(
        Uri.parse("${AppConfig.baseUrl}/tasks/"),
        headers: _headers,
        body: jsonEncode({
          "title": title,
          "description": description,
          "is_completed": false,
          "created_at": (createdAt ?? DateTime.now()).toUtc().toIso8601String(),
          if (assigneeId != null) "assignee_id": assigneeId,
        }),
      );

      if (response.statusCode == 201) {
        await fetchTasks();
        return true;
      }
    } catch (e) {
      debugPrint("Create Task Error: $e");
    }
    return false;
  }

  Future<bool> updateTask(int taskId, {bool? isCompleted, String? title, String? description, int? assigneeId, DateTime? createdAt}) async {
    if (!isAuthenticated) return false;
    try {
      final Map<String, dynamic> body = {};
      if (isCompleted != null) body['is_completed'] = isCompleted;
      if (title != null) body['title'] = title;
      if (description != null) body['description'] = description;
      if (assigneeId != null) body['assignee_id'] = assigneeId;
      if (createdAt != null) body['created_at'] = createdAt.toUtc().toIso8601String();

      final response = await http.patch(
        Uri.parse("${AppConfig.baseUrl}/tasks/$taskId"),
        headers: _headers,
        body: jsonEncode(body),
      );

      if (response.statusCode == 200) {
        await fetchTasks();
        return true;
      }
    } catch (e) {
      debugPrint("Update Task Error: $e");
    }
    return false;
  }

  Future<bool> deleteTask(int taskId) async {
    if (!isAuthenticated) return false;
    try {
      final response = await http.delete(
        Uri.parse("${AppConfig.baseUrl}/tasks/$taskId"),
        headers: _headers,
      );

      if (response.statusCode == 204) {
        await fetchTasks();
        return true;
      }
    } catch (e) {
      debugPrint("Delete Task Error: $e");
    }
    return false;
  }

  Future<bool> bulkDeleteTasks(List<int> taskIds) async {
    if (!isAuthenticated || taskIds.isEmpty) return false;
    try {
      final response = await http.post(
        Uri.parse("${AppConfig.baseUrl}/tasks/bulk-delete"),
        headers: _headers,
        body: jsonEncode(taskIds),
      );

      if (response.statusCode == 204) {
        await fetchTasks();
        return true;
      }
    } catch (e) {
      debugPrint("Bulk Delete Error: $e");
    }
    return false;
  }

  Future<bool> inviteMember(String email) async {
    if (!isAuthenticated) return false;
    try {
      final response = await http.post(
        Uri.parse("${AppConfig.baseUrl}/teams/invite"),
        headers: _headers,
        body: jsonEncode({"email": email}),
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        await fetchMembers();
        return true;
      }
    } catch (e) {
      debugPrint("Invite Member Error: $e");
    }
    return false;
  }

  Future<bool> updateProfile(String fullName, String bio) async {
    if (!isAuthenticated) return false;
    try {
      final response = await http.patch(
        Uri.parse("${AppConfig.baseUrl}/users/me"),
        headers: _headers,
        body: jsonEncode({
          "full_name": fullName,
          "bio": bio,
        }),
      );
      if (response.statusCode == 200) {
        await fetchUserProfile();
        return true;
      }
    } catch (e) {
      debugPrint("Update Profile Error: $e");
    }
    return false;
  }

  Future<bool> uploadProfileImage(String filePath) async {
    if (!isAuthenticated) return false;
    try {
      var request = http.MultipartRequest(
        'POST',
        Uri.parse("${AppConfig.baseUrl}/users/me/picture"),
      );
      request.headers.addAll({
        if (_token != null) "Authorization": "Bearer $_token",
      });
      request.files.add(await http.MultipartFile.fromPath('file', filePath));
      
      var streamedResponse = await request.send();
      var response = await http.Response.fromStream(streamedResponse);
      
      if (response.statusCode == 200) {
        await fetchUserProfile();
        return true;
      }
    } catch (e) {
      debugPrint("Upload Image Error: $e");
    }
    return false;
  }

  // --- AI FEATURES ---
  Future<Map<String, dynamic>> parseTaskWithAi(String message, List<Map<String, dynamic>> history) async {
    if (!isAuthenticated) return {};
    try {
      final response = await http.post(
        Uri.parse("${AppConfig.baseUrl}/ai/parse-task"),
        headers: _headers,
        body: jsonEncode({
          "message": message,
          "conversation_history": history,
          "local_time": DateTime.now().toIso8601String(),
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        debugPrint("AI Parse Error: ${response.statusCode} - ${response.body}");
      }
    } catch (e) {
      debugPrint("AI Parse Error: $e");
    }
    return {};
  }

  Future<String?> getAiGuidance(int taskId) async {
    if (!isAuthenticated) return null;
    try {
      final response = await http.get(
        Uri.parse("${AppConfig.baseUrl}/ai/task-guidance/$taskId"),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body)['guidance'];
      }
    } catch (e) {
      debugPrint("AI Guidance Error: $e");
    }
    return null;
  }

  Future<String?> refineAiGuidance(int taskId, String feedback) async {
    if (!isAuthenticated) return null;
    try {
      final response = await http.post(
        Uri.parse("${AppConfig.baseUrl}/ai/task-guidance/$taskId/refine"),
        headers: _headers,
        body: jsonEncode({
          "user_feedback": feedback,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body)['guidance'];
      }
    } catch (e) {
      debugPrint("AI Refine Guidance Error: $e");
    }
    return null;
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    _tasks = [];
    _members = [];
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    try {
      await _googleSignIn.signOut();
    } catch (_) {}
    notifyListeners();
  }
}
