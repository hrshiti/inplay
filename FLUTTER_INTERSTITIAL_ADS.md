# Flutter: In-Between (Interstitial) AdMob Ads — Implementation Spec

This file is the complete, self-contained spec + code for adding YouTube-style
"in-between" ads to the Flutter WebView wrapper app. The web app (this repo)
already emits everything Flutter needs — this document only concerns the
**Flutter project**, which lives outside this repo. Hand this whole file to
whoever works on the Flutter app (or paste it into an AI coding session there).

Nothing here requires adding new screens or changing your "Flutter just
renders the web app in one WebView" architecture. You are adding:
1. Three new Dart files (drop into `lib/ads/`).
2. Two function calls into your **existing** WebView screen/controller.
3. A few `pubspec.yaml` / manifest entries.

---

## 1. What already exists (context, do not re-implement)

The web app (deployed on your domain) already:

- Shows native AdMob **Native Advanced** ads via a `updateAdPosition` JS→Flutter
  bridge call (this already works — do not touch that code).
- Reports the user's subscription status via a new bridge call:
  `window.flutter_inappwebview.callHandler('userPremiumStatus', { isPremium, timestamp })`
  — fired once on load and whenever it changes.
- Reports ad-trigger boundary events via a new bridge call:
  `window.flutter_inappwebview.callHandler('adTriggerEvent', { surface, event, contentId, watchedSeconds?, index?, timestamp })`

  Where:
  - `surface`: `'watch'` (long-form movie/series player) or `'shorts'` (TikTok-style vertical reels feed)
  - `event`: `'video_end'`, `'episode_change'`, `'playback_tick'` (fired every 60s of active long-form playback), or `'swipe'` (fired each time a new reel becomes active)

- Exposes a **public, no-auth** backend endpoint you can poll for ad configuration,
  editable by the admin team from the existing admin dashboard (Admin → Settings →
  "Interstitial Ad Settings" section):

  ```
  GET https://<your-api-domain>/api/app-settings
  ```

  Response shape (relevant subset):
  ```json
  {
    "success": true,
    "data": {
      "adSettings": {
        "interstitialEnabled": true,
        "skipAdsForPremium": true,
        "androidAdUnitId": "ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx",
        "iosAdUnitId": "ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx",
        "cooldownMinutes": 3,
        "maxAdsPerSession": 6,
        "maxAdsPerDay": 15,
        "watchIntervalMinutes": 12,
        "shortsSwipeInterval": 10
      }
    }
  }
  ```

  This is how ad cadence is tuned **without an app store release** — the admin
  team edits values in the dashboard, Flutter re-fetches this on every app
  cold start (and optionally periodically).

---

## 2. Requirements checklist — gather these before wiring the code below

- [ ] AdMob account with this app already registered (should already exist since
      Native Advanced ads work).
- [ ] A **new Interstitial ad unit** created in AdMob for Android, and one for iOS.
      Paste the IDs into the admin dashboard's "Interstitial Ad Settings" section
      (`androidAdUnitId` / `iosAdUnitId`) — do NOT hardcode them in Dart, so they
      stay remotely editable.
- [ ] Confirm `google_mobile_ads` is already in `pubspec.yaml` (it must be, for
      Native Advanced to work) — note its version, some APIs below need >= 5.x.
- [ ] AdMob App ID already present in `android/app/src/main/AndroidManifest.xml`
      (`<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID".../>`)
      and `ios/Runner/Info.plist` (`GADApplicationIdentifier`) — should already be
      there for Native Advanced.
- [ ] Test device IDs registered so you can test without risking AdMob policy
      strikes from clicking your own live ads
      (`RequestConfiguration(testDeviceIds: [...])`).
- [ ] UMP (User Messaging Platform) consent already gathered somewhere in the app
      before ANY ad request (required by AdMob policy for EEA/UK users) — if this
      isn't done yet for the existing Native Advanced ads, it needs to happen
      once, globally, before `MobileAds.instance.initialize()`. Code included below.
- [ ] iOS: App Tracking Transparency (ATT) prompt implemented before ads request
      IDFA — code included below (`app_tracking_transparency` package).

---

## 3. `pubspec.yaml` additions

```yaml
dependencies:
  google_mobile_ads: ^5.2.0   # keep in sync with whatever version you already use for Native Advanced
  shared_preferences: ^2.3.2
  http: ^1.2.2
  app_tracking_transparency: ^2.0.6   # iOS only, safe no-op on Android
```

---

## 4. `lib/ads/ad_config.dart` — fetches remote ad settings

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class AdConfig {
  final bool interstitialEnabled;
  final bool skipAdsForPremium;
  final String androidAdUnitId;
  final String iosAdUnitId;
  final int cooldownMinutes;
  final int maxAdsPerSession;
  final int maxAdsPerDay;
  final int watchIntervalMinutes;
  final int shortsSwipeInterval;

  const AdConfig({
    this.interstitialEnabled = true,
    this.skipAdsForPremium = true,
    this.androidAdUnitId = '',
    this.iosAdUnitId = '',
    this.cooldownMinutes = 3,
    this.maxAdsPerSession = 6,
    this.maxAdsPerDay = 15,
    this.watchIntervalMinutes = 12,
    this.shortsSwipeInterval = 10,
  });

  factory AdConfig.fromJson(Map<String, dynamic> json) => AdConfig(
        interstitialEnabled: json['interstitialEnabled'] ?? true,
        skipAdsForPremium: json['skipAdsForPremium'] ?? true,
        androidAdUnitId: json['androidAdUnitId'] ?? '',
        iosAdUnitId: json['iosAdUnitId'] ?? '',
        cooldownMinutes: json['cooldownMinutes'] ?? 3,
        maxAdsPerSession: json['maxAdsPerSession'] ?? 6,
        maxAdsPerDay: json['maxAdsPerDay'] ?? 15,
        watchIntervalMinutes: json['watchIntervalMinutes'] ?? 12,
        shortsSwipeInterval: json['shortsSwipeInterval'] ?? 10,
      );

  static const _apiBase = 'https://YOUR_API_DOMAIN/api'; // replace with real deployed API base

  static Future<AdConfig> fetch() async {
    try {
      final res = await http
          .get(Uri.parse('$_apiBase/app-settings'))
          .timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        final adSettings = body['data']?['adSettings'];
        if (adSettings != null) return AdConfig.fromJson(adSettings);
      }
    } catch (_) {
      // Network failure — fall back to defaults below rather than blocking the app.
    }
    return const AdConfig();
  }
}
```

Replace `YOUR_API_DOMAIN` with your deployed backend's real base URL (the same
one the web app uses via `VITE_API_BASE_URL`).

---

## 5. `lib/ads/ad_frequency_manager.dart` — cooldown / session / day caps

```dart
import 'package:shared_preferences/shared_preferences.dart';
import 'ad_config.dart';

class AdFrequencyManager {
  AdFrequencyManager._();
  static final AdFrequencyManager instance = AdFrequencyManager._();

  AdConfig config = const AdConfig();
  bool isPremiumUser = false;

  DateTime? _lastShownAt;
  int _adsShownThisSession = 0;

  // Per-surface trigger counters (reset once an ad is shown)
  int _shortsSwipeCount = 0;
  DateTime? _watchWindowStart;

  static const _prefsDayCountKey = 'ad_shown_count_day';
  static const _prefsDayKey = 'ad_shown_day_stamp';

  Future<void> init() async {
    config = await AdConfig.fetch();
  }

  void setPremium(bool premium) {
    isPremiumUser = premium;
  }

  Future<int> _getTodayCount() async {
    final prefs = await SharedPreferences.getInstance();
    final todayStamp = DateTime.now().toIso8601String().substring(0, 10);
    final storedStamp = prefs.getString(_prefsDayKey);
    if (storedStamp != todayStamp) {
      await prefs.setString(_prefsDayKey, todayStamp);
      await prefs.setInt(_prefsDayCountKey, 0);
      return 0;
    }
    return prefs.getInt(_prefsDayCountKey) ?? 0;
  }

  Future<void> _incrementTodayCount() async {
    final prefs = await SharedPreferences.getInstance();
    final current = await _getTodayCount();
    await prefs.setInt(_prefsDayCountKey, current + 1);
  }

  /// Call this on every 'adTriggerEvent' from the web bridge. Returns true if
  /// an interstitial should be shown right now.
  Future<bool> shouldShowAd({
    required String surface, // 'watch' | 'shorts'
    required String event,   // 'video_end' | 'episode_change' | 'playback_tick' | 'swipe'
  }) async {
    if (!config.interstitialEnabled) return false;
    if (isPremiumUser && config.skipAdsForPremium) return false;
    if (_adsShownThisSession >= config.maxAdsPerSession) return false;

    final todayCount = await _getTodayCount();
    if (todayCount >= config.maxAdsPerDay) return false;

    if (_lastShownAt != null) {
      final elapsed = DateTime.now().difference(_lastShownAt!);
      if (elapsed.inMinutes < config.cooldownMinutes) return false;
    }

    if (surface == 'shorts') {
      if (event != 'swipe') return false;
      _shortsSwipeCount++;
      return _shortsSwipeCount >= config.shortsSwipeInterval;
    }

    // surface == 'watch'
    if (event == 'video_end' || event == 'episode_change') {
      // Natural break point — always eligible once cooldown/caps pass.
      return true;
    }
    if (event == 'playback_tick') {
      _watchWindowStart ??= DateTime.now();
      final minutesInWindow =
          DateTime.now().difference(_watchWindowStart!).inMinutes;
      return minutesInWindow >= config.watchIntervalMinutes;
    }
    return false;
  }

  /// Call this right after an interstitial is actually shown to reset counters.
  Future<void> recordAdShown() async {
    _lastShownAt = DateTime.now();
    _adsShownThisSession++;
    _shortsSwipeCount = 0;
    _watchWindowStart = null;
    await _incrementTodayCount();
  }
}
```

---

## 6. `lib/ads/interstitial_ad_controller.dart` — preload/show

```dart
import 'dart:io' show Platform;
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'ad_config.dart';

class InterstitialAdController {
  InterstitialAdController._();
  static final InterstitialAdController instance = InterstitialAdController._();

  InterstitialAd? _ad;
  bool _isLoading = false;

  String _adUnitId(AdConfig config) =>
      Platform.isIOS ? config.iosAdUnitId : config.androidAdUnitId;

  bool get isReady => _ad != null;

  void preload(AdConfig config) {
    final unitId = _adUnitId(config);
    if (unitId.isEmpty || _isLoading || _ad != null) return;
    _isLoading = true;

    InterstitialAd.load(
      adUnitId: unitId,
      request: const AdRequest(),
      adLoadCallback: InterstitialAdLoadCallback(
        onAdLoaded: (ad) {
          _ad = ad;
          _isLoading = false;
        },
        onAdFailedToLoad: (error) {
          _ad = null;
          _isLoading = false;
        },
      ),
    );
  }

  /// Shows the preloaded ad if ready, then immediately preloads the next one.
  /// Returns true if an ad was actually shown.
  Future<bool> showIfReady(AdConfig config) async {
    final ad = _ad;
    if (ad == null) return false;

    _ad = null;
    ad.fullScreenContentCallback = FullScreenContentCallback(
      onAdDismissedFullScreenContent: (ad) {
        ad.dispose();
        preload(config); // always keep one ready for next time
      },
      onAdFailedToShowFullScreenContent: (ad, error) {
        ad.dispose();
        preload(config);
      },
    );
    await ad.show();
    return true;
  }
}
```

---

## 7. Wiring into your existing WebView screen (the only edits to existing files)

In `main.dart` (app startup, once):

```dart
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'ads/ad_config.dart';
import 'ads/ad_frequency_manager.dart';
import 'ads/interstitial_ad_controller.dart';
// iOS ATT — safe no-op on Android
import 'package:app_tracking_transparency/app_tracking_transparency.dart';

Future<void> initAds() async {
  // 1. iOS ATT prompt (must happen before ad requests use IDFA)
  final status = await AppTrackingTransparency.trackingAuthorizationStatus;
  if (status == TrackingStatus.notDetermined) {
    await AppTrackingTransparency.requestTrackingAuthorization();
  }

  // 2. UMP consent (EEA/UK) — gather before ad requests. If you already do
  //    this for the existing Native Advanced ads elsewhere, skip this block
  //    and just call MobileAds.instance.initialize() once globally.
  final consentInfo = ConsentInformation.instance;
  final params = ConsentRequestParameters();
  consentInfo.requestConsentInfoUpdate(
    params,
    () async {
      if (await consentInfo.isConsentFormAvailable()) {
        // Optionally show the form via ConsentForm.loadAndShowConsentFormIfRequired
      }
      await MobileAds.instance.initialize();
      await _loadAdConfigAndPreload();
    },
    (error) async {
      await MobileAds.instance.initialize();
      await _loadAdConfigAndPreload();
    },
  );
}

Future<void> _loadAdConfigAndPreload() async {
  await AdFrequencyManager.instance.init();
  InterstitialAdController.instance.preload(AdFrequencyManager.instance.config);
}
```

Call `initAds()` once, e.g. in your root widget's `initState()`.

In your **existing** WebView screen, wherever you currently register the
`updateAdPosition` JS handler for `flutter_inappwebview` (the file with
`addJavaScriptHandler(handlerName: 'updateAdPosition', ...)`), add two more
handlers right next to it:

```dart
controller.addJavaScriptHandler(
  handlerName: 'userPremiumStatus',
  callback: (args) {
    final payload = args.isNotEmpty ? args[0] as Map : {};
    AdFrequencyManager.instance.setPremium(payload['isPremium'] == true);
    return null;
  },
);

controller.addJavaScriptHandler(
  handlerName: 'adTriggerEvent',
  callback: (args) async {
    final payload = args.isNotEmpty ? args[0] as Map : {};
    final surface = payload['surface'] as String? ?? '';
    final event = payload['event'] as String? ?? '';

    final should = await AdFrequencyManager.instance.shouldShowAd(
      surface: surface,
      event: event,
    );
    if (should) {
      final shown = await InterstitialAdController.instance
          .showIfReady(AdFrequencyManager.instance.config);
      if (shown) await AdFrequencyManager.instance.recordAdShown();
    }
    return null;
  },
);
```

That's it — no new screens, no changes to your navigation/rendering model.
The WebView keeps rendering every page exactly as it does today; these two
handlers just listen for the two new bridge calls the web app already sends,
and pop a full-screen interstitial over the WebView at the right moments.

---

## 8. Notes / edge cases

- Interstitials are shown as a native full-screen overlay on top of the
  WebView — they do not require any change to how pages render underneath.
- If `androidAdUnitId`/`iosAdUnitId` are empty in the admin dashboard, ads
  simply never load (`preload` no-ops), so you can ship this disabled and
  turn it on later purely from the admin panel.
- `maxAdsPerDay` persists via `shared_preferences` across app restarts;
  `maxAdsPerSession` and the swipe/time counters reset each app launch.
- Ads currently trigger only at video/shorts boundaries (matching YouTube's
  behavior), not on general app navigation (search, content details, etc.) —
  intentional, per prior discussion.
