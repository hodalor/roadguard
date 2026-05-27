import 'package:flutter/material.dart';

import '../../services/mvp_api_service.dart';

const List<EmergencyGuideRecord> _offlineGuides = [
  EmergencyGuideRecord(
    id: 'offline-1',
    contentCode: 'OFF-001',
    title: 'Accident First Response',
    category: 'Accident',
    content:
        '1. Move to safety if possible.\n2. Call emergency services immediately.\n3. Do not move injured people unless there is immediate danger.\n4. Share your exact location and visible landmarks.\n5. Keep the phone available for follow-up instructions.',
    version: '1.0.0',
    language: 'English',
    publishStatus: 'offline',
    updatedAt: 'Offline fallback',
    notes: 'Built-in emergency guidance.',
  ),
  EmergencyGuideRecord(
    id: 'offline-2',
    contentCode: 'OFF-002',
    title: 'Vehicle Breakdown Checklist',
    category: 'Breakdown',
    content:
        '1. Park safely off the road.\n2. Turn on hazard lights.\n3. Place a warning triangle if available.\n4. Stay visible and avoid standing in traffic lanes.\n5. Use RoadGuide to request the right service provider.',
    version: '1.0.0',
    language: 'English',
    publishStatus: 'offline',
    updatedAt: 'Offline fallback',
    notes: 'Built-in emergency guidance.',
  ),
  EmergencyGuideRecord(
    id: 'offline-3',
    contentCode: 'OFF-003',
    title: 'Basic First Aid Reminders',
    category: 'First Aid',
    content:
        '1. Check for danger before helping.\n2. Call for help early.\n3. Control bleeding with firm pressure.\n4. Keep injured persons calm and warm.\n5. Do not give food or drink to an unconscious person.',
    version: '1.0.0',
    language: 'English',
    publishStatus: 'offline',
    updatedAt: 'Offline fallback',
    notes: 'Built-in emergency guidance.',
  ),
];

class EmergencyGuidesPage extends StatefulWidget {
  const EmergencyGuidesPage({super.key});

  @override
  State<EmergencyGuidesPage> createState() => _EmergencyGuidesPageState();
}

class _EmergencyGuidesPageState extends State<EmergencyGuidesPage> {
  final _apiService = MvpApiService();

  List<EmergencyGuideRecord> _guides = _offlineGuides;
  bool _isLoading = true;
  String? _notice;

  @override
  void initState() {
    super.initState();
    _loadGuides();
  }

  Future<void> _loadGuides({bool notifyOnError = false}) async {
    setState(() {
      _isLoading = true;
      _notice = null;
    });

    try {
      final guides = await _apiService.fetchEmergencyGuides();
      if (!mounted) {
        return;
      }

      setState(() {
        _guides = guides.isEmpty ? _offlineGuides : guides;
        _notice = guides.isEmpty
            ? 'No published guides found on the server. Showing offline guides.'
            : null;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      final message =
          'Unable to reach the guide service. Showing offline emergency information instead.';
      setState(() {
        _guides = _offlineGuides;
        _notice = message;
      });

      if (notifyOnError) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Emergency Guides')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'Offline emergency information',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          const Text(
            'These guides stay useful when the network is weak. Published admin guides load first, and the app falls back to built-in emergency guidance when needed.',
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Available Guides',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
              ),
              TextButton.icon(
                onPressed: _isLoading ? null : () => _loadGuides(notifyOnError: true),
                icon: const Icon(Icons.refresh),
                label: const Text('Refresh'),
              ),
            ],
          ),
          if (_notice != null) ...[
            const SizedBox(height: 8),
            Text(
              _notice!,
              style: TextStyle(
                color: Colors.orange.shade800,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
          const SizedBox(height: 8),
          if (_isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(20),
                child: CircularProgressIndicator(),
              ),
            )
          else
            ..._guides.map(
              (guide) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Card(
                  child: ExpansionTile(
                    title: Text(
                      guide.title,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    subtitle: Text('${guide.category} • ${guide.language}'),
                    childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    expandedCrossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(guide.content),
                      const SizedBox(height: 12),
                      Text(
                        'Version: ${guide.version} • Updated: ${guide.updatedAt}',
                        style: TextStyle(color: Colors.grey.shade700),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
