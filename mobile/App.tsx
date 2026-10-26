import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  BackHandler,
  KeyboardAvoidingView,
  Linking,
  Platform,
  PermissionsAndroid,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ApiError, api, type CitizenProfile, type CitizenProfileUpdate, type EmergencyCategory, type Incident, type IncidentSeverity, type IncidentStatus, type IncidentSummary, type User } from "./src/api";
import * as IntentLauncher from "expo-intent-launcher";
import { normalizeSosPhoneNumber, prepareSosCall, SOS_CALL_CATEGORIES, startSosCountdown, type SosCallCategory, type SosSetupResult } from "./src/sosCall";
import { SOS_CALL_DEMO_NUMBER } from "./src/sosCallConfig";
import { createIncidentReportDraft, getHomeIncidentCategoryRoute, getReportInitialCategory } from "./src/homeCategories";
import { isReportSubmitDisabled, validateReportForm } from "./src/reportValidation";
import { validateProfileForm } from "./src/profileValidation";
import { AppIcon, type AppIconName } from "./src/AppIcon";

type Screen = "home" | "report" | "history" | "detail" | "confirmation" | "profile" | "assistance" | "about" | "sos";
const categories: EmergencyCategory[] = ["Police", "Fire", "Medical", "Other"];
const severities: IncidentSeverity[] = ["Low", "Moderate", "High", "Critical"];
const callCategoryIcons: Record<SosCallCategory, AppIconName> = {
  Police: "shield", Fire: "fire", Medical: "medical", Disaster: "disaster",
  Women: "person", Child: "child", Elderly: "elderly", Railway: "railway", "General SOS": "phone",
};
const incidentCategoryIcons: Record<EmergencyCategory, AppIconName> = { Police: "shield", Fire: "fire", Medical: "medical", Other: "info" };
const statusLabels: Record<IncidentStatus, string> = {
  Received: "Received",
  UnderReview: "Under review",
  Assigned: "Assigned",
  Resolved: "Resolved",
};

const colors = {
  navy: "#172B43",
  red: "#C9343B",
  redDark: "#A72931",
  ink: "#1C2B3A",
  muted: "#617182",
  line: "#DFE5E9",
  canvas: "#F5F7F8",
  white: "#FFFFFF",
  green: "#277258",
};

export default function App() {
  return <SafeAreaProvider><Emergency112App /></SafeAreaProvider>;
}

function Emergency112App() {
  const [user, setUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [submittedIncident, setSubmittedIncident] = useState<Incident | null>(null);
  const [reportPrefillCategory, setReportPrefillCategory] = useState<EmergencyCategory | null>(null);
  const [infoReturnScreen, setInfoReturnScreen] = useState<Screen>("home");
  const [assistanceReturnScreen, setAssistanceReturnScreen] = useState<Screen>("home");
  const [sosSetup, setSosSetup] = useState<SosSetupResult | null>(null);
  const [sosPermissionBusy, setSosPermissionBusy] = useState(false);
  const [sosNotice, setSosNotice] = useState("");
  const sosStartLocked = useRef(false);
  const sosPhoneNumber = normalizeSosPhoneNumber(SOS_CALL_DEMO_NUMBER);

  useEffect(() => {
    let mounted = true;
    api.me().then((current) => {
      if (mounted) {
        if (current.roles.includes("Citizen")) setUser(current);
        else setError("Sign in with a citizen account to use this app.");
      }
    }).catch((failure) => {
      if (mounted && (!(failure instanceof ApiError) || failure.status !== 401)) {
        setError(failure instanceof Error ? failure.message : "Could not reach the Emergency112 API.");
      }
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const loadHistory = useCallback(async () => {
    setRefreshing(true);
    try {
      setIncidents(await api.incidents());
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Incident history could not be loaded.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) void loadHistory();
  }, [user, loadHistory]);

  useEffect(() => {
    if (screen !== "detail" || !selectedId) return;
    let active = true;
    const refresh = async () => {
      try {
        const next = await api.incident(selectedId);
        if (active) { setSelectedIncident(next); setError(""); }
      } catch (failure) {
        if (active) setError(failure instanceof Error ? failure.message : "Incident details could not be loaded.");
      }
    };
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [screen, selectedId]);

  const signIn = async () => {
    setBusy(true);
    setError("");
    try {
      const current = await api.login(email.trim(), password);
      if (!current.roles.includes("Citizen")) {
        await api.logout().catch(() => undefined);
        throw new Error("Sign in with a citizen account. Administrator accounts are not supported in this app.");
      }
      setUser(current);
      setPassword("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Sign-in failed. Check the API address and try again.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    try { await api.logout(); } catch { /* local credential is cleared in api.logout's finally block */ }
    setUser(null);
    setScreen("home");
    setSelectedIncident(null);
    setPassword("");
    setError("");
    setBusy(false);
  };

  const submitIncident = async (draft: { category: EmergencyCategory; description: string; severity: IncidentSeverity; location: string }) => {
    setBusy(true);
    setError("");
    try {
      const created = await api.createIncident(draft);
      setSubmittedIncident(created);
      setIncidents((existing) => [created, ...existing]);
      setScreen("confirmation");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The simulated report could not be submitted.");
    } finally {
      setBusy(false);
    }
  };

  const openIncident = (id: string) => {
    setSelectedId(id);
    setSelectedIncident(null);
    setError("");
    setScreen("detail");
  };

  const openReportForCategory = (category: EmergencyCategory) => {
    const route = getHomeIncidentCategoryRoute(category);
    setReportPrefillCategory(route.initialCategory);
    setError("");
    setScreen(route.screen);
  };

  const requestDirectCallPermission = async (category: SosCallCategory) => {
    if (Platform.OS !== "android") return false;
    const permission = PermissionsAndroid.PERMISSIONS.CALL_PHONE;
    if (await PermissionsAndroid.check(permission)) return true;
    const result = await PermissionsAndroid.request(permission, {
      title: "Allow direct SOS calls?",
      message: `Emergency112 needs this permission to place your ${category} call directly after the five-second countdown. It calls only the configured demo contact. If you decline, you can open the dialer and tap Call yourself.`,
      buttonPositive: "Allow direct calls",
      buttonNegative: "Not now",
    });
    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const continueSosCall = async (category: SosCallCategory) => {
    setSosPermissionBusy(true);
    setSosNotice("");
    try {
      const prepared = await prepareSosCall(category, SOS_CALL_DEMO_NUMBER, () => requestDirectCallPermission(category));
      if (prepared.status === "invalid-number") {
        sosStartLocked.current = false;
        setSosNotice("SOS Call is not configured. Set SOS_CALL_DEMO_NUMBER in mobile/src/sosCallConfig.ts to a valid international number you control.");
        return;
      }
      setSosSetup(prepared);
      setScreen("sos");
    } finally {
      setSosPermissionBusy(false);
    }
  };

  const startSosCall = (category: SosCallCategory) => {
    if (!sosPhoneNumber || sosPermissionBusy || sosStartLocked.current) return;
    sosStartLocked.current = true;
    Alert.alert(
      `Start ${category} SOS call?`,
      `After five seconds, Emergency112 will call only the configured demo contact for this ${category} call. It is not connected to real emergency services. Android will ask for direct-call permission first.`,
      [
        { text: "Cancel", style: "cancel", onPress: () => { sosStartLocked.current = false; } },
        { text: "Continue", style: "destructive", onPress: () => { void continueSosCall(category); } },
      ],
      { cancelable: false },
    );
  };

  const exitSos = (notice = "") => {
    sosStartLocked.current = false;
    setSosPermissionBusy(false);
    setSosSetup(null);
    setSosNotice(notice);
    setScreen("home");
  };

  if (loading) {
    return <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}><StatusBar barStyle="dark-content" /><View style={styles.centerState}><ActivityIndicator size="large" color={colors.navy} /><Text style={styles.centerText}>Checking your account…</Text></View></SafeAreaView>;
  }

  if (!user && screen !== "about" && screen !== "assistance") {
    return <SignInView
      email={email}
      password={password}
      passwordVisible={passwordVisible}
      busy={busy}
      error={error}
      onEmail={setEmail}
      onPassword={setPassword}
      onTogglePassword={() => setPasswordVisible((visible) => !visible)}
      onSignIn={() => void signIn()}
      onAbout={() => { setError(""); setScreen("about"); }}
    />;
  }

  return <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
    <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
    <View style={styles.appFrame}>
      <View style={styles.topBar}>
        <View style={styles.brandMark}><AppIcon name="phone" size={21} color={colors.white} strokeWidth={2} /></View>
        <View style={styles.brandTextWrap}><Text style={styles.brandName}>Emergency112</Text><Text style={styles.brandCaption}>{user ? "Citizen account" : "Project information"}</Text></View>
        {screen !== "sos" && (user ? <><Pressable accessibilityRole="button" accessibilityLabel="About Emergency112" onPress={() => { setInfoReturnScreen(screen); setError(""); setScreen("about"); }} style={styles.topAction}><Text style={styles.topActionText}>About</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Sign out" disabled={busy} onPress={() => void signOut()} style={styles.signOutButton}><Text style={styles.signOutText}>Sign out</Text></Pressable></> : <Pressable accessibilityRole="button" onPress={() => setScreen("home")} style={styles.topAction}><Text style={styles.topActionText}>Sign in</Text></Pressable>)}
      </View>

      <View style={styles.demoBanner} accessibilityRole="text"><Text style={styles.demoBannerText}>Not for real emergencies · no responders are contacted</Text></View>
      {screen === "home" && sosNotice ? <NoticeBox text={sosNotice} /> : null}
      {error && screen !== "report" ? <ErrorBanner message={error} /> : null}

      {screen === "home" && user && <HomeView user={user} incidents={incidents} sosPhoneNumber={sosPhoneNumber} sosBusy={sosPermissionBusy} onSosCall={startSosCall} onSelectIncidentCategory={openReportForCategory} onReport={() => { setReportPrefillCategory(null); setError(""); setScreen("report"); }} onHistory={() => { setError(""); setScreen("history"); }} onAssistance={() => { setAssistanceReturnScreen("home"); setScreen("assistance"); }} onOpenIncident={openIncident} />}
      {screen === "report" && <ReportView initialCategory={reportPrefillCategory} busy={busy} error={error} onBack={() => { setError(""); setScreen("home"); }} onSubmit={submitIncident} />}
      {screen === "history" && <HistoryView incidents={incidents} refreshing={refreshing} onRefresh={() => void loadHistory()} onBack={() => setScreen("home")} onOpen={openIncident} />}
      {screen === "detail" && <DetailView incident={selectedIncident} refreshing={refreshing} onRefresh={() => { if (selectedId) void api.incident(selectedId).then(setSelectedIncident).catch((failure) => setError(failure.message)); }} onBack={() => { setError(""); setScreen("history"); }} />}
      {screen === "confirmation" && submittedIncident && <ConfirmationView incident={submittedIncident} onHistory={() => { setScreen("history"); void loadHistory(); }} onHome={() => setScreen("home")} />}
      {screen === "profile" && user && <ProfileView onDisplayName={(displayName) => setUser({ ...user, displayName })} onAbout={() => { setInfoReturnScreen("profile"); setScreen("about"); }} onHelp={() => { setAssistanceReturnScreen("profile"); setScreen("assistance"); }} onSignOut={() => void signOut()} />}
      {screen === "assistance" && <AssistanceView onBack={() => setScreen(user ? assistanceReturnScreen : "about")} onReport={() => { setError(""); setScreen(user ? "report" : "home"); }} signedIn={!!user} />}
      {screen === "about" && <AboutView onBack={() => setScreen(infoReturnScreen)} onAssistance={() => { setAssistanceReturnScreen("about"); setScreen("assistance"); }} />}
      {screen === "sos" && sosSetup && sosSetup.status !== "invalid-number" && <SosCallView setup={sosSetup} onExit={exitSos} />}

      {user && screen !== "about" && screen !== "assistance" && screen !== "sos" && <View style={styles.bottomNav}>
        <NavItem label="Home" icon="home" selected={screen === "home"} onPress={() => setScreen("home")} />
        <NavItem label="Report" icon="report" selected={screen === "report"} onPress={() => { setReportPrefillCategory(null); setError(""); setScreen("report"); }} />
        <NavItem label="History" icon="history" selected={screen === "history" || screen === "detail"} onPress={() => { setError(""); setScreen("history"); }} />
        <NavItem label="Profile" icon="profile" selected={screen === "profile"} onPress={() => { setError(""); setScreen("profile"); }} />
      </View>}
    </View>
  </SafeAreaView>;
}

function SignInView(props: {
  email: string;
  password: string;
  passwordVisible: boolean;
  busy: boolean;
  error: string;
  onAbout(): void;
  onEmail(value: string): void;
  onPassword(value: string): void;
  onTogglePassword(): void;
  onSignIn(): void;
}) {
  return <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
    <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
    <KeyboardAvoidingView style={styles.signInFrame} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.signInScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.signInBrand}><View style={styles.brandMarkLarge}><AppIcon name="phone" size={29} color={colors.white} strokeWidth={2} /></View><Text style={styles.brandNameLarge}>Emergency112</Text><Text style={styles.brandCaption}>Citizen incident reporting</Text></View>
        <View style={styles.authCard}>
          <Text style={styles.eyebrow}>CITIZEN ACCOUNT</Text>
          <Text style={styles.authTitle}>Sign in to continue</Text>
          <Text style={styles.authDescription}>Use your existing Emergency112 citizen account.</Text>
          <NoticeBox text="Not for real emergencies. This app does not notify or dispatch responders." />
          {props.error ? <ErrorBanner message={props.error} /> : null}
          <FieldLabel label="Email address"><TextInput
            style={styles.input}
            value={props.email}
            onChangeText={props.onEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            accessibilityLabel="Email address"
            placeholder="you@example.com"
            placeholderTextColor="#9AA5B1"
          /></FieldLabel>
          <FieldLabel label="Password"><View style={styles.passwordRow}><TextInput
            style={[styles.input, styles.passwordInput]}
            value={props.password}
            onChangeText={props.onPassword}
            secureTextEntry={!props.passwordVisible}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            accessibilityLabel="Password"
            placeholder="Enter your password"
            placeholderTextColor="#9AA5B1"
            onSubmitEditing={props.onSignIn}
            returnKeyType="go"
          /><Pressable
            accessibilityRole="button"
            accessibilityLabel={props.passwordVisible ? "Hide password" : "Show password"}
            accessibilityState={{ selected: props.passwordVisible }}
            onPress={props.onTogglePassword}
            style={styles.passwordToggle}
          ><Text style={styles.passwordToggleText}>{props.passwordVisible ? "Hide" : "Show"}</Text></Pressable></View></FieldLabel>
          <ActionButton title="Sign in" onPress={props.onSignIn} disabled={props.busy || !props.email.trim() || !props.password} loading={props.busy} />
          <Text style={styles.accountNote}>Need an account? Create a citizen account on the Emergency112 website first.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={props.onAbout} style={styles.aboutLink}><Text style={styles.aboutLinkText}>About this project and its limits</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function HomeView(props: { user: User; incidents: IncidentSummary[]; sosPhoneNumber: string | null; sosBusy: boolean; onSosCall(category: SosCallCategory): void; onSelectIncidentCategory(category: EmergencyCategory): void; onReport(): void; onHistory(): void; onAssistance(): void; onOpenIncident(id: string): void }) {
  return <ScrollView style={styles.contentScroll} contentContainerStyle={styles.screenContent}>
    <Text style={styles.eyebrow}>CITIZEN HOME</Text>
    <Text style={styles.pageTitle}>Welcome, {props.user.displayName.split(" ")[0]}</Text>
    <Text style={styles.pageSubtitle}>Report an incident or track an existing record.</Text>
    <View style={styles.sosCard}>
      <Text style={styles.sosTitle}>Call your configured contact</Text>
      <Text style={styles.sosCopy}>SOS calls use the same five-second countdown and can be cancelled before the call starts.</Text>
      {props.sosPhoneNumber
        ? <Text selectable style={styles.sosDestination}>Call destination: {props.sosPhoneNumber}</Text>
        : <Text style={styles.sosSetupMessage}>Set SOS_CALL_DEMO_NUMBER in mobile/src/sosCallConfig.ts to a valid international number you control. Call categories are disabled until configured.</Text>}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="General SOS call to configured demo contact after a cancellable five-second countdown"
        accessibilityState={{ disabled: !props.sosPhoneNumber || props.sosBusy, busy: props.sosBusy }}
        disabled={!props.sosPhoneNumber || props.sosBusy}
        onPress={() => props.onSosCall("General SOS")}
        style={({ pressed }) => [styles.generalSosButton, (!props.sosPhoneNumber || props.sosBusy) && styles.actionButtonDisabled, pressed && styles.pressed]}
      ><AppIcon name="phone" size={38} color={colors.white} strokeWidth={2} /><Text style={styles.generalSosLabel}>SOS</Text></Pressable>
      <Text style={styles.sosExplanation}>Calls the configured demo contact after a five-second countdown. You can cancel at any time before it starts.</Text>
      <Text style={styles.callCategoryHeading}>Other call categories</Text>
      <View style={styles.sosCategoryGrid}>{SOS_CALL_CATEGORIES.filter((category) => category !== "General SOS").map((category) => <SosCallCategoryCard
        key={category}
        category={category}
        disabled={!props.sosPhoneNumber || props.sosBusy}
        busy={props.sosBusy}
        onPress={props.onSosCall}
      />)}</View>
      <Text style={styles.callSafetyNote}>Student project only. Calls go to the configured demo contact; Emergency112 is not connected to emergency services.</Text>
    </View>
    <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Create an incident report</Text></View>
    <Text style={styles.homeSectionCopy}>Choose a category to open the report form, or start a general report.</Text>
    <ActionButton title="Create a report" onPress={props.onReport} fullWidth />
    <View style={styles.categoryGrid}>{categories.map((category) => <Pressable
      key={category}
      accessibilityRole="button"
      accessibilityLabel={`Create a ${category} incident report`}
      onPress={() => props.onSelectIncidentCategory(category)}
      style={({ pressed }) => [styles.categoryCard, pressed && styles.pressed]}
    ><View style={styles.categoryMark}><AppIcon name={incidentCategoryIcons[category]} size={19} color="#38536c" /></View><Text style={styles.categoryName}>{category}</Text></Pressable>)}</View>
    <ActionButton title="Assistance information" variant="outline" onPress={props.onAssistance} fullWidth />
    <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Recent incidents</Text><Pressable accessibilityRole="button" onPress={props.onHistory} style={styles.sectionAction}><Text style={styles.textAction}>View history</Text></Pressable></View>
    {props.incidents.length === 0
      ? <EmptyState title="No incidents yet" detail="Reports you submit will appear here with their current status." />
      : props.incidents.slice(0, 3).map((incident) => <IncidentCard key={incident.id} incident={incident} onPress={() => props.onOpenIncident(incident.id)} />)}
  </ScrollView>;
}

function SosCallCategoryCard(props: { category: SosCallCategory; disabled: boolean; busy: boolean; onPress(category: SosCallCategory): void }) {
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${props.category} SOS Call. Starts a five-second countdown to the configured demo contact.`}
    accessibilityState={{ disabled: props.disabled, busy: props.busy }}
    disabled={props.disabled}
    onPress={() => props.onPress(props.category)}
    style={({ pressed }) => [styles.sosCategoryCard, props.disabled && styles.actionButtonDisabled, pressed && !props.disabled && styles.pressed]}
  >
    <View style={styles.sosCategoryMark}><AppIcon name={callCategoryIcons[props.category]} size={19} color={colors.navy} /></View>
    <View style={styles.sosCategoryCopy}><Text style={styles.sosCategoryName}>{props.category}</Text><Text style={styles.sosCategoryHint}>{props.busy ? "Preparing call…" : "5-second countdown"}</Text></View>
  </Pressable>;
}

type SosCallStatus = "countdown" | "calling" | "returned" | "permission-denied" | "failed" | "dialer-opened" | "cancelled";

function SosCallView(props: { setup: Exclude<SosSetupResult, { status: "invalid-number" }>; onExit(notice?: string): void }) {
  const phoneNumber = props.setup.phoneNumber;
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  const [status, setStatus] = useState<SosCallStatus>(props.setup.status === "ready" ? "countdown" : "permission-denied");
  const [message, setMessage] = useState(props.setup.status === "permission-denied"
    ? "Direct-call permission was not granted. No call was placed. You can open the dialer and tap Call yourself."
    : "");

  useEffect(() => {
    if (props.setup.status !== "ready") return;
    let countdownPending = true;
    const cancelCountdown = startSosCountdown({
      onTick: setSecondsRemaining,
      onCall: async () => {
        countdownPending = false;
        setStatus("calling");
        setMessage("Opening the phone app to call your configured contact…");
        try {
          await IntentLauncher.startActivityAsync("android.intent.action.CALL", { data: `tel:${phoneNumber}` });
          setStatus("returned");
          setMessage("You returned to Emergency112. The app cannot verify whether the call connected or ended.");
        } catch {
          setStatus("failed");
          setMessage("Android could not start a direct call. No call was confirmed. You can open the dialer and tap Call yourself.");
        }
      },
      onCallError: () => {
        setStatus("failed");
        setMessage("Android could not start a direct call. No call was confirmed. You can open the dialer and tap Call yourself.");
      },
    });

    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active" && countdownPending) {
        countdownPending = false;
        cancelCountdown();
        setStatus("cancelled");
        setMessage("The countdown was stopped because you left the app. No call was placed.");
      }
    });

    return () => {
      countdownPending = false;
      appStateSubscription.remove();
      cancelCountdown();
    };
  }, [phoneNumber, props.setup.status]);

  useEffect(() => {
    const backSubscription = BackHandler.addEventListener("hardwareBackPress", () => {
      props.onExit(status === "countdown" ? "Countdown cancelled. No call was placed." : "");
      return true;
    });
    return () => backSubscription.remove();
  }, [props.onExit, status]);

  const openSystemDialer = async () => {
    try {
      await Linking.openURL(`tel:${phoneNumber}`);
      setStatus("dialer-opened");
      setMessage("The phone dialer is open with the configured number. Review it and tap Call to place the call.");
    } catch {
      setMessage("No phone dialer could be opened on this device. No call was placed.");
    }
  };

  const countdownActive = status === "countdown";
  return <ScrollView style={styles.contentScroll} contentContainerStyle={styles.sosScreenContent}>
    <Text style={styles.eyebrow}>{props.setup.category.toUpperCase()} · CALL CONTACT</Text>
    <Text style={styles.pageTitle}>SOS Call</Text>
    <Text style={styles.pageSubtitle}>Category: {props.setup.category}. This calls only the configured demo contact; real emergency services are not connected.</Text>
    <View style={styles.sosDestinationCard}>
      <Text style={styles.cardLabel}>CALL DESTINATION</Text>
      <Text selectable style={styles.sosPhoneNumber}>{phoneNumber}</Text>
    </View>

    {countdownActive ? <>
      <Text style={styles.countdownLabel}>Calling in</Text>
      <Text accessibilityLiveRegion="polite" accessibilityLabel={`${secondsRemaining} seconds remaining`} style={styles.sosCountdown}>{secondsRemaining}</Text>
      <Text style={styles.countdownHint}>Direct-call permission is already granted. Cancel before the countdown ends to stop the call.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Cancel countdown; do not call" onPress={() => props.onExit("Countdown cancelled. No call was placed.")} style={({ pressed }) => [styles.cancelCountdownButton, pressed && styles.pressed]}>
        <Text style={styles.cancelCountdownText}>Cancel countdown</Text>
      </Pressable>
    </> : <>
      <NoticeBox text={message} />
      {(status === "permission-denied" || status === "failed") && <ActionButton title="Open phone dialer" onPress={() => void openSystemDialer()} fullWidth />}
      {status === "calling" && <View style={styles.callingState}><ActivityIndicator size="large" color={colors.red} /><Text style={styles.centerText}>Opening phone app…</Text></View>}
      {status !== "calling" && <ActionButton title="Return to home" variant="outline" onPress={() => props.onExit()} fullWidth />}
    </>}
    <Text style={styles.sosSafetyText}>Emergency112 is an academic prototype. It cannot contact or dispatch emergency responders.</Text>
  </ScrollView>;
}

function ReportView(props: { initialCategory: EmergencyCategory | null; busy: boolean; error: string; onBack(): void; onSubmit(draft: { category: EmergencyCategory; description: string; severity: IncidentSeverity; location: string }): Promise<void> }) {
  const [category, setCategory] = useState<EmergencyCategory | null>(() => getReportInitialCategory(props.initialCategory));
  const [severity, setSeverity] = useState<IncidentSeverity | null>(null);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const submissionLock = useRef(false);
  const validity = validateReportForm({ category, description, severity, acknowledgedSimulation: confirmed });
  const submit = async () => {
    if (submissionLock.current || isReportSubmitDisabled({ category, description, severity, acknowledgedSimulation: confirmed }, props.busy) || !category || !severity) return;
    submissionLock.current = true;
    try {
      await props.onSubmit(createIncidentReportDraft(category, severity, description, location));
    } finally {
      submissionLock.current = false;
    }
  };

  return <ScrollView style={styles.contentScroll} contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
    <Pressable accessibilityRole="button" onPress={props.onBack} style={styles.backButton}><Text style={styles.backButtonText}>‹  Back</Text></Pressable>
    <Text style={styles.eyebrow}>NEW INCIDENT</Text><Text style={styles.pageTitle}>Describe what happened</Text>
    <Text style={styles.pageSubtitle}>Add the details you want to include. Location is optional.</Text>
    <NoticeBox text="This simulated report will not alert or dispatch emergency responders." />
    {props.error ? <ErrorBanner message={props.error} /> : null}
    <FieldLabel label="Incident category"><View style={[styles.choiceWrap, !validity.category && styles.invalidChoiceGroup]}>{categories.map((item) => <ChoiceChip key={item} label={item} selected={category === item} onPress={() => setCategory(item)} />)}</View>{!validity.category && <Text style={styles.fieldHintError}>Choose a category.</Text>}</FieldLabel>
    <FieldLabel label="Short description"><TextInput
      style={[styles.input, styles.multilineInput, !validity.description && styles.inputInvalid]}
      value={description}
      onChangeText={setDescription}
      maxLength={500}
      multiline
      textAlignVertical="top"
      accessibilityLabel="Short description"
      placeholder="Add a short description…"
      placeholderTextColor="#9AA5B1"
    /></FieldLabel>
    <Text style={styles.characterCount}>{description.length}/500</Text>
    {!validity.description && <Text style={styles.fieldHintError}>{description.trim() ? "Enter at least five non-space characters." : "Enter a short description."}</Text>}
    <FieldLabel label="Severity"><View style={[styles.choiceWrap, !validity.severity && styles.invalidChoiceGroup]}>{severities.map((item) => <ChoiceChip key={item} label={item} selected={severity === item} onPress={() => setSeverity(item)} />)}</View>{!validity.severity && <Text style={styles.fieldHintError}>Choose a severity level.</Text>}</FieldLabel>
    <FieldLabel label="Location · optional"><TextInput
      style={styles.input}
      value={location}
      onChangeText={setLocation}
      maxLength={160}
      accessibilityLabel="Location (optional)"
      placeholder="Building, room, or area"
      placeholderTextColor="#9AA5B1"
    /></FieldLabel>
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }} onPress={() => setConfirmed((value) => !value)} style={styles.confirmRow}>
      <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}><Text style={styles.checkboxMark}>{confirmed ? "✓" : ""}</Text></View>
      <Text style={styles.confirmText}>I understand this report is simulated and will not notify emergency services.</Text>
    </Pressable>
    {!validity.acknowledgedSimulation && <Text style={styles.fieldHintError}>Confirm the simulation notice to continue.</Text>}
    <ActionButton title="Submit report" onPress={() => void submit()} disabled={isReportSubmitDisabled({ category, description, severity, acknowledgedSimulation: confirmed }, props.busy)} loading={props.busy} fullWidth />
  </ScrollView>;
}

function HistoryView(props: { incidents: IncidentSummary[]; refreshing: boolean; onRefresh(): void; onBack(): void; onOpen(id: string): void }) {
  return <ScrollView style={styles.contentScroll} contentContainerStyle={styles.screenContent} refreshControl={<RefreshControl refreshing={props.refreshing} onRefresh={props.onRefresh} tintColor={colors.red} />}>
    <View style={styles.sectionHeading}><View><Text style={styles.eyebrow}>YOUR RECORDS</Text><Text style={styles.pageTitle}>Incident history</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Refresh incident history" onPress={props.onRefresh} style={styles.refreshButton}><Text style={styles.refreshText}>Refresh</Text></Pressable></View>
    <Text style={styles.pageSubtitle}>Pull down or refresh to check for the latest status updates.</Text>
    {props.incidents.length === 0
      ? <EmptyState title="No incidents yet" detail="Reports you submit will appear here with their reference and status." />
      : props.incidents.map((incident) => <IncidentCard key={incident.id} incident={incident} onPress={() => props.onOpen(incident.id)} />)}
  </ScrollView>;
}

function DetailView(props: { incident: Incident | null; refreshing: boolean; onRefresh(): void; onBack(): void }) {
  if (!props.incident) return <View style={styles.detailLoading}><ActivityIndicator color={colors.red} /><Text style={styles.centerText}>Loading incident…</Text><Pressable accessibilityRole="button" onPress={props.onBack}><Text style={styles.textAction}>Back to history</Text></Pressable></View>;
  const incident = props.incident;
  return <ScrollView style={styles.contentScroll} contentContainerStyle={styles.screenContent} refreshControl={<RefreshControl refreshing={props.refreshing} onRefresh={props.onRefresh} tintColor={colors.red} />}>
    <Pressable accessibilityRole="button" onPress={props.onBack} style={styles.backButton}><Text style={styles.backButtonText}>‹  Incident history</Text></Pressable>
    <Text style={styles.eyebrow}>INCIDENT {incident.reference}</Text><Text style={styles.pageTitle}>{incident.category} incident</Text>
    <View style={styles.detailStatusRow}><StatusPill status={incident.currentStatus} /><Pressable accessibilityRole="button" onPress={props.onRefresh} style={styles.refreshButton}><Text style={styles.refreshText}>Refresh status</Text></Pressable></View>
    <View style={styles.detailCard}><Text style={styles.cardLabel}>DESCRIPTION</Text><Text style={styles.detailDescription}>{incident.description}</Text><View style={styles.detailDivider} /><DetailLine label="Severity" value={incident.severity} /><DetailLine label="Location" value={incident.location || "Not provided"} /><DetailLine label="Submitted" value={formatDate(incident.createdAtUtc)} /></View>
    <Text style={styles.sectionTitle}>Status timeline</Text>
    {incident.statusHistory.length === 0 ? <EmptyState title="No status updates yet" detail="The incident timeline will appear here." /> : incident.statusHistory.map((item, index) => <View key={item.id} style={styles.timelineRow}><View style={styles.timelineTrack}><View style={[styles.timelineDot, index === 0 && styles.timelineDotActive]} />{index < incident.statusHistory.length - 1 && <View style={styles.timelineLine} />}</View><View style={styles.timelineCopy}><Text style={styles.timelineStatus}>{statusLabels[item.toStatus]}</Text><Text style={styles.timelineNote}>{item.note || "Status updated"}</Text><Text style={styles.timelineDate}>{item.fromStatus ? `Updated by ${item.changedBy} · Administrator` : `Reported by ${item.changedBy}`} · {formatDate(item.changedAtUtc)}</Text></View></View>)}
    {incident.assignments.length > 0 && <><Text style={styles.sectionTitle}>Simulated unit assignments</Text><Text style={styles.timelineNote}>Fictional assignments only; no responders were dispatched.</Text>{incident.assignments.map((assignment) => <View key={assignment.id} style={styles.assignmentCard}><Text style={styles.assignmentName}>{assignment.unitCode} · {assignment.unitName}</Text><Text style={styles.timelineNote}>{assignment.category} · {assignment.releasedAtUtc ? "Assignment ended" : "Active assignment"}</Text></View>)}</>}
  </ScrollView>;
}

function ConfirmationView(props: { incident: Incident; onHistory(): void; onHome(): void }) {
  return <ScrollView style={styles.contentScroll} contentContainerStyle={styles.confirmationContent}>
    <View style={styles.successMark}><Text style={styles.successMarkText}>✓</Text></View>
    <Text style={styles.eyebrow}>REPORT RECORDED</Text><Text style={styles.pageTitle}>Your report is saved</Text>
    <Text style={styles.pageSubtitle}>Saved to the project database. No emergency services were notified.</Text>
    <View style={styles.confirmationCard}><Text style={styles.cardLabel}>INCIDENT REFERENCE</Text><Text selectable style={styles.referenceText}>{props.incident.reference}</Text><StatusPill status={props.incident.currentStatus} /><View style={styles.detailDivider} /><DetailLine label="Category" value={props.incident.category} /><DetailLine label="Severity" value={props.incident.severity} /><DetailLine label="Submitted" value={formatDate(props.incident.createdAtUtc)} /></View>
    <ActionButton title="View incident history" onPress={props.onHistory} fullWidth /><ActionButton title="Return to home" variant="outline" onPress={props.onHome} fullWidth />
  </ScrollView>;
}

function ProfileView(props: { onDisplayName(value: string): void; onAbout(): void; onHelp(): void; onSignOut(): void }) {
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [form, setForm] = useState<CitizenProfileUpdate>({ fullName: "", phoneNumber: "", trustedContactName: "", trustedContactPhoneNumber: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [attemptedSave, setAttemptedSave] = useState(false);
  const validity = validateProfileForm(form);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.profile();
      setProfile(result);
      setForm({
        fullName: result.fullName ?? "",
        phoneNumber: result.phoneNumber ?? "",
        trustedContactName: result.trustedContactName ?? "",
        trustedContactPhoneNumber: result.trustedContactPhoneNumber ?? "",
      });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Account information could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  const update = (key: keyof CitizenProfileUpdate, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setNotice("");
  };

  const saveProfile = async () => {
    setAttemptedSave(true);
    if (!validity.valid || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const saved = await api.updateProfile({
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        trustedContactName: form.trustedContactName.trim(),
        trustedContactPhoneNumber: form.trustedContactPhoneNumber.trim(),
      });
      setProfile(saved);
      setForm({ fullName: saved.fullName ?? "", phoneNumber: saved.phoneNumber ?? "", trustedContactName: saved.trustedContactName ?? "", trustedContactPhoneNumber: saved.trustedContactPhoneNumber ?? "" });
      props.onDisplayName(saved.fullName);
      setNotice("Profile changes saved to your account.");
      setAttemptedSave(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Profile changes could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const removeTrustedContact = () => {
    update("trustedContactName", "");
    update("trustedContactPhoneNumber", "");
    setNotice("Save changes to remove the trusted contact from your account.");
  };

  return <KeyboardAvoidingView style={styles.profileFrame} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView style={styles.contentScroll} contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
      <Text style={styles.pageTitle}>Profile</Text>
      <Text style={styles.pageSubtitle}>Account details and an optional trusted contact.</Text>
      {loading ? <View style={styles.profileLoading}><ActivityIndicator color={colors.navy} /><Text style={styles.centerText}>Loading account details…</Text></View> : error && !profile ? <>
        <ErrorBanner message={error} />
        <ActionButton title="Try again" onPress={() => void loadProfile()} variant="outline" fullWidth />
      </> : profile ? <>
        {error ? <ErrorBanner message={error} /> : null}
        {notice ? <NoticeBox text={notice} /> : null}
        <View style={styles.profileCard}>
          <Text style={styles.sectionTitle}>Account details</Text>
          <FieldLabel label="Full name"><TextInput style={[styles.input, attemptedSave && !validity.fullName && styles.inputInvalid]} value={form.fullName} onChangeText={(value) => update("fullName", value)} maxLength={80} autoComplete="name" textContentType="name" accessibilityLabel="Full name" placeholder="Full name" placeholderTextColor="#9AA5B1" /></FieldLabel>
          {attemptedSave && !validity.fullName && <Text style={styles.fieldHintError}>Enter a name with at least two characters.</Text>}
          <FieldLabel label="Email address"><TextInput style={[styles.input, styles.readOnlyInput]} value={profile.email} editable={false} accessibilityLabel="Email address, read only" /></FieldLabel>
          <Text style={styles.fieldHint}>Email is managed by your signed-in account.</Text>
          <FieldLabel label="Phone number · optional"><TextInput style={[styles.input, attemptedSave && !validity.phoneNumber && styles.inputInvalid]} value={form.phoneNumber} onChangeText={(value) => update("phoneNumber", value)} maxLength={24} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" accessibilityLabel="Phone number, optional" placeholder="Add a phone number" placeholderTextColor="#9AA5B1" /></FieldLabel>
          {attemptedSave && !validity.phoneNumber && <Text style={styles.fieldHintError}>Enter a valid phone number or leave this blank.</Text>}
        </View>
        <View style={styles.profileCard}>
          <View style={styles.profileSectionHeading}><Text style={styles.sectionTitle}>Trusted emergency contact</Text>{(form.trustedContactName || form.trustedContactPhoneNumber) ? <Pressable accessibilityRole="button" onPress={removeTrustedContact} style={styles.inlineAction}><Text style={styles.textAction}>Remove</Text></Pressable> : null}</View>
          <Text style={styles.fieldHint}>Optional. Stored on your account for this project; it does not change the SOS call destination.</Text>
          {profile.trustedContactName && profile.trustedContactPhoneNumber ? <Text style={styles.trustedContactStatus}>Contact saved to your account</Text> : <Text style={styles.trustedContactStatus}>No trusted contact added</Text>}
          <FieldLabel label="Contact name"><TextInput style={[styles.input, attemptedSave && !validity.trustedContact && !!form.trustedContactName.trim() && styles.inputInvalid]} value={form.trustedContactName} onChangeText={(value) => update("trustedContactName", value)} maxLength={80} autoComplete="off" accessibilityLabel="Trusted contact name" placeholder="Contact name" placeholderTextColor="#9AA5B1" /></FieldLabel>
          <FieldLabel label="Contact phone number"><TextInput style={[styles.input, attemptedSave && !validity.trustedContact && !!form.trustedContactPhoneNumber.trim() && styles.inputInvalid]} value={form.trustedContactPhoneNumber} onChangeText={(value) => update("trustedContactPhoneNumber", value)} maxLength={24} keyboardType="phone-pad" autoComplete="off" accessibilityLabel="Trusted contact phone number" placeholder="Contact phone number" placeholderTextColor="#9AA5B1" /></FieldLabel>
          {attemptedSave && !validity.trustedContact && <Text style={styles.fieldHintError}>Enter both contact fields with a valid phone number, or leave both blank.</Text>}
        </View>
        <ActionButton title="Save profile" onPress={() => void saveProfile()} disabled={!validity.valid || saving} loading={saving} fullWidth />
        <View style={styles.profileCard}>
          <Text style={styles.sectionTitle}>More information</Text>
          <DetailLine label="Account and privacy" value="Profile details are stored with your account." />
          <Pressable accessibilityRole="button" onPress={props.onAbout} style={styles.profileLink}><Text style={styles.textAction}>About Emergency112</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={props.onHelp} style={styles.profileLink}><Text style={styles.textAction}>Help and assistance</Text></Pressable>
        </View>
        <ActionButton title="Sign out" onPress={props.onSignOut} variant="outline" fullWidth />
      </> : null}
    </ScrollView>
  </KeyboardAvoidingView>;
}

function AssistanceView(props: { onBack(): void; onReport(): void; signedIn: boolean }) {
  return <ScrollView style={styles.contentScroll} contentContainerStyle={styles.screenContent}>
    <Pressable accessibilityRole="button" onPress={props.onBack} style={styles.backButton}><Text style={styles.backButtonText}>‹  Back</Text></Pressable>
    <Text style={styles.eyebrow}>ASSISTANCE</Text>
    <Text style={styles.pageTitle}>Choose a safe next step</Text>
    <Text style={styles.pageSubtitle}>No phone contact is configured for this app.</Text>
    <View style={styles.urgentInfo}>
      <Text style={styles.urgentInfoTitle}>For a real emergency</Text>
      <Text style={styles.urgentInfoText}>Contact the official emergency service for your location directly. Emergency112 cannot reach them for you.</Text>
    </View>
    <ActionButton title={props.signedIn ? "Create an incident report" : "Return to sign in"} onPress={props.onReport} fullWidth />
  </ScrollView>;
}

function AboutView(props: { onBack(): void; onAssistance(): void }) {
  return <ScrollView style={styles.contentScroll} contentContainerStyle={styles.screenContent}>
    <Pressable accessibilityRole="button" onPress={props.onBack} style={styles.backButton}><Text style={styles.backButtonText}>‹  Back</Text></Pressable>
    <Text style={styles.eyebrow}>PROJECT INFORMATION</Text>
    <Text style={styles.pageTitle}>About Emergency112</Text>
    <Text style={styles.pageSubtitle}>A college project exploring incident reporting and status tracking.</Text>
    <NoticeBox text="Emergency112 is an academic prototype and is not for real emergencies. It is not connected to any emergency service and does not notify or dispatch responders." />
    <View style={styles.aboutInfoCard}>
      <Text style={styles.sectionTitle}>What this app demonstrates</Text>
      <Text style={styles.aboutInfoText}>• Sign in with a citizen account shared with the website</Text>
      <Text style={styles.aboutInfoText}>• Create and review incident records stored by the project API</Text>
      <Text style={styles.aboutInfoText}>• Follow simulated status updates from the admin dashboard</Text>
      <Text style={styles.aboutInfoText}>• View fictional response-unit assignments in an incident timeline</Text>
    </View>
    <ActionButton title="View assistance information" variant="outline" onPress={props.onAssistance} fullWidth />
  </ScrollView>;
}

function IncidentCard(props: { incident: IncidentSummary; onPress(): void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${props.incident.reference}, ${props.incident.category}, ${statusLabels[props.incident.currentStatus]}`} onPress={props.onPress} style={styles.incidentCard}>
    <View style={styles.incidentTop}><Text style={styles.incidentCategory}>{props.incident.category}</Text><StatusPill status={props.incident.currentStatus} /></View>
    <Text style={styles.incidentDescription} numberOfLines={2}>{props.incident.description}</Text>
    <View style={styles.incidentBottom}><Text selectable style={styles.incidentMeta}>{props.incident.reference}</Text><Text style={styles.incidentMeta}>{formatDate(props.incident.createdAtUtc)}</Text></View>
  </Pressable>;
}

function StatusPill({ status }: { status: IncidentStatus }) {
  const style = status === "Resolved" ? styles.statusResolved : status === "Assigned" ? styles.statusAssigned : status === "UnderReview" ? styles.statusReview : styles.statusReceived;
  return <View style={[styles.statusPill, style]}><Text style={[styles.statusText, status === "Resolved" && styles.statusTextResolved]}>{statusLabels[status]}</Text></View>;
}

function ActionButton(props: { title: string; onPress(): void; variant?: "primary" | "outline"; disabled?: boolean; loading?: boolean; fullWidth?: boolean }) {
  const outline = props.variant === "outline";
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!props.disabled, busy: !!props.loading }} disabled={props.disabled} onPress={props.onPress} style={({ pressed }) => [styles.actionButton, outline && styles.actionButtonOutline, props.disabled && styles.actionButtonDisabled, props.fullWidth && styles.fullWidthButton, pressed && !props.disabled && styles.pressed]}>
    {props.loading ? <ActivityIndicator color={outline ? colors.navy : colors.white} /> : <Text style={[styles.actionButtonText, outline && styles.actionButtonOutlineText]}>{props.title}</Text>}
  </Pressable>;
}

function ChoiceChip(props: { label: string; selected: boolean; onPress(): void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected: props.selected }} onPress={props.onPress} style={[styles.choiceChip, props.selected && styles.choiceChipSelected]}><Text style={[styles.choiceText, props.selected && styles.choiceTextSelected]}>{props.label}</Text></Pressable>;
}

function NavItem(props: { label: string; icon: AppIconName; selected: boolean; onPress(): void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: props.selected }} onPress={props.onPress} style={styles.navItem}><View style={[styles.navIndicator, props.selected && styles.navIndicatorSelected]} /><AppIcon name={props.icon} size={19} color={props.selected ? colors.navy : colors.muted} /><Text style={[styles.navLabel, props.selected && styles.navLabelSelected]}>{props.label}</Text></Pressable>;
}

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>{label}</Text>{children}</View>;
}

function NoticeBox({ text }: { text: string }) {
  return <View style={styles.noticeBox}><Text style={styles.noticeIcon}>i</Text><Text style={styles.noticeText}>{text}</Text></View>;
}

function ErrorBanner({ message }: { message: string }) {
  return <View accessibilityRole="alert" style={styles.errorBanner}><Text style={styles.errorText}>{message}</Text></View>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <View style={styles.emptyState}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyDetail}>{detail}</Text></View>;
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailLine}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  appFrame: { flex: 1, maxWidth: 560, width: "100%", alignSelf: "center", backgroundColor: colors.canvas },
  topBar: { minHeight: 62, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  brandMark: { width: 36, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.navy },
  brandMarkLarge: { width: 58, height: 58, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.navy },
  brandTextWrap: { marginLeft: 10, flex: 1 },
  brandName: { color: colors.navy, fontSize: 15, fontWeight: "800", letterSpacing: -0.3 },
  brandNameLarge: { marginTop: 12, color: colors.navy, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  brandCaption: { marginTop: 2, color: colors.muted, fontSize: 11 },
  topAction: { minWidth: 48, minHeight: 44, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  topActionText: { color: colors.navy, fontSize: 12, fontWeight: "700" },
  signOutButton: { minHeight: 42, paddingHorizontal: 10, alignItems: "center", justifyContent: "center", borderRadius: 7, borderWidth: 1, borderColor: colors.line },
  signOutText: { color: colors.navy, fontSize: 12, fontWeight: "700" },
  demoBanner: { minHeight: 30, paddingHorizontal: 12, justifyContent: "center", alignItems: "center", backgroundColor: "#F1E9E6" },
  demoBannerText: { color: "#773C39", fontSize: 10, fontWeight: "700", textAlign: "center" },
  contentScroll: { flex: 1 },
  screenContent: { padding: 18, paddingBottom: 28 },
  eyebrow: { color: "#5b7185", fontSize: 10, fontWeight: "800", letterSpacing: 0.9 },
  pageTitle: { marginTop: 5, color: colors.navy, fontSize: 26, fontWeight: "800", letterSpacing: -0.55 },
  pageSubtitle: { marginTop: 6, marginBottom: 16, color: colors.muted, fontSize: 14, lineHeight: 20 },
  sosCard: { padding: 16, borderRadius: 9, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  sosTitle: { color: colors.navy, fontSize: 17, fontWeight: "800" },
  sosCopy: { marginTop: 5, marginBottom: 8, color: colors.muted, fontSize: 12, lineHeight: 18 },
  sosDestination: { marginTop: 1, marginBottom: 7, color: colors.navy, fontSize: 12, fontWeight: "800" },
  sosSetupMessage: { marginBottom: 8, color: "#77413c", fontSize: 12, lineHeight: 18 },
  generalSosButton: { width: 158, height: 158, marginTop: 7, marginBottom: 4, borderRadius: 79, alignSelf: "center", alignItems: "center", justifyContent: "center", backgroundColor: colors.red },
  generalSosLabel: { marginTop: 4, color: colors.white, fontSize: 25, lineHeight: 30, fontWeight: "900", letterSpacing: 1 },
  sosExplanation: { marginTop: 4, marginBottom: 9, color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center" },
  callCategoryHeading: { marginTop: 9, marginBottom: 9, color: colors.navy, fontSize: 13, fontWeight: "800" },
  sosCategoryGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 8 },
  sosCategoryCard: { width: "48.5%", minHeight: 62, paddingHorizontal: 9, borderRadius: 8, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", backgroundColor: colors.white },
  sosCategoryMark: { width: 31, height: 31, marginRight: 8, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: "#edf2f5" },
  sosCategoryCopy: { flex: 1, minWidth: 0 },
  sosCategoryName: { color: colors.navy, fontSize: 12, fontWeight: "800" },
  sosCategoryHint: { marginTop: 3, color: colors.muted, fontSize: 9 },
  callSafetyNote: { marginTop: 11, color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: "center" },
  sosScreenContent: { flexGrow: 1, padding: 20, paddingBottom: 28 },
  sosDestinationCard: { marginTop: 4, marginBottom: 22, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  sosPhoneNumber: { marginTop: 7, color: colors.navy, fontSize: 20, fontWeight: "800", letterSpacing: 0.2 },
  countdownLabel: { marginTop: 14, color: colors.muted, fontSize: 14, fontWeight: "700", textAlign: "center" },
  sosCountdown: { marginTop: 5, color: colors.red, fontSize: 112, lineHeight: 126, fontWeight: "900", textAlign: "center", fontVariant: ["tabular-nums"] },
  countdownHint: { marginTop: 2, color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: "center" },
  cancelCountdownButton: { minHeight: 64, marginTop: 23, paddingHorizontal: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.red, backgroundColor: colors.white },
  cancelCountdownText: { color: colors.redDark, fontSize: 16, fontWeight: "900" },
  callingState: { minHeight: 100, alignItems: "center", justifyContent: "center", gap: 12 },
  sosSafetyText: { marginTop: 22, color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: "center" },
  homeActions: { gap: 3, marginBottom: 12 },
  actionButton: { minHeight: 50, marginTop: 8, paddingHorizontal: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.red },
  actionButtonText: { color: colors.white, fontSize: 13, fontWeight: "800" },
  actionButtonOutline: { borderWidth: 1, borderColor: "#bdc9d2", backgroundColor: colors.white },
  actionButtonOutlineText: { color: colors.navy },
  actionButtonDisabled: { opacity: 0.48 },
  fullWidthButton: { width: "100%" },
  pressed: { opacity: 0.75 },
  sectionHeading: { marginTop: 18, marginBottom: 7, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { marginTop: 5, marginBottom: 8, color: colors.navy, fontSize: 16, fontWeight: "800" },
  homeSectionCopy: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  textAction: { color: colors.navy, fontSize: 12, fontWeight: "700" },
  sectionAction: { minHeight: 44, paddingHorizontal: 7, alignItems: "center", justifyContent: "center" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 9, marginTop: 9 },
  categoryCard: { width: "48.5%", minHeight: 65, paddingHorizontal: 11, borderRadius: 8, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", backgroundColor: colors.white },
  categoryMark: { width: 32, height: 32, marginRight: 10, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: "#edf2f5" },
  categoryMarkText: { color: "#38536c", fontSize: 12, fontWeight: "800" },
  categoryName: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  incidentCard: { minHeight: 44, marginBottom: 9, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  incidentTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  incidentCategory: { color: colors.navy, fontSize: 12, fontWeight: "800" },
  incidentDescription: { marginTop: 9, color: colors.ink, fontSize: 14, lineHeight: 20 },
  incidentBottom: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  incidentMeta: { color: colors.muted, fontSize: 11, flexShrink: 1 },
  statusPill: { paddingVertical: 5, paddingHorizontal: 8, borderRadius: 5 },
  statusReceived: { backgroundColor: "#edf1f4" },
  statusReview: { backgroundColor: "#fbf3df" },
  statusAssigned: { backgroundColor: "#edf2f8" },
  statusResolved: { backgroundColor: "#e9f4ee" },
  statusText: { color: colors.navy, fontSize: 10, fontWeight: "700" },
  statusTextResolved: { color: colors.green },
  bottomNav: { minHeight: 67, paddingHorizontal: 7, paddingBottom: 3, flexDirection: "row", justifyContent: "space-around", borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white },
  navItem: { flex: 1, minWidth: 60, minHeight: 60, alignItems: "center", justifyContent: "center", gap: 3 },
  navIndicator: { width: 22, height: 3, borderRadius: 1, backgroundColor: "transparent" },
  navIndicatorSelected: { backgroundColor: colors.navy },
  navLabel: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  navLabelSelected: { color: colors.navy, fontWeight: "800" },
  signInFrame: { flex: 1, width: "100%", maxWidth: 560, alignSelf: "center" },
  signInScroll: { flexGrow: 1, padding: 20, paddingTop: 28, paddingBottom: 24, justifyContent: "center" },
  signInBrand: { alignItems: "center", marginBottom: 20 },
  authCard: { padding: 19, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  authTitle: { marginTop: 5, color: colors.navy, fontSize: 23, fontWeight: "800", letterSpacing: -0.4 },
  authDescription: { marginTop: 5, marginBottom: 15, color: colors.muted, fontSize: 13, lineHeight: 19 },
  fieldGroup: { marginTop: 13 },
  fieldLabel: { marginBottom: 7, color: "#3d5062", fontSize: 13, fontWeight: "700" },
  input: { minHeight: 48, paddingHorizontal: 12, borderWidth: 1, borderColor: "#cbd5dd", borderRadius: 7, color: colors.ink, backgroundColor: colors.white, fontSize: 15 },
  inputInvalid: { borderColor: colors.red, borderWidth: 1.5 },
  invalidChoiceGroup: { padding: 4, borderWidth: 1, borderColor: "#d98d8d", borderRadius: 8 },
  fieldHintError: { marginTop: 5, color: colors.redDark, fontSize: 11, lineHeight: 16 },
  fieldHint: { marginTop: 5, color: colors.muted, fontSize: 11, lineHeight: 16 },
  passwordRow: { position: "relative", justifyContent: "center" },
  passwordInput: { paddingRight: 65 },
  passwordToggle: { position: "absolute", right: 9, minWidth: 43, minHeight: 38, alignItems: "center", justifyContent: "center" },
  passwordToggleText: { color: colors.navy, fontSize: 12, fontWeight: "800" },
  accountNote: { marginTop: 15, color: colors.muted, fontSize: 12, lineHeight: 17, textAlign: "center" },
  aboutLink: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 10 },
  aboutLinkText: { color: colors.navy, fontSize: 12, fontWeight: "700" },
  footerDisclaimer: { marginTop: 8, color: colors.muted, fontSize: 11, textAlign: "center" },
  noticeBox: { marginVertical: 8, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#ead8d4", flexDirection: "row", alignItems: "flex-start", backgroundColor: "#fbf4f2" },
  noticeIcon: { width: 19, height: 19, marginRight: 8, borderRadius: 10, overflow: "hidden", color: colors.redDark, backgroundColor: "#FFE3E0", textAlign: "center", textAlignVertical: "center", fontSize: 11, fontWeight: "900" },
  noticeText: { flex: 1, color: "#77413c", fontSize: 12, lineHeight: 17 },
  errorBanner: { marginTop: 10, marginHorizontal: 18, marginBottom: 3, padding: 12, borderRadius: 7, borderWidth: 1, borderColor: "#ecc4c0", backgroundColor: "#fff4f2" },
  errorText: { color: "#922e33", fontSize: 12, lineHeight: 18 },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 13 },
  centerText: { color: colors.muted, fontSize: 13 },
  backButton: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", marginBottom: 12, paddingRight: 12 },
  backButtonText: { color: colors.navy, fontSize: 13, fontWeight: "700" },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choiceChip: { minHeight: 44, paddingHorizontal: 13, borderRadius: 7, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  choiceChipSelected: { borderColor: "#8499a9", backgroundColor: "#f0f4f6" },
  choiceText: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  choiceTextSelected: { color: colors.navy },
  profileFrame: { flex: 1 },
  profileLoading: { minHeight: 150, alignItems: "center", justifyContent: "center", gap: 10 },
  profileCard: { marginTop: 13, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  readOnlyInput: { backgroundColor: "#F2F4F6", color: colors.muted },
  profileSectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  inlineAction: { minHeight: 44, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  trustedContactStatus: { marginTop: 9, color: colors.navy, fontSize: 12, fontWeight: "700" },
  profileLink: { minHeight: 44, justifyContent: "center", borderTopWidth: 1, borderTopColor: colors.line, marginTop: 7 },
  multilineInput: { minHeight: 100, paddingTop: 12 },
  characterCount: { marginTop: 4, color: colors.muted, fontSize: 11, textAlign: "right" },
  confirmRow: { minHeight: 48, marginTop: 15, marginBottom: 8, flexDirection: "row", alignItems: "flex-start", gap: 9 },
  checkbox: { width: 19, height: 19, borderRadius: 5, borderWidth: 1, borderColor: "#BCC7D1", alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  checkboxChecked: { borderColor: colors.red, backgroundColor: colors.red },
  checkboxMark: { color: colors.white, fontSize: 12, fontWeight: "900" },
  confirmText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 17 },
  refreshButton: { minHeight: 44, paddingVertical: 8, paddingHorizontal: 11, borderRadius: 7, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, justifyContent: "center" },
  refreshText: { color: colors.navy, fontSize: 12, fontWeight: "700" },
  emptyState: { marginTop: 8, padding: 22, borderRadius: 8, borderWidth: 1, borderColor: colors.line, alignItems: "center", backgroundColor: colors.white },
  emptyTitle: { color: colors.navy, fontSize: 14, fontWeight: "800", textAlign: "center" },
  emptyDetail: { marginTop: 5, color: colors.muted, fontSize: 12, lineHeight: 17, textAlign: "center" },
  detailLoading: { flex: 1, padding: 25, alignItems: "center", justifyContent: "center", gap: 12 },
  detailStatusRow: { marginTop: 12, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  detailCard: { padding: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  cardLabel: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  detailDescription: { marginTop: 8, color: colors.ink, fontSize: 14, lineHeight: 20 },
  detailDivider: { height: 1, marginVertical: 13, backgroundColor: colors.line },
  detailLine: { minHeight: 30, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  detailLabel: { color: colors.muted, fontSize: 12 },
  detailValue: { flexShrink: 1, color: colors.ink, fontSize: 12, fontWeight: "700", textAlign: "right" },
  timelineRow: { minHeight: 72, flexDirection: "row" },
  timelineTrack: { width: 20, alignItems: "center" },
  timelineDot: { width: 10, height: 10, marginTop: 4, borderRadius: 5, backgroundColor: "#BFCAD5" },
  timelineDotActive: { backgroundColor: colors.red },
  timelineLine: { width: 1, flex: 1, marginTop: 3, backgroundColor: "#D8E0E7" },
  timelineCopy: { flex: 1, paddingBottom: 14 },
  timelineStatus: { color: colors.navy, fontSize: 13, fontWeight: "800" },
  timelineNote: { marginTop: 3, color: colors.muted, fontSize: 12, lineHeight: 17 },
  timelineDate: { marginTop: 3, color: colors.muted, fontSize: 11 },
  assignmentCard: { marginBottom: 9, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  assignmentName: { color: colors.navy, fontSize: 13, fontWeight: "800" },
  confirmationContent: { flexGrow: 1, padding: 20, alignItems: "stretch", justifyContent: "center" },
  successMark: { width: 53, height: 53, marginBottom: 19, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: "#E7F5EF" },
  successMarkText: { color: colors.green, fontSize: 26, fontWeight: "800" },
  confirmationCard: { marginVertical: 17, padding: 17, borderRadius: 8, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  referenceText: { marginTop: 7, marginBottom: 12, color: colors.navy, fontSize: 20, fontWeight: "800", letterSpacing: 0.2 },
  urgentInfo: { marginBottom: 14, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: "#ead8d4", backgroundColor: "#fbf4f2" },
  urgentInfoTitle: { color: "#763b37", fontSize: 14, fontWeight: "800" },
  urgentInfoText: { marginTop: 6, color: "#77413c", fontSize: 13, lineHeight: 19 },
  aboutInfoCard: { marginVertical: 12, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  aboutInfoText: { marginTop: 10, color: colors.ink, fontSize: 13, lineHeight: 19 },
});
