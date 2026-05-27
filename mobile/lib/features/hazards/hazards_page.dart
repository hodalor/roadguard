import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../services/mvp_api_service.dart';

class HazardsPage extends StatefulWidget {
  const HazardsPage({
    super.key,
    this.motoristProfile,
    this.providerProfile,
  });

  final MotoristRecord? motoristProfile;
  final ProviderRecord? providerProfile;

  @override
  State<HazardsPage> createState() => _HazardsPageState();
}

class _HazardsPageState extends State<HazardsPage> {
  final _apiService = MvpApiService();
  final _imagePicker = ImagePicker();
  final _hazardTypeController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _locationController = TextEditingController();

  List<HazardRecord> _hazards = const [];
  bool _isLoading = true;
  bool _isSubmitting = false;
  bool _isFetchingLocation = false;
  String? _error;
  String _severity = 'medium';
  String? _photoData;
  String? _locationMapUrl;
  double? _latitude;
  double? _longitude;

  @override
  void initState() {
    super.initState();
    _loadHazards();
  }

  @override
  void dispose() {
    _hazardTypeController.dispose();
    _descriptionController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _loadHazards({bool notifyOnError = false}) async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final hazards = await _apiService.fetchHazards();
      if (!mounted) {
        return;
      }

      setState(() {
        _hazards = hazards;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
      });

      if (notifyOnError) {
        _showMessage(_error!);
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _reportHazard() async {
    final hazardType = _hazardTypeController.text.trim();
    final description = _descriptionController.text.trim();
    final locationLabel = _locationController.text.trim();

    if (hazardType.isEmpty || locationLabel.isEmpty) {
      _showMessage('Hazard type and location are required.');
      return;
    }

    final requesterType = widget.providerProfile != null ? 'provider' : 'motorist';
    final reporterName = widget.providerProfile?.businessName ??
        widget.motoristProfile?.fullName ??
        'RoadGuide user';

    setState(() {
      _isSubmitting = true;
    });

    try {
      await _apiService.reportHazard(
        HazardPayload(
          requesterType: requesterType,
          userId: widget.motoristProfile?.id,
          providerId: widget.providerProfile?.id,
          reporterName: reporterName,
          hazardType: hazardType,
          severity: _severity,
          description: description,
          locationLabel: locationLabel,
          locationMapUrl: _locationMapUrl,
          photoData: _photoData,
          latitude: _latitude,
          longitude: _longitude,
        ),
      );

      if (!mounted) {
        return;
      }

      _hazardTypeController.clear();
      _descriptionController.clear();
      _locationController.clear();
      setState(() {
        _severity = 'medium';
        _photoData = null;
        _locationMapUrl = null;
        _latitude = null;
        _longitude = null;
      });

      await _loadHazards();
      _showMessage('Hazard report sent for review.');
    } catch (error) {
      if (mounted) {
        _showMessage(error.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  Future<void> _pickPhoto() async {
    try {
      final image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 60,
        maxWidth: 1280,
      );

      if (image == null) {
        return;
      }

      final bytes = await image.readAsBytes();
      final extension = image.name.toLowerCase();
      final mime = extension.endsWith('.png') ? 'image/png' : 'image/jpeg';
      setState(() {
        _photoData = 'data:$mime;base64,${base64Encode(bytes)}';
      });
    } catch (_) {
      _showMessage('Unable to pick a hazard photo.');
    }
  }

  Future<void> _fetchLocation() async {
    setState(() {
      _isFetchingLocation = true;
    });

    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        _showMessage('Location permission is required to fetch the hazard location.');
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      final label = await _reverseGeocode(position.latitude, position.longitude);
      final mapUrl =
          'https://www.google.com/maps/search/?api=1&query=${position.latitude},${position.longitude}';

      if (!mounted) {
        return;
      }

      setState(() {
        _latitude = position.latitude;
        _longitude = position.longitude;
        _locationMapUrl = mapUrl;
        _locationController.text = label;
      });
    } catch (_) {
      if (mounted) {
        _showMessage('Unable to fetch the current hazard location.');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isFetchingLocation = false;
        });
      }
    }
  }

  Future<String> _reverseGeocode(double latitude, double longitude) async {
    try {
      final response = await http.get(
        Uri.https('nominatim.openstreetmap.org', '/reverse', {
          'format': 'jsonv2',
          'lat': '$latitude',
          'lon': '$longitude',
          'addressdetails': '1',
        }),
        headers: {
          'User-Agent': 'RoadGuide-Ghana-App',
        },
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        return '${latitude.toStringAsFixed(6)}, ${longitude.toStringAsFixed(6)}';
      }

      final decoded = jsonDecode(response.body);
      if (decoded is! Map<String, dynamic>) {
        return '${latitude.toStringAsFixed(6)}, ${longitude.toStringAsFixed(6)}';
      }

      return (decoded['display_name'] ?? '').toString().trim().isNotEmpty
          ? (decoded['display_name'] as String).trim()
          : '${latitude.toStringAsFixed(6)}, ${longitude.toStringAsFixed(6)}';
    } catch (_) {
      return '${latitude.toStringAsFixed(6)}, ${longitude.toStringAsFixed(6)}';
    }
  }

  Future<void> _openMap(String mapUrl) async {
    final uri = Uri.tryParse(mapUrl);
    if (uri == null) {
      _showMessage('Map link is invalid.');
      return;
    }

    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && mounted) {
      _showMessage('Unable to open Google Maps.');
    }
  }

  Uint8List? _decodeImage(String? dataUrl) {
    if (dataUrl == null || dataUrl.isEmpty) {
      return null;
    }

    try {
      final parts = dataUrl.split(',');
      return base64Decode(parts.length > 1 ? parts.last : dataUrl);
    } catch (_) {
      return null;
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Hazard Reports')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'Community hazard reporting',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          const Text(
            'Report flooded roads, potholes, stalled vehicles, accidents, and other road hazards for moderation and nearby motorists.',
          ),
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  TextField(
                    controller: _hazardTypeController,
                    decoration: const InputDecoration(labelText: 'Hazard type'),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: _severity,
                    items: const [
                      DropdownMenuItem(value: 'low', child: Text('Low')),
                      DropdownMenuItem(value: 'medium', child: Text('Medium')),
                      DropdownMenuItem(value: 'high', child: Text('High')),
                    ],
                    onChanged: (value) {
                      if (value == null) {
                        return;
                      }
                      setState(() {
                        _severity = value;
                      });
                    },
                    decoration: const InputDecoration(labelText: 'Severity'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _locationController,
                    decoration: const InputDecoration(
                      labelText: 'Hazard location',
                      hintText: 'Accra, Newtown, Nii Street',
                    ),
                  ),
                  const SizedBox(height: 12),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Wrap(
                      spacing: 12,
                      runSpacing: 8,
                      children: [
                        OutlinedButton.icon(
                          onPressed: _isFetchingLocation ? null : _fetchLocation,
                          icon: const Icon(Icons.my_location_outlined),
                          label: Text(_isFetchingLocation ? 'Fetching...' : 'Fetch location'),
                        ),
                        if ((_locationMapUrl ?? '').isNotEmpty)
                          TextButton(
                            onPressed: () => _openMap(_locationMapUrl!),
                            child: const Text('Open map'),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _descriptionController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Description',
                      hintText: 'Add details about the hazard and traffic impact',
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (_decodeImage(_photoData) != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.memory(
                        _decodeImage(_photoData)!,
                        height: 120,
                        width: 120,
                        fit: BoxFit.cover,
                      ),
                    ),
                  if (_decodeImage(_photoData) != null) const SizedBox(height: 12),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: OutlinedButton.icon(
                      onPressed: _pickPhoto,
                      icon: const Icon(Icons.add_a_photo_outlined),
                      label: const Text('Upload hazard photo'),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _isSubmitting ? null : _reportHazard,
                      child: Text(
                        _isSubmitting ? 'Submitting...' : 'Submit hazard report',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Active hazards',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
              ),
              TextButton.icon(
                onPressed: _isLoading ? null : () => _loadHazards(notifyOnError: true),
                icon: const Icon(Icons.refresh),
                label: const Text('Refresh'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                _error!,
                style: TextStyle(color: Colors.red.shade700),
              ),
            ),
          if (_isLoading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(20),
                child: CircularProgressIndicator(),
              ),
            )
          else if (_hazards.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text('No active hazards are visible right now.'),
              ),
            )
          else
            ..._hazards.map(
              (hazard) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                '${hazard.hazardType} • ${hazard.reportCode}',
                                style: const TextStyle(fontWeight: FontWeight.w700),
                              ),
                            ),
                            Chip(label: Text(hazard.severity)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(hazard.locationLabel),
                        const SizedBox(height: 4),
                        Text(
                          hazard.description.isEmpty
                              ? 'No extra hazard details.'
                              : hazard.description,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Reporter: ${hazard.reporterName} • Confirmations: ${hazard.confirmations}',
                        ),
                        if (hazard.locationMapUrl.isNotEmpty)
                          Align(
                            alignment: Alignment.centerLeft,
                            child: TextButton(
                              onPressed: () => _openMap(hazard.locationMapUrl),
                              child: const Text('Open location'),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
