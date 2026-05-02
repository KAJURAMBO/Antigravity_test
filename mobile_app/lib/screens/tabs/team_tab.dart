import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_service.dart';
import '../../providers/theme_provider.dart';

class TeamTab extends StatefulWidget {
  const TeamTab({super.key});

  @override
  State<TeamTab> createState() => _TeamTabState();
}

class _TeamTabState extends State<TeamTab> {
  final _emailController = TextEditingController();
  bool _inviting = false;

  void _handleInvite(BuildContext context) async {
    if (_emailController.text.isEmpty) return;
    setState(() => _inviting = true);
    final success = await context.read<ApiService>().inviteMember(_emailController.text);
    setState(() => _inviting = false);
    if (success && mounted) {
      _emailController.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Invite Sent! 🚀'),
          action: SnackBarAction(label: 'DISMISS', onPressed: () {}),
        ),
      );
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Failed to invite. Check email?'),
            action: SnackBarAction(label: 'DISMISS', onPressed: () {}),
          ),
        );
      }
    }
  }

  void _handleRemove(BuildContext context, int userId, String name) async {
    final theme = context.read<ThemeProvider>().theme;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: theme.card,
        title: Text('Remove Member?', style: TextStyle(color: theme.text)),
        content: Text('Are you sure you want to remove $name from your squad?', style: TextStyle(color: theme.textDim)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Remove', style: TextStyle(color: Colors.redAccent)),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final success = await context.read<ApiService>().removeMember(userId);
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$name removed from squad.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<ThemeProvider>().theme;
    final apiService = context.watch<ApiService>();
    final members = apiService.members;
    final user = apiService.user;

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: Text('Team Hub', style: TextStyle(fontWeight: FontWeight.w900, color: theme.text)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: theme.card, borderRadius: BorderRadius.circular(20), border: Border.all(color: theme.divider)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Invite Agent', style: TextStyle(fontWeight: FontWeight.bold, color: theme.text, fontSize: 18)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _emailController,
                          style: TextStyle(color: theme.text),
                          decoration: InputDecoration(
                            hintText: 'colleague@example.com',
                            hintStyle: TextStyle(color: theme.textDim),
                            filled: true,
                            fillColor: theme.inputBg,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      ElevatedButton(
                        onPressed: _inviting ? null : () => _handleInvite(context),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: theme.primary,
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: _inviting
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : const Text('Invite', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                      )
                    ],
                  ),
                ],
              ),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async => await context.read<ApiService>().fetchMembers(),
              color: theme.primary,
              child: members.isEmpty
                  ? Stack(
                      children: [
                        ListView(physics: const AlwaysScrollableScrollPhysics()),
                        Center(child: Text("No team members found.", style: TextStyle(color: theme.textDim))),
                      ],
                    )
                  : ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: members.length,
                    itemBuilder: (context, index) {
                      final member = members[index];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: theme.card,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: theme.divider),
                        ),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: Colors.blueAccent.withOpacity(0.2),
                            backgroundImage: member.picture != null ? NetworkImage(member.picture!) : null,
                            child: member.picture == null
                                ? Text((member.fullName ?? member.email).substring(0, 1).toUpperCase(),
                                    style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blueAccent))
                                : null,
                          ),
                          title: Row(
                            children: [
                              Flexible(
                                child: Text(
                                  member.fullName ?? 'Unknown',
                                  style: TextStyle(fontWeight: FontWeight.bold, color: theme.text),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (member.id == user?.id)
                                Padding(
                                  padding: const EdgeInsets.only(left: 8.0),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(color: theme.primary.withOpacity(0.2), borderRadius: BorderRadius.circular(6)),
                                    child: Text('YOU', style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: theme.primary)),
                                  ),
                                ),
                            ],
                          ),
                          subtitle: Text(member.email, style: TextStyle(color: theme.textDim, fontSize: 12)),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(color: theme.divider, borderRadius: BorderRadius.circular(12)),
                                child: Text(member.role.toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: theme.text)),
                              ),
                              if (member.canRemove)
                                IconButton(
                                  icon: const Icon(Icons.person_remove_rounded, color: Colors.redAccent, size: 20),
                                  onPressed: () => _handleRemove(context, member.id, member.fullName ?? member.email),
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
    );
  }
}
