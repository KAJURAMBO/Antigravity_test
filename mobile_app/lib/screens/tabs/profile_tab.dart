import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../../services/api_service.dart';
import '../../providers/theme_provider.dart';
import 'package:url_launcher/url_launcher.dart';

class ProfileTab extends StatefulWidget {
  const ProfileTab({super.key});

  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  void _showEditProfileModal(BuildContext context, String currentName, String currentBio) {
    final theme = context.read<ThemeProvider>().theme;
    final nameController = TextEditingController(text: currentName);
    final bioController = TextEditingController(text: currentBio);
    bool saving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: theme.background,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(30))),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
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
                      Text('Edit Profile Data', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: theme.text)),
                      IconButton(
                        icon: Icon(Icons.close, color: theme.textDim),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Center(
                    child: Stack(
                      children: [
                        CircleAvatar(
                          radius: 50,
                          backgroundColor: theme.primary.withOpacity(0.1),
                          backgroundImage: context.watch<ApiService>().user?.picture != null 
                              ? NetworkImage(context.watch<ApiService>().user!.picture!) 
                              : null,
                          child: context.watch<ApiService>().user?.picture == null
                              ? Icon(Icons.person, size: 50, color: theme.primary)
                              : null,
                        ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: GestureDetector(
                            onTap: () async {
                              final picker = ImagePicker();
                              final image = await picker.pickImage(source: ImageSource.gallery);
                              if (image != null) {
                                await context.read<ApiService>().uploadProfileImage(image.path);
                                setModalState(() {});
                              }
                            },
                            child: CircleAvatar(
                              radius: 18,
                              backgroundColor: theme.primary,
                              child: const Icon(Icons.camera_alt, size: 18, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                TextField(
                  controller: nameController,
                  autofocus: true,
                  style: TextStyle(color: theme.text),
                  decoration: InputDecoration(
                    labelText: 'Display Name',
                    labelStyle: TextStyle(color: theme.textDim),
                    filled: true,
                    fillColor: theme.inputBg,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: bioController,
                  maxLines: 3,
                  style: TextStyle(color: theme.text),
                  decoration: InputDecoration(
                    labelText: 'Biography (Optional)',
                    labelStyle: TextStyle(color: theme.textDim),
                    filled: true,
                    fillColor: theme.inputBg,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: saving
                        ? null
                        : () async {
                            setModalState(() => saving = true);
                            final success = await context.read<ApiService>().updateProfile(nameController.text, bioController.text);
                            if (success && mounted) Navigator.pop(context);
                            setModalState(() => saving = false);
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: theme.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: saving
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('Save Profile', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
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

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    final theme = themeProvider.theme;
    final apiService = context.watch<ApiService>();
    final user = apiService.user;

    if (user == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: Text('Profile Settings', style: TextStyle(fontWeight: FontWeight.w900, color: theme.text)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.redAccent),
            onPressed: () => apiService.logout(),
          )
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => await apiService.fetchUserProfile(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            CircleAvatar(
              radius: 60,
              backgroundColor: Colors.indigoAccent.withOpacity(0.2),
              backgroundImage: user.picture != null ? NetworkImage(user.picture!) : null,
              child: user.picture == null
                  ? Text((user.fullName ?? user.email).substring(0, 1).toUpperCase(),
                      style: const TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: Colors.indigoAccent))
                  : null,
            ),
            const SizedBox(height: 24),
            Text(user.fullName ?? 'No Name', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: theme.text)),
            const SizedBox(height: 4),
            Text(user.email, style: TextStyle(fontSize: 16, color: theme.textDim)),
            const SizedBox(height: 32),
            _buildField('Display Name', user.fullName ?? 'Not set', theme),
            const SizedBox(height: 16),
            _buildField('Biography', user.bio ?? 'No biography written.', theme),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: theme.card,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: theme.divider),
              ),
              child: SwitchListTile(
                title: Text('Dark Mode', style: TextStyle(fontWeight: FontWeight.bold, color: theme.text)),
                value: themeProvider.isDark,
                onChanged: (val) => themeProvider.toggleTheme(),
                activeColor: theme.primary,
                contentPadding: EdgeInsets.zero,
              ),
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.card,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: theme.divider),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('APP AVAILABILITY', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: theme.textDim)),
                  const SizedBox(height: 8),
                  InkWell(
                    onTap: () async {
                      final url = Uri.parse('https://tt1r9jdm.status.cron-job.org/');
                      if (await canLaunchUrl(url)) {
                        await launchUrl(url, mode: LaunchMode.externalApplication);
                      }
                    },
                    child: Row(
                      children: [
                        const Icon(Icons.bar_chart, color: Colors.green, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'https://tt1r9jdm.status.cron-job.org/',
                            style: TextStyle(fontSize: 14, color: theme.primary, decoration: TextDecoration.underline),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton.icon(
                onPressed: () => _showEditProfileModal(context, user.fullName ?? '', user.bio ?? ''),
                icon: Icon(Icons.edit, color: themeProvider.isDark ? Colors.white : Colors.white),
                label: Text('Edit Profile Data', style: TextStyle(color: themeProvider.isDark ? Colors.white : Colors.white, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: theme.primary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
            )
          ],
        ),
      ),
    ),
  );
  }

  Widget _buildField(String label, String value, AppThemeColors theme) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label.toUpperCase(), style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: theme.textDim)),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(fontSize: 16, color: theme.text)),
        ],
      ),
    );
  }
}
