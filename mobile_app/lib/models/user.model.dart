class UserModel {
  final int id;
  final String email;
  final String? fullName;
  final String? picture;
  final String? bio;
  final bool notifyDailyDigest;
  final bool notifyTodayTasks;
  final bool notifyFutureTasks;

  UserModel({
    required this.id,
    required this.email,
    this.fullName,
    this.picture,
    this.bio,
    this.notifyDailyDigest = true,
    this.notifyTodayTasks = true,
    this.notifyFutureTasks = false,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'],
      email: json['email'],
      fullName: json['full_name'],
      picture: json['picture'],
      bio: json['bio'],
      notifyDailyDigest: json['notify_daily_digest'] ?? true,
      notifyTodayTasks: json['notify_today_tasks'] ?? true,
      notifyFutureTasks: json['notify_future_tasks'] ?? false,
    );
  }
}

class MemberModel {
  final int id;
  final String email;
  final String? fullName;
  final String? picture;
  final String role;
  final bool canRemove;

  MemberModel({
    required this.id,
    required this.email,
    this.fullName,
    this.picture,
    required this.role,
    required this.canRemove,
  });

  factory MemberModel.fromJson(Map<String, dynamic> json) {
    return MemberModel(
      id: json['id'],
      email: json['email'],
      fullName: json['full_name'],
      picture: json['picture'],
      role: json['role'] ?? 'member',
      canRemove: json['can_remove'] ?? false,
    );
  }
}
