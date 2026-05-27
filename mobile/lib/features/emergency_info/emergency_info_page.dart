import 'package:flutter/material.dart';

class EmergencyInfoPage extends StatelessWidget {
  const EmergencyInfoPage({super.key});

  @override
  Widget build(BuildContext context) {
    final items = const [
      ('First Aid Basics', 'Keep the victim safe, call for help, and provide immediate support.'),
      ('Accident Steps', 'Switch on hazard lights, move to safety, and document the scene.'),
      ('Breakdown Checklist', 'Park off-road, use a warning triangle, and contact support.'),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Emergency Information')),
      body: ListView.separated(
        padding: const EdgeInsets.all(20),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final item = items[index];
          return Card(
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              title: Text(item.$1),
              subtitle: Text(item.$2),
            ),
          );
        },
      ),
    );
  }
}
