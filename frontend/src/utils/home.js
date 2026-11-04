// Where each role lands. Setters and admins do not solve, so not the problem list.
function homePath(user) {
   if (user?.role === "ADMIN") return "/admin/users";
   if (user?.role === "SETTER") return "/setter/problems";

   return "/problems";
}

export { homePath };
