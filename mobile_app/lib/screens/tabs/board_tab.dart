import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../services/api_service.dart';
import '../../models/task.model.dart';
import '../../providers/theme_provider.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

class BoardTab extends StatefulWidget {
  const BoardTab({super.key});

  @override
  State<BoardTab> createState() => _BoardTabState();
}

class _BoardTabState extends State<BoardTab> {
  String _listTimeframe = 'today'; // today, 7d, 30d
  String _listStatus = 'active'; // active, backlog, done, future, delegated

  // Multi-select delete
  bool _isSelectMode = false;
  final Set<int> _selectedIds = {};

  void _toggleSelectMode() {
    setState(() {
      _isSelectMode = !_isSelectMode;
      _selectedIds.clear();
    });
  }

  void _toggleSelection(int id) {
    setState(() {
      if (_selectedIds.contains(id)) {
        _selectedIds.remove(id);
      } else {
        _selectedIds.add(id);
      }
    });
  }

  Future<void> _bulkDelete(BuildContext context) async {
    if (_selectedIds.isEmpty) return;
    final count = _selectedIds.length;
    final api = context.read<ApiService>();
    
    // Call the new backend bulk endpoint for a single refresh
    final success = await api.bulkDeleteTasks(_selectedIds.toList());
    
    if (success && mounted) {
      setState(() {
        _isSelectMode = false;
        _selectedIds.clear();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('$count task${count > 1 ? 's' : ''} deleted'),
          backgroundColor: Colors.redAccent,
          behavior: SnackBarBehavior.floating,
          action: SnackBarAction(label: 'DISMISS', textColor: Colors.white, onPressed: () {}),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    }
  }

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

  void _showAiParseModal(BuildContext context) {
    final theme = context.read<ThemeProvider>().theme;
    final textController = TextEditingController();
    bool isLoading = false;
    List<Map<String, dynamic>> history = [];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: theme.background,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(30))),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          void _submit() async {
            if (textController.text.trim().isEmpty) return;
            final input = textController.text.trim();
            setModalState(() {
              history.add({"role": "user", "text": input});
              textController.clear();
              isLoading = true;
            });

            final api = context.read<ApiService>();
            final response = await api.parseTaskWithAi(input, history);

            if (!mounted) return;
            
            if (response['needs_clarification'] == true) {
              setModalState(() {
                history.add({"role": "model", "text": response['clarification_question']});
                isLoading = false;
              });
            } else if (response['title'] != null) {
              Navigator.pop(context);
              _showTaskModal(
                context, 
                isAiInput: true,
                task: TaskModel(
                  title: response['title'],
                  description: response['description'],
                  isCompleted: false,
                  createdAt: response['date'] != null ? DateTime.parse(response['date']).toLocal() : DateTime.now(),
                  assigneeId: response['assignee_id'],
                ),
              );
            } else {
              setModalState(() {
                history.add({"role": "model", "text": "Sorry, I'm having trouble connecting to my brain right now. Please try again in a moment! 🧠💤"});
                isLoading = false;
              });
            }
          }

          return Padding(
            padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom + 24, left: 24, right: 24, top: 24),
            child: SizedBox(
               height: MediaQuery.of(context).size.height * 0.6,
               child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.auto_awesome, color: Colors.purpleAccent, size: 28),
                          const SizedBox(width: 8),
                          Text('Add with AI', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: theme.text)),
                        ]
                      ),
                      IconButton(
                        icon: Icon(Icons.close, color: theme.textDim),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: ListView.builder(
                      itemCount: history.length,
                      itemBuilder: (context, index) {
                        final msg = history[index];
                        final isUser = msg['role'] == 'user';
                        return Align(
                          alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isUser ? theme.primary.withOpacity(0.2) : Colors.purpleAccent.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(16).copyWith(
                                bottomRight: isUser ? const Radius.circular(0) : const Radius.circular(16),
                                bottomLeft: isUser ? const Radius.circular(16) : const Radius.circular(0),
                              ),
                              border: Border.all(color: isUser ? theme.primary.withOpacity(0.3) : Colors.purpleAccent.withOpacity(0.3)),
                            ),
                            child: Text(msg['text'], style: TextStyle(color: isUser ? theme.text : Colors.purple[200])),
                          ),
                        );
                      },
                    ),
                  ),
                  if (isLoading)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8.0),
                      child: CircularProgressIndicator(color: Colors.purpleAccent),
                    ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: textController,
                          autofocus: true,
                          style: TextStyle(color: theme.text),
                          onSubmitted: (_) => _submit(),
                          decoration: InputDecoration(
                            hintText: 'E.g. Wash clothes tomorrow at 5pm...',
                            hintStyle: TextStyle(color: theme.textDim),
                            filled: true,
                            fillColor: theme.inputBg,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [Colors.purpleAccent, Colors.blueAccent]),
                          borderRadius: BorderRadius.circular(16)
                        ),
                        child: IconButton(
                          icon: const Icon(Icons.send, color: Colors.white),
                          onPressed: isLoading ? null : _submit,
                        ),
                      )
                    ],
                  )
                ],
              )
            ),
          );
        },
      ),
    );
  }

  void _showTaskModal(BuildContext context, {TaskModel? task, bool isAiInput = false}) {
    final theme = context.read<ThemeProvider>().theme;
    final isEditing = task != null && task.id != null;
    String? aiGuidance = task?.aiGuidance;
    bool isLoadingGuidance = false;
    bool isSaving = false;
    final refineController = TextEditingController();
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(isEditing ? 'Edit Mission' : 'Create New Mission', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: theme.text)),
                      IconButton(
                        icon: Icon(Icons.close, color: theme.textDim),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
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
                  if (isEditing) ...[
                    if (aiGuidance != null)
                      Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.purpleAccent.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.purpleAccent.withOpacity(0.3)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.auto_awesome, color: Colors.purpleAccent, size: 16),
                                const SizedBox(width: 8),
                                Text('AI Guidance', style: TextStyle(color: Colors.purple[200], fontWeight: FontWeight.bold, fontSize: 12)),
                              ],
                            ),
                            const SizedBox(height: 8),
                            MarkdownBody(
                              data: aiGuidance!,
                              styleSheet: MarkdownStyleSheet(
                                p: TextStyle(color: theme.text, fontSize: 14),
                                strong: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                              ),
                            ),
                            const SizedBox(height: 12),
                            if (isLoadingGuidance)
                              const Center(child: Padding(padding: EdgeInsets.all(8.0), child: CircularProgressIndicator(color: Colors.purpleAccent)))
                            else
                              Row(
                                children: [
                                  Expanded(
                                    child: TextField(
                                      controller: refineController,
                                      style: TextStyle(color: theme.text, fontSize: 12),
                                      decoration: InputDecoration(
                                        hintText: 'Refine instructions...',
                                        hintStyle: TextStyle(color: theme.textDim, fontSize: 12),
                                        filled: true,
                                        fillColor: Colors.black26,
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  IconButton(
                                    icon: const Icon(Icons.send, color: Colors.purpleAccent, size: 20),
                                    onPressed: () async {
                                      if (refineController.text.trim().isEmpty) return;
                                      final feedback = refineController.text.trim();
                                      setModalState(() { 
                                        isLoadingGuidance = true; 
                                        refineController.clear(); 
                                      });
                                      final newGuidance = await context.read<ApiService>().refineAiGuidance(task.id!, feedback);
                                      if (mounted) setModalState(() {
                                        if (newGuidance != null) {
                                          aiGuidance = newGuidance;
                                        }
                                        isLoadingGuidance = false;
                                      });
                                    },
                                  )
                                ],
                              )
                          ],
                        ),
                      ),
                    if (aiGuidance == null) ...[
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          icon: isLoadingGuidance 
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.purpleAccent)) 
                            : const Icon(Icons.auto_awesome, color: Colors.purpleAccent),
                          label: Text('Ask AI ✨', style: TextStyle(color: Colors.purple[200], fontWeight: FontWeight.bold)),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            side: BorderSide(color: Colors.purpleAccent.withOpacity(0.3)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                          onPressed: isLoadingGuidance ? null : () async {
                            setModalState(() => isLoadingGuidance = true);
                            final fetched = await context.read<ApiService>().getAiGuidance(task.id!);
                            if (mounted) setModalState(() {
                              if (fetched != null) aiGuidance = fetched;
                              isLoadingGuidance = false;
                            });
                          },
                        ),
                      ),
                      const SizedBox(height: 16),
                    ]
                  ],
                  Row(
                    children: [
                      Expanded(
                        flex: 3,
                        child: GestureDetector(
                          onTap: () async {
                            final date = await showDatePicker(
                              context: context,
                              initialDate: selectedDate,
                              firstDate: DateTime(2000),
                              lastDate: DateTime(2100),
                            );
                            if (date != null) {
                              setModalState(() {
                                selectedDate = DateTime(
                                  date.year, 
                                  date.month, 
                                  date.day, 
                                  selectedDate.hour, 
                                  selectedDate.minute
                                );
                              });
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                            decoration: BoxDecoration(color: theme.inputBg, borderRadius: BorderRadius.circular(16)),
                            child: Row(
                              children: [
                                Icon(Icons.calendar_today, color: theme.textDim, size: 20),
                                const SizedBox(width: 8),
                                Text(DateFormat('MMM d, y').format(selectedDate), style: TextStyle(color: theme.text, fontSize: 13)),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 2,
                        child: GestureDetector(
                          onTap: () async {
                            final time = await showTimePicker(
                              context: context,
                              initialTime: TimeOfDay.fromDateTime(selectedDate),
                            );
                            if (time != null) {
                              setModalState(() {
                                selectedDate = DateTime(
                                  selectedDate.year,
                                  selectedDate.month,
                                  selectedDate.day,
                                  time.hour,
                                  time.minute,
                                );
                              });
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                            decoration: BoxDecoration(color: theme.inputBg, borderRadius: BorderRadius.circular(16)),
                            child: Row(
                              children: [
                                Icon(Icons.access_time, color: theme.textDim, size: 20),
                                const SizedBox(width: 8),
                                Text(DateFormat('h:mm a').format(selectedDate), style: TextStyle(color: theme.text, fontSize: 13)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<int>(
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
                    isExpanded: true,
                    dropdownColor: theme.card,
                    style: TextStyle(color: theme.text, overflow: TextOverflow.ellipsis),
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
                  const SizedBox(height: 32),
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: isSaving ? null : () async {
                        if (titleController.text.trim().isEmpty) return;
                        setModalState(() => isSaving = true);
                        final api = context.read<ApiService>();
                        final now = DateTime.now();
                        final todayDate = DateTime(now.year, now.month, now.day);
                        final selectedDateOnly = DateTime(selectedDate.year, selectedDate.month, selectedDate.day);
                        
                        DateTime finalDate = selectedDate;
                        
                        // Smart logic: matches WebApp App.tsx
                        if (!isAiInput && selectedDateOnly.isAtSameMomentAs(todayDate)) {
                          // If it is today, manual entry, and time is midnight (default), use current time
                          if (selectedDate.hour == 0 && selectedDate.minute == 0) {
                            finalDate = now;
                          }
                        } else if (!isAiInput && selectedDate.hour == 0 && selectedDate.minute == 0) {
                          // Future date, manual entry, no time -> 5:30 AM (Start of Day)
                          finalDate = DateTime(selectedDate.year, selectedDate.month, selectedDate.day, 5, 30);
                        }

                        bool success;
                        if (isEditing) {
                          success = await api.updateTask(task.id!, title: titleController.text, description: descController.text, createdAt: finalDate, assigneeId: selectedAssignee);
                        } else {
                          success = await api.createTask(titleController.text, descController.text, finalDate, selectedAssignee);
                        }
                        if (success && mounted) {
                          Navigator.pop(context);
                        } else {
                          setModalState(() => isSaving = false);
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Failed to add mission. Please try again!'), backgroundColor: Colors.redAccent),
                            );
                          }
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: theme.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: isSaving
                          ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                          : Text(isEditing ? 'Update Task' : 'Launch Task', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
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
      final localDate = t.createdAt.toLocal();
      final taskDateOnly = DateTime(localDate.year, localDate.month, localDate.day);
      final isToday = taskDateOnly == today;
      final isPast = taskDateOnly.isBefore(today);
      final isFuture = taskDateOnly.isAfter(today);

      if (_listStatus == 'delegated') {
        if (!isDelegatedByMe) return false;
      } else {
        if (!isAssignedToMe) return false;

        if (_listStatus == 'future') {
          return isFuture && !t.isCompleted;
        }

        if (_listStatus == 'backlog') {
          return isPast && !t.isCompleted;
        }

        if (_listStatus == 'active') {
          if (t.isCompleted) return false;
          // Active = Today + Overdue/Backlog
          return isToday || isPast;
        }

        if (_listStatus == 'done' && !t.isCompleted) return false;
      }

      // Timeframe filters (Apply to whatever is left)
      if (_listTimeframe == 'today') {
        // Show Today + anything from the Past that is still Active/Backlog
        return isToday || isPast;
      } else if (_listTimeframe == '7d') {
        final diff = today.difference(taskDateOnly).inDays;
        return diff.abs() <= 7;
      } else if (_listTimeframe == '30d') {
        final diff = today.difference(taskDateOnly).inDays;
        return diff.abs() <= 30;
      }
      return true;
    }).toList()
    ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<ThemeProvider>().theme;
    final apiService = context.watch<ApiService>();
    final filteredTasks = _getFilteredTasks(apiService);

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: Text(
          _isSelectMode ? '${_selectedIds.length} selected' : 'Mission Board',
          style: TextStyle(fontWeight: FontWeight.w900, color: _isSelectMode ? Colors.redAccent : theme.text),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          if (_isSelectMode) ...[
            IconButton(
              icon: const Icon(Icons.delete_sweep_rounded, color: Colors.redAccent),
              tooltip: 'Delete selected',
              onPressed: _selectedIds.isEmpty ? null : () => _bulkDelete(context),
            ),
            IconButton(
              icon: const Icon(Icons.close),
              color: theme.textDim,
              onPressed: _toggleSelectMode,
            ),
          ] else ...[
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
          ]
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
            child: RefreshIndicator(
              onRefresh: () async {
                await apiService.fetchTasks();
                await apiService.fetchMembers();
              },
              color: theme.primary,
              child: apiService.isLoading
                  ? Center(child: CircularProgressIndicator(color: theme.primary))
                  : ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(16),
                    itemCount: filteredTasks.length,
                    itemBuilder: (context, index) {
                      final task = filteredTasks[index];
                      final bool isDone = task.isCompleted;
                      final bool isSelected = _selectedIds.contains(task.id);

                      return GestureDetector(
                        onLongPress: () {
                          if (!_isSelectMode) {
                            setState(() {
                              _isSelectMode = true;
                              _selectedIds.add(task.id!);
                            });
                          }
                        },
                        onTap: () {
                          if (_isSelectMode) {
                            _toggleSelection(task.id!);
                          } else {
                            _showTaskModal(context, task: task);
                          }
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? Colors.redAccent.withOpacity(0.08)
                                : isDone ? theme.divider.withOpacity(0.3) : theme.card,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isSelected
                                  ? Colors.redAccent.withOpacity(0.6)
                                  : isDone ? Colors.transparent : theme.divider,
                              width: isSelected ? 2 : 1,
                            ),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (_isSelectMode)
                                Padding(
                                  padding: const EdgeInsets.only(right: 12, top: 4),
                                  child: AnimatedContainer(
                                    duration: const Duration(milliseconds: 150),
                                    width: 24,
                                    height: 24,
                                    decoration: BoxDecoration(
                                      color: isSelected ? Colors.redAccent : Colors.transparent,
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(
                                        color: isSelected ? Colors.redAccent : theme.textDim,
                                        width: 2,
                                      ),
                                    ),
                                    child: isSelected
                                        ? const Icon(Icons.check, size: 16, color: Colors.white)
                                        : null,
                                  ),
                                )
                              else
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
                                          text: DateFormat('MMM d, h:mm a').format(task.createdAt.toLocal()),
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
                              if (!_isSelectMode)
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
          ),
        ],
      ),
      floatingActionButton: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          FloatingActionButton.extended(
            heroTag: 'ai_btn',
            onPressed: () => _showAiParseModal(context),
            backgroundColor: Colors.purpleAccent.withOpacity(0.2),
            elevation: 0,
            icon: const Icon(Icons.auto_awesome, color: Colors.purpleAccent),
            label: const Text('Add with AI', style: TextStyle(color: Colors.purpleAccent, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 16),
          FloatingActionButton(
            heroTag: 'add_btn',
            onPressed: () => _showTaskModal(context),
            backgroundColor: theme.primary,
            elevation: 8,
            child: const Icon(Icons.add, color: Colors.white, size: 28),
          ),
        ],
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
