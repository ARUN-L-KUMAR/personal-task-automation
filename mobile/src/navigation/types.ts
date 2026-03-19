export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppTabParamList = {
  Home: undefined;
  Assistant: undefined;
  Tasks: undefined;
  Services: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

// Kept for existing screen prop typing across the current codebase.
export type AppStackParamList = AuthStackParamList & AppTabParamList;
