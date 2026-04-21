class TaskModel {
  final int? id;
  final String title;
  final String? description;
  final bool isCompleted;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final int? userId;
  final int? assigneeId;
  final String? aiGuidance;
  final List<dynamic>? aiGuidanceHistory;

  TaskModel({
    this.id,
    required this.title,
    this.description,
    required this.isCompleted,
    required this.createdAt,
    this.updatedAt,
    this.userId,
    this.assigneeId,
    this.aiGuidance,
    this.aiGuidanceHistory,
  });

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    return TaskModel(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      isCompleted: json['is_completed'] ?? false,
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at']) : DateTime.now(),
      updatedAt: json['updated_at'] != null ? DateTime.parse(json['updated_at']) : null,
      userId: json['user_id'],
      assigneeId: json['assignee_id'],
      aiGuidance: json['ai_guidance'],
      aiGuidanceHistory: json['ai_guidance_history'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'is_completed': isCompleted,
      'created_at': createdAt.toIso8601String(),
      'assignee_id': assigneeId,
      'ai_guidance': aiGuidance,
      'ai_guidance_history': aiGuidanceHistory,
    };
  }
}
