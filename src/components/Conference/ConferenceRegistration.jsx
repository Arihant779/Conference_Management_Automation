import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Building2, GraduationCap, Globe,
  ChevronRight, ChevronLeft, Check, Loader2, X,
  Calendar, MapPin, Users, Tag, FileText, Sparkles
} from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';

/* ─── helpers ─────────────────────────────────────────── */
const cls = (...c) => c.filter(Boolean).join(' ');

const REGISTRATION_TYPES = [
  {
    id: 'general',
    label: 'General Admission',
    feeKey: 'registration_fee_general',
    fallback: '$299',
    icon: Users,
    description: 'Full access to all sessions, workshops, and networking events.',
    accent: 'indigo',
  },
  {
    id: 'student',
    label: 'Student Rate',
    feeKey: 'registration_fee_student',
    fallback: '$149',
    icon: GraduationCap,
    description: 'Discounted rate for enrolled students. Valid student ID required.',
    accent: 'purple',
  },
  {
    id: 'early',
    label: 'Early Bird',
    feeKey: 'registration_fee_early',
    fallback: '$199',
    icon: Sparkles,
    description: 'Limited-time discounted rate. Available while slots last.',
    accent: 'emerald',
  },
];

const DIETARY = ['No restrictions', 'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-free', 'Other'];
const TSHIRT = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const STEPS = ['Your Details', 'Affiliation', 'Preferences', 'Review & Pay'];

/* ─── field primitives ───────────────────────────────── */
const Label = ({ children, required }) => (
  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
    {children}{required && <span className="text-indigo-400 ml-0.5">*</span>}
  </label>
);

const Input = ({ icon: Icon, error, className, ...props }) => (
  <div className="relative">
    {Icon && (
      <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
    )}
    <input
      {...props}
      className={cls(
        'w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600',
        'outline-none transition-all',
        Icon && 'pl-9',
        error
          ? 'border-red-500/50 focus:border-red-500'
          : 'border-white/10 focus:border-indigo-500/70 focus:bg-white/10',
        className,
      )}
    />
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
  </div>
);

const Select = ({ icon: Icon, children, error, ...props }) => (
  <div className="relative">
    {Icon && <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />}
    <select
      {...props}
      className={cls(
        'w-full bg-[#0d1117] border rounded-xl px-4 py-3 text-sm text-white',
        'outline-none transition-all appearance-none cursor-pointer',
        Icon && 'pl-9',
        error ? 'border-red-500/50' : 'border-white/10 focus:border-indigo-500/70',
      )}
    >
      {children}
    </select>
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
  </div>
);

const Textarea = ({ error, ...props }) => (
  <div>
    <textarea
      {...props}
      className={cls(
        'w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600',
        'outline-none resize-none transition-all',
        error ? 'border-red-500/50' : 'border-white/10 focus:border-indigo-500/70 focus:bg-white/10',
      )}
    />
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
  </div>
);

/* ─── step indicator ──────────────────────────────────── */
const StepBar = ({ current }) => (
  <div className="flex items-center gap-0 mb-10">
    {STEPS.map((label, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div className={cls(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
              done ? 'bg-indigo-600 border-indigo-600 text-white'
                : active ? 'bg-transparent border-indigo-500 text-indigo-400'
                  : 'bg-transparent border-white/10 text-slate-600',
            )}>
              {done ? <Check size={13} /> : i + 1}
            </div>
            <span className={cls(
              'text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap hidden sm:block',
              active ? 'text-white' : done ? 'text-indigo-400' : 'text-slate-600',
            )}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cls(
              'flex-1 h-px mx-2 transition-all',
              i < current ? 'bg-indigo-600' : 'bg-white/10',
            )} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   Props:
     conf        – conference object from DB
     currentUser – auth user object (optional; pre-fills email)
     onSuccess   – fn() called after successful registration
     onBack      – fn() to go back / close
═══════════════════════════════════════════════════════ */
const ConferenceRegistration = ({ conf, currentUser, onSuccess, onBack }) => {
  const confId = conf?.conference_id || conf?.id;

  const [step, setStep] = useState(0);
  const [regType, setRegType] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  /* form state */
  const [form, setForm] = useState({
    /* step 0 – personal */
    salutation: 'Dr.',
    first_name: '',
    last_name: '',
    email: currentUser?.email || '',
    phone: '',
    /* step 1 – affiliation */
    organization: '',
    department: '',
    designation: '',
    country: '',
    website: '',
    /* step 2 – preferences */
    dietary: 'No restrictions',
    tshirt: 'M',
    accommodation_required: false,
    accommodation_notes: '',
    areas_of_interest: '',
    special_requests: '',
    /* hidden */
    orcid_id: '',
  });

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: undefined }));
  };

  /* check if already registered */
  useEffect(() => {
    if (!currentUser?.id || !confId) return;
    supabase
      .from('conference_user')
      .select('id')
      .eq('conference_id', confId)
      .eq('user_id', currentUser.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setAlreadyRegistered(true); });
  }, [currentUser, confId]);

  /* ── validation ──────────────────────────────────────── */
  const validate = () => {
    const e = {};
    if (step === 0) {
      if (!form.first_name.trim()) e.first_name = 'Required';
      if (!form.last_name.trim()) e.last_name = 'Required';
      if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    }
    if (step === 1) {
      if (!form.organization.trim()) e.organization = 'Required';
      if (!form.country.trim()) e.country = 'Required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => s + 1); };
  const back = () => setStep(s => s - 1);

  /* ── submit ──────────────────────────────────────────── */
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      /* 1. look up or create user record */
      let userId = currentUser?.id;
      if (!userId) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('user_id')
          .eq('user_email', form.email.trim().toLowerCase())
          .maybeSingle();
        userId = existingUser?.user_id;
      }

      /* 2. add to conference_user as 'presenter' */
      const { error: cuErr } = await supabase.from('conference_user').insert([{
        conference_id: confId,
        user_id: userId || null,
        email: form.email.trim().toLowerCase(),
        full_name: `${form.first_name.trim()} ${form.last_name.trim()}`,
        role: 'attendee',
        joined_at: new Date().toISOString(),
        accommodation_required: form.accommodation_required,
        accommodation_notes: form.accommodation_notes || null,
      }]);

      if (cuErr && cuErr.code !== '23505') throw cuErr; /* ignore duplicate */

      setSubmitted(true);
      if (onSuccess) setTimeout(onSuccess, 3000);
    } catch (err) {
      console.error('Registration error:', err);
      setErrors({ submit: err.message || 'Registration failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── success screen ─────────────────────────────────── */
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#080b11] flex items-center justify-center px-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-emerald-500/15 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={36} className="text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">You're registered!</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-2">
            Welcome to <span className="text-white font-semibold">{conf?.title}</span>.
          </p>
          <p className="text-slate-500 text-sm">
            A confirmation will be sent to <span className="text-indigo-400">{form.email}</span>.
          </p>
          <div className="mt-8 flex flex-col gap-3 items-center">
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl">
              <Calendar size={13} className="text-indigo-400" />
              {conf?.start_date}{conf?.end_date ? ` – ${conf.end_date}` : ''}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl">
              <MapPin size={13} className="text-indigo-400" />
              {conf?.location || 'Location TBD'}
            </div>
          </div>
          {onBack && (
            <button onClick={onBack} className="mt-8 text-sm text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
              ← Back to conference
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── already registered ─────────────────────────────── */
  if (alreadyRegistered) {
    return (
      <div className="min-h-screen bg-[#080b11] flex items-center justify-center px-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-indigo-500/15 border border-indigo-500/30 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check size={28} className="text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Already Registered</h2>
          <p className="text-slate-400 text-sm">You're already registered for this conference.</p>
          {onBack && (
            <button onClick={onBack} className="mt-6 text-sm text-indigo-400 hover:text-indigo-300 font-semibold">
              ← Back to conference
            </button>
          )}
        </div>
      </div>
    );
  }

  const selectedType = REGISTRATION_TYPES.find(t => t.id === regType);
  const displayDate = conf?.start_date
    ? `${conf.start_date}${conf?.end_date ? ` – ${conf.end_date}` : ''}`
    : 'Date TBD';

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 bg-[#080b11]/95 backdrop-blur-xl border-b border-white/10 px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <>
                <button onClick={onBack} className="text-slate-500 hover:text-white text-xs font-semibold px-2 py-1.5 hover:bg-white/5 rounded-lg transition-all">
                  ← Back
                </button>
                <div className="h-4 w-px bg-white/10" />
              </>
            )}
            <div>
              <div className="font-bold text-white text-sm">{conf?.title || 'Conference'}</div>
              <div className="text-xs text-slate-600 flex items-center gap-1">
                <Calendar size={10} />{displayDate}
                {conf?.location && <><span className="mx-1 text-slate-700">·</span><MapPin size={10} />{conf.location}</>}
              </div>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
            Registration
          </span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* ── Left: form ── */}
          <div className="lg:col-span-2 bg-[#0d1117] border border-white/10 rounded-2xl p-7">
            <StepBar current={step} />

            {/* ══ STEP 0: Registration type + personal ══ */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">Choose your ticket</h2>
                  <p className="text-slate-500 text-sm">Select the registration type that applies to you.</p>
                </div>

                {/* Ticket selector */}
                <div className="grid gap-3">
                  {REGISTRATION_TYPES.map(t => {
                    const Icon = t.icon;
                    const price = conf?.[t.feeKey] || t.fallback;
                    const isSelected = regType === t.id;
                    const accent = {
                      indigo: { border: 'border-indigo-500/60', bg: 'bg-indigo-500/10', text: 'text-indigo-400', check: 'bg-indigo-600' },
                      purple: { border: 'border-purple-500/60', bg: 'bg-purple-500/10', text: 'text-purple-400', check: 'bg-purple-600' },
                      emerald: { border: 'border-emerald-500/60', bg: 'bg-emerald-500/10', text: 'text-emerald-400', check: 'bg-emerald-600' },
                    }[t.accent];

                    return (
                      <div
                        key={t.id}
                        onClick={() => setRegType(t.id)}
                        className={cls(
                          'flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all',
                          isSelected ? `${accent.border} ${accent.bg}` : 'border-white/10 hover:border-white/20 bg-white/5',
                        )}
                      >
                        <div className={cls(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all',
                          isSelected ? accent.check : 'bg-white/5',
                        )}>
                          <Icon size={17} className={isSelected ? 'text-white' : 'text-slate-500'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white text-sm">{t.label}</div>
                          <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t.description}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={cls('text-xl font-black', isSelected ? accent.text : 'text-slate-400')}>{price}</div>
                          {isSelected && (
                            <div className={cls('w-4 h-4 rounded-full flex items-center justify-center ml-auto mt-1', accent.check)}>
                              <Check size={9} className="text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Personal info */}
                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-sm font-bold text-white mb-4">Personal Information</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <Label>Title</Label>
                        <Select value={form.salutation} onChange={e => set('salutation', e.target.value)}>
                          {['Dr.', 'Prof.', 'Mr.', 'Ms.', 'Mrs.', 'Mx.'].map(s => (
                            <option key={s} value={s} className="bg-[#0d1117]">{s}</option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Label required>First Name</Label>
                        <Input
                          placeholder="Alex"
                          value={form.first_name}
                          onChange={e => set('first_name', e.target.value)}
                          error={errors.first_name}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label required>Last Name</Label>
                        <Input
                          placeholder="Rivera"
                          value={form.last_name}
                          onChange={e => set('last_name', e.target.value)}
                          error={errors.last_name}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label required>Email</Label>
                        <Input
                          icon={Mail}
                          type="email"
                          placeholder="you@example.com"
                          value={form.email}
                          onChange={e => set('email', e.target.value)}
                          error={errors.email}
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          icon={Phone}
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          value={form.phone}
                          onChange={e => set('phone', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>ORCID iD</Label>
                      <Input
                        placeholder="0000-0000-0000-0000"
                        value={form.orcid_id}
                        onChange={e => set('orcid_id', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ STEP 1: Affiliation ══ */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">Affiliation</h2>
                  <p className="text-slate-500 text-sm">Tell us about your institution or organization.</p>
                </div>
                <div>
                  <Label required>Organization / Institution</Label>
                  <Input
                    icon={Building2}
                    placeholder="MIT, Stanford, Acme Corp…"
                    value={form.organization}
                    onChange={e => set('organization', e.target.value)}
                    error={errors.organization}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Department</Label>
                    <Input
                      placeholder="Computer Science"
                      value={form.department}
                      onChange={e => set('department', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Designation / Role</Label>
                    <Input
                      placeholder="PhD Student, Research Lead…"
                      value={form.designation}
                      onChange={e => set('designation', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label required>Country</Label>
                    <Input
                      icon={Globe}
                      placeholder="United States"
                      value={form.country}
                      onChange={e => set('country', e.target.value)}
                      error={errors.country}
                    />
                  </div>
                  <div>
                    <Label>Website / LinkedIn</Label>
                    <Input
                      placeholder="https://yoursite.com"
                      value={form.website}
                      onChange={e => set('website', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ══ STEP 2: Preferences ══ */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">Preferences</h2>
                  <p className="text-slate-500 text-sm">Help us personalise your experience.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Dietary Requirements</Label>
                    <Select value={form.dietary} onChange={e => set('dietary', e.target.value)}>
                      {DIETARY.map(d => <option key={d} value={d} className="bg-[#0d1117]">{d}</option>)}
                    </Select>
                  </div>
                  <div>
                    <Label>T-Shirt Size</Label>
                    <Select value={form.tshirt} onChange={e => set('tshirt', e.target.value)}>
                      {TSHIRT.map(s => <option key={s} value={s} className="bg-[#0d1117]">{s}</option>)}
                    </Select>
                  </div>
                </div>

                {/* ── Accommodation toggle ── */}
                <div>
                  <Label>Accommodation</Label>
                  <div
                    onClick={() => set('accommodation_required', !form.accommodation_required)}
                    className={cls(
                      'flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all select-none',
                      form.accommodation_required
                        ? 'border-indigo-500/60 bg-indigo-500/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20',
                    )}
                  >
                    <div className={cls(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all',
                      form.accommodation_required ? 'bg-indigo-600' : 'bg-white/5',
                    )}>
                      <MapPin size={17} className={form.accommodation_required ? 'text-white' : 'text-slate-500'} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white text-sm">Do you need accommodation?</div>
                      <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        We'll share hotel and hostel options near the venue with you after registration.
                      </div>
                    </div>
                    {/* Toggle pill */}
                    <div className={cls(
                      'w-11 h-6 rounded-full relative transition-all shrink-0',
                      form.accommodation_required ? 'bg-indigo-600' : 'bg-white/10',
                    )}>
                      <div className={cls(
                        'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200',
                        form.accommodation_required ? 'left-[22px]' : 'left-0.5',
                      )} />
                    </div>
                  </div>

                  {/* Notes — shown only when toggled on */}
                  {form.accommodation_required && (
                    <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      <Label>Accommodation Notes</Label>
                      <Textarea
                        rows={2}
                        placeholder="Any preferences? e.g. single room, check-in / check-out dates, accessibility needs…"
                        value={form.accommodation_notes}
                        onChange={e => set('accommodation_notes', e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label>Areas of Interest</Label>
                  <Textarea
                    rows={3}
                    placeholder="Which topics or sessions are you most interested in? e.g. AI Ethics, Quantum ML, Robotics…"
                    value={form.areas_of_interest}
                    onChange={e => set('areas_of_interest', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Special Requests / Accessibility Needs</Label>
                  <Textarea
                    rows={3}
                    placeholder="Wheelchair access, sign language interpretation, or any other requests…"
                    value={form.special_requests}
                    onChange={e => set('special_requests', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* ══ STEP 3: Review ══ */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">Review your registration</h2>
                  <p className="text-slate-500 text-sm">Confirm the details below before proceeding.</p>
                </div>

                {/* Ticket */}
                {selectedType && (() => {
                  const Icon = selectedType.icon;
                  const price = conf?.[selectedType.feeKey] || selectedType.fallback;
                  return (
                    <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                      <Icon size={18} className="text-indigo-400 shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-white">{selectedType.label}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{selectedType.description}</div>
                      </div>
                      <div className="text-xl font-black text-indigo-400">{price}</div>
                    </div>
                  );
                })()}

                {/* Summary grid */}
                {[
                  {
                    title: 'Personal',
                    rows: [
                      ['Name', `${form.salutation} ${form.first_name} ${form.last_name}`],
                      ['Email', form.email],
                      form.phone && ['Phone', form.phone],
                      form.orcid_id && ['ORCID', form.orcid_id],
                    ].filter(Boolean),
                  },
                  {
                    title: 'Affiliation',
                    rows: [
                      ['Organization', form.organization],
                      form.department && ['Department', form.department],
                      form.designation && ['Designation', form.designation],
                      ['Country', form.country],
                      form.website && ['Website', form.website],
                    ].filter(Boolean),
                  },
                  {
                    title: 'Preferences',
                    rows: [
                      ['Dietary', form.dietary],
                      ['T-Shirt', form.tshirt],
                      ['Accommodation', form.accommodation_required ? 'Yes – required' : 'Not required'],
                      form.accommodation_required && form.accommodation_notes && ['Accommodation Notes', form.accommodation_notes],
                      form.areas_of_interest && ['Interests', form.areas_of_interest],
                      form.special_requests && ['Special Requests', form.special_requests],
                    ].filter(Boolean),
                  },
                ].map(section => (
                  <div key={section.title} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-white/10 bg-white/5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{section.title}</span>
                    </div>
                    <div className="divide-y divide-white/5">
                      {section.rows.map(([k, v]) => (
                        <div key={k} className="flex gap-4 px-4 py-2.5">
                          <span className="text-xs text-slate-600 w-28 shrink-0">{k}</span>
                          <span className="text-xs text-slate-300 flex-1 break-all">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {errors.submit && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                    {errors.submit}
                  </div>
                )}
              </div>
            )}

            {/* ── Nav buttons ── */}
            <div className="flex justify-between gap-3 mt-8 pt-6 border-t border-white/10">
              {step > 0
                ? (
                  <button
                    onClick={back}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <ChevronLeft size={15} /> Back
                  </button>
                )
                : <div />
              }
              {step < STEPS.length - 1 ? (
                <button
                  onClick={next}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-500/20"
                >
                  Continue <ChevronRight size={15} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? <><Loader2 size={15} className="animate-spin" />Registering…</>
                    : <><Check size={15} />Confirm Registration</>
                  }
                </button>
              )}
            </div>
          </div>

          {/* ── Right: conference card ── */}
          <aside className="lg:col-span-1 space-y-4 lg:sticky lg:top-20">
            {/* Conference info */}
            <div className="bg-[#0d1117] border border-white/10 rounded-2xl overflow-hidden">
              {conf?.banner_url && (
                <div
                  className="h-28 bg-cover bg-center relative"
                  style={{ backgroundImage: `url(${conf.banner_url})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0d1117]" />
                </div>
              )}
              <div className="p-5 space-y-3">
                {conf?.theme && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                    {conf.theme}
                  </span>
                )}
                <h3 className="font-bold text-white text-base leading-snug">{conf?.title}</h3>
                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2"><Calendar size={12} className="text-indigo-400" />{displayDate}</div>
                  {conf?.location && <div className="flex items-center gap-2"><MapPin size={12} className="text-indigo-400" />{conf.location}</div>}
                  {conf?.contact_email && <div className="flex items-center gap-2"><Mail size={12} className="text-indigo-400" />{conf.contact_email}</div>}
                </div>
              </div>
            </div>

            {/* Price summary */}
            {selectedType && (
              <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-5">
                <div className="text-[11px] text-slate-600 uppercase tracking-widest font-bold mb-3">Order Summary</div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">{selectedType.label}</span>
                  <span className="font-black text-white">{conf?.[selectedType.feeKey] || selectedType.fallback}</span>
                </div>
                <div className="border-t border-white/10 mt-3 pt-3 flex justify-between items-center">
                  <span className="text-xs text-slate-600">Total (incl. taxes)</span>
                  <span className="text-lg font-black text-indigo-400">{conf?.[selectedType.feeKey] || selectedType.fallback}</span>
                </div>
                <p className="text-[10px] text-slate-600 mt-3 leading-relaxed">
                  Payment is collected at the venue or via the link sent to your email after registration.
                </p>
              </div>
            )}

            {/* What's included */}
            <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-5">
              <div className="text-[11px] text-slate-600 uppercase tracking-widest font-bold mb-3">What's included</div>
              <ul className="space-y-2">
                {[
                  'Access to all keynotes & panels',
                  'Workshop & breakout sessions',
                  'Conference proceedings',
                  'Networking reception',
                  'Certificate of attendance',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs text-slate-400">
                    <Check size={12} className="text-indigo-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
};

export default ConferenceRegistration;