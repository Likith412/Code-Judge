import { createContext } from "react";

// `user` is null when nobody is signed in; guards and the navbar use it.
// Pages use signIn/signOut so the user state and authentication token stay in sync.
const UserContext = createContext({
   user: null,
   signIn: async () => {},
   signOut: async () => {},
   changePassword: async () => {},
   updateProfile: async () => {},
});

export default UserContext;
