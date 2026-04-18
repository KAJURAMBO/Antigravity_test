class UserModel {
  final int id;
  final String email;
  final String? fullName;
  final String? picture;
  final String? bio;

  UserModel({
    required this.id,
    required this.email,
    this.fullName,
    this.picture,
    this.bio,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'],
      email: json['email'],
      fullName: json['full_name'],
      picture: json['picture'],
      bio: json['bio'],
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
