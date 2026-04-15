import React, { useState, useEffect, useRef } from 'react';
import { Listbox } from '@headlessui/react';
import {
    User, Palette, Bell, Globe, LogOut, Check, ExternalLink, RefreshCw,
    Sun, Moon, Monitor, Wifi, WifiOff, Shield, Trash2, AlertCircle,
    Mail, Calendar, CheckSquare, Clock, Volume2, VolumeX, Smartphone, FileSpreadsheet,
    Languages, Info, ChevronRight, ChevronDown, Zap, BotMessageSquare, Upload, ImagePlus, RotateCcw, KeyRound
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { NoticeDialog } from '../../components/ui/NoticeDialog';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useLayoutDensityStore, type LayoutDensity } from '../../store/useLayoutDensityStore';
import {
    isAppLanguage,
    isDateFormat,
    isStartOfWeek,
    isTimeFormat,
    useGeneralPreferencesStore,
} from '../../store/useGeneralPreferencesStore';
import { cn } from '../../utils/cn';
import api from '../../services/api';
import {
    clearAvatar,
    getAboutProfile,
    getGoogleConnectUrl,
    sendEmailVerificationCode,
    sendPasswordVerificationCode,
    updateAboutProfile,
    updateAvatarFromGoogle,
    updateManualAvatar,
    verifyAndUpdateEmail,
    verifyAndUpdatePassword,
} from '../../services/auth.service';
import { useGoogleStatus } from '../../hooks/useGoogleStatus';
import { usePageContextStore } from '../../store/usePageContextStore';

type ThemeMode = 'light' | 'dark' | 'system';

interface NotificationSettings {
    email_summaries: boolean;
    calendar_reminders: boolean;
    task_due: boolean;
    ai_insights: boolean;
    conflict_alerts: boolean;
    browser_push: boolean;
    sound: boolean;
    digest_time: string;
    digest_frequency: string;
}

type NotificationToggleKey = Exclude<keyof NotificationSettings, 'digest_time' | 'digest_frequency'>;

interface GeneralSettings {
    language: string;
    timezone: string;
    time_format: string;
    date_format: string;
    start_of_week: string;
    ai_context_window: string;
    auto_refresh: boolean;
    telemetry: boolean;
}

const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
    language: 'en',
    timezone: 'Asia/Kolkata',
    time_format: '12h',
    date_format: 'DD/MM/YYYY',
    start_of_week: 'monday',
    ai_context_window: '10',
    auto_refresh: true,
    telemetry: false,
};

const GENERAL_SETTINGS_EVENT = 'g1-general-settings-updated';
const AI_CONTEXT_WINDOW_KEY = 'g1_ai_context_window';
const AUTO_REFRESH_SETTING_KEY = 'g1_auto_refresh_google_data';
const TELEMETRY_SETTING_KEY = 'g1_usage_telemetry_enabled';
const MAX_AVATAR_UPLOAD_BYTES = 2 * 1024 * 1024;
const SUPPORTED_AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
const OAUTH_NOTICE_STORAGE_KEY = 'g1_oauth_notice';

function resolveAvatarUrl(raw: string | null | undefined): string | null {
    if (!raw) return null;
    if (raw.startsWith('data:image/')) return raw;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    if (raw.startsWith('/')) {
        const baseUrl = ((api.defaults.baseURL as string) || 'http://localhost:8000').replace(/\/$/, '');
        return `${baseUrl}${raw}`;
    }
    return raw;
}

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === 'string' ? reader.result : '';
            if (!result) {
                reject(new Error('Unable to read image file'));
                return;
            }
            resolve(result);
        };
        reader.onerror = () => reject(new Error('Unable to read image file'));
        reader.readAsDataURL(file);
    });
}

interface SelectOption {
    v: string;
    l: string;
}

// ── Reusable toggle switch ──────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none',
                checked ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'
            )}
        >
            <span className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
                checked ? 'translate-x-6' : 'translate-x-1'
            )} />
        </button>
    );
}

// ── Setting row ─────────────────────────────────────────────────────────────
function SettingRow({
    icon: Icon, title, desc, children, className
}: {
    icon: React.ElementType; title: string; desc?: string; children: React.ReactNode; className?: string
}) {
    return (
        <div className={cn('flex items-center justify-between py-4', className)}>
            <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
                    {desc && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>}
                </div>
            </div>
            <div className="flex-shrink-0 ml-4">{children}</div>
        </div>
    );
}

// ── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, desc }: { title: string; desc?: string }) {
    return (
        <div className="mb-5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
            {desc && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>}
        </div>
    );
}

function StyledSelect({
    value,
    onChange,
    options,
    className,
}: {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    className?: string;
}) {
    const selected = options.find((option) => option.v === value);

    return (
        <Listbox value={value} onChange={onChange}>
            <div className={cn('relative min-w-[170px]', className)}>
                <Listbox.Button className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-medium text-slate-900 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    <span className="block truncate pr-6">{selected?.l ?? value}</span>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </Listbox.Button>

                <Listbox.Options className="absolute right-0 z-40 mt-1 max-h-64 w-full min-w-[190px] overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl outline-none dark:border-slate-700 dark:bg-slate-900">
                    {options.map((option) => (
                        <Listbox.Option
                            key={option.v}
                            value={option.v}
                            className={({ active }) => cn(
                                'flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                                active
                                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                                    : 'text-slate-700 dark:text-slate-200'
                            )}
                        >
                            {({ selected: isSelected }) => (
                                <>
                                    <span className={cn('truncate', isSelected && 'font-semibold')}>{option.l}</span>
                                    {isSelected && <Check className="ml-2 h-4 w-4 flex-shrink-0 text-brand-600 dark:text-brand-400" />}
                                </>
                            )}
                        </Listbox.Option>
                    ))}
                </Listbox.Options>
            </div>
        </Listbox>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: Account
// ════════════════════════════════════════════════════════════════════════════
function AccountTab() {
    const { user, setUser } = useAuthStore();
    const { isGoogleConnected, isChecking, googleServiceStatus, connectedServices, refresh } = useGoogleStatus();
    const [isRevoking, setIsRevoking] = useState(false);
    const [googleLogoFailed, setGoogleLogoFailed] = useState(false);
    const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
    const [connectError, setConnectError] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [isAvatarUploading, setIsAvatarUploading] = useState(false);
    const [isGoogleAvatarSyncing, setIsGoogleAvatarSyncing] = useState(false);
    const [isAvatarResetting, setIsAvatarResetting] = useState(false);
    const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement | null>(null);
    const oauthRedirectHandledRef = useRef(false);
    const [oauthDialog, setOauthDialog] = useState<{ title: string; message: string } | null>(null);

    const [aboutLoading, setAboutLoading] = useState(true);
    const [aboutError, setAboutError] = useState<string | null>(null);
    const [aboutSuccess, setAboutSuccess] = useState<string | null>(null);

    const [nameDraft, setNameDraft] = useState(user?.name || '');
    const [emailDraft, setEmailDraft] = useState(user?.email || '');
    const [phoneDraft, setPhoneDraft] = useState('');
    const [googleConnectedAccountEmail, setGoogleConnectedAccountEmail] = useState<string | null>(null);

    const [isSavingName, setIsSavingName] = useState(false);
    const [isSavingPhone, setIsSavingPhone] = useState(false);

    const [emailVerificationCode, setEmailVerificationCode] = useState('');
    const [emailCodeSent, setEmailCodeSent] = useState(false);
    const [emailVerificationHint, setEmailVerificationHint] = useState<string | null>(null);
    const [isSendingEmailCode, setIsSendingEmailCode] = useState(false);
    const [isSavingEmail, setIsSavingEmail] = useState(false);

    const [passwordDraft, setPasswordDraft] = useState('');
    const [passwordConfirmDraft, setPasswordConfirmDraft] = useState('');
    const [currentPasswordDraft, setCurrentPasswordDraft] = useState('');
    const [passwordVerificationCode, setPasswordVerificationCode] = useState('');
    const [passwordCodeSent, setPasswordCodeSent] = useState(false);
    const [passwordVerificationHint, setPasswordVerificationHint] = useState<string | null>(null);
    const [isSendingPasswordCode, setIsSendingPasswordCode] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    const displayName = (nameDraft || user?.name || 'User').trim() || 'User';
    const avatarSrc = !avatarLoadFailed ? resolveAvatarUrl(user?.avatar_url) : null;
    const initials = displayName
        .split(' ')
        .filter(Boolean)
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';

    const closeOauthDialog = () => {
        setOauthDialog(null);
        if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem(OAUTH_NOTICE_STORAGE_KEY);
        }
    };

    const connectGoogle = async () => {
        setConnectError(null);
        setIsConnectingGoogle(true);
        try {
            const authUrl = await getGoogleConnectUrl();
            window.location.assign(authUrl);
        } catch (err: any) {
            setConnectError(err?.message || 'Unable to start Google connection. Please sign in again and retry.');
            setIsConnectingGoogle(false);
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (!oauthRedirectHandledRef.current) {
            const params = new URLSearchParams(window.location.search);
            const authState = params.get('auth');

            if (authState) {
                oauthRedirectHandledRef.current = true;

                let notice: { title: string; message: string } | null = null;

                if (authState === 'account_mismatch' || authState === 'email_mismatch') {
                    const mismatchType = params.get('mismatch_type');
                    const connectedEmail = params.get('google_email') || 'another Google account';
                    const registeredEmail = params.get('registered_email') || params.get('expected_email') || user?.email || 'your registered email';

                    const message = mismatchType === 'google_account_mismatch'
                        ? `You already connected a different Google account earlier. Please reconnect using that same Google account. If you want to use ${connectedEmail}, create/login a new app account and connect it there.`
                        : mismatchType === 'google_email_already_registered'
                            ? `This Google account (${connectedEmail}) is already registered as another user. Please login with ${connectedEmail}, or connect a different Google account for ${registeredEmail}.`
                            : `This Google account (${connectedEmail}) does not match your registered account (${registeredEmail}). Please connect using ${registeredEmail}, or create/login a separate account with ${connectedEmail}.`;
                    setConnectError(message);
                    notice = {
                        title: 'Google Account Mismatch',
                        message,
                    };
                } else if (authState === 'failed') {
                    const reason = params.get('reason');
                    const message = reason === 'existing_google_identity_unavailable'
                        ? 'Unable to verify your previously connected Google account right now. Please try again with the same account after a moment.'
                        : 'Unable to connect Google right now. Please try again.';
                    setConnectError(message);
                    notice = {
                        title: 'Google Connection Failed',
                        message,
                    };
                } else if (authState === 'success') {
                    setConnectError(null);
                    void refresh(true);
                }

                if (notice) {
                    setOauthDialog(notice);
                    window.sessionStorage.setItem(OAUTH_NOTICE_STORAGE_KEY, JSON.stringify(notice));
                } else if (authState === 'success') {
                    window.sessionStorage.removeItem(OAUTH_NOTICE_STORAGE_KEY);
                }

                params.delete('auth');
                params.delete('mismatch_type');
                params.delete('registered_email');
                params.delete('expected_email');
                params.delete('google_email');
                params.delete('reason');
                const nextQuery = params.toString();
                const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
                window.history.replaceState({}, '', nextUrl);
                return;
            }
        }

        const storedNoticeRaw = window.sessionStorage.getItem(OAUTH_NOTICE_STORAGE_KEY);
        if (!storedNoticeRaw || oauthDialog) return;

        try {
            const storedNotice = JSON.parse(storedNoticeRaw) as { title?: string; message?: string };
            if (storedNotice?.message) {
                setConnectError(storedNotice.message);
                setOauthDialog({
                    title: storedNotice.title || 'Notice',
                    message: storedNotice.message,
                });
            }
        } catch {
            // ignore malformed session payload
            window.sessionStorage.removeItem(OAUTH_NOTICE_STORAGE_KEY);
        }
    }, [oauthDialog, refresh, user?.email]);

    useEffect(() => {
        refresh(true);
    }, [refresh]);

    useEffect(() => {
        setAvatarLoadFailed(false);
    }, [user?.avatar_url]);

    useEffect(() => {
        setNameDraft(user?.name || '');
        setEmailDraft(user?.email || '');
    }, [user?.name, user?.email]);

    const showAboutSuccess = (message: string) => {
        setAboutSuccess(message);
        window.setTimeout(() => setAboutSuccess(null), 2200);
    };

    useEffect(() => {
        let cancelled = false;

        const loadAbout = async () => {
            setAboutLoading(true);
            setAboutError(null);
            try {
                const about = await getAboutProfile();
                if (cancelled) return;

                setNameDraft(about.name || user?.name || '');
                setEmailDraft(about.email || user?.email || '');
                setPhoneDraft(about.phone || '');
                setGoogleConnectedAccountEmail(about.google_account_email || null);

                if (
                    user
                    && (
                        (about.name && about.name !== user.name)
                        || (about.email && about.email !== user.email)
                    )
                ) {
                    setUser({
                        ...user,
                        name: about.name || user.name,
                        email: about.email || user.email,
                    });
                }
            } catch (err: any) {
                if (cancelled) return;
                setAboutError(err?.message || 'Unable to load account details right now.');
            } finally {
                if (!cancelled) {
                    setAboutLoading(false);
                }
            }
        };

        void loadAbout();
        return () => {
            cancelled = true;
        };
    }, [user?.id, user?.name, user?.email, setUser]);

    const onSaveName = async () => {
        const nextName = nameDraft.trim();
        if (!nextName) {
            setAboutError('Name cannot be empty.');
            return;
        }

        setAboutError(null);
        setIsSavingName(true);
        try {
            const updatedUser = await updateAboutProfile({ name: nextName });
            setUser(updatedUser);
            setNameDraft(updatedUser.name || nextName);
            showAboutSuccess('Name updated successfully.');
        } catch (err: any) {
            setAboutError(err?.message || 'Unable to update name right now.');
        } finally {
            setIsSavingName(false);
        }
    };

    const onSavePhone = async () => {
        setAboutError(null);
        setIsSavingPhone(true);
        try {
            await updateAboutProfile({ phone: phoneDraft.trim() });
            showAboutSuccess('Phone number updated successfully.');
        } catch (err: any) {
            setAboutError(err?.message || 'Unable to update phone number right now.');
        } finally {
            setIsSavingPhone(false);
        }
    };

    const onSendEmailVerification = async () => {
        const nextEmail = emailDraft.trim();
        if (!nextEmail) {
            setAboutError('Email is required.');
            return;
        }

        setAboutError(null);
        setIsSendingEmailCode(true);
        try {
            const response = await sendEmailVerificationCode(nextEmail);
            setEmailCodeSent(true);
            setEmailVerificationCode('');
            setEmailVerificationHint(
                response.verification_code
                    ? `Verification code (dev): ${response.verification_code}`
                    : 'Verification code sent to the new email address.'
            );
        } catch (err: any) {
            setAboutError(err?.message || 'Unable to send email verification code.');
        } finally {
            setIsSendingEmailCode(false);
        }
    };

    const onVerifyAndSaveEmail = async () => {
        const nextEmail = emailDraft.trim();
        const code = emailVerificationCode.trim();
        if (!nextEmail) {
            setAboutError('Email is required.');
            return;
        }
        if (!code) {
            setAboutError('Enter the verification code to save email.');
            return;
        }

        setAboutError(null);
        setIsSavingEmail(true);
        try {
            const updatedUser = await verifyAndUpdateEmail(nextEmail, code);
            setUser(updatedUser);
            setEmailDraft(updatedUser.email || nextEmail);
            setEmailCodeSent(false);
            setEmailVerificationCode('');
            setEmailVerificationHint(null);
            showAboutSuccess('Email updated successfully.');
        } catch (err: any) {
            setAboutError(err?.message || 'Unable to verify and save email.');
        } finally {
            setIsSavingEmail(false);
        }
    };

    const onSendPasswordVerification = async () => {
        const currentPassword = currentPasswordDraft;
        if (!currentPassword) {
            setAboutError('Enter your current password first.');
            return;
        }

        setAboutError(null);
        setIsSendingPasswordCode(true);
        try {
            const response = await sendPasswordVerificationCode(currentPassword);
            setPasswordCodeSent(true);
            setPasswordVerificationCode('');
            setPasswordVerificationHint(
                response.verification_code
                    ? `Verification code (dev): ${response.verification_code}`
                    : 'Verification code sent to your account email.'
            );
        } catch (err: any) {
            setAboutError(err?.message || 'Unable to send password verification code.');
        } finally {
            setIsSendingPasswordCode(false);
        }
    };

    const onVerifyAndSavePassword = async () => {
        const currentPassword = currentPasswordDraft;
        const code = passwordVerificationCode.trim();
        if (!currentPassword) {
            setAboutError('Enter your current password first.');
            return;
        }
        if (!passwordDraft) {
            setAboutError('Enter a new password.');
            return;
        }
        if (passwordDraft.length < 6) {
            setAboutError('Password must be at least 6 characters.');
            return;
        }
        if (passwordDraft !== passwordConfirmDraft) {
            setAboutError('Password confirmation does not match.');
            return;
        }
        if (!code) {
            setAboutError('Enter the verification code to save password.');
            return;
        }

        setAboutError(null);
        setIsSavingPassword(true);
        try {
            await verifyAndUpdatePassword(currentPassword, passwordDraft, code);
            setCurrentPasswordDraft('');
            setPasswordDraft('');
            setPasswordConfirmDraft('');
            setPasswordVerificationCode('');
            setPasswordCodeSent(false);
            setPasswordVerificationHint(null);
            showAboutSuccess('Password updated successfully.');
        } catch (err: any) {
            setAboutError(err?.message || 'Unable to verify and save password.');
        } finally {
            setIsSavingPassword(false);
        }
    };

    const openAvatarPicker = () => {
        setAvatarError(null);
        avatarInputRef.current?.click();
    };

    const onAvatarSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        if (SUPPORTED_AVATAR_MIME_TYPES.indexOf(file.type) === -1) {
            setAvatarError('Please upload PNG, JPG, WEBP, or GIF image.');
            return;
        }

        if (file.size > MAX_AVATAR_UPLOAD_BYTES) {
            setAvatarError('Image is too large. Maximum allowed size is 2MB.');
            return;
        }

        setAvatarError(null);
        setIsAvatarUploading(true);
        try {
            const dataUrl = await fileToDataUrl(file);
            const updatedUser = await updateManualAvatar(dataUrl);
            setUser(updatedUser);
        } catch (err: any) {
            setAvatarError(err?.message || 'Unable to upload profile image. Please try again.');
        } finally {
            setIsAvatarUploading(false);
        }
    };

    const onUseGoogleAvatar = async () => {
        if (!isGoogleConnected) {
            setAvatarError('Connect Google first to use your Google profile photo.');
            return;
        }

        setAvatarError(null);
        setIsGoogleAvatarSyncing(true);
        try {
            const updatedUser = await updateAvatarFromGoogle();
            setUser(updatedUser);
        } catch (err: any) {
            setAvatarError(err?.message || 'Unable to fetch Google profile image right now.');
        } finally {
            setIsGoogleAvatarSyncing(false);
        }
    };

    const onUseInitialsAvatar = async () => {
        setAvatarError(null);
        setIsAvatarResetting(true);
        try {
            const updatedUser = await clearAvatar();
            setUser(updatedUser);
        } catch (err: any) {
            setAvatarError(err?.message || 'Unable to reset profile image right now.');
        } finally {
            setIsAvatarResetting(false);
        }
    };

    const handleRevoke = async () => {
        setIsRevoking(true);
        try {
            await api.post('/api/auth/logout');
            await refresh(true);
        } finally {
            setIsRevoking(false);
        }
    };

    const serviceTiles = [
        { icon: Calendar, label: 'Calendar', statusKey: 'Calendar', color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
        { icon: Mail, label: 'Gmail', statusKey: 'Gmail', color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
        { icon: CheckSquare, label: 'Tasks', statusKey: 'Tasks', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
        // Sheets access is validated through Drive API capability on backend.
        { icon: FileSpreadsheet, label: 'Sheets', statusKey: 'Drive', color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
        { icon: User, label: 'Contacts', statusKey: 'Contacts', color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20' },
    ];
    const googleAccountLabel = googleConnectedAccountEmail
        || (isGoogleConnected ? (user?.email || 'Connected (email unavailable)') : 'Not connected');
    const hasCurrentPassword = currentPasswordDraft.length > 0;

    return (
        <>
            <NoticeDialog
                isOpen={Boolean(oauthDialog)}
                onClose={closeOauthDialog}
                title={oauthDialog?.title || 'Notice'}
                message={oauthDialog?.message || ''}
            />
            <div className="space-y-8 animate-in fade-in duration-300">
            {/* Profile card */}
            <div>
                <SectionHeader title="Profile" desc="Your personal account information." />
                <Card className="p-6 border-slate-200 dark:border-slate-800">
                    <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                        onChange={onAvatarSelected}
                        className="hidden"
                    />

                    <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-brand-500/20 flex-shrink-0">
                            {avatarSrc ? (
                                <img
                                    src={avatarSrc}
                                    alt="Profile avatar"
                                    className="h-full w-full rounded-2xl object-cover"
                                    onError={() => setAvatarLoadFailed(true)}
                                />
                            ) : (
                                initials
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">{displayName}</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Pro Plan · Final Year Project</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={cn(
                                    'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full',
                                    isGoogleConnected
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800'
                                        : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800'
                                )}>
                                    {isGoogleConnected
                                        ? <><Wifi className="h-3 w-3" /> Google Connected</>
                                        : <><WifiOff className="h-3 w-3" /> Not Connected</>
                                    }
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={openAvatarPicker}
                                disabled={isAvatarUploading}
                                className="dark:border-slate-700"
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                {isAvatarUploading ? 'Uploading...' : 'Upload Photo'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onUseGoogleAvatar}
                                disabled={!isGoogleConnected || isGoogleAvatarSyncing}
                                className="dark:border-slate-700"
                            >
                                <ImagePlus className="h-4 w-4 mr-2" />
                                {isGoogleAvatarSyncing ? 'Syncing...' : 'Use Google Photo'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onUseInitialsAvatar}
                                disabled={(!avatarSrc && !user?.avatar_url) || isAvatarResetting}
                                className="dark:border-slate-700"
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                {isAvatarResetting ? 'Resetting...' : 'Use Initials'}
                            </Button>
                        </div>
                    </div>

                    {avatarError && (
                        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {avatarError}
                        </div>
                    )}
                </Card>
            </div>

            {/* About */}
            <div>
                <SectionHeader title="About" desc="Manage account identity, verification, and security details." />
                <Card className="border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    {aboutSuccess && (
                        <div className="p-4 bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm font-medium flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            {aboutSuccess}
                        </div>
                    )}
                    {aboutError && (
                        <div className="p-4 bg-red-50/80 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm font-medium flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {aboutError}
                        </div>
                    )}

                    <div className="p-5 flex flex-col lg:flex-row lg:items-center gap-3">
                        <div className="w-full lg:w-56">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">Name</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Edit your display name.</p>
                        </div>
                        <div className="flex-1 flex flex-col sm:flex-row gap-2">
                            <input
                                value={nameDraft}
                                onChange={(event) => setNameDraft(event.target.value)}
                                disabled={aboutLoading || isSavingName}
                                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                                placeholder="Your name"
                            />
                            <Button variant="outline" onClick={onSaveName} disabled={aboutLoading || isSavingName} className="dark:border-slate-700">
                                {isSavingName ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    </div>

                    <div className="p-5 flex flex-col lg:flex-row gap-3">
                        <div className="w-full lg:w-56">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">Email</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Edit, verify with code, then save.</p>
                        </div>
                        <div className="flex-1 space-y-2">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="email"
                                    value={emailDraft}
                                    onChange={(event) => setEmailDraft(event.target.value)}
                                    disabled={aboutLoading || isSendingEmailCode || isSavingEmail}
                                    className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                                    placeholder="you@example.com"
                                />
                                <Button variant="outline" onClick={onSendEmailVerification} disabled={aboutLoading || isSendingEmailCode || isSavingEmail} className="dark:border-slate-700">
                                    {isSendingEmailCode ? 'Sending...' : 'Send Verification'}
                                </Button>
                            </div>

                            {emailCodeSent && (
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        value={emailVerificationCode}
                                        onChange={(event) => setEmailVerificationCode(event.target.value)}
                                        disabled={isSavingEmail}
                                        className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                                        placeholder="Verification code"
                                    />
                                    <Button onClick={onVerifyAndSaveEmail} disabled={isSavingEmail} className="bg-brand-600 hover:bg-brand-700 text-white">
                                        {isSavingEmail ? 'Saving...' : 'Verify & Save'}
                                    </Button>
                                </div>
                            )}

                            {emailVerificationHint && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">{emailVerificationHint}</p>
                            )}
                        </div>
                    </div>

                    <div className="p-5 flex flex-col lg:flex-row gap-3">
                        <div className="w-full lg:w-56">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">Change Password</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Enter current password first, then request code and save new password.</p>
                        </div>
                        <div className="flex-1 space-y-2">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="password"
                                    value={currentPasswordDraft}
                                    onChange={(event) => setCurrentPasswordDraft(event.target.value)}
                                    disabled={aboutLoading || isSendingPasswordCode || isSavingPassword}
                                    className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                                    placeholder="Current password"
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="password"
                                    value={passwordDraft}
                                    onChange={(event) => setPasswordDraft(event.target.value)}
                                    disabled={aboutLoading || !hasCurrentPassword || isSavingPassword}
                                    className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                                    placeholder="New password"
                                />
                                <input
                                    type="password"
                                    value={passwordConfirmDraft}
                                    onChange={(event) => setPasswordConfirmDraft(event.target.value)}
                                    disabled={aboutLoading || !hasCurrentPassword || isSavingPassword}
                                    className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                                    placeholder="Confirm password"
                                />
                                <Button variant="outline" onClick={onSendPasswordVerification} disabled={aboutLoading || !hasCurrentPassword || isSendingPasswordCode || isSavingPassword} className="dark:border-slate-700">
                                    <KeyRound className="h-4 w-4 mr-2" />
                                    {isSendingPasswordCode ? 'Sending...' : 'Send Code'}
                                </Button>
                            </div>

                            {passwordCodeSent && (
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        value={passwordVerificationCode}
                                        onChange={(event) => setPasswordVerificationCode(event.target.value)}
                                        disabled={!hasCurrentPassword || isSavingPassword}
                                        className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                                        placeholder="Verification code"
                                    />
                                    <Button onClick={onVerifyAndSavePassword} disabled={!hasCurrentPassword || isSavingPassword} className="bg-brand-600 hover:bg-brand-700 text-white">
                                        {isSavingPassword ? 'Saving...' : 'Verify & Save'}
                                    </Button>
                                </div>
                            )}

                            {passwordVerificationHint && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">{passwordVerificationHint}</p>
                            )}
                        </div>
                    </div>

                    <div className="p-5 flex flex-col lg:flex-row lg:items-center gap-3">
                        <div className="w-full lg:w-56">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">Phone Number</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Optional contact number.</p>
                        </div>
                        <div className="flex-1 flex flex-col sm:flex-row gap-2">
                            <input
                                value={phoneDraft}
                                onChange={(event) => setPhoneDraft(event.target.value)}
                                disabled={aboutLoading || isSavingPhone}
                                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                                placeholder="+91 98XXXXXXXX"
                            />
                            <Button variant="outline" onClick={onSavePhone} disabled={aboutLoading || isSavingPhone} className="dark:border-slate-700">
                                {isSavingPhone ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    </div>

                    <div className="p-5 flex flex-col lg:flex-row lg:items-center gap-3">
                        <div className="w-full lg:w-56">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">Google Connected Account Email</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Read-only account currently connected via OAuth.</p>
                        </div>
                        <div className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-sm text-slate-700 dark:text-slate-300 flex items-center">
                            {aboutLoading ? 'Loading...' : googleAccountLabel}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Connected services */}
            <div>
                <SectionHeader title="Connected Services" desc="Manage your Google integration." />
                <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm flex-shrink-0">
                                    {!googleLogoFailed ? (
                                        <img
                                            src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png"
                                            alt="Google"
                                            className="h-5 w-auto"
                                            onError={() => setGoogleLogoFailed(true)}
                                        />
                                    ) : (
                                        <Globe className="h-5 w-5 text-blue-500" />
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">Google Workspace</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Calendar · Gmail · Tasks · Sheets · Contacts</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {isGoogleConnected ? (
                                    <>
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                                            <Check className="h-3 w-3" /> {connectedServices.length} Services Connected
                                        </span>
                                        <Button variant="outline" size="sm" onClick={() => refresh(true)} className="dark:border-slate-700">
                                            <RefreshCw className={cn("h-4 w-4 mr-2", isChecking && "animate-spin")} />
                                            Refresh
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleRevoke}
                                            disabled={isRevoking}
                                            className="text-red-600 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            {isRevoking ? 'Disconnecting...' : 'Disconnect'}
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        onClick={connectGoogle}
                                        disabled={isConnectingGoogle}
                                        className="bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20 disabled:opacity-70"
                                    >
                                        {isConnectingGoogle ? (
                                            <>
                                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                Opening Google...
                                            </>
                                        ) : (
                                            <>
                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                Connect Google
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {connectError && !isGoogleConnected && (
                            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400">
                                <AlertCircle className="h-3.5 w-3.5" />
                                {connectError}
                            </div>
                        )}

                        {isGoogleConnected && (
                            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                                {serviceTiles.map(({ icon: Icon, label, statusKey, color }) => {
                                    const connected = !!googleServiceStatus[statusKey];
                                    return (
                                        <div key={label} className={cn('flex items-center gap-2.5 px-3 py-2 rounded-xl', color)}>
                                            <Icon className="h-4 w-4 flex-shrink-0" />
                                            <span className="text-xs font-semibold">{label}</span>
                                            {connected
                                                ? <Check className="h-3 w-3 ml-auto" />
                                                : <WifiOff className="h-3 w-3 ml-auto text-slate-400" />
                                            }
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Security */}
            <div>
                <SectionHeader title="Security" desc="Data protection and access management." />
                <Card className="border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="p-5 flex items-start gap-4">
                        <div className="h-9 w-9 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center flex-shrink-0">
                            <Shield className="h-4.5 w-4.5 text-brand-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">OAuth2 Encrypted</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">All data is handled through Google's secure OAuth2 protocol. No passwords are stored.</p>
                        </div>
                        <span className="ml-auto flex-shrink-0 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">Active</span>
                    </div>
                    <div className="p-5 flex items-center justify-between">
                        <div className="flex items-start gap-4">
                            <div className="h-9 w-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                                <Trash2 className="h-4.5 w-4.5 text-red-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">Revoke All Access</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Disconnects all Google services. You will need to reconnect.</p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRevoke}
                            disabled={isRevoking}
                            className="text-red-600 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0 ml-4"
                        >
                            {isRevoking ? 'Revoking…' : 'Revoke'}
                        </Button>
                    </div>
                </Card>
            </div>
            </div>
        </>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: Appearance
// ════════════════════════════════════════════════════════════════════════════
function AppearanceTab() {
    const { theme, setTheme } = useThemeStore();
    const { density, setDensity } = useLayoutDensityStore();
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        api.get('/api/settings').then(({ data }) => {
            const appearancePrefs = data.preferences?.appearance;
            if (!appearancePrefs) return;

            if (
                appearancePrefs.theme === 'light'
                || appearancePrefs.theme === 'dark'
                || appearancePrefs.theme === 'system'
            ) {
                setTheme(appearancePrefs.theme);
            }

            if (
                appearancePrefs.layout_density === 'compact'
                || appearancePrefs.layout_density === 'comfortable'
                || appearancePrefs.layout_density === 'spacious'
            ) {
                setDensity(appearancePrefs.layout_density);
            }
        }).catch(() => {});
    }, [setDensity, setTheme]);

    const selectTheme = (nextTheme: ThemeMode) => {
        setSaved(false);
        setSaveError(null);
        setTheme(nextTheme);
    };

    const selectDensity = (nextDensity: LayoutDensity) => {
        setSaved(false);
        setSaveError(null);
        setDensity(nextDensity);
    };

    const saveAppearance = async () => {
        setIsSaving(true);
        setSaveError(null);
        try {
            await api.put('/api/settings', {
                preferences: {
                    appearance: {
                        theme,
                        layout_density: density,
                    },
                },
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch {
            setSaveError('Unable to save appearance settings. Please try again.');
        }
        setIsSaving(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div>
                <SectionHeader title="Theme" desc="Choose how the application looks." />
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { id: 'light', label: 'Light', icon: Sun, desc: 'Clean & bright' },
                        { id: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on eyes' },
                        { id: 'system', label: 'System', icon: Monitor, desc: 'Follow device' },
                    ].map((item) => (
                        <button key={item.id} onClick={() => selectTheme(item.id as ThemeMode)}
                            className={cn(
                                'flex flex-col items-center p-5 rounded-2xl border-2 transition-all text-center',
                                theme === item.id
                                    ? 'border-brand-500 bg-brand-50/80 dark:bg-brand-900/20 shadow-md shadow-brand-500/10'
                                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                            )}>
                            <div className={cn(
                                'h-12 w-12 rounded-xl flex items-center justify-center mb-3 transition-colors',
                                theme === item.id ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            )}>
                                <item.icon className="h-6 w-6" />
                            </div>
                            <span className="font-bold text-sm text-slate-900 dark:text-white">{item.label}</span>
                            <span className="text-[11px] text-slate-500 mt-0.5">{item.desc}</span>
                            {theme === item.id && <div className="mt-2 h-1.5 w-1.5 rounded-full bg-brand-500" />}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <SectionHeader title="Layout Density" desc="Control how compact or spacious the UI feels." />
                <Card className="p-5 border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                            { value: 'compact', label: 'Compact', desc: 'Fits more content' },
                            { value: 'comfortable', label: 'Comfortable', desc: 'Balanced spacing' },
                            { value: 'spacious', label: 'Spacious', desc: 'Roomier layout' },
                        ].map((option) => (
                            <button
                                key={option.value}
                                onClick={() => selectDensity(option.value as LayoutDensity)}
                                className={cn(
                                    'rounded-xl border px-4 py-3 text-left transition-all',
                                    density === option.value
                                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                )}
                            >
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{option.label}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{option.desc}</p>
                            </button>
                        ))}
                    </div>
                </Card>
            </div>

            {saveError && (
                <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
            )}

            <div className="flex justify-end">
                <Button className="bg-brand-600 hover:bg-brand-700 text-white" onClick={saveAppearance} disabled={isSaving}>
                    {isSaving ? 'Saving…' : saved ? '✓ Saved' : 'Save Appearance'}
                </Button>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: Notifications
// ════════════════════════════════════════════════════════════════════════════
function NotificationsTab() {
    const [notifs, setNotifs] = useState<NotificationSettings>({
        email_summaries: true,
        calendar_reminders: true,
        task_due: true,
        ai_insights: true,
        conflict_alerts: true,
        browser_push: false,
        sound: false,
        digest_time: '08:00',
        digest_frequency: 'daily',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Load notification preferences from backend on mount
    useEffect(() => {
        api.get('/api/settings').then(({ data }) => {
            const prefs = data.preferences || {};
            if (prefs.notifications) {
                setNotifs(prev => ({ ...prev, ...prefs.notifications }));
            }
        }).catch(() => {});
    }, []);

    const saveDigest = async () => {
        setIsSaving(true);
        setSaveError(null);
        try {
            await api.put('/api/settings', {
                preferences: {
                    notifications: {
                        email_summaries: notifs.email_summaries,
                        calendar_reminders: notifs.calendar_reminders,
                        task_due: notifs.task_due,
                        ai_insights: notifs.ai_insights,
                        conflict_alerts: notifs.conflict_alerts,
                        browser_push: notifs.browser_push,
                        sound: notifs.sound,
                        digest_time: notifs.digest_time,
                        digest_frequency: notifs.digest_frequency,
                    },
                },
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch {
            setSaveError('Unable to save notification settings. Please try again.');
        }
        setIsSaving(false);
    };

    const toggle = async (key: NotificationToggleKey) => {
        setSaveError(null);
        const nextValue = !notifs[key];

        if (key === 'browser_push' && nextValue) {
            if (!('Notification' in window)) {
                setSaveError('Browser push notifications are not supported in this browser.');
                return;
            }

            let permission = Notification.permission;
            if (permission === 'default') {
                permission = await Notification.requestPermission();
            }
            if (permission !== 'granted') {
                setSaveError('Allow browser notifications to enable push alerts.');
                return;
            }
        }

        setNotifs(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const activeToggleCount = [
        notifs.email_summaries,
        notifs.calendar_reminders,
        notifs.task_due,
        notifs.ai_insights,
        notifs.conflict_alerts,
        notifs.browser_push,
        notifs.sound,
    ].filter(Boolean).length;

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Summary banner */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-900/30">
                <Bell className="h-5 w-5 text-brand-600 flex-shrink-0" />
                <p className="text-sm text-brand-700 dark:text-brand-300">
                    <span className="font-bold">{activeToggleCount} notification types</span> are active. Configure what you want to be alerted about.
                </p>
            </div>

            {saveError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-700 dark:text-red-300">{saveError}</p>
                </div>
            )}

            {/* In-App Alerts */}
            <div>
                <SectionHeader title="In-App Alerts" desc="Alerts shown inside the application." />
                <Card className="border-slate-200 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800/60">
                    <div className="px-5">
                        <SettingRow icon={Mail} title="Email Digest Summaries" desc="Daily AI-generated summaries of your emails.">
                            <Toggle checked={notifs.email_summaries} onChange={() => { void toggle('email_summaries'); }} />
                        </SettingRow>
                    </div>
                    <div className="px-5">
                        <SettingRow icon={Calendar} title="Calendar Reminders" desc="Alert 30 minutes before upcoming events.">
                            <Toggle checked={notifs.calendar_reminders} onChange={() => { void toggle('calendar_reminders'); }} />
                        </SettingRow>
                    </div>
                    <div className="px-5">
                        <SettingRow icon={CheckSquare} title="Task Due Alerts" desc="Notify when a task is due today or overdue.">
                            <Toggle checked={notifs.task_due} onChange={() => { void toggle('task_due'); }} />
                        </SettingRow>
                    </div>
                    <div className="px-5">
                        <SettingRow icon={Zap} title="Conflict Alerts" desc="Warn when calendar events or tasks overlap.">
                            <Toggle checked={notifs.conflict_alerts} onChange={() => { void toggle('conflict_alerts'); }} />
                        </SettingRow>
                    </div>
                    <div className="px-5">
                        <SettingRow icon={BotMessageSquare} title="AI Insights" desc="Proactive AI tips and scheduling suggestions.">
                            <Toggle checked={notifs.ai_insights} onChange={() => { void toggle('ai_insights'); }} />
                        </SettingRow>
                    </div>
                </Card>
            </div>

            {/* System Notifications */}
            <div>
                <SectionHeader title="System Notifications" desc="Browser-level and sound alerts." />
                <Card className="border-slate-200 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800/60">
                    <div className="px-5">
                        <SettingRow icon={Smartphone} title="Browser Push Notifications" desc="Show notifications even when the app is in background.">
                            <Toggle checked={notifs.browser_push} onChange={() => { void toggle('browser_push'); }} />
                        </SettingRow>
                    </div>
                    <div className="px-5">
                        <SettingRow icon={notifs.sound ? Volume2 : VolumeX} title="Notification Sounds" desc="Play a sound when a new notification arrives.">
                            <Toggle checked={notifs.sound} onChange={() => { void toggle('sound'); }} />
                        </SettingRow>
                    </div>
                </Card>
            </div>

            {/* Daily Digest */}
            <div>
                <SectionHeader title="Daily AI Digest" desc="Get a scheduled AI summary of your day." />
                <Card className="p-5 border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Delivery Time</label>
                            <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                                <Clock className="h-4 w-4 text-slate-400" />
                                <input
                                    type="time"
                                    value={notifs.digest_time}
                                    onChange={e => setNotifs(p => ({ ...p, digest_time: e.target.value }))}
                                    className="bg-transparent text-sm font-medium text-slate-900 dark:text-white flex-1 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Frequency</label>
                            <StyledSelect
                                value={notifs.digest_frequency}
                                onChange={(value) => setNotifs(p => ({ ...p, digest_frequency: value }))}
                                className="w-full"
                                options={[
                                    { v: 'daily', l: 'Every Day' },
                                    { v: 'weekdays', l: 'Weekdays Only' },
                                    { v: 'weekly', l: 'Weekly (Mon)' },
                                ]}
                            />
                        </div>
                    </div>
                    <Button size="sm" className="bg-brand-600 hover:bg-brand-700 text-white" onClick={saveDigest} disabled={isSaving}>
                        {isSaving ? 'Saving…' : saved ? '✓ Saved' : 'Save Digest Settings'}
                    </Button>
                </Card>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: General
// ════════════════════════════════════════════════════════════════════════════
function GeneralTab() {
    const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [settingsHydrated, setSettingsHydrated] = useState(false);
    const { setGeneralPreferences } = useGeneralPreferencesStore();

    // Load general preferences from backend on mount
    useEffect(() => {
        api.get('/api/settings').then(({ data }) => {
            const prefs = data.preferences || {};
            const incoming = (prefs.general || {}) as Partial<GeneralSettings>;

            const resolved: GeneralSettings = {
                ...DEFAULT_GENERAL_SETTINGS,
                language: typeof incoming.language === 'string' ? incoming.language : DEFAULT_GENERAL_SETTINGS.language,
                timezone: typeof data.timezone === 'string' ? data.timezone : DEFAULT_GENERAL_SETTINGS.timezone,
                time_format: typeof incoming.time_format === 'string' ? incoming.time_format : DEFAULT_GENERAL_SETTINGS.time_format,
                date_format: typeof incoming.date_format === 'string' ? incoming.date_format : DEFAULT_GENERAL_SETTINGS.date_format,
                start_of_week: typeof incoming.start_of_week === 'string' ? incoming.start_of_week : DEFAULT_GENERAL_SETTINGS.start_of_week,
                ai_context_window: incoming.ai_context_window != null ? String(incoming.ai_context_window) : DEFAULT_GENERAL_SETTINGS.ai_context_window,
                auto_refresh: typeof incoming.auto_refresh === 'boolean' ? incoming.auto_refresh : DEFAULT_GENERAL_SETTINGS.auto_refresh,
                telemetry: typeof incoming.telemetry === 'boolean' ? incoming.telemetry : DEFAULT_GENERAL_SETTINGS.telemetry,
            };

            setSettings(resolved);

            if (prefs.general) {
                const nextContextWindow = incoming.ai_context_window != null
                    ? String(incoming.ai_context_window)
                    : null;
                const nextAutoRefresh = typeof incoming.auto_refresh === 'boolean'
                    ? incoming.auto_refresh
                    : null;
                const nextTelemetry = typeof incoming.telemetry === 'boolean'
                    ? incoming.telemetry
                    : resolved.telemetry;

                if (typeof window !== 'undefined') {
                    if (nextContextWindow) {
                        localStorage.setItem(AI_CONTEXT_WINDOW_KEY, nextContextWindow);
                    }
                    if (nextAutoRefresh !== null) {
                        localStorage.setItem(AUTO_REFRESH_SETTING_KEY, String(nextAutoRefresh));
                    }
                    localStorage.setItem(TELEMETRY_SETTING_KEY, String(nextTelemetry));
                }
            } else if (typeof window !== 'undefined') {
                localStorage.setItem(TELEMETRY_SETTING_KEY, String(resolved.telemetry));
            }

            setSettingsHydrated(true);
        }).catch(() => {
            setSettingsHydrated(true);
        });
    }, [setGeneralPreferences]);

    // Apply locale/time preferences globally as soon as user changes them in Settings.
    useEffect(() => {
        setGeneralPreferences({
            language: isAppLanguage(settings.language) ? settings.language : undefined,
            timezone: settings.timezone,
            timeFormat: isTimeFormat(settings.time_format) ? settings.time_format : undefined,
            dateFormat: isDateFormat(settings.date_format) ? settings.date_format : undefined,
            startOfWeek: isStartOfWeek(settings.start_of_week) ? settings.start_of_week : undefined,
        });
    }, [
        settings.language,
        settings.timezone,
        settings.time_format,
        settings.date_format,
        settings.start_of_week,
        setGeneralPreferences,
    ]);

    // Apply AI behaviour settings globally immediately; Save persists them to backend.
    useEffect(() => {
        if (!settingsHydrated || typeof window === 'undefined') return;

        localStorage.setItem(AI_CONTEXT_WINDOW_KEY, settings.ai_context_window);
        localStorage.setItem(AUTO_REFRESH_SETTING_KEY, String(settings.auto_refresh));
        localStorage.setItem(TELEMETRY_SETTING_KEY, String(settings.telemetry));
        window.dispatchEvent(new CustomEvent(GENERAL_SETTINGS_EVENT, {
            detail: {
                ai_context_window: settings.ai_context_window,
                auto_refresh: settings.auto_refresh,
                telemetry: settings.telemetry,
            },
        }));
    }, [settings.ai_context_window, settings.auto_refresh, settings.telemetry, settingsHydrated]);

    const saveSettings = async () => {
        setIsSaving(true);
        setSaveError(null);
        try {
            await api.put('/api/settings', {
                timezone: settings.timezone,
                preferences: {
                    general: {
                        language: settings.language,
                        time_format: settings.time_format,
                        date_format: settings.date_format,
                        start_of_week: settings.start_of_week,
                        ai_context_window: settings.ai_context_window,
                        auto_refresh: settings.auto_refresh,
                        telemetry: settings.telemetry,
                    },
                },
            });

            if (typeof window !== 'undefined') {
                localStorage.setItem(AI_CONTEXT_WINDOW_KEY, settings.ai_context_window);
                localStorage.setItem(AUTO_REFRESH_SETTING_KEY, String(settings.auto_refresh));
                localStorage.setItem(TELEMETRY_SETTING_KEY, String(settings.telemetry));
                setGeneralPreferences({
                    language: isAppLanguage(settings.language) ? settings.language : undefined,
                    timezone: settings.timezone,
                    timeFormat: isTimeFormat(settings.time_format) ? settings.time_format : undefined,
                    dateFormat: isDateFormat(settings.date_format) ? settings.date_format : undefined,
                    startOfWeek: isStartOfWeek(settings.start_of_week) ? settings.start_of_week : undefined,
                });

                window.dispatchEvent(new CustomEvent(GENERAL_SETTINGS_EVENT, {
                    detail: {
                        ai_context_window: settings.ai_context_window,
                        auto_refresh: settings.auto_refresh,
                        telemetry: settings.telemetry,
                        language: settings.language,
                        timezone: settings.timezone,
                        time_format: settings.time_format,
                        date_format: settings.date_format,
                        start_of_week: settings.start_of_week,
                    },
                }));
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch {
            setSaveError('Unable to save general settings. Please try again.');
        }
        setIsSaving(false);
    };

    const toggle = (key: 'auto_refresh' | 'telemetry') =>
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Locale */}
            <div>
                <SectionHeader title="Language & Region" desc="Localization and timezone preferences." />
                <Card className="border-slate-200 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800/60">
                    {[
                        { key: 'language', label: 'Language', options: [{ v: 'en', l: 'English (US)' }, { v: 'ta', l: 'Tamil' }, { v: 'hi', l: 'Hindi' }], icon: Languages },
                        { key: 'timezone', label: 'Timezone', options: [{ v: 'Asia/Kolkata', l: 'IST (UTC+5:30)' }, { v: 'UTC', l: 'UTC' }, { v: 'America/New_York', l: 'EST' }], icon: Globe },
                        { key: 'time_format', label: 'Time Format', options: [{ v: '12h', l: '12-hour (2:00 PM)' }, { v: '24h', l: '24-hour (14:00)' }], icon: Clock },
                        { key: 'date_format', label: 'Date Format', options: [{ v: 'DD/MM/YYYY', l: 'DD/MM/YYYY' }, { v: 'MM/DD/YYYY', l: 'MM/DD/YYYY' }, { v: 'YYYY-MM-DD', l: 'ISO 8601' }], icon: Calendar },
                        { key: 'start_of_week', label: 'Week Starts On', options: [{ v: 'monday', l: 'Monday' }, { v: 'sunday', l: 'Sunday' }], icon: Calendar },
                    ].map(({ key, label, options, icon: Icon }) => (
                        <div key={key} className="px-5">
                            <SettingRow icon={Icon} title={label}>
                                <StyledSelect
                                    value={settings[key as keyof Pick<GeneralSettings, 'language' | 'timezone' | 'time_format' | 'date_format' | 'start_of_week'>]}
                                    onChange={(value) => setSettings(p => ({ ...p, [key]: value }))}
                                    options={options}
                                />
                            </SettingRow>
                        </div>
                    ))}

                </Card>
            </div>

            {/* AI Behaviour */}
            <div>
                <SectionHeader title="AI Behaviour" desc="Control how the AI assistant works." />
                <Card className="border-slate-200 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800/60">
                    <div className="px-5">
                        <SettingRow icon={BotMessageSquare} title="Conversation Context Window" desc="How many past messages the AI remembers.">
                            <StyledSelect
                                value={settings.ai_context_window}
                                onChange={(value) => setSettings(p => ({ ...p, ai_context_window: value }))}
                                options={['5', '10', '15', '20'].map(v => ({ v, l: `${v} messages` }))}
                            />
                        </SettingRow>
                    </div>
                    <div className="px-5">
                        <SettingRow icon={RefreshCw} title="Auto-Refresh Google Data" desc="Automatically sync Google data every 5 minutes.">
                            <Toggle checked={settings.auto_refresh} onChange={() => toggle('auto_refresh')} />
                        </SettingRow>
                    </div>
                </Card>
            </div>

            {/* Privacy */}
            <div>
                <SectionHeader title="Privacy & Data" desc="Control your data and usage preferences." />
                <Card className="border-slate-200 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800/60">
                    <div className="px-5">
                        <SettingRow icon={Info} title="Usage Analytics" desc="Share anonymous usage data to help improve the app.">
                            <Toggle checked={settings.telemetry} onChange={() => toggle('telemetry')} />
                        </SettingRow>
                    </div>
                    <div className="px-5 py-4">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                            <p className="text-xs text-amber-700 dark:text-amber-400">All data stays on your device. No conversation data is sent to external servers other than OpenRouter for AI queries.</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* App Info */}
            <div>
                <SectionHeader title="About" />
                <Card className="border-slate-200 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800/60">
                    {[
                        { label: 'App Version', value: '1.0.0-beta' },
                        { label: 'Build', value: 'Final Year Project – 2025–26' },
                        { label: 'AI Model', value: 'Llama 3.3 70B (via OpenRouter)' },
                        { label: 'Backend', value: 'FastAPI + LangGraph' },
                        { label: 'Frontend', value: 'React 18 + TypeScript' },
                    ].map(({ label, value }) => (
                        <div key={label} className="px-5 py-3 flex items-center justify-between">
                            <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{value}</span>
                        </div>
                    ))}
                </Card>
            </div>

            <div className="flex justify-end">
                {saveError && <p className="text-sm text-red-600 dark:text-red-400 mr-4 self-center">{saveError}</p>}
                <Button className="bg-brand-600 hover:bg-brand-700 text-white" onClick={saveSettings} disabled={isSaving}>
                    {isSaving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
                </Button>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN SETTINGS PAGE
// ════════════════════════════════════════════════════════════════════════════
export function SettingsPage() {
    const [activeTab, setActiveTab] = useState('account');
    const { logout } = useAuthStore();
    const { setHeaderContext, clearHeaderContext } = usePageContextStore();

    const tabs = [
        { id: 'account', label: 'Account', icon: User },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'general', label: 'General', icon: Globe },
    ];

    useEffect(() => {
        setHeaderContext({
            hideSearch: true,
            summary: 'Manage your account, preferences, and connected services.',
        });
        return () => clearHeaderContext();
    }, [clearHeaderContext, setHeaderContext]);

    return (
        <div className="space-y-4 pb-4">
            <Card className="flex flex-col md:flex-row border-slate-200 dark:border-slate-800 shadow-soft overflow-hidden min-h-[680px]">
                {/* ── Left tab nav ── */}
                <div className="w-full md:w-60 bg-slate-50/50 dark:bg-slate-900/50 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col flex-shrink-0">
                    <nav className="space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all',
                                    activeTab === tab.id
                                        ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm border border-slate-100 dark:border-slate-700'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                                )}
                            >
                                <tab.icon className="h-4.5 w-4.5 flex-shrink-0" />
                                {tab.label}
                                {activeTab === tab.id && <ChevronRight className="h-3.5 w-3.5 ml-auto text-brand-400" />}
                            </button>
                        ))}
                    </nav>

                    <div className="mt-auto pt-6">
                        <button
                            onClick={() => logout()}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                        >
                            <LogOut className="h-4.5 w-4.5" />
                            Sign Out
                        </button>
                    </div>
                </div>

                {/* ── Right content ── */}
                <div className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar">
                    {activeTab === 'account' && <AccountTab />}
                    {activeTab === 'appearance' && <AppearanceTab />}
                    {activeTab === 'notifications' && <NotificationsTab />}
                    {activeTab === 'general' && <GeneralTab />}
                </div>
            </Card>
        </div>
    );
}
