import { areaOfInterestApi, langListApi, sessionPricingApi } from '@/api/functions/cms.api';
import { editSessionApi, sessionDetailInterpreterApi } from '@/api/functions/session.api';
import { queryKeys } from '@/config/constants';
import { RequestSessionModalContentWrap } from '@/styles/StyledComponents/RequestSessionModalContentWrap';
import CommonAutocomplete from '@/ui/CommonAutoComplete/CommonAutoComplete';
import InputFieldCommon from '@/ui/CommonInput/CommonInput';
import CustomSelect from '@/ui/CustomSelect/CustomSelect';
import CheckBoxEmptyIcon from '@/ui/Icons/CheckBoxEmptyIcon';
import CheckedIconCheckBox from '@/ui/Icons/CheckedIconCheckBox';
import DirectionIcon from '@/ui/Icons/DirectionIcon';
import InfoIcon from '@/ui/Icons/InfoIcon';
import { showWarnToast } from '@/ui/Toast/ToastUtils';
import { yupResolver } from '@hookform/resolvers/yup';
import EditIcon from '@mui/icons-material/Edit';
import {
  Box,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Grid2,
  IconButton,
  InputLabel,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import { DatePicker, LocalizationProvider, TimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useMutation, useQuery } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as yup from 'yup';
import ButtonCommon from '../layouts/common/ButtonCommon';
import LocationPicker from '../Map/LocationPicker';

interface IAdjustedData {
  clientSecret?: string;
  paymentIntentId?: string;
  duration_comparision?: {
    existingStart: string;
    existingEnd: string;
    requestedStart: string;
    requestedEnd: string;
    finalStart: string;
    finalEnd: string;
    existingDurationInMinutes: number;
    newDurationInMinutes: number;
    extraAmount: number;
    platform_fee_amount?: string;
  };
}

interface IRequestSessionEditProps {
  handleClose: (data: IAdjustedData) => void;
  id: string;
  BottomButtonText?: string;
}

let pricingPlanList: { value: string; label: string; pricing: number }[] = [];

const validationSchema = yup.object({
  lang1: yup
    .object({
      value: yup.string().required(),
      label: yup.string().required(),
    })
    .required('Please select the first language'),
  lang2: yup
    .object({
      value: yup.string().required(),
      label: yup.string().required(),
    })
    .required('Please select the second language'),
  interpreterType: yup.string().required('Please select interpreter type'),
  sessionType: yup.string().required('Please select session type'),
  sessionFormat: yup.string().required('Please select session format'),
  sessionLocation: yup
    .string()
    .default('')
    .when('sessionFormat', {
      is: (val: string) => {
        const selectedSession = pricingPlanList.find(item => item.value === val);
        const isOnsite = selectedSession?.label?.toLowerCase()?.includes('site');
        return isOnsite;
      },
      then: schema => schema.required('Please select a location'),
      otherwise: schema => schema.notRequired(),
    }),
  sessionDate: yup
    .mixed<Dayjs>()
    .nullable()
    .required('Please select session date')
    .test('is-valid-date', 'Please select a valid date', value => {
      if (!value) return false;
      return dayjs.isDayjs(value) && value.isValid();
    }),
  startTime: yup
    .mixed<Dayjs>()
    .nullable()
    .required('Please select start time')
    .test('is-valid-time', 'Please select a valid start time', value => {
      if (!value) return false;
      return dayjs.isDayjs(value) && value.isValid();
    }),
  endTime: yup
    .mixed<Dayjs>()
    .nullable()
    .required('Please select end time')
    .test('is-valid-time', 'Please select a valid end time', value => {
      if (!value) return false;
      return dayjs.isDayjs(value) && value.isValid();
    })
    .test('is-after-start', function (value) {
      const { startTime, sessionFormat } = this.parent;
      if (!value || !startTime) return true;

      const selectedSession = pricingPlanList.find(item => item.value === sessionFormat);
      const isOnsite = selectedSession?.label?.toLowerCase()?.includes('site');
      const minimumEndTime = dayjs(startTime).add(isOnsite ? 2 : 0, 'hour');

      // Onsite requires AT LEAST 2 hours, so exactly 2 hours must pass.
      // isAfter is strictly exclusive and was rejecting it, meaning a session
      // that could be booked (the create form uses MUI minTime, which is
      // inclusive) could not then be edited.
      // Non-onsite has no minimum duration, so the end must still be strictly
      // after the start - a zero-length session is not valid.
      const isTooShort = isOnsite
        ? dayjs(value).isBefore(minimumEndTime)
        : !dayjs(value).isAfter(dayjs(startTime));

      if (isTooShort) {
        return this.createError({
          message: isOnsite
            ? 'End time must be at least 2 hours after start time for onsite sessions'
            : 'End time must be after start time',
        });
      }

      return true;
    }),
  preferredGender: yup.string().default(''),
  sessionDetails: yup.string().required('Please provide session details'),
  documentTranslation: yup.boolean().default(false),
  acceptTerms: yup
    .boolean()
    .oneOf([true], 'You must accept the cancellation policy and terms of use')
    .required('You must accept the terms'),
});

type TFormValues = {
  lang1: { value: string; label: string };
  lang2: { value: string; label: string };
  interpreterType: string;
  sessionType: string;
  sessionFormat: string;
  sessionLocation: string;
  sessionDate: Dayjs | null;
  startTime: Dayjs | null;
  endTime: Dayjs | null;
  preferredGender: string;
  sessionDetails: string;
  documentTranslation: boolean;
  acceptTerms: boolean;
};

function SessionEditForm({ id, handleClose }: IRequestSessionEditProps) {
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const editSessionMutation = useMutation({
    mutationFn: editSessionApi,
    onSuccess: data => {
      // console.log(data.data, '***');
      handleClose(data.data);
    },
  });

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<TFormValues>({
    defaultValues: {
      lang1: { value: '', label: '' },
      lang2: { value: '', label: '' },
      interpreterType: '',
      sessionType: '',
      sessionFormat: '',
      sessionLocation: '',
      sessionDate: null,
      startTime: null,
      endTime: null,
      preferredGender: '',
      sessionDetails: '',
      documentTranslation: false,
      acceptTerms: false,
    },
    resolver: yupResolver(validationSchema) as any,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const sessionDetailQuery = useQuery({
    queryKey: queryKeys.interpreterSessionDetail(id),
    queryFn: () => sessionDetailInterpreterApi(id),
    enabled: Boolean(id),
    refetchOnMount: true,
  });

  const languageQuery = useQuery({
    queryKey: queryKeys.langList,
    queryFn: langListApi,
  });

  const areaInterestQuery = useQuery({
    queryKey: queryKeys.areaOfExpertise,
    queryFn: areaOfInterestApi,
  });

  const interpreterType = watch('interpreterType');
  const sessionTypeValue = watch('sessionType');
  const isPricingAllowed = Boolean(interpreterType && sessionTypeValue);

  const pricingPlanQuery = useQuery({
    queryKey: queryKeys.pricingPlanList(`${interpreterType}-${sessionTypeValue}`),
    queryFn: () =>
      sessionPricingApi({
        interpreterType: interpreterType as 'Certified' | 'Qualified',
        sessionType: sessionTypeValue,
      }),
    enabled: isPricingAllowed,
  });

  useEffect(() => {
    if (sessionDetailQuery.data?.data) {
      const sessionData = sessionDetailQuery.data.data;

      // Parse location if it's stored as JSON string
      let locationString = '';
      if (sessionData.location) {
        try {
          // If location is already a JSON string with lat/lng
          // const parsed = JSON.parse(sessionData.location);
          locationString = sessionData.location;
        } catch {
          // If location is just a plain address string
          locationString = sessionData.location;
        }
      }

      const formattedData: TFormValues = {
        lang1: {
          value: sessionData.language_one._id,
          label: sessionData.language_one.language_display_name,
        },
        lang2: {
          value: sessionData.language_two._id,
          label: sessionData.language_two.language_display_name,
        },
        interpreterType: 'Certified',
        sessionType: sessionData.type._id,
        sessionFormat: sessionData.format._id,
        sessionLocation: locationString,
        sessionDate: dayjs(sessionData.start_date_time),
        startTime: dayjs(sessionData.start_date_time),
        endTime: dayjs(sessionData.end_date_time),
        preferredGender: sessionData.preferred_gender || '',
        sessionDetails: sessionData.details,
        documentTranslation: false,
        acceptTerms: true,
      };

      reset(formattedData);
    }
  }, [sessionDetailQuery.data, reset]);

  const languages =
    languageQuery.data?.data?.map(item => ({
      value: item._id,
      label: item.language_display_name,
    })) || [];

  const interestList =
    areaInterestQuery?.data?.data?.map(item => ({
      label: item.expertise_display_name,
      value: item._id,
    })) || [];

  pricingPlanList =
    pricingPlanQuery.data?.data?.map(item => ({
      value: item.sessionformatDetails._id,
      label: item.sessionformatDetails.title,
      pricing: item.price,
    })) || [];

  const selectedSession = pricingPlanList.find(item => item.value === watch('sessionFormat'));
  const isOnsite = selectedSession?.label?.toLowerCase()?.includes('site');

  const onSubmit = async (data: TFormValues) => {
    const startDateTime = dayjs(data.sessionDate)
      .hour(dayjs(data.startTime).hour())
      .minute(dayjs(data.startTime).minute())
      .second(0);

    const endDateTime = dayjs(data.sessionDate)
      .hour(dayjs(data.endTime).hour())
      .minute(dayjs(data.endTime).minute())
      .second(0);

    const formData = new FormData();
    formData.append('language_one', data.lang1.value);
    formData.append('language_two', data.lang2.value);
    formData.append('interpreter_type', data.interpreterType);
    formData.append('type', data.sessionType);
    formData.append('format', data.sessionFormat);
    formData.append('id', id);

    if (data.sessionLocation) {
      const location = JSON.parse(data.sessionLocation);
      formData.append('location', location?.address);
      formData.append('lat', location?.lat);
      formData.append('lng', location?.lng);
      formData.append('isOnSite', 'true');
    }

    formData.append('start_date_time', startDateTime.toISOString());
    formData.append('end_date_time', endDateTime.toISOString());

    if (data.preferredGender) formData.append('preferred_gender', data.preferredGender);
    if (data.sessionDetails) formData.append('details', data.sessionDetails);

    editSessionMutation.mutate(formData);
  };

  if (sessionDetailQuery.isLoading) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' minHeight='400px'>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <RequestSessionModalContentWrap>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid2 container spacing={2}>
            {/* LANGUAGES */}
            <Grid2 size={{ xs: 12 }}>
              <Box className='eachInputBox'>
                <InputLabel>Select languages for interpretation</InputLabel>
                <Stack
                  direction='row'
                  alignItems='center'
                  justifyContent='space-between'
                  className='interpretationLanguagesBox'
                  gap='5px'
                >
                  <Controller
                    name='lang1'
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                      <Stack width={'50%'}>
                        <CommonAutocomplete
                          {...field}
                          label='English'
                          options={languages}
                          onSelect={value => field.onChange(value)}
                        />
                        {error && (
                          <Typography color='error' variant='caption'>
                            {error.message}
                          </Typography>
                        )}
                      </Stack>
                    )}
                  />
                  <DirectionIcon />
                  <Controller
                    name='lang2'
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                      <Stack width={'50%'}>
                        <CommonAutocomplete
                          {...field}
                          label='Spanish'
                          options={languages}
                          onSelect={value => field.onChange(value)}
                        />
                        {error && (
                          <Typography color='error' variant='caption'>
                            {error.message}
                          </Typography>
                        )}
                      </Stack>
                    )}
                  />
                </Stack>
              </Box>
            </Grid2>

            {/* INTERPRETER TYPE */}
            <Grid2 size={{ xs: 12 }}>
              <Box className='eachInputBox'>
                <InputLabel>Interpreter Type</InputLabel>
                <Controller
                  name='interpreterType'
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      {...field}
                      initialvalue='Certified'
                      error={!!errors.interpreterType}
                    >
                      <MenuItem value='Certified'>Certified</MenuItem>
                      <MenuItem value='Qualified'>Qualified</MenuItem>
                    </CustomSelect>
                  )}
                />
                {errors.interpreterType && (
                  <Typography color='error' variant='caption'>
                    {errors.interpreterType.message}
                  </Typography>
                )}
              </Box>
            </Grid2>

            {/* SESSION TYPE */}
            <Grid2 size={{ xs: 12 }}>
              <Box className='eachInputBox'>
                <InputLabel>Session Type</InputLabel>
                <Controller
                  name='sessionType'
                  control={control}
                  render={({ field }) => (
                    <CustomSelect {...field} initialvalue='Medical' error={!!errors.sessionType}>
                      {interestList.map(item => (
                        <MenuItem value={item.value} key={item.value}>
                          {item.label}
                        </MenuItem>
                      ))}
                    </CustomSelect>
                  )}
                />
                {errors.sessionType && (
                  <Typography color='error' variant='caption'>
                    {errors.sessionType.message}
                  </Typography>
                )}
              </Box>
            </Grid2>

            {/* SESSION FORMAT */}
            {isPricingAllowed && (
              <Grid2 size={{ xs: 12 }}>
                <Box className='eachInputBox'>
                  <InputLabel>Session Format</InputLabel>
                  {pricingPlanQuery.isLoading ? (
                    <Box
                      width={'100%'}
                      sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    >
                      <CircularProgress size={15} />
                    </Box>
                  ) : (
                    <Controller
                      name='sessionFormat'
                      control={control}
                      render={({ field }) => (
                        <CustomSelect
                          {...field}
                          initialvalue='On-site'
                          error={!!errors.sessionFormat}
                          disabled
                          // disabled={!isPricingAllowed}
                          onClick={() => {
                            if (!isPricingAllowed) {
                              showWarnToast('Please select Interpreter Type and Session Type.');
                            }
                          }}
                        >
                          {pricingPlanList.map(item => (
                            <MenuItem value={item.value} key={item.value}>
                              <Stack
                                direction='row'
                                alignItems='center'
                                justifyContent='space-between'
                                className='menuStack'
                              >
                                <Typography>{item.label}</Typography>
                                <Typography>${item.pricing}/hr</Typography>
                              </Stack>
                            </MenuItem>
                          ))}
                        </CustomSelect>
                      )}
                    />
                  )}

                  {errors.sessionFormat && (
                    <Typography color='error' variant='caption'>
                      {errors.sessionFormat.message}
                    </Typography>
                  )}
                </Box>
              </Grid2>
            )}

            {/* SESSION LOCATION */}
            {Boolean(isOnsite) && (
              <Grid2 size={{ xs: 12 }}>
                <Box className='eachInputBox'>
                  <Stack direction='row' alignItems='center' justifyContent='space-between'>
                    <InputLabel>Session Location</InputLabel>
                    <IconButton
                      size='small'
                      onClick={() => setIsEditingLocation(!isEditingLocation)}
                      color='primary'
                    >
                      <EditIcon fontSize='small' />
                    </IconButton>
                  </Stack>

                  <Controller
                    name='sessionLocation'
                    control={control}
                    render={({ field }) => {
                      // Parse the location to display address
                      let displayAddress = 'No location selected';
                      try {
                        if (field.value) {
                          const locationData = JSON.parse(field.value);
                          displayAddress = locationData.address || 'No location selected';
                        }
                      } catch {
                        displayAddress = field.value || 'No location selected';
                      }

                      return (
                        <>
                          {!isEditingLocation ? (
                            // Display mode
                            <Box
                              sx={{
                                p: 2,
                                border: '1px solid',
                                borderColor: errors.sessionLocation ? 'error.main' : 'divider',
                                borderRadius: 1,
                                bgcolor: 'background.paper',
                                minHeight: '56px',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <Typography
                                variant='body1'
                                color={
                                  displayAddress === 'No location selected'
                                    ? 'text.secondary'
                                    : 'text.primary'
                                }
                              >
                                {displayAddress}
                              </Typography>
                            </Box>
                          ) : (
                            // Edit mode - Show LocationPicker
                            <Box height={400}>
                              <LocationPicker
                                height={400}
                                onLocationChange={data => {
                                  const str = JSON.stringify(data);
                                  field.onChange(str);
                                  // Optionally close the picker after selection
                                  setIsEditingLocation(false);
                                }}
                              />
                            </Box>
                          )}
                        </>
                      );
                    }}
                  />

                  {errors.sessionLocation && (
                    <Typography color='error' variant='caption' display='block' mt={1}>
                      {errors.sessionLocation.message}
                    </Typography>
                  )}
                </Box>
              </Grid2>
            )}

            {/* SESSION DATE */}
            <Grid2 size={{ xs: 12 }}>
              <Box className='eachInputBox datepickerdsgn'>
                <InputLabel>Session Date</InputLabel>
                <Controller
                  name='sessionDate'
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      minDate={dayjs()}
                      views={['year', 'month', 'day']}
                      slotProps={{
                        textField: {
                          error: !!errors.sessionDate,
                          helperText: errors.sessionDate?.message,
                          fullWidth: true,
                        },
                      }}
                    />
                  )}
                />
              </Box>
            </Grid2>

            {/* START TIME */}
            <Grid2 size={{ md: 6, xs: 12 }}>
              <Box className='eachInputBox datepickerdsgn'>
                <InputLabel>Start Time</InputLabel>
                <Controller
                  name='startTime'
                  control={control}
                  render={({ field }) => (
                    <TimePicker
                      {...field}
                      views={['hours', 'minutes']}
                      slotProps={{
                        textField: {
                          error: !!errors.startTime,
                          helperText: errors.startTime?.message,
                          fullWidth: true,
                        },
                      }}
                    />
                  )}
                />
              </Box>
            </Grid2>

            {/* END TIME */}
            <Grid2 size={{ md: 6, xs: 12 }}>
              <Box className='eachInputBox datepickerdsgn'>
                <InputLabel>End Time</InputLabel>
                <Controller
                  name='endTime'
                  control={control}
                  render={({ field }) => (
                    <TimePicker
                      {...field}
                      views={['hours', 'minutes']}
                      minTime={
                        watch('startTime')
                          ? dayjs(watch('startTime')).add(isOnsite ? 2 : 0, 'hour')
                          : undefined
                      }
                      slotProps={{
                        textField: {
                          error: !!errors.endTime,
                          helperText: errors.endTime?.message,
                          fullWidth: true,
                        },
                      }}
                    />
                  )}
                />
              </Box>
            </Grid2>

            {/* GENDER */}
            <Grid2 size={{ xs: 12 }}>
              <Box className='eachInputBox'>
                <InputLabel>
                  Preferred Gender <span>(Optional)</span>
                </InputLabel>
                <Controller
                  name='preferredGender'
                  control={control}
                  render={({ field }) => (
                    <CustomSelect {...field} initialvalue='Select Gender'>
                      <MenuItem value='Male'>Male</MenuItem>
                      <MenuItem value='Female'>Female</MenuItem>
                      <MenuItem value='Choose not to disclose'>Choose not to disclose</MenuItem>
                    </CustomSelect>
                  )}
                />
              </Box>
              <Stack direction='row' alignItems='flex-start' gap='5px' className='informationBox'>
                <i>
                  <InfoIcon />
                </i>
                <Typography className='infoText'>
                  While we offer the option to indicate a preferred gender. Please note that we
                  cannot guarantee that your preference will always be met; however we will make
                  every reasonable effort to accommodate your selection whenever possible.
                </Typography>
              </Stack>
            </Grid2>

            {/* SESSION DETAILS */}
            <Grid2 size={{ xs: 12 }}>
              <Box className='eachInputBox'>
                <InputLabel>Session Details</InputLabel>
                <Controller
                  name='sessionDetails'
                  control={control}
                  render={({ field }) => (
                    <InputFieldCommon
                      {...field}
                      multiline
                      rows={4}
                      error={!!errors.sessionDetails}
                      helperText={errors.sessionDetails?.message}
                    />
                  )}
                />
              </Box>
              <Stack direction='row' alignItems='flex-start' gap='5px' className='informationBox'>
                <i>
                  <InfoIcon />
                </i>
                <Typography className='infoText'>
                  Please do not provide meeting links in this box. Our system will not recognize
                  them.
                </Typography>
              </Stack>
            </Grid2>
          </Grid2>

          {/* TERMS */}
          <Controller
            name='acceptTerms'
            control={control}
            render={({ field }) => (
              <FormControlLabel
                className='checkbox'
                control={
                  <Checkbox
                    {...field}
                    checked={field.value}
                    icon={<CheckBoxEmptyIcon />}
                    checkedIcon={<CheckedIconCheckBox />}
                  />
                }
                label='Accept Cancellation Policy & Terms of Use'
              />
            )}
          />
          {errors.acceptTerms && (
            <Typography color='error' variant='caption' display='block'>
              {errors.acceptTerms.message}
            </Typography>
          )}

          {/* SUBMIT BUTTON */}
          <Stack
            direction='row'
            alignItems='center'
            justifyContent='flex-end'
            className='requestSessionbtn'
          >
            <ButtonCommon
              variant='contained'
              color='primary'
              type='submit'
              isLoading={editSessionMutation.isPending}
            >
              Update Session
            </ButtonCommon>
          </Stack>
        </form>
      </RequestSessionModalContentWrap>
    </LocalizationProvider>
  );
}

export default SessionEditForm;
