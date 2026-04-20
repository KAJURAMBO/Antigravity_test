import '../../providers/theme_provider.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter/foundation.dart'; // For kReleaseMode
import '../services/api_service.dart';
import 'dashboard_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<ThemeProvider>().theme;
    final apiService = context.watch<ApiService>();

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: theme.isDark 
              ? [const Color(0xFF0F2027), const Color(0xFF203A43), const Color(0xFF2C5364)]
              : [const Color(0xFFFFFFFF), const Color(0xFFF3F4F7)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 32.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // App Logo / Icon
                  Hero(
                    tag: 'app_logo',
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: theme.primary.withOpacity(0.1),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: theme.primary.withOpacity(0.2),
                            blurRadius: 40,
                            spreadRadius: 5,
                          )
                        ],
                      ),
                      child: Icon(Icons.check_circle_rounded,
                          size: 80, color: theme.primary),
                    ),
                  ),
                  const SizedBox(height: 48),
                  
                  // Welcome Text
                  Text(
                    'AI-Smart Todo',
                    style: TextStyle(
                      fontSize: 38, 
                      fontWeight: FontWeight.w900, 
                      color: theme.text,
                      letterSpacing: -1,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Conquer every task with confidence',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14, 
                      color: theme.textDim, 
                      fontWeight: FontWeight.w500,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 64),

                  // Google Sign In (Primary for Release)
                  SizedBox(
                    width: double.infinity,
                    height: 58,
                    child: ElevatedButton.icon(
                      onPressed: apiService.isLoading
                          ? null
                          : () async {
                              final success = await apiService.loginWithGoogle();
                              if (success && mounted) {
                                Navigator.pushReplacement(
                                  context,
                                  MaterialPageRoute(builder: (context) => const DashboardScreen()),
                                );
                              } else if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Google Sign-In failed. Check configuration!')),
                                );
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: theme.isDark ? Colors.white : Colors.black,
                        foregroundColor: theme.isDark ? Colors.black : Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      ),
                      icon: apiService.isLoading 
                        ? const SizedBox()
                        : SizedBox(
                            height: 24,
                            width: 24,
                            child: Image.network(
                              'https://www.gstatic.com/images/branding/product/2x/googleg_64dp.png',
                            ),
                          ),
                      label: apiService.isLoading 
                        ? const CircularProgressIndicator(strokeWidth: 2)
                        : const Text('Continue with Google', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  ),

                  // Dev-only / Debug Login Methods
                  if (!kReleaseMode) ...[
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(child: Divider(color: theme.divider.withOpacity(0.5))),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Text('DEVELOPER ENTRY', style: TextStyle(color: theme.textDim, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1)),
                        ),
                        Expanded(child: Divider(color: theme.divider.withOpacity(0.5))),
                      ],
                    ),
                    const SizedBox(height: 24),
                    TextField(
                      controller: _usernameController,
                      style: TextStyle(color: theme.text),
                      decoration: InputDecoration(
                        hintText: 'Dev Username',
                        hintStyle: TextStyle(color: theme.textDim),
                        prefixIcon: Icon(Icons.code, color: theme.primary),
                        filled: true,
                        fillColor: theme.card.withOpacity(0.5),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide.none,
                        ),
                      ),
                      onSubmitted: (val) async {
                         if (val.isNotEmpty) {
                            await apiService.login(val);
                            if (mounted) Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const DashboardScreen()));
                         }
                      },
                    ),
                  ],

                  const SizedBox(height: 48),
                  // Footer
                  Text(
                    'By continuing, you agree to our Terms of Service',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 11, color: theme.textDim),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
