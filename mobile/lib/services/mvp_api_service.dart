import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../config/mobile_env.dart';

class MvpApiService {
  MvpApiService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;
  String? _resolvedBaseUrl;

  String get currentBaseUrl => _resolvedBaseUrl ?? _baseUrls.first;

  bool _isLocalApiUrl(String value) {
    final lower = value.toLowerCase();
    return lower.contains('localhost') ||
        lower.contains('127.0.0.1') ||
        lower.contains('10.0.2.2');
  }

  List<String> get _baseUrls {
    final urls = <String>[];
    final configuredUrl = MobileEnv.apiBaseUrl?.trim();
    final shouldIncludeLocalFallbacks =
        configuredUrl == null || configuredUrl.isEmpty || _isLocalApiUrl(configuredUrl);
    if (configuredUrl != null && configuredUrl.isNotEmpty) {
      urls.add(configuredUrl);
    }

    if (kIsWeb) {
      if (shouldIncludeLocalFallbacks) {
        urls.add('http://localhost:5001/api');
      }
      return urls.toSet().toList();
    }

    if (!shouldIncludeLocalFallbacks) {
      return urls.toSet().toList();
    }

    if (defaultTargetPlatform == TargetPlatform.android) {
      urls.addAll([
        'http://10.0.2.2:5001/api',
        'http://127.0.0.1:5001/api',
        'http://localhost:5001/api',
      ]);
    } else {
      urls.addAll([
        'http://127.0.0.1:5001/api',
        'http://localhost:5001/api',
      ]);
    }

    return urls.toSet().toList();
  }

  Uri _buildUriForBase(
    String baseUrl,
    String path, [
    Map<String, String?>? queryParameters,
  ]) {
    final normalizedBase = baseUrl.endsWith('/') ? baseUrl : '$baseUrl/';
    final normalizedPath = path.startsWith('/') ? path.substring(1) : path;

    final filteredQuery = <String, String>{};
    if (queryParameters != null) {
      for (final entry in queryParameters.entries) {
        final value = entry.value;
        if (value != null && value.isNotEmpty) {
          filteredQuery[entry.key] = value;
        }
      }
    }

    return Uri.parse('$normalizedBase$normalizedPath')
        .replace(queryParameters: filteredQuery.isEmpty ? null : filteredQuery);
  }

  bool _shouldRetryOnConnectionError(Object error) {
    final message = error.toString().toLowerCase();
    return message.contains('socketexception') ||
        message.contains('clientexception') ||
        message.contains('timed out') ||
        message.contains('connection refused') ||
        message.contains('failed host lookup');
  }

  bool _looksLikeHtmlResponse(http.Response response) {
    final body = response.body.trimLeft().toLowerCase();
    return body.startsWith('<!doctype html') ||
        body.startsWith('<html') ||
        response.headers['content-type']?.toLowerCase().contains('text/html') == true;
  }

  Future<http.Response> _requestWithFallback({
    required String path,
    Map<String, String?>? queryParameters,
    required Future<http.Response> Function(Uri uri) send,
  }) async {
    Object? lastError;

    for (final baseUrl in _baseUrls) {
      final uri = _buildUriForBase(baseUrl, path, queryParameters);

      for (var attempt = 0; attempt < 2; attempt += 1) {
        try {
          final response = await send(uri).timeout(const Duration(seconds: 15));

          if (_looksLikeHtmlResponse(response)) {
            lastError = Exception(
              'The deployed backend returned an HTML page instead of API JSON at ${uri.toString()}.',
            );

            if (attempt == 0) {
              await Future<void>.delayed(const Duration(seconds: 2));
              continue;
            }

            break;
          }

          _resolvedBaseUrl = baseUrl;
          return response;
        } catch (error) {
          lastError = error;
          if (!_shouldRetryOnConnectionError(error)) {
            break;
          }
          if (attempt == 0) {
            await Future<void>.delayed(const Duration(seconds: 2));
            continue;
          }
        }
      }
    }

    throw lastError ?? Exception('Unable to reach the RoadGuide API.');
  }

  Future<List<ServiceCatalogRecord>> fetchServices() async {
    final response = await _requestWithFallback(
      path: '/settings/service-catalog',
      send: (uri) => _client.get(uri),
    );
    final json = _parseJson(response);

    if (json is! List) {
      throw Exception('Unexpected response while loading services.');
    }

    return json
        .whereType<Map<String, dynamic>>()
        .map(ServiceCatalogRecord.fromJson)
        .where((service) => service.isActive)
        .toList();
  }

  Future<List<MotoristRecord>> fetchMotorists() async {
    final response = await _requestWithFallback(
      path: '/motorists',
      send: (uri) => _client.get(uri),
    );
    final json = _parseJson(response);

    if (json is! List) {
      throw Exception('Unexpected response while loading motorists.');
    }

    return json
        .whereType<Map<String, dynamic>>()
        .map(MotoristRecord.fromJson)
        .toList();
  }

  Future<List<ProviderRecord>> fetchProviders({String? serviceId}) async {
    final response = await _requestWithFallback(
      path: '/providers/mvp',
      queryParameters: {
        'serviceId': serviceId,
      },
      send: (uri) => _client.get(uri),
    );
    final json = _parseJson(response);

    if (json is! List) {
      throw Exception('Unexpected response while loading providers.');
    }

    return json
        .whereType<Map<String, dynamic>>()
        .map(ProviderRecord.fromJson)
        .toList();
  }

  Future<List<ProviderRecord>> fetchNearbyProviders({
    required double latitude,
    required double longitude,
    String? serviceId,
    String? excludeProviderId,
  }) async {
    final response = await _requestWithFallback(
      path: '/providers/nearby',
      queryParameters: {
        'latitude': latitude.toString(),
        'longitude': longitude.toString(),
        'serviceId': serviceId,
        'excludeProviderId': excludeProviderId,
      },
      send: (uri) => _client.get(uri),
    );
    final json = _parseJson(response);

    if (json is! List) {
      throw Exception('Unexpected response while loading nearby providers.');
    }

    return json
        .whereType<Map<String, dynamic>>()
        .map(ProviderRecord.fromJson)
        .toList();
  }

  Future<List<HazardRecord>> fetchHazards() async {
    final response = await _requestWithFallback(
      path: '/hazards',
      send: (uri) => _client.get(uri),
    );
    final json = _parseJson(response);

    if (json is! List) {
      throw Exception('Unexpected response while loading hazards.');
    }

    return json
        .whereType<Map<String, dynamic>>()
        .map(HazardRecord.fromJson)
        .toList();
  }

  Future<HazardRecord> reportHazard(HazardPayload payload) async {
    final response = await _requestWithFallback(
      path: '/hazards',
      send: (uri) => _client.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload.toJson()),
      ),
    );

    final json = _parseJsonMap(response);
    return HazardRecord.fromJson(_extractData(json));
  }

  Future<List<EmergencyGuideRecord>> fetchEmergencyGuides() async {
    final response = await _requestWithFallback(
      path: '/content',
      send: (uri) => _client.get(uri),
    );
    final json = _parseJson(response);

    if (json is! List) {
      throw Exception('Unexpected response while loading emergency guides.');
    }

    return json
        .whereType<Map<String, dynamic>>()
        .map(EmergencyGuideRecord.fromJson)
        .toList();
  }

  Future<AuthSessionRecord> login({
    required String phoneNumber,
    required String pin,
  }) async {
    final response = await _requestWithFallback(
      path: '/auth/login',
      send: (uri) => _client.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phoneNumber': phoneNumber,
          'pin': pin,
        }),
      ),
    );

    final json = _parseJsonMap(response);
    return AuthSessionRecord.fromJson(_extractData(json));
  }

  Future<AuthSessionRecord> resetPin({
    required String phoneNumber,
    required String currentPin,
    required String newPin,
  }) async {
    final response = await _requestWithFallback(
      path: '/auth/reset-pin',
      send: (uri) => _client.patch(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phoneNumber': phoneNumber,
          'currentPin': currentPin,
          'newPin': newPin,
        }),
      ),
    );

    final json = _parseJsonMap(response);
    return AuthSessionRecord.fromJson(_extractData(json));
  }

  Future<MotoristRecord> saveMotorist(MotoristPayload payload) async {
    final response = await _requestWithFallback(
      path: '/motorists',
      send: (uri) => _client.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload.toJson()),
      ),
    );

    final json = _parseJsonMap(response);
    return MotoristRecord.fromJson(_extractData(json));
  }

  Future<ProviderRecord> registerProvider(ProviderPayload payload) async {
    final response = await _requestWithFallback(
      path: '/providers/register',
      send: (uri) => _client.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload.toJson()),
      ),
    );

    final json = _parseJsonMap(response);
    return ProviderRecord.fromJson(_extractData(json));
  }

  Future<ProviderRecord> updateProviderAvailability({
    required String providerId,
    required bool isAvailable,
  }) async {
    final response = await _requestWithFallback(
      path: '/providers/$providerId/availability',
      send: (uri) => _client.patch(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'availabilityStatus': isAvailable ? 'available' : 'offline',
        }),
      ),
    );

    final json = _parseJsonMap(response);
    return ProviderRecord.fromJson(_extractData(json));
  }

  Future<SosRequestRecord> createEmergencyRequest({
    required String requesterType,
    String? userId,
    String? providerId,
    required String emergencyType,
    required String serviceId,
    required String requiredServiceName,
    required String locationLabel,
    required String note,
    String? locationMapUrl,
    String? directProviderId,
    List<String>? requestImages,
    double? latitude,
    double? longitude,
  }) async {
    final response = await _requestWithFallback(
      path: '/sos',
      send: (uri) => _client.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'requesterType': requesterType,
          'userId': userId,
          'providerId': providerId,
          'emergencyType': emergencyType,
          'serviceId': serviceId,
          'requiredServiceName': requiredServiceName,
          'locationLabel': locationLabel,
          'locationMapUrl': locationMapUrl,
          'directProviderId': directProviderId,
          'requestImages': requestImages ?? const <String>[],
          'location': {
            'latitude': latitude,
            'longitude': longitude,
          },
          'note': note,
        }),
      ),
    );

    final json = _parseJsonMap(response);
    return SosRequestRecord.fromJson(_extractData(json));
  }

  Future<List<SosRequestRecord>> fetchRequests({
    String? userId,
    String? providerId,
    String? serviceId,
    String? status,
    String? viewerProviderId,
  }) async {
    final response = await _requestWithFallback(
      path: '/sos/mvp',
      queryParameters: {
        'userId': userId,
        'providerId': providerId,
        'serviceId': serviceId,
        'status': status,
        'viewerProviderId': viewerProviderId,
      },
      send: (uri) => _client.get(uri),
    );

    final json = _parseJson(response);
    if (json is! List) {
      throw Exception('Unexpected response while loading emergency requests.');
    }

    return json
        .whereType<Map<String, dynamic>>()
        .map(SosRequestRecord.fromJson)
        .toList();
  }

  Future<SosRequestRecord> respondToRequest({
    required String requestId,
    required String providerId,
    required bool accepted,
  }) async {
    final response = await _requestWithFallback(
      path: '/sos/$requestId/provider-response',
      send: (uri) => _client.patch(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'providerId': providerId,
          'decision': accepted ? 'accept' : 'reject',
        }),
      ),
    );

    final json = _parseJsonMap(response);
    return SosRequestRecord.fromJson(_extractData(json));
  }

  Future<SosRequestRecord> cancelRequest({
    required String requestId,
    String? userId,
    String? providerId,
  }) async {
    final response = await _requestWithFallback(
      path: '/sos/$requestId/cancel',
      send: (uri) => _client.patch(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'providerId': providerId,
        }),
      ),
    );

    final json = _parseJsonMap(response);
    return SosRequestRecord.fromJson(_extractData(json));
  }

  Future<SosRequestRecord> transferRequest({
    required String requestId,
    required String userId,
    required String providerId,
  }) async {
    final response = await _requestWithFallback(
      path: '/sos/$requestId/transfer',
      send: (uri) => _client.patch(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'providerId': providerId,
        }),
      ),
    );

    final json = _parseJsonMap(response);
    return SosRequestRecord.fromJson(_extractData(json));
  }

  Future<SosRequestRecord> sendProviderOffer({
    required String requestId,
    required String providerId,
    String? message,
  }) async {
    final response = await _requestWithFallback(
      path: '/sos/$requestId/offers',
      send: (uri) => _client.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'providerId': providerId,
          'message': message,
        }),
      ),
    );

    final json = _parseJsonMap(response);
    return SosRequestRecord.fromJson(_extractData(json));
  }

  Future<void> logout({
    required String sessionToken,
    required String phoneNumber,
  }) async {
    await _requestWithFallback(
      path: '/auth/logout',
      send: (uri) => _client.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'sessionToken': sessionToken,
          'phoneNumber': phoneNumber,
        }),
      ),
    );
  }

  Future<void> logClientError({
    required String source,
    required String action,
    required String message,
    String? detail,
    String? phoneNumber,
    String? endpoint,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      await _requestWithFallback(
        path: '/audit-logs/client-error',
        send: (uri) => _client.post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'source': source,
            'action': action,
            'message': message,
            'detail': detail,
            'phoneNumber': phoneNumber,
            'endpoint': endpoint,
            'metadata': metadata,
          }),
        ),
      );
    } catch (_) {
      // Best-effort logging only.
    }
  }

  dynamic _parseJson(http.Response response) {
    final body = response.body.trim();
    if (body.startsWith('<!DOCTYPE html') ||
        body.startsWith('<html') ||
        response.headers['content-type']?.contains('text/html') == true) {
      final requestedUrl = response.request?.url.toString() ?? currentBaseUrl;
      throw Exception(
        'The deployed backend returned an HTML page instead of RoadGuide API JSON at $requestedUrl. Check the deployed API URL or wait for the backend to finish waking up.',
      );
    }

    final decoded = body.isEmpty ? {} : jsonDecode(body);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      if (decoded is Map<String, dynamic> && decoded['message'] is String) {
        throw Exception(decoded['message'] as String);
      }
      throw Exception('Request failed with status ${response.statusCode}.');
    }

    return decoded;
  }

  Map<String, dynamic> _parseJsonMap(http.Response response) {
    final decoded = _parseJson(response);
    if (decoded is! Map<String, dynamic>) {
      throw Exception('Unexpected response from server.');
    }

    return decoded;
  }

  Map<String, dynamic> _extractData(Map<String, dynamic> json) {
    final data = json['data'];
    if (data is! Map<String, dynamic>) {
      throw Exception('Response payload is missing.');
    }

    return data;
  }
}

class MotoristRecord {
  const MotoristRecord({
    required this.id,
    required this.fullName,
    required this.phoneNumber,
    required this.address,
    required this.idType,
    required this.idNumber,
    required this.profileImageData,
    required this.email,
    required this.emergencyContacts,
    required this.pinDefaultHint,
  });

  final String id;
  final String fullName;
  final String phoneNumber;
  final String address;
  final String idType;
  final String idNumber;
  final String profileImageData;
  final String? email;
  final List<EmergencyContactRecord> emergencyContacts;
  final String pinDefaultHint;

  factory MotoristRecord.fromJson(Map<String, dynamic> json) {
    return MotoristRecord(
      id: (json['id'] ?? '').toString(),
      fullName: (json['fullName'] ?? '').toString(),
      phoneNumber: (json['phoneNumber'] ?? '').toString(),
      address: (json['address'] ?? '').toString(),
      idType: (json['idType'] ?? '').toString(),
      idNumber: (json['idNumber'] ?? '').toString(),
      profileImageData: (json['profileImageData'] ?? '').toString(),
      email: json['email']?.toString(),
      emergencyContacts: (json['emergencyContacts'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(EmergencyContactRecord.fromJson)
          .toList(),
      pinDefaultHint: (json['pinDefaultHint'] ?? '1234').toString(),
    );
  }
}

class ServiceCatalogRecord {
  const ServiceCatalogRecord({
    required this.id,
    required this.name,
    required this.slug,
    required this.description,
    required this.isActive,
  });

  final String id;
  final String name;
  final String slug;
  final String description;
  final bool isActive;

  factory ServiceCatalogRecord.fromJson(Map<String, dynamic> json) {
    return ServiceCatalogRecord(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      slug: (json['slug'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      isActive: json['isActive'] == true,
    );
  }
}

class ProviderRecord {
  const ProviderRecord({
    required this.id,
    required this.fullName,
    required this.businessName,
    required this.phoneNumber,
    required this.address,
    required this.email,
    required this.idType,
    required this.idNumber,
    required this.profileImageData,
    required this.emergencyContacts,
    required this.serviceId,
    required this.serviceName,
    required this.serviceArea,
    required this.currentLocationLabel,
    required this.currentLocationMapUrl,
    required this.coordinates,
    required this.distanceKm,
    required this.shopImagesCount,
    required this.availabilityStatus,
    required this.approvalStatus,
    required this.pinDefaultHint,
  });

  final String id;
  final String fullName;
  final String businessName;
  final String phoneNumber;
  final String address;
  final String? email;
  final String idType;
  final String idNumber;
  final String profileImageData;
  final List<EmergencyContactRecord> emergencyContacts;
  final String serviceId;
  final String serviceName;
  final String serviceArea;
  final String currentLocationLabel;
  final String currentLocationMapUrl;
  final GeoPointRecord? coordinates;
  final double? distanceKm;
  final int shopImagesCount;
  final String availabilityStatus;
  final String approvalStatus;
  final String pinDefaultHint;

  bool get isAvailable => availabilityStatus == 'available';
  bool get isApproved => approvalStatus == 'approved';

  factory ProviderRecord.fromJson(Map<String, dynamic> json) {
    return ProviderRecord(
      id: (json['id'] ?? '').toString(),
      fullName: (json['fullName'] ?? '').toString(),
      businessName: (json['businessName'] ?? '').toString(),
      phoneNumber: (json['phoneNumber'] ?? '').toString(),
      address: (json['address'] ?? '').toString(),
      email: json['email']?.toString(),
      idType: (json['idType'] ?? '').toString(),
      idNumber: (json['idNumber'] ?? '').toString(),
      profileImageData: (json['profileImageData'] ?? '').toString(),
      emergencyContacts: (json['emergencyContacts'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(EmergencyContactRecord.fromJson)
          .toList(),
      serviceId: (json['serviceId'] ?? '').toString(),
      serviceName: (json['serviceName'] ?? json['serviceType'] ?? '').toString(),
      serviceArea: (json['serviceArea'] ?? json['address'] ?? '').toString(),
      currentLocationLabel: (json['currentLocationLabel'] ?? '').toString(),
      currentLocationMapUrl: (json['currentLocationMapUrl'] ?? '').toString(),
      coordinates: json['coordinates'] is Map<String, dynamic>
          ? GeoPointRecord.fromJson(json['coordinates'] as Map<String, dynamic>)
          : null,
      distanceKm: double.tryParse((json['distanceKm'] ?? '').toString()),
      shopImagesCount: int.tryParse((json['shopImagesCount'] ?? '0').toString()) ?? 0,
      availabilityStatus: (json['availabilityStatus'] ?? 'offline').toString(),
      approvalStatus: (json['approvalStatus'] ?? 'pending').toString(),
      pinDefaultHint: (json['pinDefaultHint'] ?? '1234').toString(),
    );
  }
}

class AuthSessionRecord {
  const AuthSessionRecord({
    required this.phoneNumber,
    required this.motorist,
    required this.provider,
    required this.sessionToken,
    required this.sessionExpiresAt,
  });

  final String phoneNumber;
  final MotoristRecord? motorist;
  final ProviderRecord? provider;
  final String sessionToken;
  final String sessionExpiresAt;

  factory AuthSessionRecord.fromJson(Map<String, dynamic> json) {
    return AuthSessionRecord(
      phoneNumber: (json['phoneNumber'] ?? '').toString(),
      motorist: json['motorist'] is Map<String, dynamic>
          ? MotoristRecord.fromJson(json['motorist'] as Map<String, dynamic>)
          : null,
      provider: json['provider'] is Map<String, dynamic>
          ? ProviderRecord.fromJson(json['provider'] as Map<String, dynamic>)
          : null,
      sessionToken: (json['sessionToken'] ?? '').toString(),
      sessionExpiresAt: (json['sessionExpiresAt'] ?? '').toString(),
    );
  }
}

class HazardRecord {
  const HazardRecord({
    required this.id,
    required this.reportCode,
    required this.hazardType,
    required this.locationLabel,
    required this.locationMapUrl,
    required this.severity,
    required this.status,
    required this.reporterName,
    required this.confirmations,
    required this.reportedAt,
    required this.expiresAt,
    required this.description,
    required this.photoData,
  });

  final String id;
  final String reportCode;
  final String hazardType;
  final String locationLabel;
  final String locationMapUrl;
  final String severity;
  final String status;
  final String reporterName;
  final int confirmations;
  final String reportedAt;
  final String expiresAt;
  final String description;
  final String photoData;

  factory HazardRecord.fromJson(Map<String, dynamic> json) {
    return HazardRecord(
      id: (json['id'] ?? '').toString(),
      reportCode: (json['reportCode'] ?? '').toString(),
      hazardType: (json['hazardType'] ?? '').toString(),
      locationLabel: (json['locationLabel'] ?? json['location'] ?? '').toString(),
      locationMapUrl: (json['locationMapUrl'] ?? '').toString(),
      severity: (json['severity'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      reporterName: (json['reporterName'] ?? json['reporter'] ?? '').toString(),
      confirmations: int.tryParse((json['confirmations'] ?? '0').toString()) ?? 0,
      reportedAt: (json['reportedAt'] ?? json['createdAt'] ?? '').toString(),
      expiresAt: (json['expiresAt'] ?? '').toString(),
      description: (json['description'] ?? json['notes'] ?? '').toString(),
      photoData: (json['photoData'] ?? '').toString(),
    );
  }
}

class EmergencyGuideRecord {
  const EmergencyGuideRecord({
    required this.id,
    required this.contentCode,
    required this.title,
    required this.category,
    required this.content,
    required this.version,
    required this.language,
    required this.publishStatus,
    required this.updatedAt,
    required this.notes,
  });

  final String id;
  final String contentCode;
  final String title;
  final String category;
  final String content;
  final String version;
  final String language;
  final String publishStatus;
  final String updatedAt;
  final String notes;

  factory EmergencyGuideRecord.fromJson(Map<String, dynamic> json) {
    return EmergencyGuideRecord(
      id: (json['id'] ?? '').toString(),
      contentCode: (json['contentCode'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      category: (json['category'] ?? '').toString(),
      content: (json['content'] ?? '').toString(),
      version: (json['version'] ?? '').toString(),
      language: (json['language'] ?? 'English').toString(),
      publishStatus: (json['publishStatus'] ?? '').toString(),
      updatedAt: (json['updatedAt'] ?? '').toString(),
      notes: (json['notes'] ?? '').toString(),
    );
  }
}

class SosRequestRecord {
  const SosRequestRecord({
    required this.id,
    required this.ticket,
    required this.requesterType,
    required this.userId,
    required this.providerRequesterId,
    required this.requesterName,
    required this.requesterPhoneNumber,
    required this.requesterEmail,
    required this.motoristName,
    required this.emergencyType,
    required this.requiredServiceId,
    required this.requiredServiceType,
    required this.addressString,
    required this.locationMapUrl,
    required this.note,
    required this.requestImages,
    required this.status,
    required this.assignedProviderId,
    required this.assignedProviderName,
    required this.assignedProviderPhoneNumber,
    required this.assignedProviderEmail,
    required this.directProviderId,
    required this.directProviderName,
    required this.currentNotifiedProviderId,
    required this.currentNotifiedProviderName,
    required this.ringExpiresAt,
    required this.allowProviderOffers,
    required this.providerOffers,
    required this.createdAt,
  });

  final String id;
  final String ticket;
  final String requesterType;
  final String? userId;
  final String? providerRequesterId;
  final String requesterName;
  final String requesterPhoneNumber;
  final String requesterEmail;
  final String motoristName;
  final String emergencyType;
  final String? requiredServiceId;
  final String requiredServiceType;
  final String addressString;
  final String locationMapUrl;
  final String note;
  final List<String> requestImages;
  final String status;
  final String? assignedProviderId;
  final String? assignedProviderName;
  final String? assignedProviderPhoneNumber;
  final String? assignedProviderEmail;
  final String? directProviderId;
  final String? directProviderName;
  final String? currentNotifiedProviderId;
  final String? currentNotifiedProviderName;
  final String? ringExpiresAt;
  final bool allowProviderOffers;
  final List<ProviderOfferRecord> providerOffers;
  final String createdAt;

  factory SosRequestRecord.fromJson(Map<String, dynamic> json) {
    return SosRequestRecord(
      id: (json['id'] ?? '').toString(),
      ticket: (json['ticket'] ?? '').toString(),
      requesterType: (json['requesterType'] ?? '').toString(),
      userId: json['userId']?.toString(),
      providerRequesterId: json['providerRequesterId']?.toString(),
      requesterName: (json['requesterName'] ?? json['motoristName'] ?? '').toString(),
      requesterPhoneNumber: (json['requesterPhoneNumber'] ?? '').toString(),
      requesterEmail: (json['requesterEmail'] ?? '').toString(),
      motoristName: (json['motoristName'] ?? json['requesterName'] ?? '').toString(),
      emergencyType: (json['emergencyType'] ?? '').toString(),
      requiredServiceId: json['requiredServiceId']?.toString(),
      requiredServiceType:
          (json['requiredServiceName'] ?? json['requiredServiceType'] ?? '').toString(),
      addressString: (json['locationLabel'] ?? json['addressString'] ?? '').toString(),
      locationMapUrl: (json['locationMapUrl'] ?? '').toString(),
      note: (json['note'] ?? '').toString(),
      requestImages: (json['requestImages'] as List<dynamic>? ?? const [])
          .map((item) => item.toString())
          .toList(),
      status: (json['status'] ?? '').toString(),
      assignedProviderId: json['assignedProviderId']?.toString(),
      assignedProviderName: json['assignedProviderName']?.toString(),
      assignedProviderPhoneNumber: json['assignedProviderPhoneNumber']?.toString(),
      assignedProviderEmail: json['assignedProviderEmail']?.toString(),
      directProviderId: json['directProviderId']?.toString(),
      directProviderName: json['directProviderName']?.toString(),
      currentNotifiedProviderId: json['currentNotifiedProviderId']?.toString(),
      currentNotifiedProviderName: json['currentNotifiedProviderName']?.toString(),
      ringExpiresAt: json['ringExpiresAt']?.toString(),
      allowProviderOffers: json['allowProviderOffers'] == true,
      providerOffers: (json['providerOffers'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(ProviderOfferRecord.fromJson)
          .toList(),
      createdAt: (json['createdAt'] ?? '').toString(),
    );
  }
}

class GeoPointRecord {
  const GeoPointRecord({
    required this.latitude,
    required this.longitude,
  });

  final double latitude;
  final double longitude;

  factory GeoPointRecord.fromJson(Map<String, dynamic> json) {
    return GeoPointRecord(
      latitude: double.tryParse((json['latitude'] ?? '').toString()) ?? 0,
      longitude: double.tryParse((json['longitude'] ?? '').toString()) ?? 0,
    );
  }
}

class ProviderOfferRecord {
  const ProviderOfferRecord({
    required this.providerId,
    required this.providerName,
    required this.message,
    required this.createdAt,
  });

  final String? providerId;
  final String providerName;
  final String message;
  final String createdAt;

  factory ProviderOfferRecord.fromJson(Map<String, dynamic> json) {
    return ProviderOfferRecord(
      providerId: json['providerId']?.toString(),
      providerName: (json['providerName'] ?? '').toString(),
      message: (json['message'] ?? '').toString(),
      createdAt: (json['createdAt'] ?? '').toString(),
    );
  }
}

class MotoristPayload {
  const MotoristPayload({
    required this.fullName,
    required this.phoneNumber,
    required this.address,
    required this.idType,
    required this.idNumber,
    required this.profileImageData,
    required this.pin,
    required this.emergencyContacts,
    this.email,
  });

  final String fullName;
  final String phoneNumber;
  final String address;
  final String idType;
  final String idNumber;
  final String profileImageData;
  final String pin;
  final List<EmergencyContactPayload> emergencyContacts;
  final String? email;

  Map<String, dynamic> toJson() {
    return {
      'fullName': fullName,
      'phoneNumber': phoneNumber,
      'address': address,
      'idType': idType,
      'idNumber': idNumber,
      'profileImageData': profileImageData,
      'pin': pin,
      'email': email,
      'emergencyContacts': emergencyContacts.map((item) => item.toJson()).toList(),
    };
  }
}

class ProviderPayload {
  const ProviderPayload({
    required this.fullName,
    required this.businessName,
    required this.phoneNumber,
    required this.address,
    required this.idType,
    required this.idNumber,
    required this.profileImageData,
    required this.shopImages,
    required this.serviceId,
    required this.serviceArea,
    required this.pin,
    required this.emergencyContacts,
    this.email,
    this.currentLocationLabel,
    this.currentLocationMapUrl,
    this.latitude,
    this.longitude,
  });

  final String fullName;
  final String businessName;
  final String phoneNumber;
  final String address;
  final String? email;
  final String idType;
  final String idNumber;
  final String profileImageData;
  final List<String> shopImages;
  final String serviceId;
  final String serviceArea;
  final String pin;
  final List<EmergencyContactPayload> emergencyContacts;
  final String? currentLocationLabel;
  final String? currentLocationMapUrl;
  final double? latitude;
  final double? longitude;

  Map<String, dynamic> toJson() {
    return {
      'fullName': fullName,
      'businessName': businessName,
      'phoneNumber': phoneNumber,
      'address': address,
      'email': email,
      'idType': idType,
      'idNumber': idNumber,
      'profileImageData': profileImageData,
      'shopImages': shopImages,
      'emergencyContacts': emergencyContacts.map((item) => item.toJson()).toList(),
      'serviceId': serviceId,
      'serviceArea': serviceArea,
      'pin': pin,
      'currentLocationLabel': currentLocationLabel,
      'currentLocationMapUrl': currentLocationMapUrl,
      'currentLocation': {
        'latitude': latitude,
        'longitude': longitude,
      },
    };
  }
}

class EmergencyContactRecord {
  const EmergencyContactRecord({
    required this.name,
    required this.phoneNumber,
    required this.email,
    required this.relationship,
    required this.notifyViaSms,
    required this.notifyViaEmail,
  });

  final String name;
  final String phoneNumber;
  final String? email;
  final String relationship;
  final bool notifyViaSms;
  final bool notifyViaEmail;

  factory EmergencyContactRecord.fromJson(Map<String, dynamic> json) {
    return EmergencyContactRecord(
      name: (json['name'] ?? '').toString(),
      phoneNumber: (json['phoneNumber'] ?? '').toString(),
      email: json['email']?.toString(),
      relationship: (json['relationship'] ?? '').toString(),
      notifyViaSms: json['notifyViaSms'] != false,
      notifyViaEmail: json['notifyViaEmail'] != false,
    );
  }
}

class EmergencyContactPayload {
  const EmergencyContactPayload({
    required this.name,
    required this.phoneNumber,
    required this.email,
    required this.relationship,
    this.notifyViaSms = true,
    this.notifyViaEmail = true,
  });

  final String name;
  final String phoneNumber;
  final String? email;
  final String relationship;
  final bool notifyViaSms;
  final bool notifyViaEmail;

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'phoneNumber': phoneNumber,
      'email': email,
      'relationship': relationship,
      'notifyViaSms': notifyViaSms,
      'notifyViaEmail': notifyViaEmail,
    };
  }
}

class HazardPayload {
  const HazardPayload({
    required this.requesterType,
    required this.hazardType,
    required this.severity,
    required this.description,
    required this.locationLabel,
    this.userId,
    this.providerId,
    this.reporterName,
    this.locationMapUrl,
    this.photoData,
    this.latitude,
    this.longitude,
  });

  final String requesterType;
  final String? userId;
  final String? providerId;
  final String? reporterName;
  final String hazardType;
  final String severity;
  final String description;
  final String locationLabel;
  final String? locationMapUrl;
  final String? photoData;
  final double? latitude;
  final double? longitude;

  Map<String, dynamic> toJson() {
    return {
      'requesterType': requesterType,
      'userId': userId,
      'providerId': providerId,
      'reporterName': reporterName,
      'hazardType': hazardType,
      'severity': severity,
      'description': description,
      'locationLabel': locationLabel,
      'locationMapUrl': locationMapUrl,
      'photoData': photoData,
      'location': {
        'latitude': latitude,
        'longitude': longitude,
      },
    };
  }
}
