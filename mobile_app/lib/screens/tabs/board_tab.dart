import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_service.dart';
import '../../models/task.model.dart';
import '../../providers/theme_provider.dart';

class BoardTab extends StatefulWidget {
  const BoardTab({super.key});

  @override
  State<BoardTab> createState() => _BoardTabState();
}

class _BoardTabState extends State<BoardTab> {
  String _listTimeframe = 'today'; // today, 7d, 30d
  String _listStatus = 'active'; // active, backlog, done, future, delegated

  void _confirmDelete(BuildContext context, int taskId) {
    final theme = context.read<ThemeProvider>().theme;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: theme.card,
        title: Text('Delete Task?', style: TextStyle(color: theme.text)),
        content: Text('This action cannot be undone.', style: TextStyle(color: theme.textDim)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              await context.read<ApiService>().deleteTask(taskId);
              if (mounted) Navigator.pop(context);
            },
            child: const Text('Delete', style: TextStyle(color: Colors.redAccent)),
          ),
        ],
      ),
    );
  }

  void _showTaskModal(BuildContext context, {TaskModel? task}) {
    final theme = context.read<ThemeProvider>().theme;
    final isEditing = task != null;
    final titleController = TextEditingController(text: task?.title ?? '');
    final descController = TextEditingController(text: task?.description ?? '');
    DateTime selectedDate = task?.createdAt ?? DateTime.now();
    int? selectedAssignee = task?.assigneeId;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: theme.background,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(30))),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          final members = context.read<ApiService>().members;

          return Padding(
            padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom + 24, left: 24, right: 24, top: 24),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(isEditing ? 'Edit Mission' : 'Create New Mission', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: theme.text)),
                  const SizedBox(height: 24),
                TextField(
                  controller: titleController,
                  autofocus: !isEditing,
                  style: TextStyle(color: theme.text),
                  decoration: InputDecoration(
                    labelText: 'Task Title',
                    labelStyle: TextStyle(color: theme.textDim),
                    filled: true,
                    fillColor: theme.inputBg,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: descController,
                  maxLines: 3,
                  style: TextStyle(color: theme.text),
                  decoration: InputDecoration(
                    labelText: 'Description (Optional)',
                    labelStyle: TextStyle(color: theme.textDim),
                    filled: true,
                    fillColor: theme.inputBg,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () async {
                          final date = await showDatePicker(
                            context: context,
                            initialDate: selectedDate,
                            firstDate: DateTime(2000),
                            lastDate: DateTime(2100),
                          );
                          if (date != null) {
                            setModalState(() => selectedDate = date);
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                          decoration: BoxDecoration(color: theme.inputBg, borderRadius: BorderRadius.circular(16)),
                          child: Row(
                            children: [
                              Icon(Icons.calendar_today, color: theme.textDim, size: 20),
                              const SizedBox(width: 8),
                              Text("${selectedDate.month}/${selectedDate.day}/${selectedDate.year}", style: TextStyle(color: theme.text)),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: DropdownButtonFormField<int>(
                        value: () {
                          final currentUserId = context.read<ApiService>().user?.id;
                          if (selectedAssignee == null || selectedAssignee == currentUserId) {
                            return null;
                          }
                          if (members.any((m) => m.id == selectedAssignee)) {
                            return selectedAssignee;
                          }
                          return null;
                        }(),
                        dropdownColor: theme.card,
                        style: TextStyle(color: theme.text),
                        decoration: InputDecoration(
                          labelText: 'Assign To',
                          labelStyle: TextStyle(color: theme.textDim),
                          filled: true,
                          fillColor: theme.inputBg,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                        ),
                        items: [
                          const DropdownMenuItem<int>(value: null, child: Text('Myself')),
                          ...members
                              .where((m) => m.id != context.read<ApiService>().user?.id)
                              .map((m) => DropdownMenuItem(value: m.id, child: Text(m.fullName ?? m.email))),
                        ],
                        onChanged: (val) => setModalState(() => selectedAssignee = val),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: () async {
                      if (titleController.text.isNotEmpty) {
                        final api = context.read<ApiService>();
                        bool success;
                        if (isEditing) {
                          success = await api.updateTask(task.id!, title: titleController.text, description: descController.text, createdAt: selectedDate, assigneeId: selectedAssignee);
                        } else {
                          success = await api.createTask(titleController.text, descController.text, selectedDate, selectedAssignee);
                        }
                        if (success && mounted) Navigator.pop(context);
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: theme.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: Text(isEditing ? 'Update Task' : 'Launch Task', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        );
        },
      ),
    );
  }

  List<TaskModel> _getFilteredTasks(ApiService apiService) {
    final tasks = apiService.tasks;
    final user = apiService.user;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    return tasks.where((t) {
      final isAssignedToMe = t.assigneeId == user?.id || (t.assigneeId == null && t.userId == user?.id);
      final isDelegatedByMe = t.userId == user?.id && t.assigneeId != null && t.assigneeId != user?.id;

      if (_listStatus == 'delegated') {
        if (!isDelegatedByMe) return false;
      } else {
        if (!isAssignedToMe) return false;

        if (_listStatus == 'future') {
          final d = DateTime(t.createdAt.year, t.createdAt.month, t.createdAt.day);
          return d.isAfter(today) && !t.isCompleted;
        }

        if (_listStatus == 'backlog') {
          final d = DateTime(t.createdAt.year, t.createdAt.month, t.createdAt.day);
          if (!d.isBefore(today)) return false;
          return !t.isCompleted;
        }

        if (_listStatus == 'active') {
          if (t.isCompleted) return false;
          final d = DateTime(t.createdAt.year, t.createdAt.month, t.createdAt.day);
          if (d.isBefore(today)) return false;
        }

        if (_listStatus == 'done' && !t.isCompleted) return false;
      }

      final taskDate = DateTime(t.createdAt.year, t.createdAt.month, t.createdAt.day);
      if (_listTimeframe == 'today') {
        if (_listStatus == 'done' && taskDate.isAfter(today)) return true;
        return taskDate == today;
      } else if (_listTimeframe == '7d') {
        final diff = today.difference(taskDate).inDays;
        if (_listStatus == 'delegated') return diff.abs() <= 7;
        return diff >= 0 && diff <= 7;
      } else if (_listTimeframe == '30d') {
        final diff = today.difference(taskDate).inDays;
        if (_listStatus == 'delegated') return diff.abs() <= 30;
        return diff >= 0 && diff <= 30;
      }
      return false;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<ThemeProvider>().theme;
    final apiService = context.watch<ApiService>();
    final filteredTasks = _getFilteredTasks(apiService);

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: Text('Mission Board', style: TextStyle(fontWeight: FontWeight.w900, color: theme.text)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          DropdownButton<String>(
            value: _listTimeframe,
            dropdownColor: theme.card,
            underline: const SizedBox(),
            icon: Icon(Icons.calendar_month, color: theme.primary),
            style: TextStyle(color: theme.text, fontWeight: FontWeight.bold),
            items: const [
              DropdownMenuItem(value: 'today', child: Text('Today')),
              DropdownMenuItem(value: '7d', child: Text('Weekly')),
              DropdownMenuItem(value: '30d', child: Text('Monthly')),
            ],
            onChanged: (val) {
              if (val != null) setState(() => _listTimeframe = val);
            },
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: Column(
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: ['active', 'backlog', 'done', 'future', 'delegated'].map((status) {
                final isSelected = _listStatus == status;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(status.toUpperCase()),
                    labelStyle: TextStyle(
                      fontWeight: FontWeight.bold, 
                      fontSize: 11, 
                      color: isSelected ? Colors.white : theme.text
                    ),
                    selected: isSelected,
                    selectedColor: theme.primary,
                    backgroundColor: theme.isDark ? Colors.white10 : Colors.black.withOpacity(0.05),
                    showCheckmark: false,
                    side: BorderSide.none,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    onSelected: (_) => setState(() => _listStatus = status),
                  ),
                );
              }).toList(),
            ),
          ),
          Expanded(
            child: apiService.isLoading
                ? Center(child: CircularProgressIndicator(color: theme.primary))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: filteredTasks.length,
                    itemBuilder: (context, index) {
                      final task = filteredTasks[index];
                      final bool isDone = task.isCompleted;

                      return GestureDetector(
                        onTap: () => _showTaskModal(context, task: task),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: isDone ? theme.divider.withOpacity(0.3) : theme.card,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: isDone ? Colors.transparent : theme.divider),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: isDone ? Colors.green.withOpacity(0.1) : theme.primary.withOpacity(0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  isDone ? Icons.check_circle_rounded : Icons.access_time_filled_rounded,
                                  color: isDone ? Colors.green : theme.primary,
                                  size: 24,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      task.title,
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w800,
                                        color: isDone ? theme.textDim : theme.text,
                                        decoration: isDone ? TextDecoration.lineThrough : null,
                                      ),
                                    ),
                                    if (task.description != null && task.description!.isNotEmpty)
                                      Padding(
                                        padding: const EdgeInsets.only(top: 4.0),
                                        child: Text(
                                          task.description!,
                                          style: TextStyle(color: theme.textDim),
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    const SizedBox(height: 12),
                                    Wrap(
                                      spacing: 8,
                                      runSpacing: 8,
                                      children: [
                                        _buildPill(
                                          icon: Icons.calendar_today,
                                          text: "${task.createdAt.month}/${task.createdAt.day}",
                                          color: theme.divider,
                                          textColor: theme.textDim,
                                          theme: theme,
                                        ),
                                        if (task.assigneeId != null && task.assigneeId != apiService.user?.id)
                                          _buildPill(
                                            icon: Icons.person,
                                            text: "Assigned To: ${apiService.members.where((m) => m.id == task.assigneeId).firstOrNull?.fullName ?? 'Agent'}",
                                            color: Colors.blueAccent.withOpacity(0.2),
                                            textColor: Colors.blueAccent,
                                            theme: theme,
                                          ),
                                        if (task.assigneeId == apiService.user?.id)
                                          _buildPill(
                                            icon: Icons.person,
                                            text: task.userId == apiService.user?.id ? "Assigned by: SELF" : "Assigned by Operator",
                                            color: Colors.purpleAccent.withOpacity(0.2),
                                            textColor: Colors.purpleAccent,
                                            theme: theme,
                                          ),
                                        if (isDone)
                                          _buildPill(
                                            icon: Icons.check_circle,
                                            text: "COMPLETED",
                                            color: Colors.green.withOpacity(0.2),
                                            textColor: Colors.green,
                                            theme: theme,
                                          ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              PopupMenuButton<String>(
                                icon: Icon(Icons.more_vert, color: theme.textDim),
                                color: theme.card,
                                onSelected: (value) {
                                  if (value == 'toggle') {
                                    apiService.updateTask(task.id!, isCompleted: !isDone);
                                  } else if (value == 'edit') {
                                    _showTaskModal(context, task: task);
                                  } else if (value == 'delete') {
                                    _confirmDelete(context, task.id!);
                                  }
                                },
                                itemBuilder: (context) => [
                                  PopupMenuItem(value: 'toggle', child: Text(isDone ? 'Mark as Active' : 'Mark as Done', style: TextStyle(color: theme.text))),
                                  PopupMenuItem(value: 'edit', child: Text('Edit details', style: TextStyle(color: theme.text))),
                                  const PopupMenuItem(value: 'delete', child: Text('Delete task', style: TextStyle(color: Colors.redAccent))),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showTaskModal(context),
        backgroundColor: theme.primary,
        elevation: 8,
        child: const Icon(Icons.add, color: Colors.white, size: 28),
      ),
    );
  }

  Widget _buildPill({required IconData icon, required String text, required Color color, required Color textColor, required AppThemeColors theme}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: theme.divider),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: textColor),
          const SizedBox(width: 4),
          Text(text, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: textColor)),
        ],
      ),
    );
  }
}
