import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';
import '../../services/api_service.dart';
import '../../providers/theme_provider.dart';
import '../../models/task.model.dart';

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
      final isAssignedToMe = t.assigneeId == apiService.user?.id ||
          (t.assigneeId == null && t.userId == apiService.user?.id);
      if (!isAssignedToMe) return false;

      final targetDate = (t.dueDate ?? t.createdAt).toLocal();
      final taskDateOnly =
          DateTime(targetDate.year, targetDate.month, targetDate.day);

      if (_timeframe == 'today') {
        return taskDateOnly == today;
      } else if (_timeframe == '7d') {
        final diff = today.difference(taskDateOnly).inDays;
        return diff.abs() <= 7;
      } else if (_timeframe == '30d') {
        final diff = today.difference(taskDateOnly).inDays;
        return diff.abs() <= 30;
      }
      return true;
    }).toList();


    int doneCount = tasks.where((t) => t.isCompleted).length;
    int activeCount = tasks.where((t) {
      final targetDate = (t.dueDate ?? t.createdAt).toLocal();
      final taskDateOnly =
          DateTime(targetDate.year, targetDate.month, targetDate.day);
      return !t.isCompleted && taskDateOnly == today;
    }).length;
    int backlogCount = allTasks.where((t) {
      final isAssignedToMe = t.assigneeId == apiService.user?.id ||
          (t.assigneeId == null && t.userId == apiService.user?.id);
      if (!isAssignedToMe) return false;

      final targetDate = (t.dueDate ?? t.createdAt).toLocal();
      final taskDateOnly =
          DateTime(targetDate.year, targetDate.month, targetDate.day);
      return !t.isCompleted && taskDateOnly.isBefore(today);
    }).length;
    int futureCount = tasks.where((t) {
      final targetDate = (t.dueDate ?? t.createdAt).toLocal();
      final taskDateOnly =
          DateTime(targetDate.year, targetDate.month, targetDate.day);
      return !t.isCompleted && taskDateOnly.isAfter(today);
    }).length;

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: Text('Analytics Hub',
            style: TextStyle(fontWeight: FontWeight.w900, color: theme.text)),
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
              DropdownMenuItem(value: 'all', child: Text('Total')),
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
              Row(
                children: [
                  Expanded(
                      child: _buildStatCard(
                          'Done', doneCount.toString(), Colors.green, theme)),
                  const SizedBox(width: 12),
                  Expanded(
                      child: _buildStatCard('Active', activeCount.toString(),
                          Colors.orange, theme)),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                      child: _buildStatCard('Backlog', backlogCount.toString(),
                          Colors.redAccent, theme)),
                  const SizedBox(width: 12),
                  Expanded(
                      child: _buildStatCard('Future', futureCount.toString(),
                          Colors.cyan, theme)),
                ],
              ),
              const SizedBox(height: 32),
              Text('Completion Overview',
                  style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: theme.text)),
              const SizedBox(height: 24),
              Container(
                height: 320,
                padding: const EdgeInsets.fromLTRB(16, 32, 16, 16),
                decoration: BoxDecoration(
                    color: theme.card,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: theme.divider)),
                child: BarChart(
                  BarChartData(
                    alignment: BarChartAlignment.spaceAround,
                    maxY: ([doneCount, activeCount, backlogCount, futureCount].reduce((a, b) => a > b ? a : b) == 0
                        ? 10
                        : [doneCount, activeCount, backlogCount, futureCount].reduce((a, b) => a > b ? a : b).toDouble() + 5),
                    barTouchData: BarTouchData(enabled: true),
                    titlesData: FlTitlesData(
                      show: true,
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          reservedSize: 40,
                          getTitlesWidget: (value, meta) {
                            final style = TextStyle(
                                color: theme.textDim,
                                fontWeight: FontWeight.bold,
                                fontSize: 10);
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
                            return SideTitleWidget(
                                meta: meta, space: 12, child: text);
                          },
                        ),
                      ),
                      leftTitles:
                          AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      topTitles:
                          AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      rightTitles:
                          AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    ),
                    gridData: FlGridData(show: false),
                    borderData: FlBorderData(show: false),
                    barGroups: [
                      BarChartGroupData(
                        x: 0,
                        barRods: [
                          BarChartRodData(
                              toY: activeCount.toDouble(),
                              color: Colors.orange,
                              width: 18,
                              borderRadius: BorderRadius.circular(4))
                        ],
                      ),
                      BarChartGroupData(
                        x: 1,
                        barRods: [
                          BarChartRodData(
                              toY: doneCount.toDouble(),
                              color: Colors.green,
                              width: 18,
                              borderRadius: BorderRadius.circular(4))
                        ],
                      ),
                      BarChartGroupData(
                        x: 2,
                        barRods: [
                          BarChartRodData(
                              toY: backlogCount.toDouble(),
                              color: Colors.redAccent,
                              width: 18,
                              borderRadius: BorderRadius.circular(4))
                        ],
                      ),
                      BarChartGroupData(
                        x: 3,
                        barRods: [
                          BarChartRodData(
                              toY: futureCount.toDouble(),
                              color: Colors.cyan,
                              width: 18,
                              borderRadius: BorderRadius.circular(4))
                        ],
                      ),
                    ],
                  ),
                  swapAnimationDuration: const Duration(milliseconds: 500),
                  swapAnimationCurve: Curves.easeInOut,
                ),
              ),
              const SizedBox(height: 24),
              Text('Activity Trend',
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: theme.text)),
              const SizedBox(height: 16),
              _buildLegend(theme),
              const SizedBox(height: 16),
              Container(
                height: 200,
                padding: const EdgeInsets.fromLTRB(16, 24, 24, 8),
                decoration: BoxDecoration(
                    color: theme.card,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: theme.divider)),
                child: LineChart(
                  LineChartData(
                    minY: 0,
                    gridData: FlGridData(
                        show: true,
                        drawVerticalLine: false,
                        getDrawingHorizontalLine: (val) =>
                            FlLine(color: theme.divider, strokeWidth: 1)),
                    titlesData: FlTitlesData(
                      show: true,
                      topTitles:
                          AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      rightTitles:
                          AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      leftTitles: AxisTitles(
                          sideTitles: SideTitles(
                              showTitles: true,
                              reservedSize: 30,
                              getTitlesWidget: (val, meta) => SideTitleWidget(
                                  meta: meta,
                                  child: Text(val.toInt().toString(),
                                      style: TextStyle(
                                          color: theme.textDim,
                                          fontSize: 10))))),
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          getTitlesWidget: (val, meta) {
                            if (val != val.toInt().toDouble()) return const SizedBox();

                            if (_timeframe == 'today' || _timeframe == '7d') {
                              final days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
                              final now = DateTime.now();
                              final pointDate = now.subtract(Duration(days: 6 - val.toInt()));
                              if (val.toInt() < 0 || val.toInt() > 6) return const SizedBox();
                              final dayIdx = (pointDate.weekday - 1) % 7;
                              return SideTitleWidget(
                                meta: meta,
                                child: Text('${days[dayIdx]} ${pointDate.day}',
                                    style: TextStyle(
                                        color: theme.textDim, fontSize: 9)),
                              );
                            } else if (_timeframe == '30d') {
                              if (val.toInt() % 5 == 0) {
                                final now = DateTime.now();
                                final pointDate = now.subtract(Duration(days: 29 - val.toInt()));
                                if (val.toInt() < 0 || val.toInt() > 29) return const SizedBox();
                                return SideTitleWidget(
                                  meta: meta,
                                  child: Text('${pointDate.day}/${pointDate.month}',
                                      style: TextStyle(
                                          color: theme.textDim, fontSize: 8)),
                                );
                              }
                              return const SizedBox();
                            } else {
                              // all-time Month labels
                              final now = DateTime.now();
                              final today = DateTime(now.year, now.month, now.day);
                              DateTime earliest = today;
                              for (var t in tasks) {
                                final tOrig = (t.dueDate ?? t.createdAt).toLocal();
                                if (tOrig.isBefore(earliest)) earliest = tOrig;
                              }
                              DateTime current = DateTime(earliest.year, earliest.month, 1);
                              final List<DateTime> monthDates = [];
                              while (!current.isAfter(today)) {
                                monthDates.add(current);
                                current = DateTime(current.year, current.month + 1, 1);
                              }
                              final idx = val.toInt();
                              if (idx >= 0 && idx < monthDates.length) {
                                final date = monthDates[idx];
                                final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                return SideTitleWidget(
                                  meta: meta,
                                  child: Text(months[date.month - 1],
                                      style: TextStyle(color: theme.textDim, fontSize: 8)),
                                );
                              }
                              return const SizedBox();
                            }
                          },
                        ),
                      ),
                    ),
                    borderData: FlBorderData(show: false),
                    lineBarsData: _buildTrendLineData(tasks, theme),
                  ),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLegend(AppThemeColors theme) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _legendItem('Done', const Color(0xFF22C55E)),
        const SizedBox(width: 16),
        _legendItem('Active', const Color(0xFFD946EF)),
        const SizedBox(width: 16),
        _legendItem('Backlog', const Color(0xFFEF4444)),
      ],
    );
  }

  Widget _legendItem(String label, Color color) {
    return Row(
      children: [
        Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text(label,
            style: const TextStyle(
                fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
      ],
    );
  }

  List<LineChartBarData> _buildTrendLineData(
      List<TaskModel> tasks, AppThemeColors theme) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    final List<FlSpot> doneSpots = [];
    final List<FlSpot> activeSpots = [];
    final List<FlSpot> backlogSpots = [];

    if (_timeframe == 'all') {
      if (tasks.isEmpty) {
        doneSpots.add(const FlSpot(0, 0));
        activeSpots.add(const FlSpot(0, 0));
        backlogSpots.add(const FlSpot(0, 0));
      } else {
        DateTime earliest = today;
        for (var t in tasks) {
          final tOrig = (t.dueDate ?? t.createdAt).toLocal();
          if (tOrig.isBefore(earliest)) earliest = tOrig;
        }
        
        int spotX = 0;
        DateTime current = DateTime(earliest.year, earliest.month, 1);
        while (!current.isAfter(today)) {
          int doneCount = 0;
          int activeCount = 0;
          int backlogCount = 0;

          for (var t in tasks) {
            final tOrig = (t.dueDate ?? t.createdAt).toLocal();
            if (tOrig.year == current.year && tOrig.month == current.month) {
              if (t.isCompleted) {
                doneCount++;
              } else {
                if (!tOrig.isBefore(today)) {
                  activeCount++;
                } else {
                  backlogCount++;
                }
              }
            }
          }

          doneSpots.add(FlSpot(spotX.toDouble(), doneCount.toDouble()));
          activeSpots.add(FlSpot(spotX.toDouble(), activeCount.toDouble()));
          backlogSpots.add(FlSpot(spotX.toDouble(), backlogCount.toDouble()));
          
          spotX++;
          current = DateTime(current.year, current.month + 1, 1);
        }
      }
    } else {
      final daysCount = (_timeframe == 'today' || _timeframe == '7d') ? 7 : 30;
      for (int i = daysCount - 1; i >= 0; i--) {
        final date = today.subtract(Duration(days: i));

        int doneCount = 0;
        int activeCount = 0;
        int backlogCount = 0;

        for (var t in tasks) {
          final tOrig = (t.dueDate ?? t.createdAt).toLocal();
          final tDate = DateTime(tOrig.year, tOrig.month, tOrig.day);
          if (tDate == date) {
            if (t.isCompleted) {
              doneCount++;
            } else {
              if (!tDate.isBefore(today)) {
                activeCount++;
              } else {
                backlogCount++;
              }
            }
          }
        }

        final spotX = (daysCount - 1 - i).toDouble();
        doneSpots.add(FlSpot(spotX, doneCount.toDouble()));
        activeSpots.add(FlSpot(spotX, activeCount.toDouble()));
        backlogSpots.add(FlSpot(spotX, backlogCount.toDouble()));
      }
    }

    return [
      _lineData(doneSpots, const Color(0xFF22C55E)),
      _lineData(activeSpots, const Color(0xFFD946EF)),
      _lineData(backlogSpots, const Color(0xFFEF4444)),
    ];
  }

  LineChartBarData _lineData(List<FlSpot> spots, Color color) {
    return LineChartBarData(
      spots: spots,
      isCurved: true,
      preventCurveOverShooting: true,
      color: color,
      barWidth: 3,
      isStrokeCapRound: true,
      dotData: FlDotData(
          show: true,
          getDotPainter: (spot, percent, barData, index) => FlDotCirclePainter(
              radius: 3,
              color: color,
              strokeWidth: 1,
              strokeColor: Colors.white)),
      belowBarData: BarAreaData(
        show: true,
        gradient: LinearGradient(
          colors: [color.withOpacity(0.3), color.withOpacity(0.0)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
    );
  }

  Widget _buildStatCard(
      String title, String value, Color color, AppThemeColors theme,
      {bool isFullWidth = false}) {
    return Container(
      width: isFullWidth ? double.infinity : null,
      padding: EdgeInsets.symmetric(vertical: isFullWidth ? 24 : 20),
      decoration: BoxDecoration(
          color: theme.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: theme.divider)),
      child: Column(
        children: [
          Text(value,
              style: TextStyle(
                  fontSize: 32, fontWeight: FontWeight.w900, color: color)),
          const SizedBox(height: 4),
          Text(title,
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: theme.textDim)),
        ],
      ),
    );
  }
}
