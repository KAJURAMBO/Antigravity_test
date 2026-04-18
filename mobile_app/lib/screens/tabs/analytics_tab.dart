import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';
import '../../services/api_service.dart';
import '../../providers/theme_provider.dart';

class AnalyticsTab extends StatefulWidget {
  const AnalyticsTab({super.key});

  @override
  State<AnalyticsTab> createState() => _AnalyticsTabState();
}

class _AnalyticsTabState extends State<AnalyticsTab> {
  String _timeframe = '7d';

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<ThemeProvider>().theme;
    final apiService = context.watch<ApiService>();
    final allTasks = apiService.tasks;

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    
    final tasks = allTasks.where((t) {
      final taskDate = DateTime(t.createdAt.year, t.createdAt.month, t.createdAt.day);
      if (_timeframe == 'today') {
        return taskDate == today;
      } else if (_timeframe == '7d') {
        final diff = today.difference(taskDate).inDays;
        return diff >= 0 && diff <= 7;
      } else if (_timeframe == '30d') {
        final diff = today.difference(taskDate).inDays;
        return diff >= 0 && diff <= 30;
      }
      return false;
    }).toList();

    int totalTasks = tasks.length;
    int doneCount = tasks.where((t) => t.isCompleted).length;
    int activeCount = tasks.where((t) => !t.isCompleted && !DateTime(t.createdAt.year, t.createdAt.month, t.createdAt.day).isBefore(today) && !DateTime(t.createdAt.year, t.createdAt.month, t.createdAt.day).isAfter(today)).length;
    int backlogCount = allTasks.where((t) => !t.isCompleted && DateTime(t.createdAt.year, t.createdAt.month, t.createdAt.day).isBefore(today)).length;
    int futureCount = allTasks.where((t) => !t.isCompleted && DateTime(t.createdAt.year, t.createdAt.month, t.createdAt.day).isAfter(today)).length;

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: Text('Analytics Hub', style: TextStyle(fontWeight: FontWeight.w900, color: theme.text)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          DropdownButton<String>(
            value: _timeframe,
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
              if (val != null) setState(() => _timeframe = val);
            },
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => await apiService.fetchTasks(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStatCard('Total Tasks', totalTasks.toString(), Colors.blueAccent, theme, isFullWidth: true),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildStatCard('Done', doneCount.toString(), Colors.green, theme)),
                const SizedBox(width: 12),
                Expanded(child: _buildStatCard('Active', activeCount.toString(), Colors.orange, theme)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildStatCard('Backlog', backlogCount.toString(), Colors.redAccent, theme)),
                const SizedBox(width: 12),
                Expanded(child: _buildStatCard('Future', futureCount.toString(), Colors.cyan, theme)),
              ],
            ),
            const SizedBox(height: 32),
            Text('Completion Overview', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: theme.text)),
            const SizedBox(height: 24),
            Container(
              height: 320,
              padding: const EdgeInsets.fromLTRB(16, 32, 16, 16),
              decoration: BoxDecoration(color: theme.card, borderRadius: BorderRadius.circular(24), border: Border.all(color: theme.divider)),
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: (totalTasks == 0 ? 10 : totalTasks.toDouble() + 5),
                  barTouchData: BarTouchData(enabled: true),
                  titlesData: FlTitlesData(
                    show: true,
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 40,
                        getTitlesWidget: (value, meta) {
                          final style = TextStyle(color: theme.textDim, fontWeight: FontWeight.bold, fontSize: 10);
                          Widget text;
                          switch (value.toInt()) {
                            case 0:
                              text = Text('Active', style: style);
                              break;
                            case 1:
                              text = Text('Done', style: style);
                              break;
                            case 2:
                              text = Text('Backlog', style: style);
                              break;
                            case 3:
                              text = Text('Future', style: style);
                              break;
                            default:
                              text = const Text('');
                              break;
                          }
                          return SideTitleWidget(meta: meta, space: 12, child: text);
                        },
                      ),
                    ),
                    leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  gridData: FlGridData(show: false),
                  borderData: FlBorderData(show: false),
                  barGroups: [
                    BarChartGroupData(
                      x: 0,
                      barRods: [BarChartRodData(toY: activeCount.toDouble(), color: Colors.orange, width: 18, borderRadius: BorderRadius.circular(4))],
                    ),
                    BarChartGroupData(
                      x: 1,
                      barRods: [BarChartRodData(toY: doneCount.toDouble(), color: Colors.green, width: 18, borderRadius: BorderRadius.circular(4))],
                    ),
                    BarChartGroupData(
                      x: 2,
                      barRods: [BarChartRodData(toY: backlogCount.toDouble(), color: Colors.redAccent, width: 18, borderRadius: BorderRadius.circular(4))],
                    ),
                    BarChartGroupData(
                      x: 3,
                      barRods: [BarChartRodData(toY: futureCount.toDouble(), color: Colors.cyan, width: 18, borderRadius: BorderRadius.circular(4))],
                    ),
                  ],
                ),
                swapAnimationDuration: const Duration(milliseconds: 500),
                swapAnimationCurve: Curves.easeInOut,
              ),
            ),
          ],
        ),
      ),
    ),
  );
  }

  Widget _buildStatCard(String title, String value, Color color, AppThemeColors theme, {bool isFullWidth = false}) {
    return Container(
      width: isFullWidth ? double.infinity : null,
      padding: EdgeInsets.symmetric(vertical: isFullWidth ? 24 : 20),
      decoration: BoxDecoration(color: theme.card, borderRadius: BorderRadius.circular(16), border: Border.all(color: theme.divider)),
      child: Column(
        children: [
          Text(value, style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: color)),
          const SizedBox(height: 4),
          Text(title, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: theme.textDim)),
        ],
      ),
    );
  }
}
