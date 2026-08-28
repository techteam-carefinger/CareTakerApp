export type RootStackParamList = {
  Login: undefined;
  OtpVerification: {
    phoneNumber: string;
    keepSignedIn?: boolean;
  };
  ProfileSetup: {
    phoneNumber: string;
  };
  RegistrationDocuments: {
    phoneNumber: string;
  };
  Home: undefined;
  Earnings: undefined;
  JobHistory: undefined;
  Profile: undefined;
  ProfileDetails: undefined;
  EditProfileField: {
    field: 'name' | 'email' | 'vehicleNumber' | 'vehicleModel';
    initialValue?: string;
  };
  ActiveJob: {
    bookingId: string;
    otp?: number;
    customerName?: string;
    customerPhone?: string;
    pickup: {
      address: string;
      latitude: number;
      longitude: number;
    };
    drop?: {
      address: string;
      latitude: number;
      longitude: number;
    };
    remainingMinutes?: number;
    ratePerMinute?: number;
    isFree?: boolean;
  };
  ServiceComplete: {
    bookingId: string;
    minutes: number;
    ratePerMinute?: number;
    earnings?: number;
    customerName?: string;
  };
  TermsAndConditions: undefined;
  PrivacyPolicy: undefined;
};
