import { createContext } from "react";

// `user` is null when signed out. Pages use these so the token stays in sync.
const UserContext = createContext({
   user: null,
   signIn: async () => {},
   signOut: async () => {},
   signOutEverywhere: async () => {},
   changePassword: async () => {},
   updateProfile: async () => {},
});

export default UserContext;
