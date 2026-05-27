import 'package:flutter/material.dart';

class ProvidersPage extends StatelessWidget {
  const ProvidersPage({super.key});

  @override
  Widget build(BuildContext context) {
    final providers = const [
      ('Accra Quick Tow', 'Towing, jump start, battery assist', '4.8'),
      ('Kumasi Mobile Mechanics', 'Repairs, diagnostics, tyre support', '4.6'),
      ('Tema Road Rescue', 'Recovery, towing, roadside support', '4.7'),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Service Providers')),
      body: ListView.separated(
        padding: const EdgeInsets.all(20),
        itemCount: providers.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final provider = providers[index];
          return Card(
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: const CircleAvatar(
                backgroundColor: Color(0xFFFFE1CC),
                child: Icon(Icons.build, color: Color(0xFFFF6A00)),
              ),
              title: Text(provider.$1),
              subtitle: Text(provider.$2),
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.star, color: Colors.amber),
                  Text(provider.$3),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
