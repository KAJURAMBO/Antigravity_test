import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';
import '../models/task.model.dart';
import '../models/user.model.dart';

class ApiService extends ChangeNotifier {
  List<TaskModel> _tasks = [];
  List<MemberModel> _members = [];
  bool _isLoading = false;
  String? _token;
  UserModel? _user;

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
        logout();
      }
    } catch (e) {
      logout();
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

  Future<void> logout() async {
    _token = null;
    _user = null;
    _tasks = [];
    _members = [];
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    notifyListeners();
  }
}
