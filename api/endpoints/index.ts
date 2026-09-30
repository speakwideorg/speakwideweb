export const baseUrl = process.env.NEXT_APP_BASE_URL;
export const baseUrlApi = `${process.env.NEXT_APP_BASE_URL}/api/`;
export const baseUrlMedia = process.env.NEXT_PUBLIC_S3_CDN_URL;

export const mediaUrl = (url: string) => {
  return `${baseUrlMedia}/uploads/${url}`;
};

export const endpoints = {
  auth: {
    user: {
      signUp: '/user/signup',
      verifyOtp: '/user/verify-otp',
      resendOtpEmail: '/user/resent-otp',
      login: '/user/signin',
    },
    interpreter: {
      signUp: '/interpreter/signup',
      login: '/interpreter/signin',
      signUpV2: '/interpreter/signup/v2',
    },
    forgotPass: '/user/forgot-password',
    verifyForgotOtp: '/user/verify-resetpw-otp',
    setNewPassForgot: '/user/forget-password-change-password',
  },
  onBoard: {
    user: {
      businessCreate: '/user/business/create',
    },
    interpreter: {
      setAvailability: '/interpreter/availability/create-update',
      verifyPersonaStatus: '/interpreter/persona-status',
    },
  },
  profile: {
    user: {
      profileData: '/user/profile',
      updateProfile: '/user/update-profile',
    },
    interpreter: {
      profileData: '/interpreter/profile',
      updateProfile: '/interpreter/update-profile',
      changePassword: '/interpreter/change-password',
    },
  },
  subscription: {
    interpreter: {
      subscriptionList: '/subscription/list',
    },
    user: {
      subscriptionList: '/subscription/list',
      pricingPlan: '/pricingplan/list',
    },
  },
  payment: {
    interpreter: {
      addBankAcnt: '/interpreter/addBankAccount',
      listBankAcnt: '/interpreter/listBankAccounts',
      addBankAccount: '/interpreter/updateBankStatus',
      taxInfoUrl: '/interpreter/generate-express-account-login-link',
    },
    user: {
      setupIntent: '/user/createSetupIntent',
      addCard: '/user/addCard',
      deleteCard: '/user/deleteCard',
      listCards: '/user/listCard',
      createPaymentIntent: '/user/createPaymentIntent',
      subscriptionDetails: 'user/subscriptionDetails',
      transactionHistory: '/history/transactions',
      downloadInvoice: '/user/invoice',
    },
    confirmPayment: `${baseUrlApi}session/check-transaction-status`,
    listBanks: '/stripe/client-listBankAccounts',
    defaultPayment: '/stripe/set-default-payment-method',
  },
  videoSession: {
    getToken: '/session/getToken/',
    chat: {
      fileUpload: '/chat/massage-file-upload',
      chatHistorySave: '/chat/history',
      getChatHistory: '/chat/getHistory',
    },
  },
  session: {
    interpreter: {
      list: '/session/interpreter-list',
      detail: '/session/details',
      approve: '/session/approve',
      reject: '/session/reject',
      updatedApproveReject: '/session/update-request',
    },
    user: {
      list: '/session/client-list',
      requestSession: '/session/request',
      cancel: '/session/cancel',
      dispute: '/review/submit',
      edit: '/session/update',
    },
  },
  dispute: {
    user: {
      create: '/dispute/create',
      categoryList: '/disputeCategory/list',
      list: '/dispute/client-list',
      detail: (id: string) => `/dispute/client-details/${id}`,
    },
    interpreter: {
      create: '/dispute/interpreter/create',
      list: '/dispute/interpreter/list',
      detail: (id: string) => `/dispute/interpreter-details/${id}`,
    },
    chatHistory: '/dispute-or-support/chat-list',
    chatInitiate: '/dispute-or-support/support-initiate',
  },
  favourite: {
    user: {
      addInterpreter: '/favourite/submit',
      getAll: '/favourite/list',
    },
  },
  notifications: {
    all: '/notifications/list',
    unreadCount: '/notifications/unread-count',
    readAll: '/notifications/read-all',
    read: (id: string) => `/notifications/${id}/read`,
  },

  invitation: {
    user: {
      inviteUser: '/subscription/sharing/create',
      action: '/subscription/sharing/action',
      sharingList: '/subscription/shearing/list',
      remove: '/subscription-sharing/remove-user',
      inviteList: '/subscription/shearing/invite/list',
    },
  },

  referral: {
    create: '/referral/create',
  },

  cms: {
    areaOfExpertise: '/areaofexpertise/list',
    languageList: '/language/list',
    businessList: '/business_sector/list',
    sessionFormat: '/format/list',
    pricingPlan: '/pricingplan/list',
    cmsData: '/cms/details',
  },

  payout: {
    earning: '/payment/interpreter-earning-list',
    payout: '/payment/interpreter-payout-list',
  },

  other: {
    fcmSubscribe: '/fcm/subscribe-to-topic',
  },
};
