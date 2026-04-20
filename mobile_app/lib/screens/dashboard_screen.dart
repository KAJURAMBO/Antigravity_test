import '../../providers/theme_provider.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import 'login_screen.dart';
import 'tabs/board_tab.dart';
import 'tabs/analytics_tab.dart';
import 'tabs/team_tab.dart';
import 'tabs/profile_tab.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;

  final List<Widget> _tabs = [
    BoardTab(),
    AnalyticsTab(),
    TeamTab(),
    ProfileTab(),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ApiService>().fetchTasks();
      context.read<ApiService>().fetchMembers();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<ThemeProvider>().theme;
    final apiService = context.watch<ApiService>();

    if (!apiService.isAuthenticated) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => LoginScreen()));
      });
      return SizedBox();
    }

    return Scaffold(
      backgroundColor: theme.background,
      body: IndexedStack(
        index: _currentIndex,
        children: _tabs,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: theme.text.withOpacity(0.1))),
        ),
        child: NavigationBar(
          selectedIndex: _currentIndex,
          onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
          backgroundColor: theme.background,
          indicatorColor: theme.primary.withOpacity(0.1),
          height: 65,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          destinations: [
            NavigationDestination(
              icon: Icon(Icons.dashboard_outlined, color: theme.textDim),
              selectedIcon: Icon(Icons.dashboard_rounded, color: theme.primary),
              label: 'Board',
            ),
            NavigationDestination(
              icon: Icon(Icons.bar_chart_outlined, color: theme.textDim),
              selectedIcon: Icon(Icons.bar_chart_rounded, color: theme.primary),
              label: 'Analytics',
            ),
            NavigationDestination(
              icon: Icon(Icons.people_outline_rounded, color: theme.textDim),
              selectedIcon: Icon(Icons.people_rounded, color: theme.primary),
              label: 'Team',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline_rounded, color: theme.textDim),
              selectedIcon: Icon(Icons.person_rounded, color: theme.primary),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}
