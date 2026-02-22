import React, { useState } from 'react';
import {
    User, Palette, Bell, Globe, LogOut, Check, ExternalLink, RefreshCw,
    Sun, Moon, Monitor, Wifi, WifiOff, Shield, Trash2, AlertCircle,
    Mail, Calendar, CheckSquare, Clock, Volume2, VolumeX, Smartphone,
    Languages, Info, ChevronRight, Zap, BotMessageSquare
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { cn } from '../../utils/cn';

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

// ════════════════════════════════════════════════════════════════════════════
// TAB: Account
// ════════════════════════════════════════════════════════════════════════════
function AccountTab() {
    const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
    const connectGoogle = () => { window.location.href = 'http://localhost:8000/api/auth/google'; };

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Profile card */}
            <div>
                <SectionHeader title="Profile" desc="Your personal account information." />
                <Card className="p-6 border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-5">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-brand-500/20 flex-shrink-0">
                            AK
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">Arun Kumar</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Pro Plan · Final Year Project</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={cn(
                                    'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full',
                                    isAuthenticated
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800'
                                        : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800'
                                )}>
                                    {isAuthenticated
                                        ? <><Wifi className="h-3 w-3" /> Google Connected</>
                                        : <><WifiOff className="h-3 w-3" /> Not Connected</>
                                    }
                                </span>
                            </div>
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
                                    <img src="https://www.gstatic.com/images/branding/product/2x/google_64dp.png" alt="Google" className="h-6 w-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">Google Workspace</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Calendar · Gmail · Tasks · Drive · Contacts</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {isAuthenticated ? (
                                    <>
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                                            <Check className="h-3 w-3" /> Connected
                                        </span>
                                        <Button variant="outline" size="sm" onClick={() => checkAuth()} className="dark:border-slate-700">
                                            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                                            Refresh
                                        </Button>
                                    </>
                                ) : (
                                    <Button onClick={connectGoogle} className="bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20">
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Connect Google
                                    </Button>
                                )}
                            </div>
                        </div>

                        {isAuthenticated && (
                            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { icon: Calendar, label: 'Calendar', color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
                                    { icon: Mail, label: 'Gmail', color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
                                    { icon: CheckSquare, label: 'Tasks', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
                                    { icon: User, label: 'Contacts', color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20' },
                                ].map(({ icon: Icon, label, color }) => (
                                    <div key={label} className={cn('flex items-center gap-2.5 px-3 py-2 rounded-xl', color)}>
                                        <Icon className="h-4 w-4 flex-shrink-0" />
                                        <span className="text-xs font-semibold">{label}</span>
                                        <Check className="h-3 w-3 ml-auto" />
                                    </div>
                                ))}
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
                        <Button variant="outline" size="sm" className="text-red-600 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0 ml-4">
                            Revoke
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: Appearance
// ════════════════════════════════════════════════════════════════════════════
function AppearanceTab() {
    const { theme, setTheme } = useThemeStore();
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
                        <button key={item.id} onClick={() => setTheme(item.id as any)}
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
                <SectionHeader title="Layout Density" />
                <Card className="p-5 border-slate-200 dark:border-slate-800">
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-600 dark:text-slate-400">Density</span>
                            <span className="font-bold text-slate-900 dark:text-white">Comfortable</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full w-2/3 bg-brand-500 rounded-full" />
                        </div>
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>Compact</span><span>Comfortable</span><span>Spacious</span>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: Notifications
// ════════════════════════════════════════════════════════════════════════════
function NotificationsTab() {
    const [notifs, setNotifs] = useState({
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

    const toggle = (key: keyof typeof notifs) =>
        setNotifs(prev => ({ ...prev, [key]: !(prev[key] as any) }));

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Summary banner */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-900/30">
                <Bell className="h-5 w-5 text-brand-600 flex-shrink-0" />
                <p className="text-sm text-brand-700 dark:text-brand-300">
                    <span className="font-bold">3 notification types</span> are active. Configure what you want to be alerted about.
                </p>
            </div>

            {/* In-App Alerts */}
            <div>
                <SectionHeader title="In-App Alerts" desc="Alerts shown inside the application." />
                <Card className="border-slate-200 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800/60">
                    <div className="px-5">
                        <SettingRow icon={Mail} title="Email Digest Summaries" desc="Daily AI-generated summaries of your emails.">
                            <Toggle checked={notifs.email_summaries} onChange={() => toggle('email_summaries')} />
                        </SettingRow>
                    </div>
                    <div className="px-5">
                        <SettingRow icon={Calendar} title="Calendar Reminders" desc="Alert 30 minutes before upcoming events.">
                            <Toggle checked={notifs.calendar_reminders} onChange={() => toggle('calendar_reminders')} />
                        </SettingRow>
                    </div>
                    <div className="px-5">
                        <SettingRow icon={CheckSquare} title="Task Due Alerts" desc="Notify when a task is due today or overdue.">
                            <Toggle checked={notifs.task_due} onChange={() => toggle('task_due')} />
                        </SettingRow>
                    </div>
                    <div className="px-5">
                        <SettingRow icon={Zap} title="Conflict Alerts" desc="Warn when calendar events or tasks overlap.">
                            <Toggle checked={notifs.conflict_alerts} onChange={() => toggle('conflict_alerts')} />
                        </SettingRow>
                    </div>
                    <div className="px-5">
                        <SettingRow icon={BotMessageSquare} title="AI Insights" desc="Proactive AI tips and scheduling suggestions.">
                            <Toggle checked={notifs.ai_insights} onChange={() => toggle('ai_insights')} />
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
                            <Toggle checked={notifs.browser_push} onChange={() => toggle('browser_push')} />
                        </SettingRow>
                    </div>
                    <div className="px-5">
                        <SettingRow icon={notifs.sound ? Volume2 : VolumeX} title="Notification Sounds" desc="Play a sound when a new notification arrives.">
                            <Toggle checked={notifs.sound} onChange={() => toggle('sound')} />
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
                            <select
                                value={notifs.digest_frequency}
                                onChange={e => setNotifs(p => ({ ...p, digest_frequency: e.target.value }))}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            >
                                <option value="daily">Every Day</option>
                                <option value="weekdays">Weekdays Only</option>
                                <option value="weekly">Weekly (Mon)</option>
                            </select>
                        </div>
                    </div>
                    <Button size="sm" className="bg-brand-600 hover:bg-brand-700 text-white">
                        Save Digest Settings
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
    const [settings, setSettings] = useState({
        language: 'en',
        timezone: 'Asia/Kolkata',
        time_format: '12h',
        date_format: 'DD/MM/YYYY',
        start_of_week: 'monday',
        ai_context_window: '10',
        auto_refresh: true,
        telemetry: false,
    });

    const toggle = (key: keyof typeof settings) =>
        setSettings(prev => ({ ...prev, [key]: !(prev[key] as any) }));

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
                                <select
                                    value={(settings as any)[key]}
                                    onChange={e => setSettings(p => ({ ...p, [key]: e.target.value }))}
                                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                >
                                    {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                                </select>
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
                            <select
                                value={settings.ai_context_window}
                                onChange={e => setSettings(p => ({ ...p, ai_context_window: e.target.value }))}
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                            >
                                {['5', '10', '15', '20'].map(v => <option key={v} value={v}>{v} messages</option>)}
                            </select>
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
                <Button className="bg-brand-600 hover:bg-brand-700 text-white">
                    Save Changes
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

    const tabs = [
        { id: 'account', label: 'Account', icon: User },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'general', label: 'General', icon: Globe },
    ];

    return (
        <div className="space-y-8 pb-12">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your account, preferences, and connected services.</p>
            </div>

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
