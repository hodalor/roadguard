import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../guides/emergency_guides_page.dart';
import '../hazards/hazards_page.dart';
import '../../services/mvp_api_service.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final _apiService = MvpApiService();
  final _imagePicker = ImagePicker();

  final _motoristNameController = TextEditingController();
  final _motoristPhoneController = TextEditingController();
  final _motoristAddressController = TextEditingController();
  final _motoristEmailController = TextEditingController();
  final _motoristIdNumberController = TextEditingController();
  final _motoristPinController = TextEditingController();

  final _providerNameController = TextEditingController();
  final _providerBusinessController = TextEditingController();
  final _providerPhoneController = TextEditingController();
  final _providerAddressController = TextEditingController();
  final _providerEmailController = TextEditingController();
  final _providerIdNumberController = TextEditingController();
  final _providerServiceAreaController = TextEditingController();
  final _providerPinController = TextEditingController();

  final _loginPhoneController = TextEditingController();
  final _loginPinController = TextEditingController(text: '1234');
  final _resetCurrentPinController = TextEditingController(text: '1234');
  final _resetNewPinController = TextEditingController();
  final _resetConfirmPinController = TextEditingController();

  final _requestIssueController = TextEditingController();
  final _requestLocationController = TextEditingController();
  final _requestNoteController = TextEditingController();

  int _currentIndex = 0;
  String _selectedMotoristIdType = 'Ghana Card';
  String _selectedProviderIdType = 'Ghana Card';
  String _selectedRequesterType = 'motorist';
  String? _selectedProviderServiceId;
  String? _selectedRequestServiceId;

  bool _isLoadingServices = true;
  bool _isLoadingProviders = false;
  bool _isLoadingRequests = false;
  bool _isSavingMotorist = false;
  bool _isSavingProvider = false;
  bool _isSubmittingRequest = false;
  bool _isUpdatingAvailability = false;
  bool _isSubmittingDecision = false;
  bool _isSendingOffer = false;
  bool _isTransferringRequest = false;
  bool _isAuthenticating = false;
  bool _isResettingPin = false;
  bool _isFetchingProviderLocation = false;
  bool _isFetchingRequestLocation = false;

  String? _serviceLoadError;
  String? _providerLoadError;
  String? _requestLoadError;

  String? _motoristProfileImageData;
  String? _providerProfileImageData;
  List<String> _providerShopImages = [];
  List<String> _requestImages = [];

  double? _providerLatitude;
  double? _providerLongitude;
  String? _providerLocationLabel;
  String? _providerMapUrl;

  double? _requestLatitude;
  double? _requestLongitude;
  String? _requestMapUrl;

  MotoristRecord? _motoristProfile;
  ProviderRecord? _providerProfile;
  ProviderRecord? _selectedDirectProvider;

  List<ServiceCatalogRecord> _services = const [];
  List<ProviderRecord> _nearbyProviders = const [];
  List<SosRequestRecord> _myRequests = const [];
  List<SosRequestRecord> _providerQueue = const [];

  Timer? _refreshTimer;
  Timer? _ringTimer;
  String? _ringingRequestId;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
    _refreshTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      if (_isRegistered) {
        _refreshSignedInData();
      }
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _ringTimer?.cancel();
    _motoristNameController.dispose();
    _motoristPhoneController.dispose();
    _motoristAddressController.dispose();
    _motoristEmailController.dispose();
    _motoristIdNumberController.dispose();
    _motoristPinController.dispose();
    _providerNameController.dispose();
    _providerBusinessController.dispose();
    _providerPhoneController.dispose();
    _providerAddressController.dispose();
    _providerEmailController.dispose();
    _providerIdNumberController.dispose();
    _providerServiceAreaController.dispose();
    _providerPinController.dispose();
    _loginPhoneController.dispose();
    _loginPinController.dispose();
    _resetCurrentPinController.dispose();
    _resetNewPinController.dispose();
    _resetConfirmPinController.dispose();
    _requestIssueController.dispose();
    _requestLocationController.dispose();
    _requestNoteController.dispose();
    super.dispose();
  }

  bool get _isRegistered => _motoristProfile != null || _providerProfile != null;

  bool get _canRequestEmergency => _motoristProfile != null || _providerProfile != null;

  String? get _activePhoneNumber =>
      _motoristProfile?.phoneNumber.isNotEmpty == true
          ? _motoristProfile?.phoneNumber
          : _providerProfile?.phoneNumber;

  List<SosRequestRecord> get _activeMyRequests {
    return _myRequests
        .where(
          (request) =>
              request.status == 'awaiting_provider' ||
              request.status == 'accepted_by_provider' ||
              request.status == 'transferred',
        )
        .toList();
  }

  List<SosRequestRecord> get _historyRequests {
    return [..._myRequests]..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  bool _canCancelRequest(SosRequestRecord request) {
    return request.status == 'awaiting_provider' ||
        request.status == 'accepted_by_provider' ||
        request.status == 'transferred';
  }

  List<_NavigationItem> get _navigationItems {
    if (!_isRegistered) {
      return [
        _NavigationItem(
          id: 'account',
          title: 'Login',
          destination: const NavigationDestination(
            icon: Icon(Icons.lock_outline),
            selectedIcon: Icon(Icons.lock),
            label: 'Login',
          ),
          child: _buildRegistrationTab(),
        ),
      ];
    }

    if (_providerProfile != null) {
      return [
        _NavigationItem(
          id: 'emergency',
          title: 'Emergency',
          destination: const NavigationDestination(
            icon: Icon(Icons.sos_outlined),
            selectedIcon: Icon(Icons.sos),
            label: 'Emergency',
          ),
          child: _buildEmergencyTab(),
        ),
        _NavigationItem(
          id: 'requests',
          title: 'Requests',
          destination: const NavigationDestination(
            icon: Icon(Icons.notifications_active_outlined),
            selectedIcon: Icon(Icons.notifications_active),
            label: 'Requests',
          ),
          child: _buildProviderRequestsTab(),
        ),
        _NavigationItem(
          id: 'history',
          title: 'History',
          destination: const NavigationDestination(
            icon: Icon(Icons.history_outlined),
            selectedIcon: Icon(Icons.history),
            label: 'History',
          ),
          child: _buildHistoryTab(),
        ),
        _NavigationItem(
          id: 'providers',
          title: 'Providers',
          destination: const NavigationDestination(
            icon: Icon(Icons.place_outlined),
            selectedIcon: Icon(Icons.place),
            label: 'Providers',
          ),
          child: _buildProvidersTab(),
        ),
        _NavigationItem(
          id: 'profile',
          title: 'Profile',
          destination: const NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
          child: _buildProfileTab(),
        ),
      ];
    }

    return [
      _NavigationItem(
        id: 'emergency',
        title: 'Emergency',
        destination: const NavigationDestination(
          icon: Icon(Icons.sos_outlined),
          selectedIcon: Icon(Icons.sos),
          label: 'Emergency',
        ),
        child: _buildEmergencyTab(),
      ),
      _NavigationItem(
        id: 'providers',
        title: 'Providers',
        destination: const NavigationDestination(
          icon: Icon(Icons.place_outlined),
          selectedIcon: Icon(Icons.place),
          label: 'Providers',
        ),
        child: _buildProvidersTab(),
      ),
      _NavigationItem(
        id: 'history',
        title: 'History',
        destination: const NavigationDestination(
          icon: Icon(Icons.history_outlined),
          selectedIcon: Icon(Icons.history),
          label: 'History',
        ),
        child: _buildHistoryTab(),
      ),
      _NavigationItem(
        id: 'profile',
        title: 'Profile',
        destination: const NavigationDestination(
          icon: Icon(Icons.person_outline),
          selectedIcon: Icon(Icons.person),
          label: 'Profile',
        ),
        child: _buildProfileTab(),
      ),
    ];
  }

  Future<void> _loadInitialData() async {
    await _loadServices();
    await _loadNearbyProviders();
  }

  Future<void> _loadServices({bool notifyOnError = false}) async {
    setState(() {
      _isLoadingServices = true;
      _serviceLoadError = null;
    });

    try {
      final services = await _apiService.fetchServices();
      if (!mounted) {
        return;
      }

      setState(() {
        _services = services;
        _selectedProviderServiceId ??= services.isNotEmpty ? services.first.id : null;
        _selectedRequestServiceId ??= services.isNotEmpty ? services.first.id : null;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _serviceLoadError = _formatError(error);
      });

      if (notifyOnError && _serviceLoadError != null) {
        _showMessage(_serviceLoadError!);
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingServices = false;
        });
      }
    }
  }

  Future<void> _refreshSignedInData({bool notifyOnError = false}) async {
    if (!_isRegistered) {
      return;
    }

    setState(() {
      _isLoadingRequests = true;
      _requestLoadError = null;
    });

    try {
      final ownRequests = <SosRequestRecord>[];

      if (_motoristProfile != null) {
        ownRequests.addAll(await _apiService.fetchRequests(userId: _motoristProfile!.id));
      }

      if (_providerProfile != null) {
        ownRequests.addAll(await _apiService.fetchRequests(providerId: _providerProfile!.id));
      }

      final deduped = <String, SosRequestRecord>{};
      for (final request in ownRequests) {
        deduped[request.id] = request;
      }

      final providerQueue = _providerProfile == null
          ? const <SosRequestRecord>[]
          : await _apiService.fetchRequests(viewerProviderId: _providerProfile!.id);

      if (!mounted) {
        return;
      }

      setState(() {
        _myRequests = deduped.values.toList()
          ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
        _providerQueue = providerQueue;
      });

      _syncRingState();
      await _loadNearbyProviders();
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _requestLoadError = _formatError(error);
      });

      if (notifyOnError && _requestLoadError != null) {
        _showMessage(_requestLoadError!);
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingRequests = false;
        });
      }
    }
  }

  Future<void> _loadNearbyProviders({bool notifyOnError = false}) async {
    if (!_isRegistered) {
      return;
    }

    setState(() {
      _isLoadingProviders = true;
      _providerLoadError = null;
    });

    try {
      final latitude =
          _requestLatitude ??
          _providerLatitude ??
          _providerProfile?.coordinates?.latitude;
      final longitude =
          _requestLongitude ??
          _providerLongitude ??
          _providerProfile?.coordinates?.longitude;

      final providers = latitude != null && longitude != null
          ? await _apiService.fetchNearbyProviders(
              latitude: latitude,
              longitude: longitude,
              serviceId: _selectedRequestServiceId,
              excludeProviderId: _providerProfile?.id,
            )
          : await _apiService.fetchProviders();

      if (!mounted) {
        return;
      }

      setState(() {
        _nearbyProviders = providers;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _providerLoadError = _formatError(error);
      });

      if (notifyOnError && _providerLoadError != null) {
        _showMessage(_providerLoadError!);
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingProviders = false;
        });
      }
    }
  }

  void _syncProviderFormFromMotorist() {
    final motorist = _motoristProfile;
    if (motorist == null) {
      return;
    }

    _providerNameController.text = motorist.fullName;
    _providerPhoneController.text = motorist.phoneNumber;
    _providerAddressController.text = motorist.address;
    _providerEmailController.text = motorist.email ?? '';
    _providerIdNumberController.text = motorist.idNumber;
    _selectedProviderIdType = motorist.idType;
    _providerProfileImageData ??= motorist.profileImageData;
    _providerPinController.text = _providerPinController.text.trim().isEmpty
        ? '1234'
        : _providerPinController.text.trim();
  }

  bool _isValidPin(String value) {
    return RegExp(r'^\d{4}$').hasMatch(value);
  }

  Future<void> _login() async {
    final phone = _loginPhoneController.text.trim();
    final pin = _loginPinController.text.trim();

    if (phone.isEmpty || !_isValidPin(pin)) {
      _showMessage('Enter the phone number and a valid 4-digit PIN.');
      return;
    }

    setState(() {
      _isAuthenticating = true;
    });

    try {
      final session = await _apiService.login(phoneNumber: phone, pin: pin);
      if (!mounted) {
        return;
      }

      setState(() {
        _motoristProfile = session.motorist;
        _providerProfile = session.provider;
        _selectedRequesterType = session.provider != null && session.motorist == null
            ? 'provider'
            : 'motorist';
      });

      if (session.motorist != null) {
        _requestLocationController.text = session.motorist!.address;
      } else if (session.provider != null) {
        _requestLocationController.text = session.provider!.serviceArea;
      }

      _syncProviderFormFromMotorist();
      await _refreshSignedInData();
      _showMessage('Login successful.');
    } catch (error) {
      if (mounted) {
        _showMessage(_formatError(error));
      }
    } finally {
      if (mounted) {
        setState(() {
          _isAuthenticating = false;
        });
      }
    }
  }

  Future<void> _resetPin() async {
    final phone = _activePhoneNumber ?? _loginPhoneController.text.trim();
    final currentPin = _resetCurrentPinController.text.trim();
    final newPin = _resetNewPinController.text.trim();
    final confirmPin = _resetConfirmPinController.text.trim();

    if (phone.isEmpty) {
      _showMessage('No active phone number found for this account.');
      return;
    }

    if (!_isValidPin(currentPin) || !_isValidPin(newPin)) {
      _showMessage('Current PIN and new PIN must both be 4 digits.');
      return;
    }

    if (newPin != confirmPin) {
      _showMessage('New PIN and confirm PIN do not match.');
      return;
    }

    setState(() {
      _isResettingPin = true;
    });

    try {
      final session = await _apiService.resetPin(
        phoneNumber: phone,
        currentPin: currentPin,
        newPin: newPin,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _motoristProfile = session.motorist ?? _motoristProfile;
        _providerProfile = session.provider ?? _providerProfile;
      });

      _loginPinController.text = newPin;
      _resetCurrentPinController.text = newPin;
      _resetNewPinController.clear();
      _resetConfirmPinController.clear();
      _showMessage('PIN reset successfully.');
    } catch (error) {
      if (mounted) {
        _showMessage(_formatError(error));
      }
    } finally {
      if (mounted) {
        setState(() {
          _isResettingPin = false;
        });
      }
    }
  }

  Future<void> _openMotoristRegistrationModal() async {
    _motoristPinController.text =
        _motoristPinController.text.trim().isEmpty ? '1234' : _motoristPinController.text.trim();
    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Add Motorist Account'),
          content: SizedBox(
            width: 520,
            child: SingleChildScrollView(
              child: _buildMotoristFormFields(
                onSaved: () => Navigator.of(dialogContext).pop(),
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _openSignUpChoiceModal() async {
    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Choose account type'),
          content: SizedBox(
            width: 360,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () {
                      Navigator.of(dialogContext).pop();
                      _openMotoristRegistrationModal();
                    },
                    icon: const Icon(Icons.directions_car_outlined),
                    label: const Text('Motorist'),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _isLoadingServices
                        ? null
                        : () {
                            Navigator.of(dialogContext).pop();
                            _openProviderRegistrationModal();
                          },
                    icon: const Icon(Icons.build_circle_outlined),
                    label: Text(
                      _isLoadingServices ? 'Loading services...' : 'Provider',
                    ),
                  ),
                ),
                if (_serviceLoadError != null) ...[
                  const SizedBox(height: 12),
                  _InlineNotice(
                    message: _serviceLoadError!,
                    color: Colors.red.shade700,
                    background: const Color(0xFFFFEFEF),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _openProviderRegistrationModal() async {
    _providerPinController.text =
        _providerPinController.text.trim().isEmpty ? '1234' : _providerPinController.text.trim();
    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: Text(_providerProfile == null ? 'Add Provider Account' : 'Update Provider Profile'),
          content: SizedBox(
            width: 560,
            child: SingleChildScrollView(
              child: _buildProviderFormFields(
                onSaved: () => Navigator.of(dialogContext).pop(),
              ),
            ),
          ),
        );
      },
    );
  }

  Future<bool> _registerMotorist() async {
    final name = _motoristNameController.text.trim();
    final phone = _motoristPhoneController.text.trim();
    final address = _motoristAddressController.text.trim();
    final email = _motoristEmailController.text.trim();
    final idNumber = _motoristIdNumberController.text.trim();
    final pin = _motoristPinController.text.trim();

    if (name.isEmpty || phone.isEmpty || address.isEmpty || idNumber.isEmpty) {
      _showMessage('Motorist name, phone, address, and ID number are required.');
      return false;
    }

    if (!_isValidPin(pin)) {
      _showMessage('Enter a valid 4-digit PIN for the motorist account.');
      return false;
    }

    if (_motoristProfileImageData == null) {
      _showMessage('Motorist profile picture is required.');
      return false;
    }

    setState(() {
      _isSavingMotorist = true;
    });

    try {
      final motorist = await _apiService.saveMotorist(
        MotoristPayload(
          fullName: name,
          phoneNumber: phone,
          address: address,
          idType: _selectedMotoristIdType,
          idNumber: idNumber,
          profileImageData: _motoristProfileImageData!,
          pin: pin,
          email: email.isEmpty ? null : email,
        ),
      );

      if (!mounted) {
        return false;
      }

      setState(() {
        _motoristProfile = motorist;
        _selectedRequesterType = 'motorist';
        _requestLocationController.text = motorist.address;
        _requestMapUrl = '';
      });

      _loginPhoneController.text = phone;
      _loginPinController.text = pin;
      _resetCurrentPinController.text = pin;
      _syncProviderFormFromMotorist();
      await _refreshSignedInData();
      _showMessage('Motorist account saved successfully.');
      return true;
    } catch (error) {
      if (mounted) {
        _showMessage(
          '${_formatError(error)} Current API: ${_apiService.currentBaseUrl}',
        );
      }
      return false;
    } finally {
      if (mounted) {
        setState(() {
          _isSavingMotorist = false;
        });
      }
    }
  }

  Future<bool> _saveProviderProfile() async {
    final fullName = _providerNameController.text.trim();
    final businessName = _providerBusinessController.text.trim();
    final phone = _providerPhoneController.text.trim();
    final address = _providerAddressController.text.trim();
    final email = _providerEmailController.text.trim();
    final idNumber = _providerIdNumberController.text.trim();
    final serviceArea = _providerServiceAreaController.text.trim();
    final pin = _providerPinController.text.trim();
    final serviceId = _selectedProviderServiceId;

    if (fullName.isEmpty ||
        businessName.isEmpty ||
        phone.isEmpty ||
        address.isEmpty ||
        idNumber.isEmpty ||
        serviceArea.isEmpty) {
      _showMessage('Provider personal, business, ID, and service area fields are required.');
      return false;
    }

    if (!_isValidPin(pin)) {
      _showMessage('Enter a valid 4-digit PIN for the provider account.');
      return false;
    }

    if (serviceId == null || _services.isEmpty) {
      _showMessage('Ask the admin to create provider services first.');
      return false;
    }

    if (_providerProfileImageData == null) {
      _showMessage('Provider profile picture is required.');
      return false;
    }

    if (_providerShopImages.length < 3) {
      _showMessage('Upload at least three shop or work images.');
      return false;
    }

    setState(() {
      _isSavingProvider = true;
    });

    try {
      final provider = await _apiService.registerProvider(
        ProviderPayload(
          fullName: fullName,
          businessName: businessName,
          phoneNumber: phone,
          address: address,
          email: email.isEmpty ? null : email,
          idType: _selectedProviderIdType,
          idNumber: idNumber,
          profileImageData: _providerProfileImageData!,
          shopImages: _providerShopImages,
          serviceId: serviceId,
          serviceArea: serviceArea,
          pin: pin,
          currentLocationLabel: _providerLocationLabel,
          currentLocationMapUrl: _providerMapUrl,
          latitude: _providerLatitude,
          longitude: _providerLongitude,
        ),
      );

      if (!mounted) {
        return false;
      }

      setState(() {
        _providerProfile = provider;
        if (_motoristProfile == null) {
          _selectedRequesterType = 'provider';
          _requestLocationController.text = provider.serviceArea;
        }
      });

      _loginPhoneController.text = phone;
      _loginPinController.text = pin;
      _resetCurrentPinController.text = pin;
      await _refreshSignedInData();
      _goToTab('profile');
      _showMessage(
        provider.approvalStatus == 'approved'
            ? 'Provider profile saved successfully.'
            : 'Provider profile submitted. Status is pending approval.',
      );
      return true;
    } catch (error) {
      if (mounted) {
        _showMessage(_formatError(error));
      }
      return false;
    } finally {
      if (mounted) {
        setState(() {
          _isSavingProvider = false;
        });
      }
    }
  }

  Future<void> _createEmergencyRequest() async {
    if (!_canRequestEmergency) {
      _showMessage('Register a motorist or provider account before requesting help.');
      return;
    }

    final issue = _requestIssueController.text.trim();
    final location = _requestLocationController.text.trim();
    final note = _requestNoteController.text.trim();
    final service = _selectedService(_selectedRequestServiceId);

    if (issue.isEmpty || location.isEmpty) {
      _showMessage('Problem summary and exact location are required.');
      return;
    }

    if (service == null) {
      _showMessage('Select the service you need.');
      return;
    }

    final requesterType =
        _selectedRequesterType == 'provider' && _providerProfile != null
            ? 'provider'
            : 'motorist';

    setState(() {
      _isSubmittingRequest = true;
    });

    try {
      await _apiService.createEmergencyRequest(
        requesterType: requesterType,
        userId: requesterType == 'motorist' ? _motoristProfile?.id : null,
        providerId: requesterType == 'provider' ? _providerProfile?.id : null,
        emergencyType: issue,
        serviceId: service.id,
        requiredServiceName: service.name,
        locationLabel: location,
        locationMapUrl: _requestMapUrl,
        directProviderId: _selectedDirectProvider?.id,
        requestImages: _requestImages,
        note: note,
        latitude: _requestLatitude,
        longitude: _requestLongitude,
      );

      if (!mounted) {
        return;
      }

      _requestIssueController.clear();
      _requestNoteController.clear();
      setState(() {
        _selectedDirectProvider = null;
        _requestImages = [];
      });

      await _refreshSignedInData();
      _showMessage('Emergency request submitted successfully.');
    } catch (error) {
      if (mounted) {
        _showMessage(_formatError(error));
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSubmittingRequest = false;
        });
      }
    }
  }

  Future<void> _cancelRequest(SosRequestRecord request) async {
    try {
      final updated = await _apiService.cancelRequest(
        requestId: request.id,
        userId: _motoristProfile?.id,
        providerId: _providerProfile?.id,
      );
      _replaceRequest(updated);
      await _refreshSignedInData();
      _showMessage('Emergency request cancelled.');
    } catch (error) {
      _showMessage(_formatError(error));
    }
  }

  Future<void> _handleRequestDecision(SosRequestRecord request, bool accepted) async {
    final provider = _providerProfile;
    if (provider == null) {
      _showMessage('Complete the provider profile first.');
      return;
    }

    setState(() {
      _isSubmittingDecision = true;
    });

    try {
      final updated = await _apiService.respondToRequest(
        requestId: request.id,
        providerId: provider.id,
        accepted: accepted,
      );
      _replaceRequest(updated);
      await _refreshSignedInData();
      _showMessage(
        accepted
            ? 'Request accepted.'
            : 'Request rejected and moved to the next provider if available.',
      );
    } catch (error) {
      _showMessage(_formatError(error));
    } finally {
      if (mounted) {
        setState(() {
          _isSubmittingDecision = false;
        });
      }
    }
  }

  Future<void> _sendOffer(SosRequestRecord request) async {
    final provider = _providerProfile;
    if (provider == null) {
      return;
    }

    setState(() {
      _isSendingOffer = true;
    });

    try {
      final updated = await _apiService.sendProviderOffer(
        requestId: request.id,
        providerId: provider.id,
        message: 'Provider ${provider.businessName} can handle service ${request.ticket}.',
      );
      _replaceRequest(updated);
      await _refreshSignedInData();
      _showMessage('Offer sent to the requester.');
    } catch (error) {
      _showMessage(_formatError(error));
    } finally {
      if (mounted) {
        setState(() {
          _isSendingOffer = false;
        });
      }
    }
  }

  Future<void> _transferRequest(SosRequestRecord request, ProviderOfferRecord offer) async {
    if (_motoristProfile == null || offer.providerId == null) {
      return;
    }

    setState(() {
      _isTransferringRequest = true;
    });

    try {
      final updated = await _apiService.transferRequest(
        requestId: request.id,
        userId: _motoristProfile!.id,
        providerId: offer.providerId!,
      );
      _replaceRequest(updated);
      await _refreshSignedInData();
      _showMessage('Request transferred to ${offer.providerName}.');
    } catch (error) {
      _showMessage(_formatError(error));
    } finally {
      if (mounted) {
        setState(() {
          _isTransferringRequest = false;
        });
      }
    }
  }

  Future<void> _toggleProviderAvailability(bool value) async {
    final provider = _providerProfile;
    if (provider == null) {
      return;
    }

    setState(() {
      _isUpdatingAvailability = true;
    });

    try {
      final updated = await _apiService.updateProviderAvailability(
        providerId: provider.id,
        isAvailable: value,
      );
      if (!mounted) {
        return;
      }

      setState(() {
        _providerProfile = updated;
      });
      await _refreshSignedInData();
      _showMessage(value ? 'Provider is now available.' : 'Provider is now offline.');
    } catch (error) {
      if (mounted) {
        _showMessage(_formatError(error));
      }
    } finally {
      if (mounted) {
        setState(() {
          _isUpdatingAvailability = false;
        });
      }
    }
  }

  Future<void> _pickMotoristProfileImage() async {
    final imageData = await _pickSingleImage();
    if (!mounted || imageData == null) {
      return;
    }

    setState(() {
      _motoristProfileImageData = imageData;
    });
  }

  Future<void> _pickProviderProfileImage() async {
    final imageData = await _pickSingleImage();
    if (!mounted || imageData == null) {
      return;
    }

    setState(() {
      _providerProfileImageData = imageData;
    });
  }

  Future<void> _pickProviderShopImages() async {
    final images = await _pickMultipleImages();
    if (!mounted || images.isEmpty) {
      return;
    }

    setState(() {
      _providerShopImages = images;
    });
  }

  Future<void> _pickRequestImages() async {
    final images = await _pickMultipleImages();
    if (!mounted || images.isEmpty) {
      return;
    }

    setState(() {
      _requestImages = images;
    });
  }

  Future<List<String>> _pickMultipleImages() async {
    try {
      final files = await _imagePicker.pickMultiImage(
        imageQuality: 60,
        maxWidth: 1280,
      );
      final encoded = <String>[];
      for (final file in files) {
        encoded.add(await _encodeImage(file));
      }
      return encoded;
    } catch (_) {
      if (mounted) {
        _showMessage('Unable to pick images.');
      }
      return const [];
    }
  }

  Future<String?> _pickSingleImage() async {
    try {
      final image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 60,
        maxWidth: 1280,
      );
      if (image == null) {
        return null;
      }
      return _encodeImage(image);
    } catch (_) {
      if (mounted) {
        _showMessage('Unable to pick image from gallery.');
      }
      return null;
    }
  }

  Future<String> _encodeImage(XFile image) async {
    final bytes = await image.readAsBytes();
    final extension = image.name.toLowerCase();
    final mime = extension.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return 'data:$mime;base64,${base64Encode(bytes)}';
  }

  Future<void> _fetchProviderLocation() async {
    setState(() {
      _isFetchingProviderLocation = true;
    });

    try {
      final snapshot = await _fetchCurrentAddress();
      if (!mounted || snapshot == null) {
        return;
      }

      setState(() {
        _providerLatitude = snapshot.latitude;
        _providerLongitude = snapshot.longitude;
        _providerLocationLabel = snapshot.label;
        _providerMapUrl = snapshot.mapUrl;
      });
      _showMessage('Provider location captured successfully.');
    } catch (_) {
      if (mounted) {
        _showMessage('Unable to fetch the provider location.');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isFetchingProviderLocation = false;
        });
      }
    }
  }

  Future<void> _fetchRequestLocation() async {
    setState(() {
      _isFetchingRequestLocation = true;
    });

    try {
      final snapshot = await _fetchCurrentAddress();
      if (!mounted || snapshot == null) {
        return;
      }

      setState(() {
        _requestLatitude = snapshot.latitude;
        _requestLongitude = snapshot.longitude;
        _requestLocationController.text = snapshot.label;
        _requestMapUrl = snapshot.mapUrl;
      });

      await _loadNearbyProviders();
      _showMessage('Exact request location captured successfully.');
    } catch (_) {
      if (mounted) {
        _showMessage('Unable to fetch the request location.');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isFetchingRequestLocation = false;
        });
      }
    }
  }

  Future<_LocationSnapshot?> _fetchCurrentAddress() async {
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      _showMessage('Location permission is required to fetch the current address.');
      return null;
    }

    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
      ),
    );
    final label = await _reverseGeocode(position.latitude, position.longitude);
    return _LocationSnapshot(
      latitude: position.latitude,
      longitude: position.longitude,
      label: label,
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=${position.latitude},${position.longitude}',
    );
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

      final address = decoded['address'];
      if (address is Map<String, dynamic>) {
        final parts = <String>[
          address['city']?.toString() ?? address['town']?.toString() ?? address['village']?.toString() ?? '',
          address['suburb']?.toString() ?? address['neighbourhood']?.toString() ?? '',
          address['road']?.toString() ?? '',
        ].where((part) => part.isNotEmpty).toList();

        if (parts.isNotEmpty) {
          return parts.join(', ');
        }
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

  ServiceCatalogRecord? _selectedService(String? id) {
    for (final service in _services) {
      if (service.id == id) {
        return service;
      }
    }
    return null;
  }

  void _selectDirectProvider(ProviderRecord provider) {
    setState(() {
      _selectedDirectProvider = provider;
      _selectedRequestServiceId = provider.serviceId;
    });
    _goToTab('emergency');
    _showMessage('Direct request is set for ${provider.businessName}.');
  }

  void _replaceRequest(SosRequestRecord request) {
    if (!mounted) {
      return;
    }

    setState(() {
      _myRequests = _replaceInList(_myRequests, request);
      _providerQueue = _replaceInList(_providerQueue, request);
    });
  }

  List<SosRequestRecord> _replaceInList(
    List<SosRequestRecord> source,
    SosRequestRecord request,
  ) {
    final items = [...source];
    final index = items.indexWhere((item) => item.id == request.id);
    if (index >= 0) {
      items[index] = request;
    } else {
      items.insert(0, request);
    }
    return items;
  }

  void _syncRingState() {
    final provider = _providerProfile;
    if (provider == null || !provider.isApproved || !provider.isAvailable) {
      _ringTimer?.cancel();
      _ringingRequestId = null;
      return;
    }

    final request = _providerQueue.where((item) {
      if (item.status != 'awaiting_provider') {
        return false;
      }
      if (item.currentNotifiedProviderId != provider.id) {
        return false;
      }
      final expiresAt = DateTime.tryParse(item.ringExpiresAt ?? '');
      return expiresAt != null && expiresAt.isAfter(DateTime.now());
    }).cast<SosRequestRecord?>().firstWhere(
          (item) => item != null,
          orElse: () => null,
        );

    if (request == null) {
      _ringTimer?.cancel();
      _ringingRequestId = null;
      return;
    }

    if (_ringingRequestId == request.id) {
      return;
    }

    _ringTimer?.cancel();
    _ringingRequestId = request.id;
    SystemSound.play(SystemSoundType.alert);
    _ringTimer = Timer.periodic(const Duration(seconds: 3), (timer) {
      final active = _providerQueue.any((item) {
        if (item.id != request.id) {
          return false;
        }
        if (item.currentNotifiedProviderId != provider.id) {
          return false;
        }
        final expiresAt = DateTime.tryParse(item.ringExpiresAt ?? '');
        return expiresAt != null && expiresAt.isAfter(DateTime.now());
      });

      if (!active) {
        timer.cancel();
        _ringingRequestId = null;
        return;
      }

      SystemSound.play(SystemSoundType.alert);
    });
  }

  void _goToTab(String id) {
    final index = _navigationItems.indexWhere((item) => item.id == id);
    if (index < 0) {
      return;
    }

    setState(() {
      _currentIndex = index;
    });
  }

  String _formatError(Object error) {
    return error.toString().replaceFirst('Exception: ', '').trim();
  }

  String _statusLabel(String value) {
    switch (value) {
      case 'awaiting_provider':
        return 'Pending';
      case 'accepted_by_provider':
        return 'Accepted';
      case 'rejected_by_provider':
        return 'Rejected';
      case 'transferred':
        return 'Transferred';
      case 'resolved':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        final normalized = value.replaceAll('_', ' ');
        if (normalized.isEmpty) {
          return value;
        }
        return normalized[0].toUpperCase() + normalized.substring(1);
    }
  }

  Future<void> _logout() async {
    setState(() {
      _currentIndex = 0;
      _selectedRequesterType = 'motorist';
      _selectedDirectProvider = null;
      _providerLoadError = null;
      _requestLoadError = null;
      _ringingRequestId = null;
      _motoristProfile = null;
      _providerProfile = null;
      _nearbyProviders = const [];
      _myRequests = const [];
      _providerQueue = const [];
      _requestImages = [];
      _providerShopImages = [];
      _providerLatitude = null;
      _providerLongitude = null;
      _providerLocationLabel = null;
      _providerMapUrl = null;
      _requestLatitude = null;
      _requestLongitude = null;
      _requestMapUrl = null;
    });

    _ringTimer?.cancel();

    _motoristNameController.clear();
    _motoristPhoneController.clear();
    _motoristAddressController.clear();
    _motoristEmailController.clear();
    _motoristIdNumberController.clear();
    _motoristPinController.text = '1234';
    _providerNameController.clear();
    _providerBusinessController.clear();
    _providerPhoneController.clear();
    _providerAddressController.clear();
    _providerEmailController.clear();
    _providerIdNumberController.clear();
    _providerServiceAreaController.clear();
    _providerPinController.text = '1234';
    _loginPhoneController.clear();
    _loginPinController.text = '1234';
    _resetCurrentPinController.text = '1234';
    _resetNewPinController.clear();
    _resetConfirmPinController.clear();
    _requestIssueController.clear();
    _requestLocationController.clear();
    _requestNoteController.clear();

    _motoristProfileImageData = null;
    _providerProfileImageData = null;

    _showMessage('Logged out successfully.');
  }

  String _formatTimestamp(String value) {
    final parsed = DateTime.tryParse(value);
    if (parsed == null) {
      return value;
    }

    final local = parsed.toLocal();
    final hour = local.hour == 0 ? 12 : (local.hour > 12 ? local.hour - 12 : local.hour);
    final minute = local.minute.toString().padLeft(2, '0');
    final suffix = local.hour >= 12 ? 'PM' : 'AM';
    return '${local.year}-${local.month.toString().padLeft(2, '0')}-${local.day.toString().padLeft(2, '0')} $hour:$minute $suffix';
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

  Future<void> _openHazardsPage() async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => HazardsPage(
          motoristProfile: _motoristProfile,
          providerProfile: _providerProfile,
        ),
      ),
    );
  }

  Future<void> _openEmergencyGuidesPage() async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const EmergencyGuidesPage(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final items = _navigationItems;
    final selectedIndex = _currentIndex >= items.length ? items.length - 1 : _currentIndex;

    return Scaffold(
      appBar: AppBar(
        title: Text(items[selectedIndex].title),
        actions: _isRegistered
            ? [
                IconButton(
                  onPressed: _isLoadingRequests ? null : () => _refreshSignedInData(notifyOnError: true),
                  icon: const Icon(Icons.refresh),
                ),
              ]
            : null,
      ),
      body: SafeArea(
        child: IndexedStack(
          index: selectedIndex,
          children: items.map((item) => item.child).toList(),
        ),
      ),
      bottomNavigationBar: items.length < 2
          ? null
          : NavigationBar(
              labelBehavior: NavigationDestinationLabelBehavior.alwaysHide,
              selectedIndex: selectedIndex,
              onDestinationSelected: (index) {
                setState(() {
                  _currentIndex = index;
                });
              },
              destinations: items.map((item) => item.destination).toList(),
            ),
    );
  }

  Widget _buildRegistrationTab() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _SectionCard(
          title: 'Login',
          subtitle: 'Use phone number and PIN to open the app',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _loginPhoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Phone number'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _loginPinController,
                keyboardType: TextInputType.number,
                obscureText: true,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(4),
                ],
                decoration: const InputDecoration(
                  labelText: '4-digit PIN',
                  hintText: '1234',
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _isAuthenticating ? null : _login,
                  child: Text(
                    _isAuthenticating ? 'Signing in...' : 'Login',
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _openSignUpChoiceModal,
                  icon: const Icon(Icons.person_add_alt_1),
                  label: const Text('Sign up'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildEmergencyTab() {
    final requesterOptions = <DropdownMenuItem<String>>[
      const DropdownMenuItem(value: 'motorist', child: Text('Motorist account')),
      if (_providerProfile != null)
        const DropdownMenuItem(value: 'provider', child: Text('Provider account')),
    ];

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const _HeroBanner(
          title: 'Emergency requests',
          subtitle:
              'One active request per service is allowed. Cancel the current request before creating another in the same category.',
        ),
        const SizedBox(height: 20),
        _SectionCard(
          title: 'Create request',
          subtitle: 'Use current location, exact address, images, and optional direct provider',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_serviceLoadError != null)
                _InlineNotice(
                  message: _serviceLoadError!,
                  color: Colors.red.shade700,
                  background: const Color(0xFFFFEFEF),
                ),
              DropdownButtonFormField<String>(
                initialValue: _selectedRequesterType,
                items: requesterOptions,
                onChanged: (value) {
                  if (value == null) {
                    return;
                  }
                  setState(() {
                    _selectedRequesterType = value;
                  });
                },
                decoration: const InputDecoration(labelText: 'Request with'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _selectedRequestServiceId,
                items: _services
                    .map(
                      (service) => DropdownMenuItem(
                        value: service.id,
                        child: Text(service.name),
                      ),
                    )
                    .toList(),
                onChanged: (value) async {
                  if (value == null) {
                    return;
                  }
                  setState(() {
                    _selectedRequestServiceId = value;
                    if (_selectedDirectProvider?.serviceId != value) {
                      _selectedDirectProvider = null;
                    }
                  });
                  await _loadNearbyProviders();
                },
                decoration: const InputDecoration(labelText: 'Service needed'),
              ),
              const SizedBox(height: 12),
              TextButton.icon(
                onPressed: _isLoadingProviders ? null : () => _loadNearbyProviders(notifyOnError: true),
                icon: const Icon(Icons.near_me_outlined),
                label: const Text('Refresh nearby providers'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _requestIssueController,
                decoration: const InputDecoration(
                  labelText: 'Problem summary',
                  hintText: 'Flat tyre, towing, battery issue, car electrician',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _requestLocationController,
                decoration: const InputDecoration(
                  labelText: 'Exact location',
                  hintText: 'Accra, Newtown, Nii Street',
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 12,
                runSpacing: 8,
                children: [
                  OutlinedButton.icon(
                    onPressed: _isFetchingRequestLocation ? null : _fetchRequestLocation,
                    icon: const Icon(Icons.my_location_outlined),
                    label: Text(
                      _isFetchingRequestLocation ? 'Fetching...' : 'Fetch location',
                    ),
                  ),
                  if ((_requestMapUrl ?? '').isNotEmpty)
                    TextButton(
                      onPressed: () => _openMap(_requestMapUrl!),
                      child: const Text('Open map'),
                    ),
                ],
              ),
              if ((_requestMapUrl ?? '').isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  'Google Maps link is attached to this request.',
                  style: TextStyle(
                    color: Colors.grey.shade700,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
              const SizedBox(height: 12),
              TextField(
                controller: _requestNoteController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'More details',
                  hintText: 'Add car details, blocked road note, or direction hint',
                ),
              ),
              const SizedBox(height: 16),
              _MultiImagePickerCard(
                title: 'Request images',
                subtitle: 'Optional photos the provider can review before accepting',
                buttonLabel: 'Upload request images',
                imageDataList: _requestImages,
                onPressed: _pickRequestImages,
              ),
              if (_selectedDirectProvider != null) ...[
                const SizedBox(height: 16),
                _InlineNotice(
                  message:
                      'Direct provider selected: ${_selectedDirectProvider!.businessName}. Their phone rings first for 30 seconds before other providers can step in.',
                  color: const Color(0xFF0A5C36),
                  background: const Color(0xFFEAF7EF),
                  trailing: TextButton(
                    onPressed: () {
                      setState(() {
                        _selectedDirectProvider = null;
                      });
                    },
                    child: const Text('Clear'),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _isSubmittingRequest ? null : _createEmergencyRequest,
                  icon: const Icon(Icons.sos),
                  label: Text(
                    _isSubmittingRequest ? 'Sending...' : 'Send emergency request',
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _SectionCard(
          title: 'Safety Tools',
          subtitle: 'Report hazards and open emergency guides from the mobile app',
          child: Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: _openHazardsPage,
                  icon: const Icon(Icons.warning_amber_outlined),
                  label: const Text('Hazards'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _openEmergencyGuidesPage,
                  icon: const Icon(Icons.menu_book_outlined),
                  label: const Text('Guides'),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _SectionCard(
          title: 'Active requests',
          subtitle: 'Cancel, track provider routing, or transfer to a provider offer',
          child: _isLoadingRequests
              ? const Center(child: Padding(
                  padding: EdgeInsets.all(16),
                  child: CircularProgressIndicator(),
                ))
              : _activeMyRequests.isEmpty
                  ? const _EmptyState(
                      message: 'No active requests. Create one when you need roadside help.',
                    )
                  : Column(
                      children: _activeMyRequests
                          .map(
                            (request) => Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: _RequestTile(
                                request: request,
                                statusLabel: _statusLabel(request.status),
                                createdAtLabel: _formatTimestamp(request.createdAt),
                                onOpenMap: request.locationMapUrl.isEmpty
                                    ? null
                                    : () => _openMap(request.locationMapUrl),
                                footer: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (request.currentNotifiedProviderName != null)
                                      Text(
                                        'Currently ringing: ${request.currentNotifiedProviderName}',
                                        style: const TextStyle(fontWeight: FontWeight.w600),
                                      ),
                                    if (request.providerOffers.isNotEmpty) ...[
                                      const SizedBox(height: 10),
                                      const Text(
                                        'Provider offers',
                                        style: TextStyle(fontWeight: FontWeight.w700),
                                      ),
                                      const SizedBox(height: 8),
                                      ...request.providerOffers.map(
                                        (offer) => Padding(
                                          padding: const EdgeInsets.only(bottom: 8),
                                          child: _OfferTile(
                                            offer: offer,
                                            onTransfer: _motoristProfile == null ||
                                                    offer.providerId == null ||
                                                    _isTransferringRequest
                                                ? null
                                                : () => _transferRequest(request, offer),
                                          ),
                                        ),
                                      ),
                                    ],
                                    const SizedBox(height: 12),
                                    SizedBox(
                                      width: double.infinity,
                                      child: OutlinedButton(
                                        onPressed: () => _cancelRequest(request),
                                        child: const Text('Cancel current request'),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          )
                          .toList(),
                    ),
        ),
      ],
    );
  }

  Widget _buildProvidersTab() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const _HeroBanner(
          title: 'Nearby providers',
          subtitle:
              'Motorists can view nearby providers and send a direct request to one provider. If they do not respond, the request opens to others.',
        ),
        const SizedBox(height: 20),
        _SectionCard(
          title: 'Provider list',
          subtitle: 'Shows all providers, and uses your captured request location when available',
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      _providerLoadError ??
                          ((_requestLocationController.text.trim().isEmpty)
                              ? 'Showing providers from the database. Fetch current location for better sorting.'
                              : 'Providers are sorted using your current request location when available.'),
                    ),
                  ),
                  TextButton.icon(
                    onPressed: _isLoadingProviders
                        ? null
                        : () => _loadNearbyProviders(notifyOnError: true),
                    icon: const Icon(Icons.refresh),
                    label: const Text('Refresh'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (_isLoadingProviders)
                const Padding(
                  padding: EdgeInsets.all(20),
                  child: CircularProgressIndicator(),
                )
              else if (_nearbyProviders.isEmpty)
                const _EmptyState(
                  message: 'No providers are available for the selected service yet.',
                )
              else
                ..._nearbyProviders.map(
                  (provider) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _ProviderListTile(
                      provider: provider,
                      onDirectRequest: () => _selectDirectProvider(provider),
                      onOpenMap: provider.currentLocationMapUrl.isEmpty
                          ? null
                          : () => _openMap(provider.currentLocationMapUrl),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildProviderRequestsTab() {
    final provider = _providerProfile;

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _HeroBanner(
          title: 'Incoming requests',
          subtitle: provider == null
              ? 'Complete the provider profile from the profile tab.'
              : provider.isApproved
                  ? 'Your phone rings here for 30 seconds when RoadGuide sends a request to you first.'
                  : 'Your provider profile is pending approval. You can still request help, but incoming jobs stay locked until approval.',
        ),
        const SizedBox(height: 20),
        if (provider != null && !provider.isApproved)
          const _InlineNotice(
            message: 'Provider status: pending approval',
            color: Color(0xFFB25B00),
            background: Color(0xFFFFF4E6),
          ),
        if (provider != null && !provider.isApproved) const SizedBox(height: 16),
        _SectionCard(
          title: 'Request queue',
          subtitle: 'Accept, reject, or offer help when the request becomes visible',
          child: provider == null
              ? const Text('No provider profile yet.')
              : !_providerProfile!.isAvailable
                  ? const Text('Turn on provider availability from profile to receive jobs.')
                  : _providerQueue.isEmpty
                      ? const _EmptyState(
                          message: 'No requests are visible to this provider right now.',
                        )
                      : Column(
                          children: _providerQueue
                              .map(
                                (request) => Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: _ProviderRequestCard(
                                    request: request,
                                    onOpenMap: request.locationMapUrl.isEmpty
                                        ? null
                                        : () => _openMap(request.locationMapUrl),
                                    onAccept: !_providerProfile!.isApproved ||
                                            _isSubmittingDecision
                                        ? null
                                        : () => _handleRequestDecision(request, true),
                                    onReject: !_providerProfile!.isApproved ||
                                            _isSubmittingDecision
                                        ? null
                                        : () => _handleRequestDecision(request, false),
                                    onOffer: !_providerProfile!.isApproved ||
                                            _isSendingOffer ||
                                            !request.allowProviderOffers
                                        ? null
                                        : () => _sendOffer(request),
                                    createdAtLabel: _formatTimestamp(request.createdAt),
                                    isRingingNow:
                                        request.currentNotifiedProviderId == _providerProfile!.id,
                                  ),
                                ),
                              )
                              .toList(),
                        ),
        ),
      ],
    );
  }

  Widget _buildHistoryTab() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const _HeroBanner(
          title: 'History',
          subtitle: 'Track your request status, exact address, images, and assigned provider.',
        ),
        const SizedBox(height: 20),
        _SectionCard(
          title: 'Request history',
          subtitle: 'Shows every request record for this account, no matter the status',
          child: _historyRequests.isEmpty
              ? const _EmptyState(
                  message: 'No request history yet.',
                )
              : Column(
                  children: _historyRequests
                      .map(
                        (request) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _RequestTile(
                            request: request,
                            statusLabel: _statusLabel(request.status),
                            createdAtLabel: _formatTimestamp(request.createdAt),
                            onOpenMap: request.locationMapUrl.isEmpty
                                ? null
                                : () => _openMap(request.locationMapUrl),
                            footer: _canCancelRequest(request)
                                ? SizedBox(
                                    width: double.infinity,
                                    child: OutlinedButton(
                                      onPressed: () => _cancelRequest(request),
                                      child: const Text('Cancel request'),
                                    ),
                                  )
                                : null,
                          ),
                        ),
                      )
                      .toList(),
                ),
        ),
      ],
    );
  }

  Widget _buildProfileTab() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const _HeroBanner(
          title: 'Profile',
          subtitle:
              'Motorists do not see a provider account tab. Upgrade from here when you want to become a provider.',
        ),
        const SizedBox(height: 20),
        if (_motoristProfile != null)
          _SectionCard(
            title: 'Motorist profile',
            subtitle: 'Saved account details',
            child: Column(
              children: [
                _SummaryRow(label: 'Name', value: _motoristProfile!.fullName),
                _SummaryRow(label: 'Phone', value: _motoristProfile!.phoneNumber),
                _SummaryRow(label: 'Address', value: _motoristProfile!.address),
                _SummaryRow(label: 'Email', value: _motoristProfile!.email ?? 'Not provided'),
                _SummaryRow(
                  label: 'ID',
                  value: '${_motoristProfile!.idType} • ${_motoristProfile!.idNumber}',
                ),
              ],
            ),
          ),
        if (_motoristProfile != null) const SizedBox(height: 16),
        if (_providerProfile == null && _motoristProfile != null)
          _SectionCard(
            title: 'Become a provider',
            subtitle:
                'Use the motorist details already saved, then add business information and shop images.',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'The provider form only appears here after the motorist account is saved.',
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () {
                    _syncProviderFormFromMotorist();
                    _openProviderRegistrationModal();
                  },
                  child: const Text('Save because a provider'),
                ),
              ],
            ),
          ),
        const SizedBox(height: 16),
        _SectionCard(
          title: 'Reset PIN',
          subtitle: 'Change the 4-digit PIN used on the login screen',
          child: Column(
            children: [
              TextField(
                controller: _resetCurrentPinController,
                keyboardType: TextInputType.number,
                obscureText: true,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(4),
                ],
                decoration: const InputDecoration(
                  labelText: 'Current PIN',
                  hintText: '1234',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _resetNewPinController,
                keyboardType: TextInputType.number,
                obscureText: true,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(4),
                ],
                decoration: const InputDecoration(labelText: 'New 4-digit PIN'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _resetConfirmPinController,
                keyboardType: TextInputType.number,
                obscureText: true,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(4),
                ],
                decoration: const InputDecoration(labelText: 'Confirm new PIN'),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _isResettingPin ? null : _resetPin,
                  icon: const Icon(Icons.lock_reset),
                  label: Text(_isResettingPin ? 'Resetting...' : 'Reset PIN'),
                ),
              ),
            ],
          ),
        ),
        if (_providerProfile != null) ...[
          const SizedBox(height: 16),
          _SectionCard(
            title: 'Provider profile',
            subtitle: _providerProfile!.isApproved
                ? 'Approved provider account'
                : 'Pending approval',
            child: Column(
              children: [
                _SummaryRow(label: 'Owner', value: _providerProfile!.fullName),
                _SummaryRow(label: 'Business', value: _providerProfile!.businessName),
                _SummaryRow(label: 'Phone', value: _providerProfile!.phoneNumber),
                _SummaryRow(label: 'Service', value: _providerProfile!.serviceName),
                _SummaryRow(label: 'Area', value: _providerProfile!.serviceArea),
                _SummaryRow(label: 'Status', value: _providerProfile!.approvalStatus),
                if (_providerProfile!.currentLocationLabel.isNotEmpty)
                  _SummaryRow(
                    label: 'Location',
                    value: _providerProfile!.currentLocationLabel,
                  ),
                if (_providerProfile!.currentLocationMapUrl.isNotEmpty)
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton(
                      onPressed: () => _openMap(_providerProfile!.currentLocationMapUrl),
                      child: const Text('Open provider location in Google Maps'),
                    ),
                  ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Available for requests'),
                  value: _providerProfile!.isAvailable,
                  onChanged: _isUpdatingAvailability ? null : _toggleProviderAvailability,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _openHazardsPage,
                  icon: const Icon(Icons.warning_amber_outlined),
                  label: const Text('Open Hazards'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _openEmergencyGuidesPage,
                  icon: const Icon(Icons.menu_book_outlined),
                  label: const Text('Open Guides'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _logout,
              icon: const Icon(Icons.logout),
              label: const Text('Logout'),
            ),
          ),
        ] else ...[
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _openHazardsPage,
                  icon: const Icon(Icons.warning_amber_outlined),
                  label: const Text('Open Hazards'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _openEmergencyGuidesPage,
                  icon: const Icon(Icons.menu_book_outlined),
                  label: const Text('Open Guides'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _logout,
              icon: const Icon(Icons.logout),
              label: const Text('Logout'),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildMotoristFormFields({required VoidCallback onSaved}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        TextField(
          controller: _motoristNameController,
          decoration: const InputDecoration(labelText: 'Full name'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _motoristPhoneController,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(labelText: 'Phone number'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _motoristAddressController,
          decoration: const InputDecoration(labelText: 'Home address'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _motoristEmailController,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(labelText: 'Email (optional)'),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: _selectedMotoristIdType,
          items: _idTypes
              .map(
                (item) => DropdownMenuItem(
                  value: item,
                  child: Text(item),
                ),
              )
              .toList(),
          onChanged: (value) {
            if (value == null) {
              return;
            }
            setState(() {
              _selectedMotoristIdType = value;
            });
          },
          decoration: const InputDecoration(labelText: 'ID type'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _motoristIdNumberController,
          decoration: const InputDecoration(labelText: 'ID number'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _motoristPinController,
          keyboardType: TextInputType.number,
          obscureText: true,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(4),
          ],
          decoration: const InputDecoration(
            labelText: '4-digit PIN',
            hintText: '1234',
          ),
        ),
        const SizedBox(height: 16),
        _ImagePickerCard(
          title: 'Motorist profile picture',
          subtitle: 'Required for every account',
          buttonLabel: 'Upload picture',
          imageBytes: _decodeImage(_motoristProfileImageData),
          onPressed: _pickMotoristProfileImage,
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: FilledButton(
            onPressed: _isSavingMotorist
                ? null
                : () async {
                    final saved = await _registerMotorist();
                    if (mounted && saved) {
                      onSaved();
                    }
                  },
            child: Text(
              _isSavingMotorist ? 'Saving account...' : 'Save motorist account',
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildProviderFormFields({required VoidCallback onSaved}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
          TextField(
            controller: _providerNameController,
            decoration: const InputDecoration(labelText: 'Full name'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _providerBusinessController,
            decoration: const InputDecoration(labelText: 'Business name'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _providerPhoneController,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'Phone number'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _providerAddressController,
            decoration: const InputDecoration(labelText: 'Business address'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _providerEmailController,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: 'Email (optional)'),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _selectedProviderIdType,
            items: _idTypes
                .map(
                  (item) => DropdownMenuItem(
                    value: item,
                    child: Text(item),
                  ),
                )
                .toList(),
            onChanged: (value) {
              if (value == null) {
                return;
              }
              setState(() {
                _selectedProviderIdType = value;
              });
            },
            decoration: const InputDecoration(labelText: 'ID type'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _providerIdNumberController,
            decoration: const InputDecoration(labelText: 'ID number'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _providerPinController,
            keyboardType: TextInputType.number,
            obscureText: true,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(4),
            ],
            decoration: const InputDecoration(
              labelText: '4-digit PIN',
              hintText: '1234',
            ),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _selectedProviderServiceId,
            items: _services
                .map(
                  (service) => DropdownMenuItem(
                    value: service.id,
                    child: Text(service.name),
                  ),
                )
                .toList(),
            onChanged: (value) {
              if (value == null) {
                return;
              }
              setState(() {
                _selectedProviderServiceId = value;
              });
            },
            decoration: const InputDecoration(labelText: 'Service provided'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _providerServiceAreaController,
            decoration: const InputDecoration(
              labelText: 'Service area',
              hintText: 'Type the areas you cover',
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 8,
            children: [
              OutlinedButton.icon(
                onPressed: _isFetchingProviderLocation ? null : _fetchProviderLocation,
                icon: const Icon(Icons.my_location_outlined),
                label: Text(
                  _isFetchingProviderLocation ? 'Fetching...' : 'Fetch location',
                ),
              ),
              if ((_providerMapUrl ?? '').isNotEmpty)
                TextButton(
                  onPressed: () => _openMap(_providerMapUrl!),
                  child: const Text('Open map'),
                ),
            ],
          ),
          if ((_providerLocationLabel ?? '').isNotEmpty) ...[
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                _providerLocationLabel!,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          ],
          const SizedBox(height: 16),
          _ImagePickerCard(
            title: 'Provider profile picture',
            subtitle: 'Required for provider approval',
            buttonLabel: 'Upload picture',
            imageBytes: _decodeImage(_providerProfileImageData),
            onPressed: _pickProviderProfileImage,
          ),
          const SizedBox(height: 12),
          _MultiImagePickerCard(
            title: 'Shop and work images',
            subtitle: 'Upload at least three images',
            buttonLabel: 'Upload shop images',
            imageDataList: _providerShopImages,
            onPressed: _pickProviderShopImages,
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _isSavingProvider
                  ? null
                  : () async {
                      final saved = await _saveProviderProfile();
                      if (mounted && saved) {
                        onSaved();
                      }
                    },
              child: Text(
                _isSavingProvider ? 'Saving provider...' : 'Save provider profile',
              ),
            ),
          ),
      ],
    );
  }
}

class _HeroBanner extends StatelessWidget {
  const _HeroBanner({
    required this.title,
    required this.subtitle,
  });

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF081A3A),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            subtitle,
            style: const TextStyle(color: Colors.white70, fontSize: 15),
          ),
        ],
      ),
    );
  }
}

class _InlineNotice extends StatelessWidget {
  const _InlineNotice({
    required this.message,
    required this.color,
    required this.background,
    this.trailing,
  });

  final String message;
  final Color color;
  final Color background;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              message,
              style: TextStyle(color: color, fontWeight: FontWeight.w600),
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text(subtitle, style: TextStyle(color: Colors.grey.shade700)),
            const SizedBox(height: 16),
            child,
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 88,
            child: Text(
              label,
              style: TextStyle(
                color: Colors.grey.shade700,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}

class _RequestTile extends StatelessWidget {
  const _RequestTile({
    required this.request,
    required this.statusLabel,
    required this.createdAtLabel,
    this.onOpenMap,
    this.footer,
  });

  final SosRequestRecord request;
  final String statusLabel;
  final String createdAtLabel;
  final VoidCallback? onOpenMap;
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F9FC),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${request.ticket} • ${request.emergencyType}',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
              _StatusBadge(label: statusLabel),
            ],
          ),
          const SizedBox(height: 8),
          Text(request.addressString),
          if (request.locationMapUrl.isNotEmpty)
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: onOpenMap,
                child: const Text('Open exact location'),
              ),
            ),
          const SizedBox(height: 4),
          Text('Requester: ${request.requesterName} (${request.requesterType})'),
          const SizedBox(height: 4),
          Text('Required service: ${request.requiredServiceType}'),
          const SizedBox(height: 4),
          Text('Assigned provider: ${request.assignedProviderName ?? 'Pending'}'),
          const SizedBox(height: 4),
          if (request.directProviderName != null)
            Text('Direct provider: ${request.directProviderName}'),
          if (request.directProviderName != null) const SizedBox(height: 4),
          Text('Note: ${request.note.isEmpty ? 'No additional note' : request.note}'),
          if (request.requestImages.isNotEmpty) const SizedBox(height: 8),
          if (request.requestImages.isNotEmpty)
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: request.requestImages
                  .map((image) => _ImageThumb(dataUrl: image))
                  .toList(),
            ),
          const SizedBox(height: 4),
          Text('Created: $createdAtLabel'),
          if (footer != null) const SizedBox(height: 12),
          if (footer != null) footer!,
        ],
      ),
    );
  }
}

class _ProviderRequestCard extends StatelessWidget {
  const _ProviderRequestCard({
    required this.request,
    required this.createdAtLabel,
    required this.isRingingNow,
    required this.onAccept,
    required this.onReject,
    required this.onOffer,
    this.onOpenMap,
  });

  final SosRequestRecord request;
  final String createdAtLabel;
  final bool isRingingNow;
  final VoidCallback? onAccept;
  final VoidCallback? onReject;
  final VoidCallback? onOffer;
  final VoidCallback? onOpenMap;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F9FC),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${request.ticket} • ${request.requesterName}',
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          if (isRingingNow) ...[
            const SizedBox(height: 8),
            const _StatusBadge(label: 'Ringing now'),
          ],
          const SizedBox(height: 8),
          Text('Emergency: ${request.emergencyType}'),
          const SizedBox(height: 4),
          Text('Requester type: ${request.requesterType}'),
          const SizedBox(height: 4),
          Text('Requested service: ${request.requiredServiceType}'),
          const SizedBox(height: 4),
          Text('Location: ${request.addressString}'),
          if (request.locationMapUrl.isNotEmpty)
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: onOpenMap,
                child: const Text('Open exact location'),
              ),
            ),
          const SizedBox(height: 4),
          Text('Note: ${request.note.isEmpty ? 'No additional note' : request.note}'),
          if (request.requestImages.isNotEmpty) const SizedBox(height: 8),
          if (request.requestImages.isNotEmpty)
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: request.requestImages
                  .map((image) => _ImageThumb(dataUrl: image))
                  .toList(),
            ),
          const SizedBox(height: 8),
          Text('Created: $createdAtLabel'),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: onAccept,
                  child: const Text('Accept'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton(
                  onPressed: onReject,
                  child: const Text('Reject'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: onOffer,
              child: const Text('Offer to help'),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final color = switch (label) {
      'Accepted by provider' => Colors.green,
      'Rejected by provider' => Colors.red,
      'Resolved' => Colors.blue,
      'Cancelled' => Colors.grey,
      _ => const Color(0xFFFF6A00),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w700,
          fontSize: 12,
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F9FC),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(message),
    );
  }
}

class _ImagePickerCard extends StatelessWidget {
  const _ImagePickerCard({
    required this.title,
    required this.subtitle,
    required this.buttonLabel,
    required this.imageBytes,
    required this.onPressed,
  });

  final String title;
  final String subtitle;
  final String buttonLabel;
  final Uint8List? imageBytes;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F9FC),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(subtitle),
          const SizedBox(height: 12),
          if (imageBytes != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.memory(
                imageBytes!,
                height: 140,
                width: 140,
                fit: BoxFit.cover,
              ),
            ),
          if (imageBytes != null) const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: onPressed,
            icon: const Icon(Icons.photo_library_outlined),
            label: Text(buttonLabel),
          ),
        ],
      ),
    );
  }
}

class _MultiImagePickerCard extends StatelessWidget {
  const _MultiImagePickerCard({
    required this.title,
    required this.subtitle,
    required this.buttonLabel,
    required this.imageDataList,
    required this.onPressed,
  });

  final String title;
  final String subtitle;
  final String buttonLabel;
  final List<String> imageDataList;
  final VoidCallback onPressed;

  Uint8List? _decode(String dataUrl) {
    try {
      final parts = dataUrl.split(',');
      return base64Decode(parts.length > 1 ? parts.last : dataUrl);
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F9FC),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(subtitle),
          const SizedBox(height: 12),
          if (imageDataList.isNotEmpty)
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: imageDataList
                  .map(_decode)
                  .whereType<Uint8List>()
                  .map(
                    (bytes) => ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.memory(
                        bytes,
                        height: 84,
                        width: 84,
                        fit: BoxFit.cover,
                      ),
                    ),
                  )
                  .toList(),
            ),
          if (imageDataList.isNotEmpty) const SizedBox(height: 12),
          Text(
            imageDataList.isEmpty
                ? 'No shop images selected yet'
                : '${imageDataList.length} image(s) selected',
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: onPressed,
            icon: const Icon(Icons.add_a_photo_outlined),
            label: Text(buttonLabel),
          ),
        ],
      ),
    );
  }
}

class _NavigationItem {
  const _NavigationItem({
    required this.id,
    required this.title,
    required this.destination,
    required this.child,
  });

  final String id;
  final String title;
  final NavigationDestination destination;
  final Widget child;
}

class _ProviderListTile extends StatelessWidget {
  const _ProviderListTile({
    required this.provider,
    required this.onDirectRequest,
    this.onOpenMap,
  });

  final ProviderRecord provider;
  final VoidCallback onDirectRequest;
  final VoidCallback? onOpenMap;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F9FC),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  provider.businessName,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
              _StatusBadge(
                label: provider.isApproved ? 'Approved' : 'Pending',
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text('Owner: ${provider.fullName}'),
          const SizedBox(height: 4),
          Text('Service: ${provider.serviceName}'),
          const SizedBox(height: 4),
          Text('Area: ${provider.serviceArea}'),
          if ((provider.distanceKm ?? 0) > 0) ...[
            const SizedBox(height: 4),
            Text('Distance: ${provider.distanceKm!.toStringAsFixed(2)} km'),
          ],
          if (provider.currentLocationLabel.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text('Location: ${provider.currentLocationLabel}'),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: provider.isApproved ? onDirectRequest : null,
                  child: const Text('Direct request'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton(
                  onPressed: provider.currentLocationMapUrl.isEmpty ? null : onOpenMap,
                  child: const Text('Open map'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _OfferTile extends StatelessWidget {
  const _OfferTile({
    required this.offer,
    this.onTransfer,
  });

  final ProviderOfferRecord offer;
  final VoidCallback? onTransfer;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFE3E8F0)),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            offer.providerName,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Text(offer.message),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: onTransfer,
              child: const Text('Transfer request here'),
            ),
          ),
        ],
      ),
    );
  }
}

class _ImageThumb extends StatelessWidget {
  const _ImageThumb({required this.dataUrl});

  final String dataUrl;

  @override
  Widget build(BuildContext context) {
    try {
      final parts = dataUrl.split(',');
      final bytes = base64Decode(parts.length > 1 ? parts.last : dataUrl);
      return ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Image.memory(
          bytes,
          width: 72,
          height: 72,
          fit: BoxFit.cover,
        ),
      );
    } catch (_) {
      return const SizedBox.shrink();
    }
  }
}

class _LocationSnapshot {
  const _LocationSnapshot({
    required this.latitude,
    required this.longitude,
    required this.label,
    required this.mapUrl,
  });

  final double latitude;
  final double longitude;
  final String label;
  final String mapUrl;
}

const List<String> _idTypes = [
  'Ghana Card',
  'Passport',
  'Driver License',
  'Voter ID',
];
