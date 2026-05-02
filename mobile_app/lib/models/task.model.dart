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

  final DateTime? dueDate;

  TaskModel({
    this.id,
    required this.title,
    this.description,
    required this.isCompleted,
    required this.createdAt,
    this.updatedAt,
    this.dueDate,
    this.userId,
    this.assigneeId,
    this.aiGuidance,
    this.aiGuidanceHistory,
  });

  TaskModel copyWith({
    int? id,
    String? title,
    String? description,
    bool? isCompleted,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? dueDate,
    int? userId,
    int? assigneeId,
    String? aiGuidance,
    List<dynamic>? aiGuidanceHistory,
  }) {
    return TaskModel(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      isCompleted: isCompleted ?? this.isCompleted,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      dueDate: dueDate ?? this.dueDate,
      userId: userId ?? this.userId,
      assigneeId: assigneeId ?? this.assigneeId,
      aiGuidance: aiGuidance ?? this.aiGuidance,
      aiGuidanceHistory: aiGuidanceHistory ?? this.aiGuidanceHistory,
    );
  }

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    return TaskModel(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      isCompleted: json['is_completed'] ?? false,
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at']).toLocal() 
          : DateTime.now(),
      updatedAt: json['updated_at'] != null 
          ? DateTime.parse(json['updated_at']).toLocal() 
          : null,
      dueDate: json['due_date'] != null 
          ? DateTime.parse(json['due_date']).toLocal() 
          : null,
      userId: json['user_id'],
      assigneeId: json['assignee_id'],
      aiGuidance: json['ai_guidance'],
      aiGuidanceHistory: json['ai_guidance_history'] is List 
          ? List<dynamic>.from(json['ai_guidance_history']) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'is_completed': isCompleted,
      'created_at': createdAt.toIso8601String(),
      'due_date': dueDate?.toIso8601String(),
      'assignee_id': assigneeId,
      'ai_guidance': aiGuidance,
      'ai_guidance_history': aiGuidanceHistory,
    };
  }
}
