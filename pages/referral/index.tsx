import { langListApi } from '@/api/functions/cms.api';
import { createReferralApi } from '@/api/functions/referral.api';
import Wrapper from '@/layout/wrapper/Wrapper';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Container,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Head from 'next/head';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';

interface ILanguage {
  _id: string;
  language_display_name: string;
}

/** Fires a GA event when analytics is present. Silent otherwise. */
const track = (event: string, params: Record<string, unknown> = {}) => {
  if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
    (window as any).gtag('event', event, params);
  }
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function Referral() {
  const router = useRouter();
  // Partner slug is passed straight through; the server resolves and validates
  // it. An unknown value is recorded as "Direct" rather than breaking the page.
  const source = useMemo(() => {
    const s = router.query?.source;
    return typeof s === 'string' ? s.trim().toLowerCase().slice(0, 80) : '';
  }, [router.query]);

  const [languages, setLanguages] = useState<ILanguage[]>([]);
  const [language, setLanguage] = useState<ILanguage | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);

  // Guards against a second submit slipping through before state updates.
  const inFlight = useRef(false);
  const startedTracked = useRef(false);

  useEffect(() => {
    if (!router.isReady) return;
    track('referral_page_view', { referral_source: source || 'direct' });
  }, [router.isReady, source]);

  useEffect(() => {
    let active = true;
    langListApi()
      .then((res: any) => {
        if (active && res?.data) setLanguages(res.data);
      })
      .catch(() => {
        /* the field falls back to free text if the list can't load */
      });
    return () => {
      active = false;
    };
  }, []);

  const onFirstInput = () => {
    if (startedTracked.current) return;
    startedTracked.current = true;
    track('referral_form_started', { referral_source: source || 'direct' });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Please enter your full name.';
    if (!email.trim()) e.email = 'Please enter your email address.';
    else if (!EMAIL_RE.test(email.trim())) e.email = 'Please enter a valid email address.';
    if (!phone.trim()) e.phone = 'Please enter your phone number.';
    else if (phone.replace(/\D/g, '').length < 7) e.phone = 'Please enter a valid phone number.';
    if (!language) e.language = 'Please select the language needed.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (inFlight.current || submitting) return;
    if (!validate()) return;

    inFlight.current = true;
    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await createReferralApi({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        language_id: language?._id,
        languageName: language?.language_display_name,
        source: source || undefined,
      });

      if (res?.status === false) {
        setSubmitError(res?.message || 'Something went wrong. Please try again.');
        return;
      }
      track('referral_submitted', { referral_source: source || 'direct' });
      setDone(true);
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.message ||
          'We could not submit your request. Please check your connection and try again.'
      );
    } finally {
      setSubmitting(false);
      inFlight.current = false;
    }
  };

  return (
    <>
      <Head>
        <title>Request an Interpreter | Speakwide</title>
        {/* Utility page, not an SEO landing page. */}
        <meta name='robots' content='noindex, follow' />
      </Head>

      <Wrapper isFixedHeader>
        <Container maxWidth='sm'>
          <Box py={{ xs: 5, sm: 8 }}>
            {done ? (
              <Box textAlign='center'>
                <Typography variant='h4' component='h1' gutterBottom>
                  Thank You
                </Typography>
                <Typography color='text.secondary'>
                  Your request has been received. A Speakwide team member will contact you to help
                  coordinate interpreter services.
                </Typography>
                <Typography color='text.secondary' mt={2}>
                  No further action is needed from you right now.
                </Typography>
              </Box>
            ) : (
              <>
                <Typography variant='h4' component='h1' gutterBottom>
                  Need an Interpreter?
                </Typography>
                <Typography color='text.secondary' mb={4}>
                  Complete the short form below and a Speakwide team member will contact you to help
                  coordinate interpreter services.
                </Typography>

                <form onSubmit={handleSubmit} noValidate>
                  <Stack spacing={2.5}>
                    <TextField
                      label='Full Name'
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        onFirstInput();
                      }}
                      error={!!errors.fullName}
                      helperText={errors.fullName}
                      autoComplete='name'
                      fullWidth
                      required
                    />

                    <TextField
                      label='Email Address'
                      type='email'
                      inputMode='email'
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        onFirstInput();
                      }}
                      error={!!errors.email}
                      helperText={errors.email}
                      autoComplete='email'
                      fullWidth
                      required
                    />

                    <TextField
                      label='Phone Number'
                      type='tel'
                      inputMode='tel'
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        onFirstInput();
                      }}
                      error={!!errors.phone}
                      helperText={errors.phone}
                      autoComplete='tel'
                      fullWidth
                      required
                    />

                    <Autocomplete
                      options={languages}
                      value={language}
                      onChange={(_, v) => {
                        setLanguage(v);
                        onFirstInput();
                      }}
                      getOptionLabel={(o) => o?.language_display_name || ''}
                      isOptionEqualToValue={(o, v) => o._id === v._id}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label='Language Needed'
                          error={!!errors.language}
                          helperText={errors.language}
                          required
                        />
                      )}
                    />

                    {submitError && <Alert severity='error'>{submitError}</Alert>}

                    <Button
                      type='submit'
                      variant='contained'
                      size='large'
                      disabled={submitting}
                      sx={{ py: 1.5 }}
                      startIcon={
                        submitting ? <CircularProgress size={18} color='inherit' /> : undefined
                      }
                    >
                      {submitting ? 'Submitting…' : 'Request an Interpreter'}
                    </Button>

                    <Typography variant='body2' color='text.secondary'>
                      By submitting this form, you agree that Speakwide may contact you regarding
                      your interpreter request. See our{' '}
                      <MuiLink component={NextLink} href='/privacy/'>
                        Privacy Policy
                      </MuiLink>{' '}
                      and{' '}
                      <MuiLink component={NextLink} href='/terms/'>
                        Terms of Service
                      </MuiLink>
                      .
                    </Typography>
                  </Stack>
                </form>
              </>
            )}
          </Box>
        </Container>
      </Wrapper>
    </>
  );
}

export default Referral;
