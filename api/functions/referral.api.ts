import axiosInstance from '../axiosInstance';
import { endpoints } from '../endpoints';

export interface IReferralPayload {
  fullName: string;
  email: string;
  phone: string;
  language_id?: string;
  languageName?: string;
  /** Partner slug from ?source= — resolved and validated server-side. */
  source?: string;
  recaptchaToken?: string;
}

export interface IReferralRes {
  status: boolean;
  message: string;
  data?: { referralId?: string; duplicate?: boolean };
}

export const createReferralApi = async (payload: IReferralPayload) => {
  const res = await axiosInstance.post<IReferralRes>(endpoints.referral.create, payload);
  return res.data;
};
